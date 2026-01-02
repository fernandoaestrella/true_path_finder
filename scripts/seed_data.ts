/**
 * Seed Data Script - Generates Goals, Methods, Reviews, and Events
 * Run with: npx tsx scripts/seed_data.ts
 * 
 * All content is marked with [AI GENERATED] for clarity.
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

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const AI_TAG = '[AI GENERATED]';

// ============================================================================
// Firestore Helpers
// ============================================================================

interface FirestoreValue {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
    timestampValue?: string;
    mapValue?: { fields: Record<string, FirestoreValue> };
    arrayValue?: { values: FirestoreValue[] };
}

function toFirestoreValue(value: any): FirestoreValue {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(v => toFirestoreValue(v)) } };
    }
    if (typeof value === 'object' && value !== null) {
        const fields: Record<string, FirestoreValue> = {};
        for (const [k, v] of Object.entries(value)) {
            fields[k] = toFirestoreValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

// ============================================================================
// API Functions
// ============================================================================

async function createUser(email: string, password: string): Promise<{ uid: string; idToken: string } | null> {
    try {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const data = await res.json();
        if (data.error) {
            console.log(`    Auth error: ${data.error.message}`);
            return null;
        }
        return { uid: data.localId, idToken: data.idToken };
    } catch (e: any) {
        console.log(`    Fetch error: ${e.message}`);
        return null;
    }
}

async function createDocument(idToken: string, collection: string, data: Record<string, any>): Promise<string | null> {
    try {
        const res = await fetch(`${FIRESTORE_URL}/${collection}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])) })
        });
        
        if (!res.ok) {
            const errText = await res.text();
            console.log(`    Firestore error: ${errText.substring(0, 200)}`);
            return null;
        }
        
        const result = await res.json();
        // Extract document ID from name like "projects/.../documents/goals/ABC123"
        const docId = result.name?.split('/').pop() || null;
        return docId;
    } catch (e: any) {
        console.log(`    Fetch error: ${e.message}`);
        return null;
    }
}

// ============================================================================
// Seed Data Definitions
// ============================================================================

const GOALS = [
    { title: `${AI_TAG} Improve Sleep Quality`, description: `${AI_TAG} Learn techniques to fall asleep faster and wake up refreshed.` },
    { title: `${AI_TAG} Build a Reading Habit`, description: `${AI_TAG} Develop a consistent habit of reading books regularly.` },
    { title: `${AI_TAG} Practice Mindfulness`, description: `${AI_TAG} Cultivate present-moment awareness through various practices.` },
];

const METHODS_PER_GOAL = [
    // For Sleep
    [
        { title: `${AI_TAG} 4-7-8 Breathing Technique`, description: `${AI_TAG} A breathing pattern that promotes relaxation before sleep.`, resources: [{ id: 'r1', title: 'Tutorial Video', url: 'https://example.com/478-breathing' }], suggestedMinimum: { type: 'days', value: 7 } },
        { title: `${AI_TAG} No Screens After 9 PM`, description: `${AI_TAG} Eliminate blue light exposure before bedtime.`, resources: [], suggestedMinimum: { type: 'days', value: 14 } },
    ],
    // For Reading
    [
        { title: `${AI_TAG} Read 20 Pages Daily`, description: `${AI_TAG} A simple daily target to build consistency.`, resources: [{ id: 'r2', title: 'Book Tracker App', url: 'https://example.com/tracker' }], suggestedMinimum: { type: 'days', value: 30 } },
    ],
    // For Mindfulness
    [
        { title: `${AI_TAG} 10-Minute Morning Meditation`, description: `${AI_TAG} Start each day with a brief meditation session.`, resources: [{ id: 'r3', title: 'Guided Audio', url: 'https://example.com/meditation' }], suggestedMinimum: { type: 'days', value: 21 } },
        { title: `${AI_TAG} Mindful Walking`, description: `${AI_TAG} Practice awareness during daily walks.`, resources: [], suggestedMinimum: { type: 'attempts', value: 10 } },
    ],
];

const REVIEW_TEXTS = [
    `${AI_TAG} This has been quite effective for me. Noticeable improvements after a few weeks.`,
    `${AI_TAG} Still getting the hang of it, but I see potential.`,
    `${AI_TAG} Fantastic results! Highly recommend giving it a real try.`,
    `${AI_TAG} Not sure if it's working yet, but staying consistent.`,
    `${AI_TAG} Life-changing. This genuinely improved my daily routine.`,
];

// ============================================================================
// Main Script
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   TRUE PATH FINDER - SEED DATA       ║');
    console.log('╚══════════════════════════════════════╝\n');
    
    if (!API_KEY || !PROJECT_ID) {
        console.error('ERROR: Missing env vars. Check .env.local');
        process.exit(1);
    }

    console.log(`Project: ${PROJECT_ID}\n`);

    // --- Create Users ---
    console.log('1. Creating test users...');
    const users: { email: string; password: string; uid: string; idToken: string }[] = [];
    
    for (let i = 1; i <= 3; i++) {
        const email = `seeduser${Date.now()}${i}@test.com`;
        const password = 'SeedPass123!';
        
        const result = await createUser(email, password);
        if (result) {
            users.push({ email, password, ...result });
            console.log(`   ✓ ${email}`);
        }
    }

    if (users.length === 0) {
        console.log('\n   No users created. Exiting.');
        process.exit(1);
    }

    console.log('\n   --- Credentials ---');
    users.forEach(u => console.log(`   ${u.email} / ${u.password}`));
    console.log('   -------------------\n');

    // We'll use the first user's token for creating shared content
    const primaryToken = users[0].idToken;
    const createdMethodIds: string[] = [];

    // --- Create Goals ---
    console.log('2. Creating goals...');
    const goalIds: string[] = [];
    
    for (const goalDef of GOALS) {
        const goalId = await createDocument(primaryToken, 'goals', {
            ...goalDef,
            createdBy: users[0].uid,
            createdAt: new Date(),
            groupId: 'general',
        });
        
        if (goalId) {
            goalIds.push(goalId);
            console.log(`   ✓ Goal: ${goalDef.title.substring(0, 40)}...`);
        }
    }

    // --- Create Methods ---
    console.log('\n3. Creating methods...');
    
    for (let i = 0; i < goalIds.length; i++) {
        const goalId = goalIds[i];
        const methods = METHODS_PER_GOAL[i] || [];
        
        for (const methodDef of methods) {
            const creatorIdx = Math.floor(Math.random() * users.length);
            const methodId = await createDocument(users[creatorIdx].idToken, 'methods', {
                ...methodDef,
                goalId,
                createdBy: users[creatorIdx].uid,
                createdAt: new Date(),
                stats: { activeUsers: 0, avgRating: 0, reviewCount: 0 },
            });
            
            if (methodId) {
                createdMethodIds.push(methodId);
                console.log(`   ✓ Method: ${methodDef.title.substring(0, 40)}...`);
            }
        }
    }

    // --- Create Reviews ---
    console.log('\n4. Creating reviews (with varied dates)...');
    
    for (const methodId of createdMethodIds) {
        // Each user writes 1-2 reviews for each method
        for (const user of users) {
            const numReviews = 1 + Math.floor(Math.random() * 2);
            
            for (let r = 0; r < numReviews; r++) {
                const daysAgo = Math.floor(Math.random() * 180);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                
                const score = 1 + Math.floor(Math.random() * 5);
                const content = REVIEW_TEXTS[Math.floor(Math.random() * REVIEW_TEXTS.length)];
                
                await createDocument(user.idToken, 'reviews', {
                    methodId,
                    userId: user.uid,
                    score,
                    content,
                    createdAt: date,
                    updatedAt: date,
                    metMinimum: daysAgo > 30,
                    attemptsSummary: { count: 5 + Math.floor(Math.random() * 20), totalDurationMinutes: 100 + Math.floor(Math.random() * 500) },
                });
            }
        }
        console.log(`   ✓ Reviews for method ${methodId.substring(0, 8)}...`);
    }

    // --- Create Events ---
    console.log('\n5. Creating events...');
    
    for (let i = 0; i < Math.min(3, createdMethodIds.length); i++) {
        const methodId = createdMethodIds[i];
        const creatorIdx = Math.floor(Math.random() * users.length);
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3 + Math.floor(Math.random() * 14));
        futureDate.setHours(10 + Math.floor(Math.random() * 10), 0, 0, 0);
        
        const eventId = await createDocument(users[creatorIdx].idToken, 'events', {
            methodId,
            title: `${AI_TAG} Practice Session ${i + 1}`,
            description: `${AI_TAG} Join us for a group practice session. All levels welcome.`,
            links: [],
            phases: {
                arrival: { durationSeconds: 300 },
                practice: { durationSeconds: 1800 },
                close: { durationSeconds: 300 },
            },
            startTime: futureDate,
            maxPerBatch: 21,
            createdBy: users[creatorIdx].uid,
        });
        
        if (eventId) {
            console.log(`   ✓ Event: Practice Session ${i + 1} on ${futureDate.toLocaleDateString()}`);
        }
    }

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║           SEED COMPLETE!             ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('\nRefresh your app to see the new content.');
}

main().catch(console.error);
