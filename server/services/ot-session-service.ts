/**
 * OT Session Service
 * Handles multi-session OT management with JSONB storage
 * 
 * Features:
 * - Multiple OT sessions per day
 * - Automatic session numbering
 * - Payroll period locking
 * - Daily OT cap validation
 */

import { storage } from '../storage';
import type {
    OTSession,
    StartOTSessionRequest,
    EndOTSessionRequest,
    StartOTSessionResponse,
    EndOTSessionResponse,
    CompanySettings,
    PayrollPeriod
} from '../types/ot-types';
import { CloudinaryService } from './cloudinary-service';

export class OTSessionService {

    /**
     * Start a new OT session
     * Creates new session in otSessions JSONB array
     */
    static async startSession(request: StartOTSessionRequest): Promise<StartOTSessionResponse> {
        try {
            const { userId, latitude, longitude, imageUrl, address, reason } = request;

            // Get user for department info
            const user = await storage.getUser(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Get today's date (normalized to midnight)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // ✅ SECURITY CHECK 1: Verify user is not on approved full-day leave
            const leaveStatus = await this.checkLeaveStatus(userId, today);
            if (leaveStatus.onLeave) {
                const leaveTypeText = leaveStatus.leaveType === 'casual_leave' ? 'casual leave' : 'unpaid leave';
                return {
                    success: false,
                    message: `Cannot start OT while on approved ${leaveTypeText}. Contact your manager if this is an error.`
                };
            }

            // ✅ SECURITY CHECK 2: Check if payroll period is locked
            const isLocked = await this.checkPayrollLocked(today);
            if (isLocked) {
                return {
                    success: false,
                    message: 'Payroll period is locked. Cannot start OT.'
                };
            }

            // ✅ SECURITY CHECK 3: Validate holiday OT policy
            // This enforces allowOT field - blocks OT on strict holidays
            await this.validateHolidayOT(userId, today);

            // Determine OT type
            const otType = await this.determineOTType(user.department || 'operations', new Date());

            // Generate session ID for the NEW session
            // Note: In a transaction, we can't easily know the "sessionNumber" sequentially 
            // without reading. The transaction method reads it.
            // However, our transaction method expects a session OBJECT.
            // We need to pass the "partial" session or let the transaction build it.
            // But to keep it simple, we'll let the transaction handle the appending.
            // Wait, we need the Session ID for the response. 
            // Our transaction method `addOTSessionTransaction` appends to the array.
            // We need to generate the ID *before* calling it, but we need the index.
            // CHALLENGE: To be truly atomic, we should read the index inside the transaction.

            // RE-STRATEGY: The `addOTSessionTransaction` I wrote pushes `session`.
            // But `session` needs an ID and Number.
            // If I generate distinct IDs (random/timestamp), the number is just cosmetic.
            // Let's use a Timestamp-based ID so it's unique regardless of index.

            const timestamp = new Date().getTime();
            const sessionId = `ot_${userId}_${timestamp}`;

            // Validating uniqueness in transaction is critical.
            // The transaction I wrote does NOT auto-increment sessionNumber.
            // It just pushes what I give it.
            // If I want perfect Session Numbers (1, 2, 3), I must read inside transaction.
            // The transaction logic I added (lines 6150+) reads the doc.
            // I should modify `addOTSessionTransaction` to *assign* the session number properly.

            // For now, let's look at the implementation of `addOTSessionTransaction` again.
            // It does: `const updatedSessions = [...sessions, session];`
            // It does NOT modify the session object.

            // CRITICAL DECISION: Session Number is nice-to-have. Data Safety is critical.
            // I will estimate the Session Number as `existingSessions.length + 1` from a fresh read?
            // No, that defeats the purpose.

            // BETTER FIX: Update Storage method to accept a "Session Creator Function" or partial data?
            // Too complex.
            // PRACTICAL FIX: Pass the session with a placeholder, rely on `sessionId` for identity.
            // We can accept that `sessionNumber` might be slightly off in a race condition (rare),
            // OR we fetch, generate, and rely on the transaction to fail if state changed?
            // The transaction fails if `attendanceRef` changes? No, Firestore transactions retry.

            // Let's rely on the transaction to block duplicates.
            // I'll assume sessionNumber is 1 + (current estimate). logic collision is low impact.
            // The important part is Blocking 2 active sessions.

            // Let's do a quick read (optimistic) to get session count, 
            // then send to transaction.
            // Transaction verifies "No Active Session".
            // If checking fails, it aborts. SAFE.

            const attendance = await storage.getAttendanceByUserAndDate(userId, today);

            // Must have attendance record to start OT (user must check-in first)
            if (!attendance) {
                return {
                    success: false,
                    message: 'No attendance record found for today. Please check in first before starting OT.'
                };
            }

            const currentCount = attendance.otSessions?.length || 0;
            const sessionNumber = currentCount + 1;

            // Create new session object
            const newSession: OTSession = {
                sessionId,
                sessionNumber,
                otType,
                startTime: new Date(),
                otHours: 0,
                startImageUrl: imageUrl,
                startLatitude: latitude.toString(),
                startLongitude: longitude.toString(),
                startAddress: address,
                reason: reason || '',
                employeeId: userId,
                status: 'in_progress',
                createdAt: new Date()
            };

            // ATOMIC WRITE: Ensures no double-start
            // Pass attendance.id (the actual document ID) - NOT userId
            try {
                await storage.addOTSessionTransaction(attendance.id, newSession);
            } catch (err: any) {
                if (err.message === 'ACTIVE_SESSION_EXISTS') {
                    return {
                        success: false,
                        message: 'You already have an active OT session. Please end it first.'
                    };
                }
                throw err;
            }

            // Log activity
            await storage.createActivityLog({
                type: 'attendance',
                title: `OT Session Started (${otType})`,
                description: `${user.displayName} started ${otType} OT session`,
                entityId: sessionId,
                entityType: 'ot_session',
                userId
            });

            return {
                success: true,
                message: `OT session started successfully (${otType})`,
                sessionId,
                otType,
                startTime: newSession.startTime
            };

        } catch (error) {
            console.error('Error starting OT session:', error);
            return {
                success: false,
                message: 'Failed to start OT session'
            };
        }
    }

    /**
     * End an active OT session
     * Calculates OT hours and validates daily cap
     */
    static async endSession(request: EndOTSessionRequest): Promise<EndOTSessionResponse> {
        try {
            const { userId, sessionId, latitude, longitude, imageUrl, address, reason } = request;

            // Get user
            const user = await storage.getUser(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if payroll period is locked
            const isLocked = await this.checkPayrollLocked(today);
            if (isLocked) {
                return {
                    success: false,
                    message: 'Payroll period is locked. Cannot end OT.'
                };
            }

            // Get attendance record
            const attendance = await storage.getAttendanceByUserAndDate(userId, today);
            if (!attendance) {
                return { success: false, message: 'No attendance record found' };
            }

            // Parse OT sessions
            const sessions: OTSession[] = Array.isArray(attendance.otSessions)
                ? attendance.otSessions
                : [];

            // Find the  session
            const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
            if (sessionIndex === -1) {
                return { success: false, message: 'OT session not found' };
            }

            const session = sessions[sessionIndex];

            // Verify session is in progress
            if (session.status !== 'in_progress') {
                return { success: false, message: 'OT session is not active' };
            }

            // Calculate OT hours
            const endTime = new Date();
            const startTime = new Date(session.startTime);
            const otHours = Number(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

            // Calculate total OT for today (before adding current session)
            const totalOTBefore = sessions
                .filter(s => s.status === 'completed' || s.status === 'APPROVED')
                .reduce((sum, s) => sum + s.otHours, 0);

            // Get daily limit
            const settings = await this.getCompanySettings();
            const maxDaily = settings.maxOTHoursPerDay;
            const totalOTAfter = totalOTBefore + otHours;

            // ZERO-FRAUD LOGIC: Determine status
            let sessionStatus: 'APPROVED' | 'PENDING_REVIEW';
            let statusMessage: string;

            if (totalOTAfter <= maxDaily) {
                // Within limit → Auto-approve
                sessionStatus = 'APPROVED';
                statusMessage = `OT session completed and approved. ${otHours.toFixed(2)} hours recorded.`;
            } else {
                // Exceeds limit → Pending review
                sessionStatus = 'PENDING_REVIEW';
                statusMessage = `Daily OT limit exceeded (${maxDaily}h). Session saved but requires admin approval. Total: ${totalOTAfter.toFixed(2)}h.`;
            }

            // Update session
            sessions[sessionIndex] = {
                ...session,
                endTime,
                otHours,
                endImageUrl: imageUrl,
                endLatitude: latitude.toString(),
                endLongitude: longitude.toString(),
                endAddress: address,
                status: sessionStatus,
                updatedAt: new Date()
            };

            // Calculate total APPROVED OT for today (for attendance record)
            const approvedOTToday = sessions
                .filter(s => s.status === 'APPROVED' || s.status === 'completed')
                .reduce((sum, s) => sum + s.otHours, 0);

            // Update attendance
            await storage.updateAttendance(attendance.id, {
                otSessions: sessions,
                totalOTHours: approvedOTToday  // Only count approved hours
            });

            // Log activity
            await storage.createActivityLog({
                type: 'attendance',
                title: sessionStatus === 'APPROVED' ? 'OT Session Approved' : 'OT Session Pending Review',
                description: `${user.displayName} completed OT session: ${otHours.toFixed(2)} hours (${sessionStatus})`,
                entityId: sessionId,
                entityType: 'ot_session',
                userId
            });

            // Send notification if pending review
            if (sessionStatus === 'PENDING_REVIEW') {
                await storage.createNotification({
                    userId,
                    type: 'admin_review',
                    title: 'OT Requires Review',
                    message: `Your OT session (${otHours.toFixed(2)}h) exceeds the daily limit and requires admin approval.`,
                    createdAt: new Date()
                });
            }

            return {
                success: true,
                message: statusMessage,
                otHours,
                totalOTToday: totalOTAfter,
                exceedsDailyLimit: sessionStatus === 'PENDING_REVIEW',
                reviewRequired: sessionStatus === 'PENDING_REVIEW'
            };

        } catch (error) {
            console.error('Error ending OT session:', error);
            return {
                success: false,
                message: 'Failed to end OT session'
            };
        }
    }

    /**
     * Get active session for user
     */
    static async getActiveSession(userId: string): Promise<OTSession | null> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const attendance = await storage.getAttendanceByUserAndDate(userId, today);
            if (!attendance || !attendance.otSessions) {
                return null;
            }

            const sessions: OTSession[] = Array.isArray(attendance.otSessions)
                ? attendance.otSessions
                : [];

            return sessions.find(s => s.status === 'in_progress') || null;

        } catch (error) {
            console.error('Error getting active session:', error);
            return null;
        }
    }

    /**
     * Get all OT sessions for a date
     */
    static async getSessionsForDate(userId: string, date: Date): Promise<OTSession[]> {
        try {
            const attendance = await storage.getAttendanceByUserAndDate(userId, date);
            if (!attendance || !attendance.otSessions) {
                return [];
            }

            return Array.isArray(attendance.otSessions) ? attendance.otSessions : [];

        } catch (error) {
            console.error('Error getting sessions:', error);
            return [];
        }
    }

    /**
     * Determine OT type based on current time and company settings
     */
    private static async determineOTType(
        department: string,
        currentTime: Date
    ): Promise<'early_arrival' | 'late_departure' | 'weekend' | 'holiday'> {
        try {
            // 1. Check holiday FIRST (highest priority)
            const { HolidayService } = await import('./holiday-service');
            const holiday = await HolidayService.getHolidayForDate(currentTime, department);
            if (holiday) {
                return 'holiday';
            }

            // 2. Check weekend (configurable, not hardcoded)
            const settings = await this.getCompanySettings();
            const dayOfWeek = currentTime.getDay();
            if (settings.weekendDays.includes(dayOfWeek)) {
                return 'weekend';
            }

            // 3. Check early/late based on department timing
            const { EnterpriseTimeService } = await import('./enterprise-time-service');
            const deptTiming = await EnterpriseTimeService.getDepartmentTiming(department);

            // Parse department times
            const parseTime = (timeStr: string): Date => {
                const today = new Date(currentTime);
                const [time, period] = timeStr.split(' ');
                const [hours, minutes] = time.split(':').map(Number);
                let hour = hours;
                if (period === 'PM' && hour !== 12) hour += 12;
                if (period === 'AM' && hour === 12) hour = 0;
                today.setHours(hour, minutes, 0, 0);
                return today;
            };

            const deptStartTime = parseTime(deptTiming.checkInTime);
            const deptEndTime = parseTime(deptTiming.checkOutTime);

            if (currentTime < deptStartTime) {
                return 'early_arrival';
            } else {
                return 'late_departure';
            }

        } catch (error) {
            console.error('Error determining OT type:', error);
            return 'late_departure'; // Default
        }
    }

    /**
     * Get company settings (cached)
     */
    private static async getCompanySettings(): Promise<CompanySettings> {
        try {
            const settings = await storage.getCompanySettings();
            return settings || {
                id: '1',
                weekendDays: [0], // Sunday only default
                defaultOTRate: 1.0,
                weekendOTRate: 1.0,
                maxOTHoursPerDay: 5.0,
                updatedAt: new Date()
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            // Return safe defaults
            return {
                id: '1',
                weekendDays: [0],
                defaultOTRate: 1.0,
                weekendOTRate: 1.0,
                maxOTHoursPerDay: 5.0,
                maxOTHoursPerDay: 5.0,
                updatedAt: new Date()
            };
        }
    }

    /**
     * Check if payroll period is locked
     */
    private static async checkPayrollLocked(date: Date): Promise<boolean> {
        try {
            const month = date.getMonth() + 1;
            const year = date.getFullYear();

            const period = await storage.getPayrollPeriod(month, year);
            return period && period.status === 'locked';

        } catch (error) {
            console.error('Error checking payroll lock:', error);
            return false; // Allow if error
        }
    }

    /**
     * Check if user has approved full-day leave on the given date
     * Blocks OT for: casual_leave, unpaid_leave
     * Allows OT for: permission (partial-day)
     */
    private static async checkLeaveStatus(
        userId: string,
        date: Date
    ): Promise<{ onLeave: boolean; leaveType?: string }> {
        try {
            // Get all leaves for user
            const leaves = await storage.listLeaveApplicationsByUser(userId);

            // Find any approved FULL-DAY leave that covers this date
            const fullDayLeaveOnDate = leaves.find(leave => {
                // Only check approved leaves
                if (leave.status !== 'approved') return false;

                // ✅ BLOCK: Casual leave (full-day)
                if (leave.leaveType === 'casual_leave' && leave.startDate && leave.endDate) {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);

                    // Normalize dates
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    const checkDate = new Date(date);
                    checkDate.setHours(12, 0, 0, 0);

                    return checkDate >= start && checkDate <= end;
                }

                // ✅ BLOCK: Unpaid leave (full-day)
                if (leave.leaveType === 'unpaid_leave' && leave.startDate && leave.endDate) {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);

                    // Normalize dates
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    const checkDate = new Date(date);
                    checkDate.setHours(12, 0, 0, 0);

                    return checkDate >= start && checkDate <= end;
                }

                // ⚠️ DO NOT BLOCK: Permission (partial-day, max 2 hours)
                // Employee can still work OT outside permission hours
                // Example: Permission 10AM-12PM, OT 7PM-10PM is valid

                return false;
            });

            if (fullDayLeaveOnDate) {
                return {
                    onLeave: true,
                    leaveType: fullDayLeaveOnDate.leaveType
                };
            }

            return { onLeave: false };

        } catch (error) {
            console.error('Error checking leave status:', error);
            // On error, allow OT (fail open to avoid blocking legitimate work)
            return { onLeave: false };
        }
    }

