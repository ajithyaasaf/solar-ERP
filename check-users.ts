import 'dotenv/config';
import { admin } from "./server/firebase";

async function checkUsers() {
    try {
        const snapshot = await admin.firestore().collection('users').get();
        const users = snapshot.docs.map(doc => ({
            name: doc.data().displayName,
            email: doc.data().email,
            role: doc.data().role,
            department: doc.data().department,
            designation: doc.data().designation
        }));
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkUsers();
