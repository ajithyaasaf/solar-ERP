import { storage } from '../server/storage';

async function createTestNotification() {
    try {
        const masterAdmins = await storage.getUsersByRole('master_admin');
        if (masterAdmins.length === 0) {
            console.log("No master admins found.");
            process.exit(1);
        }

        const admin = masterAdmins[0];
        console.log(`Creating test notification for: ${admin.displayName || admin.email} (${admin.uid})`);

        await storage.createNotification({
            userId: admin.uid,
            type: 'admin_review',
            category: 'attendance',
            title: 'Test Notification',
            message: 'This is a test notification to verify dismiss functionality works correctly.',
            actionLabel: 'View',
            actionUrl: '/attendance-management?tab=pending-review',
            dismissible: true,
            status: 'unread',
        });

        console.log("Test notification created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Failed:", error);
        process.exit(1);
    }
}

createTestNotification();
