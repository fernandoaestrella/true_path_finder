# Deploy to Vercel

Quick guide to deploy True Path Finder to Vercel.

---

## 1. Install Vercel CLI (Optional)

```powershell
npm i -g vercel
```

---

## 2. Deploy via Vercel Dashboard (EASIEST)

### First Time Setup

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended) or email
3. Click **Add New Project**
4. Import your GitHub repository:
   - If not on GitHub yet, push your code:
     ```powershell
     git add .
     git commit -m "Initial commit"
     git push origin main
     ```
   - Or click **Import Git Repository** and paste your repo URL

5. **Configure Project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `.next` (auto-filled)

6. **Add Environment Variables:**
   Click **Environment Variables** and add each from your `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_FIREBASE_DATABASE_URL
   ```

7. Click **Deploy**

### Done!
- Your app deploys in ~2 minutes
- You get a URL like `true-path-finder.vercel.app`
- Every git push auto-deploys

---

## 3. Update Firebase Auth Domain

After deployment, add your Vercel domain to Firebase:

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click **Add domain**
3. Add your Vercel URL: `your-app.vercel.app`

---

## 4. CLI Deployment (Alternative)

If you prefer CLI:

```powershell
# First time
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: true-path-finder
# - Which directory? ./ 
# - Auto-detected Next.js? Yes
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# (paste value, repeat for each env var)

# Deploy to production
vercel --prod
```

---

## Auto-Deploy on Push

Vercel automatically deploys when you push to GitHub:
- **Push to `main`** → Production deployment
- **Push to other branches** → Preview deployment

---

## Local Testing Before Deploy

```powershell
npm run build
npm start
# Test at http://localhost:3000
```

---

## Benefits vs Firebase Hosting

✅ Handles dynamic routes automatically  
✅ Server-side rendering (if needed later)  
✅ Automatic HTTPS  
✅ Global CDN  
✅ Auto-deploys from Git  
✅ **Firebase backend still works perfectly** (no changes needed)
