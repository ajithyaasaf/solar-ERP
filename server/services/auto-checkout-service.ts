import { storage } from '../storage';
import { EnterpriseTimeService } from './enterprise-time-service';
import { NotificationService } from './notification-service';

export class AutoCheckoutService {
    /**
     * Main job to process incomplete attendance records
     * Should be called via CRON every 2 hours
     */
    static async processAutoCheckouts() {
        console.log('[AUTO-CHECKOUT] Starting auto-checkout job...');

        try {
            // Process records for today and yesterday to ensure we don't miss anything 
            // around the 2-hour threshold
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            const datesToProcess = [now, yesterday];

            for (const date of datesToProcess) {
                await this.processDate(date);
            }

            console.log('[AUTO-CHECKOUT] Job completed.');
        } catch (error) {
            console.error('[AUTO-CHECKOUT] Critical error in auto-checkout job:', error);
        }
    }

    private static async processDate(date: Date) {
        const incomplete = await storage.listIncompleteAttendance(date);
        const now = new Date();

        if (incomplete.length === 0) {
            return;
        }

        console.log(`[AUTO-CHECKOUT] Found ${incomplete.length} incomplete records for ${date.toISOString().split('T')[0]}`);

        for (const record of incomplete) {
            try {
                if (!record.userDepartment) {
                    console.warn(`[AUTO-CHECKOUT] Skipping record ${record.id} - missing department`);
                    continue;
                }

                const timing = await EnterpriseTimeService.getDepartmentTiming(record.userDepartment);

                // Parse the department check-out time for this specific attendance date
                const deptCheckOutDate = EnterpriseTimeService.parseTimeToDate(timing.checkOutTime, record.date);

                // 2-hour grace period (in milliseconds)
                const gracePeriodMs = 2 * 60 * 60 * 1000;
                const autoCheckoutThreshold = new Date(deptCheckOutDate.getTime() + gracePeriodMs);

                // If current time is past the threshold, perform auto-checkout
                if (now >= autoCheckoutThreshold) {
                    console.log(`[AUTO-CHECKOUT] Auto-checking out record ${record.id} for user ${record.userId}`);

                    // Use department closing time as the official checkout time
                    const checkOutTime = deptCheckOutDate;

                    // Calculate final working hours using the established service
                    const metrics = await EnterpriseTimeService.calculateTimeMetrics(
                        record.userId,
                        record.userDepartment,
                        record.checkInTime!,
                        checkOutTime
                    );

                    // Update attendance record
                    await storage.updateAttendance(record.id, {
                        checkOutTime,
                        workingHours: metrics.workingHours,
                        autoCorrected: true,
                        autoCorrectedAt: now,
                        autoCorrectionReason: `Forgotten checkout (system auto-corrected after 2 hours past ${timing.checkOutTime})`,
                        adminReviewStatus: 'pending'
                    });

                    // Phase 2: Create employee notification
                    await NotificationService.createAutoCheckoutNotification(
                        record.userId,
                        record.date,
                        timing.checkOutTime
                    );

                    // Phase 3: Notify Admin about pending review
                    const user = await storage.getUser(record.userId);
                    if (user) {
                        await NotificationService.notifyAdminReviewPending(
                            record.id,
                            user.displayName,
                            record.date
                        );
                    }
                }
            } catch (error) {
                console.error(`[AUTO-CHECKOUT] Error processing record ${record.id}:`, error);
            }
        }
    }
}
