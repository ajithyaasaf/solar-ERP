import { storage } from '../server/storage';
import { db } from '../server/db';

async function testDismiss() {
    try {
        console.log("Fetching all master admins...");
        const masterAdmins = await storage.getUsersByRole('master_admin');
        if (masterAdmins.length === 0) {
            console.log("No master admins found.");
            return;
        }

        const admin = masterAdmins[0];
        console.log(`Checking notifications for admin: ${admin.displayName || admin.email} (${admin.uid})`);

        // Check raw firestore directly to make sure we bypass storage
        const snapshot = await storage.db.collection('notifications').get();
        const rawNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Total notifications in database: ${rawNotifs.length}`);

        const unread = rawNotifs.filter(n => n.status === 'unread');
        console.log(`Total UNREAD notifications in database: ${unread.length}`);

        if (unread.length > 0) {
            const first = unread[0];
            console.log(`First unread ID: ${first.id}`);
            console.log(`Notification userId: ${first.userId}`);
            console.log(`Does it match current admin UID? ${first.userId === admin.uid}`);

            // Now test storage method
            const viaStorage = await storage.getNotifications(admin.uid);
            console.log(`Via storage.getNotifications: ${viaStorage.length} total, matches via ID? ${viaStorage.some(n => n.id === first.id)}`);

        } else {
            console.log("No unread notifications to test on.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Test failed with error:", error);
        process.exit(1);
    }
}

testDismiss();
