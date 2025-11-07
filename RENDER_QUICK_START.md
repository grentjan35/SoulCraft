# 🚀 Quick Start: Deploy to Render.com

## Step-by-Step Deployment

### 1️⃣ Push to GitHub

```bash
git init
git add .
git commit -m "Ready for Render deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2️⃣ Deploy on Render

1. Go to **https://render.com** and sign in
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render auto-detects `render.yaml` and deploys!
5. Wait 2-5 minutes for first deployment

### 3️⃣ Play Your Game!

Your URL: `https://medieval-battle-arena.onrender.com`

## ✅ Everything is Already Configured

- ✅ Port: `process.env.PORT || 3000`
- ✅ Static files served from `public/`
- ✅ Socket.IO with CORS
- ✅ Health check: `/health`
- ✅ Dev tools: `/devtools.html`
- ✅ Graceful shutdown
- ✅ Production error handling

## ⚠️ Free Tier Note

Server sleeps after 15 min of inactivity. First visit takes ~60 seconds to wake up.

## 🔄 Updates

Every push to GitHub auto-deploys:

```bash
git add .
git commit -m "Update game"
git push
```

## 📖 Full Guide

See `DEPLOYMENT.md` for complete instructions and troubleshooting.

---

**That's it! Your medieval battle arena is now live! ⚔️**
