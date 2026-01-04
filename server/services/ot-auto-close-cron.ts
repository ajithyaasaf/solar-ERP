/**
 * OT Auto-Close Cron Service
 * Runs daily at midnight to close forgotten OT sessions
 * 
 * ZERO-FRAUD LOGIC:
 * - Sessions left open are auto-closed at 11:59 PM
 * - Status set to PENDING_REVIEW (requires admin verification)
 * - OT hours set to 0 for payroll purposes until approved
 * - Employee

 notified about auto-close
 */

import * as cron from 'node-cron';
import { storage } from '../storage';
import type { OTSession } from '../types/ot-types';
import { getUTCMidnight, getUTCEndOfDay } from '../utils/timezone-helpers';

export class OTAutoCloseService {
    private static cronJob: cron.ScheduledTask | null = null;

    /**
     * Start the auto-close cron job
     * Runs daily at 12:05 AM
     */
    static start(): void {
        if (this.cronJob) {
            console.log('[OT-AUTO-CLOSE] Cron already running');
            return;
        }

        // Schedule: Run at 12:05 AM every day
        this.cronJob = cron.schedule('5 0 * * *', async () => {
            try {
                await this.runAutoClose();
            } catch (error) {
                console.error('[OT-AUTO-CLOSE] Fatal error:', error);
            }
        });

        console.log('[OT-AUTO-CLOSE] ✅ Cron scheduled (runs daily at 12:05 AM)');
    }

    /**
     * Stop the cron job (for cleanup)
     */
    static stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('[OT-AUTO-CLOSE] Cron stopped');
        }
    }

    /**
     * Main auto-close logic
     */
    private static async runAutoClose(): Promise<void> {
        console.log('[OT-AUTO-CLOSE] Starting auto-close at', new Date().toISOString());

        try {
            // ZERO-FRAUD FIX: Look back 3 days to catch "Zombie Sessions"
            // If we only look at "yesterday", a late-night session (e.g. 10 PM) might not be 
            // 16h old during the first pass, and would be ignored forever in subsequent runs.
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const startDate = getUTCMidnight(threeDaysAgo); // UTC-safe

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const endDate = getUTCEndOfDay(yesterday); // UTC-safe

            // Get attendance records from last 3 days
            const attendanceRecords = await storage.listAttendanceByDateRange(
                startDate,
                endDate
            );

            let closedCount = 0;
            let errorCount = 0;

            // Process each attendance record
            for (const attendance of attendanceRecords) {
                if (!attendance.otSessions || !Array.isArray(attendance.otSessions)) {
                    continue;
                }

                // Find open sessions
                const openSessions = attendance.otSessions.filter(
                    (s: OTSession) => {
                        // FILTER: Only auto-close 'in_progress' sessions
                        if (s.status !== 'in_progress') return false;

                        // PROTECTION: Don't close sessions started recently
                        // If session started < 8 hours ago, assume it's still valid
                        const startTime = new Date(s.startTime);
                        const now = new Date();
                        const hoursRunning = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

                        return hoursRunning > 8; // Only close if running longer than 8 hours (no night shifts)
                    }
                );

                if (openSessions.length === 0) {
                    continue;
                }

                try {
                    // Close each open session
                    for (const session of openSessions) {
                        await this.closeSession(attendance.id, session, attendance.userId);
                        closedCount++;
                    }
                } catch (error) {
                    console.error(`[OT-AUTO-CLOSE] Error closing sessions for ${attendance.userId}:`, error);
                    errorCount++;
                }
            }

            console.log(`[OT-AUTO-CLOSE] ✅ Completed: ${closedCount} sessions closed, ${errorCount} errors`);

        } catch (error) {
            console.error('[OT-AUTO-CLOSE] Fatal error during run:', error);
        }
    }

    /**
     * Close a single session
     */
    private static async closeSession(
        attendanceId: string,
        session: OTSession,
        userId: string
    ): Promise<void> {
        try {
            // Get the attendance record
            const attendance = await storage.getAttendance(attendanceId);
            if (!attendance || !attendance.otSessions) {
                throw new Error('Attendance not found');
            }

            const sessions = Array.isArray(attendance.otSessions) ? attendance.otSessions : [];

            // Find session index
            const sessionIndex = sessions.findIndex(
                (s: OTSession) => s.sessionId === session.sessionId
            );

            if (sessionIndex === -1) {
                throw new Error('Session not found');
            }

            // ZERO-FRAUD LOGIC: Auto-close with PENDING_REVIEW status
            const now = new Date();
            const endOfDay = new Date(session.startTime);
            endOfDay.setHours(23, 59, 59, 999);

            // Calculate hours to end of day (for display only, not used for payroll)
            const startTime = new Date(session.startTime);
            const calculatedHours = Number(
                ((endOfDay.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
            );

            // Update session with PENDING_REVIEW status
            sessions[sessionIndex] = {
                ...session,
                endTime: endOfDay,
                otHours: 0,  // CRITICAL: Set to 0 for payroll (admin must approve actual hours)
                status: 'PENDING_REVIEW',
                autoClosedAt: now,
                autoClosedNote: `Session auto-closed at midnight. Employee forgot to end session. Calculated ${calculatedHours.toFixed(2)}h (needs admin verification).`,
                updatedAt: now
            };

            // Update attendance (no change to totalOTHours since this is pending)
            await storage.updateAttendance(attendanceId, {
                otSessions: sessions
            });

            // Get user for notification
            const user = await storage.getUser(userId);
            const userName = user?.displayName || 'Employee';

            // Notify employee
            await storage.createNotification({
                userId,
                type: 'admin_review',
                title: 'OT Session Auto-Closed',
                message: `Your OT session from ${this.formatTime(session.startTime)} was auto-closed because you forgot to end it. An admin will review and verify your actual hours.`,
                createdAt: now
            });

            // Log activity
            await storage.createActivityLog({
                type: 'attendance',
                title: 'OT Session Auto-Closed',
                description: `${userName}'s OT session auto-closed (forgot to end). Status: PENDING_REVIEW. Estimated ${calculatedHours.toFixed(2)}h.`,
                entityId: session.sessionId,
                entityType: 'ot_session',
                userId
            });

            console.log(`[OT-AUTO-CLOSE] ✓ Closed session ${session.sessionId} for ${userName}`);

        } catch (error) {
            console.error(`[OT-AUTO-CLOSE] Error closing session ${session.sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Format time for display
     */
    private static formatTime(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Manual trigger (for testing)
     */
    static async runNow(): Promise<void> {
        console.log('[OT-AUTO-CLOSE] Manual run triggered');
        await this.runAutoClose();
    }
}
