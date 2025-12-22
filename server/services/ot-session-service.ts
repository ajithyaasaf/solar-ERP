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

            // Get today's attendance record
            let attendance = await storage.getAttendanceByUserAndDate(userId, today);

            if (!attendance) {
                // Create new attendance record if doesn't exist (for weekend OT)
                attendance = await storage.createAttendance({
                    userId,
                    date: today,
                    attendanceType: 'office',
                    status: 'present',
                    isLate: false,
                    isWithinOfficeRadius: true,
                    otSessions: [],
                    totalOTHours: 0
                });
            }

            // Parse existing OT sessions
            const existingSessions: OTSession[] = Array.isArray(attendance.otSessions)
                ? attendance.otSessions
                : [];

            // Check for active session
            const activeSession = existingSessions.find(s => s.status === 'in_progress');
            if (activeSession) {
                return {
                    success: false,
                    message: 'You already have an active OT session. Please end it first.'
                };
            }

            // Determine OT type
            const otType = await this.determineOTType(user.department || 'operations', new Date());

            // Generate session ID and number
            const sessionNumber = existingSessions.length + 1;
            const sessionId = `ot_${today.toISOString().split('T')[0].replace(/-/g, '')}_${userId}_${String(sessionNumber).padStart(3, '0')}`;

            // Create new session
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

            // Add to sessions array
            const updatedSessions = [...existingSessions, newSession];

            // Update attendance record
            await storage.updateAttendance(attendance.id, {
                otSessions: updatedSessions
            });

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

            // Update session
            sessions[sessionIndex] = {
                ...session,
                endTime,
                otHours,
                endImageUrl: imageUrl,
                endLatitude: latitude.toString(),
                endLongitude: longitude.toString(),
                endAddress: address,
                status: 'completed',
                updatedAt: new Date()
            };

            // Calculate total OT for today
            const totalOTToday = sessions
                .filter(s => s.status === 'completed')
                .reduce((sum, s) => sum + s.otHours, 0);

            // Check daily OT cap
            const settings = await this.getCompanySettings();
            const exceedsDailyLimit = totalOTToday > settings.maxOTHoursPerDay;

            if (exceedsDailyLimit) {
                return {
                    success: false,
                    message: `Daily OT limit exceeded (${settings.maxOTHoursPerDay}h). Total: ${totalOTToday.toFixed(2)}h. Contact admin for approval.`,
                    totalOTToday,
                    exceedsDailyLimit: true
                };
            }

            // Update attendance
            await storage.updateAttendance(attendance.id, {
                otSessions: sessions,
                totalOTHours: totalOTToday
            });

            // Log activity
            await storage.createActivityLog({
                type: 'attendance',
                title: 'OT Session Completed',
                description: `${user.displayName} completed OT session: ${otHours.toFixed(2)} hours`,
                entityId: sessionId,
                entityType: 'ot_session',
                userId
            });

            return {
                success: true,
                message: `OT session completed. ${otHours.toFixed(2)} hours recorded.`,
                otHours,
                totalOTToday,
                exceedsDailyLimit
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
                defaultOTRate: 1.5,
                weekendOTRate: 2.0,
                maxOTHoursPerDay: 5.0,
                updatedAt: new Date()
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            // Return safe defaults
            return {
                id: '1',
                weekendDays: [0],
                defaultOTRate: 1.5,
                weekendOTRate: 2.0,
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