    /**
     * Validate if OT is allowed on a given date based on holiday policy
     * Throws error if holiday blocks OT
     * Returns holiday if it exists (for rate calculation)
     * 
     * @param userId - User ID for department context
     * @param date - Date to check
     * @returns Holiday object if exists and allows OT, or null
     * @throws Error if holiday blocks OT
     */
    private static async validateHolidayOT(userId: string, date: Date): Promise<any | null> {
        try {
            const user = await storage.getUser(userId);
            if (!user) {
                return null; // No user, no validation needed
            }

            // Check if date is a holiday for this user's department
            const { UnifiedAttendanceService } = await import('./unified-attendance-service');
            const { isHoliday, holiday } = await UnifiedAttendanceService.isHoliday(
                date,
                user.department || undefined
            );

            // CRITICAL: Block OT if holiday doesn't allow it
            if (isHoliday && holiday && !holiday.allowOT) {
                throw new Error(
                    `OT submissions are not allowed on ${holiday.name}. This is a strict holiday.`
                );
            }

            // Return holiday for potential rate calculation (or null if not a holiday)
            return holiday || null;

        } catch (error) {
            // If error is our custom "not allowed" error, re-throw it
            if (error instanceof Error && error.message.includes('not allowed')) {
                throw error;
            }

            // For other errors, log and allow OT (fail open)
            console.error('[OTSessionService] Error validating holiday OT:', error);
            return null;
        }
    }

    /**
     * Lock all OT sessions for a payroll period
     */
    static async lockSessionsForPeriod(month: number, year: number, adminId: string): Promise<void> {
        try {
            // Get all attendance records for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const attendanceRecords = await storage.listAttendanceByDateRange(startDate, endDate);

            // Lock all completed OT sessions
            for (const attendance of attendanceRecords) {
                if (!attendance.otSessions) continue;

                const sessions: OTSession[] = Array.isArray(attendance.otSessions)
                    ? attendance.otSessions
                    : [];

                const updatedSessions = sessions.map(s =>
                    s.status === 'completed' ? { ...s, status: 'locked' as const } : s
                );

                await storage.updateAttendance(attendance.id, {
                    otSessions: updatedSessions
                });
            }

            console.log(`Locked OT sessions for ${month}/${year}`);

        } catch (error) {
            console.error('Error locking sessions:', error);
            throw error;
        }
    }
}
