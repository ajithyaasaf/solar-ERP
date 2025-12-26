import { storage } from '../storage';
import { EnterpriseTimeService } from './enterprise-time-service';
import { NotificationService } from './notification-service';

export class AutoCheckoutService {
    /**
     * Main job to process incomplete attendance records
     * Should be called via CRON every 2 hours
     */
    static async processAutoCheckouts() {
        console.log('[AUTO-CHECKOUT] ========================================');
        console.log('[AUTO-CHECKOUT] Starting auto-checkout job...');
        console.log('[AUTO-CHECKOUT] Current time:', new Date().toISOString());

        try {
            // Process records for today and yesterday to ensure we don't miss anything 
            // around the 2-hour threshold
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            const datesToProcess = [now, yesterday];
            console.log('[AUTO-CHECKOUT] Processing dates:', datesToProcess.map(d => d.toISOString().split('T')[0]));

            for (const date of datesToProcess) {
                await this.processDate(date);
            }

            console.log('[AUTO-CHECKOUT] Job completed successfully.');
            console.log('[AUTO-CHECKOUT] ========================================');
        } catch (error) {
            console.error('[AUTO-CHECKOUT] Critical error in auto-checkout job:', error);
        }
    }

    private static async processDate(date: Date) {
        console.log(`[AUTO-CHECKOUT] Processing date: ${date.toISOString().split('T')[0]}`);

        const incomplete = await storage.listIncompleteAttendance(date);
        const now = new Date();

        console.log(`[AUTO-CHECKOUT] Found ${incomplete.length} incomplete records for ${date.toISOString().split('T')[0]}`);

        if (incomplete.length === 0) {
            console.log(`[AUTO-CHECKOUT] No incomplete records to process for ${date.toISOString().split('T')[0]}`);
            return;
        }

        // Log each incomplete record found
        incomplete.forEach((record, index) => {
            console.log(`[AUTO-CHECKOUT] Incomplete record #${index + 1}:`, {
                id: record.id,
                userId: record.userId,
                userDepartment: record.userDepartment,
                date: record.date?.toISOString().split('T')[0],
                checkInTime: record.checkInTime?.toISOString(),
                checkOutTime: record.checkOutTime,
            });
        });

        for (const record of incomplete) {
            try {
                if (!record.userDepartment) {
                    console.warn(`[AUTO-CHECKOUT] ⚠️ Skipping record ${record.id} -missing department`);
                    continue;
                }

                const timing = await EnterpriseTimeService.getDepartmentTiming(record.userDepartment);
                console.log(`[AUTO-CHECKOUT] Department timing for ${record.userDepartment}:`, timing);

                // Parse the department check-out time based on check-in time (handles cross-midnight shifts)
                const deptCheckOutDate = EnterpriseTimeService.getExpectedCheckoutDateTime(record.checkInTime!, timing.checkOutTime);
                console.log(`[AUTO-CHECKOUT] Dept checkout time: ${deptCheckOutDate.toISOString()}`);

                // Use department-specific grace period (default to 2 hours if not set)
                const gracePeriodMs = (timing.autoCheckoutGraceMinutes || 120) * 60 * 1000;
                const autoCheckoutThreshold = new Date(deptCheckOutDate.getTime() + gracePeriodMs);
                console.log(`[AUTO-CHECKOUT] Grace period threshold: ${autoCheckoutThreshold.toISOString()}`);
                console.log(`[AUTO-CHECKOUT] Current time: ${now.toISOString()}`);
                console.log(`[AUTO-CHECKOUT] Is past threshold? ${now >= autoCheckoutThreshold}`);

                // If current time is past the threshold, perform auto-checkout
                if (now >= autoCheckoutThreshold) {
                    console.log(`[AUTO-CHECKOUT] ✅ Processing auto-checkout for record ${record.id}`);

                    // Use department closing time as the official checkout time
                    const checkOutTime = deptCheckOutDate;

                    // Calculate final working hours using the established service
                    const metrics = await EnterpriseTimeService.calculateTimeMetrics(
                        record.userId,
                        record.userDepartment,
                        record.checkInTime!,
                        checkOutTime
                    );

                    console.log(`[AUTO-CHECKOUT] Calculated metrics:`, {
                        workingHours: metrics.workingHours,
                        checkOutTime: checkOutTime.toISOString()
                    });

                    // Update attendance record
                    await storage.updateAttendance(record.id, {
                        checkOutTime,
                        workingHours: metrics.workingHours,
                        autoCorrected: true,
                        autoCorrectedAt: now,
                        autoCorrectionReason: `Forgotten checkout (system auto-corrected after ${timing.autoCheckoutGraceMinutes || 120} minutes past ${timing.checkOutTime})`,
                        adminReviewStatus: 'pending'
                    });

                    console.log(`[AUTO-CHECKOUT] ✅ Record ${record.id} updated with adminReviewStatus='pending'`);

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
                } else {
                    console.log(`[AUTO-CHECKOUT] ⏳ Record ${record.id} not yet past grace period - skipping`);
                }
            } catch (error) {
                console.error(`[AUTO-CHECKOUT] ❌ Error processing record ${record.id}:`, error);
            }
        }
    }
}
