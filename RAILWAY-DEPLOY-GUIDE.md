# 🚂 NEBULOSA RAILWAY DEPLOYMENT

## 🔐 Authentication Required
**Railway Token**: `<YOUR_RAILWAY_TOKEN>`
**Pairing Code**: `teal-thorough-mindfulness`  
**Login URL**: https://railway.com/cli-login?d=d29yZENvZGU9dGVhbC10aG9yb3VnaC1taW5kZnVsbmVzcyZob3N0bmFtZT1mcmlza3ktZ2hvc3Q=

---

## 🚀 **DEPLOY WITHOUT CLI (RECOMMENDED)**

### **Method 1: GitHub Integration** ⭐
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - ✅ Railway auto-detects Node.js!

3. **Set Environment Variables** (in Railway dashboard):
   ```env
   BOT_TOKEN=your_telegram_bot_token
   ZOOM_CLIENT_ID=vGVyI0IRv6si45iKO_qIw
   ZOOM_CLIENT_SECRET=your_zoom_client_secret
   ZOOM_SECRET_TOKEN=your_zoom_secret_token
   ZOOM_REDIRECT_URI=https://your-app.railway.app/auth/zoom/callback
   PORT=3000
   ```

### **Method 2: Direct Upload**
1. **Create Railway Account**: Sign up at railway.app
2. **New Project**: Click "Deploy Now"
3. **Upload Files**: Drag and drop your project folder
4. **Auto-Deploy**: Railway handles the rest!

---

## 🎯 **DEPLOYMENT FILES READY**

✅ `production-bot.js` - Main Telegram bot (17 commands)  
✅ `package-bot.json` - Node.js dependencies  
✅ `railway.json` - Railway configuration  
✅ `Dockerfile` - Container setup  
✅ `.dockerignore` - Build optimization  

---

## 💰 **RAILWAY PRICING**

- **Free Credit**: $5/month
- **Usage-Based**: Pay only for what you use
- **Bot Hosting**: ~$3-5/month estimated
- **Auto-Sleep**: Saves money during idle periods

---

## 🎉 **AFTER DEPLOYMENT**

Your bot will be live at:
- **URL**: `https://nebulosa-production.railway.app`
- **OAuth**: `https://nebulosa-production.railway.app/auth/zoom/callback`

### **Test Your Bot**:
1. Find your bot on Telegram
2. Send `/start` command
3. Try `/botstatus` for status
4. Use `/zoomlogin` after Zoom approval

---

## 🔧 **CLI LOGIN (ALTERNATIVE)**

If you want to use Railway CLI:

1. **Complete Login**:
   - Visit: https://railway.com/cli-login?d=d29yZENvZGU9dGVhbC10aG9yb3VnaC1taW5kZnVsbmVzcyZob3N0bmFtZT1mcmlza3ktZ2hvc3Q=
   - Enter pairing code: `teal-thorough-mindfulness`

2. **Deploy via CLI**:
   ```bash
   railway up
   ```

---

## 🎯 **NEXT STEPS**

1. ✅ **Deploy on Railway** (GitHub method recommended)
2. ⚙️ **Set environment variables**
3. 🧪 **Test bot commands**
4. 🔄 **Update Zoom OAuth redirect URI**
5. ⏳ **Wait for Zoom app approval**
6. 🎉 **Launch to users!**

---

## 📊 **BOT FEATURES READY**

Your Nebulosa bot includes:
- 🔐 Zoom OAuth integration
- 🎥 Meeting creation & management
- 👥 Real-time participant monitoring
- 🤖 Browser automation (multipin)
- 💬 17 Telegram commands
- 🌐 Bilingual support
- 👑 Admin controls
- 📊 Usage analytics

**Railway is the perfect platform for your $5/month bot hosting!** 🚂✨

---

*Railway deployment ready - choose GitHub integration for easiest setup!*
