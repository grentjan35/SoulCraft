# 🏰 Medieval Battle Arena - Render.com Deployment Guide

This guide will walk you through deploying your Medieval Battle Arena game to Render.com for free hosting.

## 📋 Prerequisites

- A GitHub account
- A Render.com account (sign up at https://render.com)
- Your game code pushed to a GitHub repository

## 🚀 Deployment Steps

### 1. Push Your Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Render deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy on Render.com

#### Option A: Using render.yaml (Recommended)

1. Go to https://render.com/dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to deploy

#### Option B: Manual Setup

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: medieval-battle-arena (or your preferred name)
   - **Environment**: Node
   - **Region**: Oregon (or closest to you)
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Click "Create Web Service"

### 3. Environment Variables (Optional)

If needed, you can add these in the Render dashboard under "Environment":
- `NODE_ENV`: production

### 4. Wait for Deployment

- First deployment takes 2-5 minutes
- Render will automatically install dependencies and start your server
- You'll get a URL like: `https://medieval-battle-arena.onrender.com`

## 🎮 Accessing Your Game

Once deployed, you can access:
- **Main Game**: `https://your-app-name.onrender.com`
- **Dev Tools**: `https://your-app-name.onrender.com/devtools.html`
- **Health Check**: `https://your-app-name.onrender.com/health`

## ⚠️ Important Notes

### Free Tier Limitations

1. **Cold Starts**: After 15 minutes of inactivity, the server will sleep. First request will take 30-60 seconds to wake up.
2. **750 hours/month**: Free tier gives you 750 hours of runtime per month.
3. **Read-Only Filesystem**: Changes to hitboxes via dev tools will be kept in memory but won't persist after restart.

### Solutions for Cold Starts

1. Use a service like UptimeRobot (https://uptimerobot.com) to ping your app every 5 minutes
2. Upgrade to a paid plan ($7/month) for always-on hosting

## 🔧 Troubleshooting

### Build Fails

- Check that `package.json` has correct dependencies
- Ensure Node version is compatible (>= 18.0.0)
- Check Render logs for specific error messages

### WebSocket Connection Issues

- Render automatically handles WebSockets
- Make sure Socket.IO is using both websocket and polling transports (already configured)
- Check browser console for connection errors

### Game Not Loading

- Verify the health endpoint: `https://your-app-name.onrender.com/health`
- Check Render logs for errors
- Ensure all files are committed to GitHub

## 📦 What's Configured

Your game is already configured with:

✅ Port configuration via `process.env.PORT`  
✅ Static file serving from `public/` folder  
✅ Socket.IO with proper CORS and transport settings  
✅ Health check endpoint at `/health`  
✅ Graceful shutdown handling  
✅ Production-ready error handling  
✅ Dev tools accessible at `/devtools.html`  
✅ Hitbox API endpoints  

## 🎯 Testing Locally Before Deploy

```bash
# Install dependencies
npm install

# Start server
npm start

# Visit in browser
http://localhost:3000
```

## 🔄 Updating Your Deployed Game

Every time you push to GitHub:

```bash
git add .
git commit -m "Your update message"
git push
```

Render will automatically:
1. Detect the changes
2. Rebuild your application
3. Deploy the new version

## 🌐 Custom Domain (Optional)

1. Go to your Render dashboard
2. Select your service
3. Go to "Settings" → "Custom Domain"
4. Follow instructions to add your domain

## 📞 Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com

## 🎮 Share Your Game!

Once deployed, share your Render URL with friends to play together!

**Example**: `https://medieval-battle-arena.onrender.com`

---

Made with ⚔️ for epic medieval battles!
