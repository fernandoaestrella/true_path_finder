/**
 * Review Generation Script - Using Firebase REST API
 * Run with: npx tsx scripts/generate_reviews.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Manual env loading
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
}

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const METHOD_ID = 'TIalvecB46SGTIoWlv9B';

// REST API endpoints
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
    timestampValue?: string;
    mapValue?: { fields: Record<string, FirestoreValue> };
}

function toFirestoreValue(value: any): FirestoreValue {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (typeof value === 'object') {
        const fields: Record<string, FirestoreValue> = {};
        for (const [k, v] of Object.entries(value)) {
            fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

async function createUser(email: string, password: string): Promise<{ uid: string; idToken: string } | null> {
    try {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) {
            console.log(`  Auth error: ${data.error.message}`);
            return null;
        }
        return { uid: data.localId, idToken: data.idToken };
    } catch (e: any) {
        console.log(`  Fetch error: ${e.message}`);
        return null;
    }
}

async function createReview(idToken: string, userId: string, methodId: string, score: number, daysAgo: number) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const reviewData = {
        fields: {
            methodId: toFirestoreValue(methodId),
            userId: toFirestoreValue(userId),
            score: toFirestoreValue(score),
            content: toFirestoreValue(`[MOCK] Test review with score ${score}. Created ${daysAgo} days ago.`),
            createdAt: toFirestoreValue(date),
            updatedAt: toFirestoreValue(date),
            metMinimum: toFirestoreValue(daysAgo > 30),
            attemptsSummary: toFirestoreValue({ count: 10, totalDurationMinutes: 100 })
        }
    };

    try {
        const res = await fetch(`${FIRESTORE_URL}/reviews`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(reviewData)
        });
        
        if (!res.ok) {
            const errText = await res.text();
            console.log(`  Firestore error: ${errText}`);
            return false;
        }
        console.log(`  ✓ Review: Score ${score}, ${daysAgo} days ago`);
        return true;
    } catch (e: any) {
        console.log(`  Fetch error: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log('=== Review Generation Script ===\n');
    
    if (!API_KEY || !PROJECT_ID) {
        console.error('ERROR: Missing env vars. Check .env.local');
        process.exit(1);
    }

    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Method ID: ${METHOD_ID}\n`);

    const users: { email: string; password: string; uid: string; idToken: string }[] = [];

    // Create test users
    console.log('Creating test users...');
    for (let i = 1; i <= 3; i++) {
        const email = `tester${Date.now()}${i}@test.com`;
        const password = 'Test123456!';
        
        console.log(`  Creating ${email}...`);
        const result = await createUser(email, password);
        
        if (result) {
            users.push({ email, password, uid: result.uid, idToken: result.idToken });
            console.log(`  ✓ Created: ${email} / ${password}`);
        }
    }

    if (users.length === 0) {
        console.log('\nNo users created. Exiting.');
        process.exit(1);
    }

    console.log('\n--- User Credentials (save these!) ---');
    users.forEach(u => console.log(`  ${u.email} / ${u.password}`));
    console.log('--------------------------------------\n');

    // Generate reviews for each user
    console.log('Generating review histories...\n');

    // User 1: Success story (starts low, goes high)
    if (users[0]) {
        console.log(`User 1 (Success Story): ${users[0].email}`);
        await createReview(users[0].idToken, users[0].uid, METHOD_ID, 2, 180);
        await createReview(users[0].idToken, users[0].uid, METHOD_ID, 3, 120);
        await createReview(users[0].idToken, users[0].uid, METHOD_ID, 4, 60);
        await createReview(users[0].idToken, users[0].uid, METHOD_ID, 5, 7);
    }

    // User 2: Drop-off (starts high, leaves)
    if (users[1]) {
        console.log(`\nUser 2 (Drop-off): ${users[1].email}`);
        await createReview(users[1].idToken, users[1].uid, METHOD_ID, 4, 150);
        await createReview(users[1].idToken, users[1].uid, METHOD_ID, 2, 140);
    }

    // User 3: Consistent middle
    if (users[2]) {
        console.log(`\nUser 3 (Consistent): ${users[2].email}`);
        await createReview(users[2].idToken, users[2].uid, METHOD_ID, 3, 180);
        await createReview(users[2].idToken, users[2].uid, METHOD_ID, 3, 90);
        await createReview(users[2].idToken, users[2].uid, METHOD_ID, 3, 14);
    }

    console.log('\n=== Done! ===');
    console.log('Go to the Method page and check the Trends tab.');
}

main().catch(console.error);
