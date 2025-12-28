# Firebase Setup Guide

Quick guide to set up Firebase for True Path Finder.

---

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → Name it `true-path-finder`
3. Disable Google Analytics (not needed for MVP)
4. Click **Create project**

---

## 2. Enable Services in Firebase Console

### Authentication
1. Go to **Build → Authentication → Get Started**
2. Enable **Email/Password** sign-in method

### Firestore
1. Go to **Build → Firestore Database → Create Database**
2. Select **Production mode**
3. Choose region closest to your users (e.g., `us-east1`)

### Realtime Database
1. Go to **Build → Realtime Database → Create Database**
2. Select **Locked mode** (we'll add rules later)
3. Choose same region as Firestore

---

## 3. Get Firebase Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → Click **Web** (</> icon)
3. Register app name: `true-path-finder-web`
4. Copy the `firebaseConfig` object - you'll need it for `.env.local`

---

## 4. Install Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
```

---

## 5. Run `firebase init`

Run this command and answer each question as shown:

```powershell
cd c:\Users\Admin\development\true_path_finder
firebase init
```

### Question-by-Question Answers:

| Question | Answer |
|----------|--------|
| **Are you ready to proceed?** | `Yes` |
| **Which Firebase features?** | Select with Space: `Firestore`, `Functions`, `Hosting`, `Realtime Database` → Enter |
| **Use existing project or create?** | `Use an existing project` |
| **Select project** | Choose `true-path-finder` |

#### Firestore Setup
| Question | Answer |
|----------|--------|
| **What file for Firestore Rules?** | `firebase/firestore.rules` |
| **What file for Firestore indexes?** | `firestore.indexes.json` (default) |

#### Functions Setup
| Question | Answer |
|----------|--------|
| **What language for Cloud Functions?** | `TypeScript` |
| **Use ESLint?** | `Yes` |
| **Install dependencies now?** | `Yes` |

#### Hosting Setup
| Question | Answer |
|----------|--------|
| **What is your public directory?** | `out` |
| **Configure as single-page app?** | `No` (Next.js handles routing) |
| **Set up automatic builds with GitHub?** | `Yes` (optional, but recommended) |
| **GitHub repository** | `your-username/true_path_finder` |
| **Set up workflow for PRs?** | `Yes` |
| **Build script before deploy?** | `npm ci && npm run build` |
| **Auto deploy on merge to main?** | `Yes` |
| **Branch for live channel?** | `main` |

#### Realtime Database Setup
| Question | Answer |
|----------|--------|
| **What file for Database Rules?** | `firebase/database.rules.json` |

---

## 6. Create `.env.local`

Copy `.env.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=true-path-finder.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=true-path-finder
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=true-path-finder.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://true-path-finder-default-rtdb.firebaseio.com
```

---

## 7. Deploy Rules

```powershell
firebase deploy --only firestore:rules,database
```

---

## Troubleshooting

**"API not enabled" error for Realtime Database**:
1. Go to Firebase Console → Build → Realtime Database
2. Click "Create Database" if not done already
3. Wait a minute for API to propagate, then retry

**Free Plan Note**: Firebase Spark (free) allows hosting multiple sites using [hosting targets](https://firebase.google.com/docs/hosting/multisites).
