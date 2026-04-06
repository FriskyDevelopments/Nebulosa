# 🚂 NEBULOSA RAILWAY DEPLOYMENT

## 🔐 Railway Token Configuration

**Project Token**: `<YOUR_RAILWAY_TOKEN>`

---

## 🚀 Quick Deploy Commands

### Method 1: Automated Script
```bash
./deploy-nebulosa-railway.sh
```

### Method 2: Manual Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login with your token
railway login --token <YOUR_RAILWAY_TOKEN>

# Deploy
railway up
```

---

## ⚙️ Environment Variables Setup

Set these in Railway dashboard or via CLI:

```bash
# Required Environment Variables
railway variables set BOT_TOKEN="your_telegram_bot_token"
railway variables set ZOOM_CLIENT_ID="vGVyI0IRv6si45iKO_qIw"
railway variables set ZOOM_CLIENT_SECRET="your_zoom_client_secret"
railway variables set ZOOM_SECRET_TOKEN="your_zoom_secret_token"
railway variables set PORT="3000"

# Auto-configured
railway variables set ZOOM_REDIRECT_URI="https://nebulosa-production.railway.app/auth/zoom/callback"
```

---

## 🌐 Expected Railway URLs

- **Main App**: `https://nebulosa-production.railway.app`
- **OAuth Callback**: `https://nebulosa-production.railway.app/auth/zoom/callback`
- **Health Check**: `https://nebulosa-production.railway.app/health`

---

## 📊 Monitoring Commands

```bash
# View deployment logs
railway logs --follow

# Check service status
railway status

# View environment variables
railway variables

# Connect to shell
railway shell
```

---

## 🎯 Deployment Features

✅ **Automatic Detection**: Railway detects Node.js  
✅ **Auto-Scaling**: Scales based on usage  
✅ **HTTPS**: Free SSL certificate  
✅ **Git Integration**: Deploy on push  
✅ **Environment Management**: Secure variable storage  
✅ **Monitoring**: Built-in logs and metrics  

---

## 🔧 Project Structure

```
Nebulosa-1/
├── production-bot.js      # Main bot application
├── package-bot.json       # Dependencies (copied to package.json)
├── railway.json          # Railway configuration
├── Dockerfile            # Container setup
├── .dockerignore         # Build optimization
└── deploy-nebulosa-railway.sh  # Automated deployment
```

---

## 💰 Cost Estimate

- **Railway Hobby Plan**: $5/month
- **Free Credit**: $5/month (first month free!)
- **Usage-Based**: Pay only for what you use
- **Auto-Sleep**: Saves money during idle periods

---

## 🎉 After Deployment

1. **Test Bot Commands**:
   - Send `/start` to your bot
   - Verify all 17 commands work
   - Check `/botstatus`

2. **Update Zoom App**:
   - Set redirect URI to Railway URL
   - Wait for app approval (24-72h)
   - Test OAuth flow

3. **Monitor Performance**:
   - Check Railway dashboard
   - View real-time logs
   - Monitor resource usage

---

## 🐛 Troubleshooting

### Common Issues:

1. **Token Authentication Failed**
   ```bash
   railway logout
   railway login --token <YOUR_RAILWAY_TOKEN>
   ```

2. **Deployment Failed**
   ```bash
   railway logs
   # Check for missing environment variables
   ```

3. **Bot Not Responding**
   ```bash
   railway status
   # Verify BOT_TOKEN is set correctly
   ```

### Debug Commands:
```bash
# Full deployment logs
railway logs --tail 100

# Environment check
railway variables

# Service health
railway status --json
```

---

## 🚀 Ready to Deploy!

Your Nebulosa bot is configured and ready for Railway deployment with token:
**`<YOUR_RAILWAY_TOKEN>`**

Run: `./deploy-nebulosa-railway.sh` to deploy automatically! 🎯
