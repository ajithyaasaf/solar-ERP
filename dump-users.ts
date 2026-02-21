import 'dotenv/config';
import { db } from "./server/firebase";
import { useEffect, useInsertionEffect } from 'react';
import { getEnabledCategories } from 'trace_events';

async function dumpUsers() {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => doc.data());

    const marketingUsers = users.filter(u => String(u.department).toLowerCase() === 'marketing');
    const salesUsers = users.filter(u => String(u.department).toLowerCase() === 'sales');

    console.log("MARKETING USERS:");
    console.log(JSON.stringify(marketingUsers.map(u => ({
        uid: u.uid,
        name: u.displayName,
        role: u.role,
        department: u.department,
        designation: u.designation,
        permissions: u.permissions
    })), null, 2));

    console.log("\nSALES USERS:");
    console.log(JSON.stringify(salesUsers.map(u => ({
        uid: u.uid,
        name: u.displayName,
        role: u.role,
        department: u.department,
        designation: u.designation,
        permissions: u.permissions
    })), null, 2));

    process.exit(0);
}

dumpUsers();
