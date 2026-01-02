/**
 * Internal Cron Scheduler for Automated Jobs
 * Runs scheduled tasks automatically within the Node.js server
 * NO external configuration needed - fully automated for production
 */

import * as cron from 'node-cron';
import { AutoCheckoutService } from './services/auto-checkout-service';
import { OTAutoCloseService } from './services/ot-auto-close-cron';

/**
 * Initialize all scheduled cron jobs
 * Called once when the server starts
 */
export function initializeCronJobs() {
    console.log('[CRON] Initializing automated cron jobs...');

    // Auto-Checkout Job: Runs every 2 hours
    // Cron expression: "0 */2 * * *" = At minute 0 past every 2nd hour
    const autoCheckoutJob = cron.schedule('0 */2 * * *', async () => {
        console.log('[CRON] Auto-checkout job triggered at:', new Date().toISOString());
        try {
            await AutoCheckoutService.processAutoCheckouts();
            console.log('[CRON] Auto-checkout job completed successfully');
        } catch (error) {
            console.error('[CRON] Error in auto-checkout job:', error);
        }
    }, {
        timezone: "Asia/Kolkata" // IST timezone
    });

    console.log('[CRON] ✅ Auto-checkout job scheduled: Every 2 hours');

    // OT Auto-Close Job: Runs daily at 12:05 AM
    // Cron expression: "5 0 * * *" = At 00:05 (12:05 AM) every day
    const otAutoCloseJob = cron.schedule('5 0 * * *', async () => {
        console.log('[CRON] OT auto-close job triggered at:', new Date().toISOString());
        try {
            await OTAutoCloseService.runNow();
            console.log('[CRON] OT auto-close job completed successfully');
        } catch (error) {
            console.error('[CRON] Error in OT auto-close job:', error);
        }
    }, {
        timezone: "Asia/Kolkata" // IST timezone
    });

    console.log('[CRON] ✅ OT auto-close job scheduled: Daily at 12:05 AM IST');

    // Optional: Run auto-checkout immediately on server start (for testing)
    // Remove this in production if you don't want immediate execution
    if (process.env.NODE_ENV === 'development') {
        console.log('[CRON] Development mode: Running auto-checkout immediately for testing...');
        AutoCheckoutService.processAutoCheckouts()
            .then(() => console.log('[CRON] Initial auto-checkout check completed'))
            .catch(error => console.error('[CRON] Initial auto-checkout check failed:', error));
    }

    return {
        autoCheckoutJob,
        otAutoCloseJob
    };
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCronJobs(jobs: { autoCheckoutJob: cron.ScheduledTask; otAutoCloseJob: cron.ScheduledTask }) {
    console.log('[CRON] Stopping all cron jobs...');
    jobs.autoCheckoutJob.stop();
    jobs.otAutoCloseJob.stop();
    console.log('[CRON] All cron jobs stopped');
}
