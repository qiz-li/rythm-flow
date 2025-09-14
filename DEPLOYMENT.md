# Rhythm Flow - Deployment Guide

This guide covers how to deploy Rhythm Flow to production. The app consists of two parts:
- **Frontend**: React/Vite app (deploy to Vercel)
- **Backend**: Socket.IO server (deploy to Railway, Render, or similar)

## 🚀 Quick Deploy

### Option 1: Deploy to Vercel + Railway (Recommended)

#### Step 1: Deploy Backend to Railway

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Deploy from GitHub**:
   - Connect your GitHub repo
   - Select only the `/server` folder for deployment
   - Railway will auto-detect the Node.js app

3. **Configure Environment**:
   ```bash
   NODE_ENV=production
   PORT=3001  # Railway will override this
   ```

4. **Get your server URL**: Railway will provide a URL like `https://your-app.up.railway.app`

#### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up
2. **Deploy from GitHub**:
   - Connect your GitHub repo
   - Vercel will auto-detect the Vite app
   - Use the root directory (not `/server`)

3. **Configure Environment Variables** in Vercel dashboard:
   ```bash
   VITE_SOCKET_URL=wss://your-railway-app.up.railway.app
   VITE_OPENAI_API_KEY=your_openai_key_here  # Optional
   ```

4. **Deploy**: Vercel will build and deploy automatically

### Option 2: Deploy to Vercel + Render

#### Deploy Backend to Render

1. **Create Render Account**: Go to [render.com](https://render.com)
2. **Create Web Service**:
   - Connect GitHub repo
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**:
   ```bash
   NODE_ENV=production
   ```

#### Deploy Frontend to Vercel
Same as Option 1, but use your Render URL:
```bash
VITE_SOCKET_URL=wss://rhythm-flow-server.onrender.com
```

## 🔧 Manual Deployment

### Backend Deployment

The server can be deployed to any Node.js hosting platform:

**Supported Platforms:**
- ✅ Railway (recommended)
- ✅ Render
- ✅ Heroku
- ✅ DigitalOcean App Platform
- ✅ Any Docker-compatible platform

**Requirements:**
- Node.js 18+
- Support for WebSocket connections
- HTTP/HTTPS endpoints

**Environment Variables:**
```bash
NODE_ENV=production
PORT=3001  # Most platforms override this
```

### Frontend Deployment

**Supported Platforms:**
- ✅ Vercel (recommended)
- ✅ Netlify
- ✅ Cloudflare Pages
- ✅ GitHub Pages (with routing config)

**Build Configuration:**
```bash
npm run build
# Output directory: dist/
```

**Environment Variables:**
```bash
VITE_SOCKET_URL=wss://your-server-domain.com
VITE_OPENAI_API_KEY=sk-...  # Optional for fallback transcription
```

## 🌐 Domain Configuration

### Custom Domains

1. **Backend**: Add your custom domain to your server platform
2. **Frontend**: Add your custom domain to Vercel
3. **Update CORS**: Modify `server/index.js` CORS origins to include your domain:

```javascript
origin: [
  "https://yourdomain.com",
  "https://www.yourdomain.com"
]
```

### SSL/HTTPS

- Both Vercel and Railway/Render provide automatic HTTPS
- Use `wss://` (not `ws://`) for WebSocket connections in production
- Web Speech API requires HTTPS for microphone access

## 🔐 Security Considerations

### API Keys

- **OpenAI API Key**: Optional, only for fallback transcription
- **Never commit API keys** to Git
- Use environment variables in production
- Consider server-side transcription for production apps

### CORS Configuration

- Update server CORS origins for your production domains
- Remove localhost origins in production
- Use specific domains instead of wildcards when possible

### WebSocket Security

- Use WSS (secure WebSocket) in production
- Configure proper CORS origins
- Consider rate limiting for production

## 🧪 Testing Deployment

### Frontend Testing
```bash
# Test build locally
npm run build
npm run preview
```

### Backend Testing
```bash
# Test server locally
cd server
npm start

# Test health endpoint
curl http://localhost:3001/health
```

### Integration Testing
1. Deploy backend first and note the URL
2. Update `VITE_SOCKET_URL` in frontend environment
3. Deploy frontend
4. Test real-time features between multiple browser tabs

## 🚨 Troubleshooting

### Common Issues

**WebSocket Connection Failed**:
- Check `VITE_SOCKET_URL` is correct and uses `wss://`
- Verify server is running and accessible
- Check browser developer console for errors

**Microphone Not Working**:
- Ensure site is served over HTTPS
- Check browser permissions
- Verify Web Speech API support (Chrome/Edge recommended)

**CORS Errors**:
- Add your frontend domain to server CORS configuration
- Check both HTTP and HTTPS versions
- Verify WebSocket and HTTP origins match

**Build Errors**:
- Check all environment variables are set
- Verify Node.js version compatibility
- Run `npm run typecheck` to check TypeScript errors

### Performance Optimization

**Frontend**:
- Enable gzip compression (automatic on Vercel)
- Use CDN for assets (automatic on Vercel)
- Configure proper caching headers

**Backend**:
- Use process manager like PM2 for production
- Configure proper logging
- Set up monitoring and health checks
- Consider horizontal scaling for high traffic

## 📊 Monitoring

### Health Checks

Backend provides health endpoints:
- `GET /health` - Server status and metrics
- `GET /` - Basic server information

### Logging

Monitor these logs in production:
- WebSocket connections/disconnections
- Session creation and management
- Transcription service usage
- Error rates and performance metrics

## 🔄 Updates

### Automated Deployment

Both Vercel and Railway support automatic deployment from Git:
- Push to `main` branch triggers deployment
- Environment variables persist between deployments
- Rollback available through platform dashboards

### Manual Updates

1. **Backend**: Push changes, platform auto-deploys
2. **Frontend**: Push changes, Vercel auto-deploys
3. **Environment**: Update through platform dashboards

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Docs**: Check the main README.md
- **Platform Docs**:
  - [Vercel Docs](https://vercel.com/docs)
  - [Railway Docs](https://docs.railway.app)
  - [Render Docs](https://render.com/docs)