
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import * as fs from 'fs';
import * as path from 'path';

// Manual env loading for standalone script
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    });
}

// Config from env (or hardcoded for dev if needed, but better to use env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const METHOD_ID = 'YOUR_METHOD_ID_HERE'; // User can replace this or we can create one.

// Random helpers
const getRandomScore = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomText = (score: number) => {
    const texts = [
        ["Terrible.", "Hated it.", "Made things worse.", "Waste of time."],
        ["Meh.", "Didn't do much.", "Boring.", "Nothing changed."],
        ["Okay.", "Decent.", "Helped a bit.", "Good starting point."],
        ["Great!", "Really helpful.", "Feeling better.", "Solid method."],
        ["Life changing!", "Amazing.", "The best thing ever.", "Totally transformed me."]
    ];
    return texts[score - 1][Math.floor(Math.random() * texts[score - 1].length)];
};

async function createReview(userId: string, methodId: string, score: number, dateOffsetDays: number) {
    const date = new Date();
    date.setDate(date.getDate() - dateOffsetDays);
    
    await addDoc(collection(db, 'reviews'), {
        methodId,
        userId,
        score,
        content: `[MOCK] ${getRandomText(score)} (Day -${dateOffsetDays})`,
        createdAt: Timestamp.fromDate(date),
        updatedAt: Timestamp.fromDate(date),
        metMinimum: Math.random() > 0.5,
        attemptsSummary: { count: 10, totalDurationMinutes: 100 }
    });
    console.log(`Created review: Score ${score} on ${date.toISOString().split('T')[0]}`);
}

async function main() {
    console.log("Starting Review Generation...");

    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.error("Missing Env Vars. Make sure .env.local exists.");
        process.exit(1);
    }

    const testUsers = [];
    
    // 1. Create a few test users
    for (let i = 1; i <= 5; i++) {
        const email = `test_trend_${Date.now()}_${i}@example.com`;
        const password = 'password123';
        
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            testUsers.push({ uid: userCred.user.uid, email, password });
            console.log(`Created User: ${email} / ${password} (UID: ${userCred.user.uid})`);
        } catch (e: any) {
             console.log(`Error creating user ${email}: ${e.message}`);
             // If email exists, try to login? Na, just generic catch
        }
    }
    
    // 2. Generate Review History
    // We want a mix of patterns.
    
    // User 1: The "Success Story" (Starts low, goes high, stays high)
    if (testUsers[0]) {
        const uid = testUsers[0].uid;
        console.log(`\nGenerating Success Story for ${testUsers[0].email} (Method: ${METHOD_ID})...`);
        // 6 months ago
        await createReview(uid, METHOD_ID, 2, 180);
        await createReview(uid, METHOD_ID, 3, 150);
        await createReview(uid, METHOD_ID, 3, 120);
        await createReview(uid, METHOD_ID, 4, 90);
        await createReview(uid, METHOD_ID, 5, 60);
        await createReview(uid, METHOD_ID, 5, 30);
        await createReview(uid, METHOD_ID, 5, 2);
    }
    
    // User 2: The "Drop Off" (Starts high, gets bored/low, stops)
    if (testUsers[1]) {
        const uid = testUsers[1].uid;
        console.log(`\nGenerating Drop Off for ${testUsers[1].email}...`);
        await createReview(uid, METHOD_ID, 4, 180);
        await createReview(uid, METHOD_ID, 3, 170);
        await createReview(uid, METHOD_ID, 2, 160);
        // ... stops
    }
    
    // User 3: The "Consistent" (Middle of the road)
    if (testUsers[2]) {
        const uid = testUsers[2].uid;
        console.log(`\nGenerating Consistent for ${testUsers[2].email}...`);
        for (let d = 180; d >= 0; d -= 30) {
            await createReview(uid, METHOD_ID, 3, d);
        }
    }
    
    console.log("\nDone! Copy a User Email/Password above to log in and test.");
    console.log("IMPORTANT: Update the METHOD_ID const in this script to target a real method ID from your database.");
    process.exit(0);
}

main();
