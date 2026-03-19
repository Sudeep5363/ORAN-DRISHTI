# Deployment Guide

## 🚀 Deploy Oran-Drishti to Production

This guide covers deploying Oran-Drishti to various platforms.

---

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured in `.env`
- [ ] Dependencies installed: `npm install`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] Tests pass (if applicable)
- [ ] README and docs updated

---

## 🔧 Build for Production

```bash
# Build the optimized bundle
npm run build

# The output is in the 'dist/' folder
```

---

## ☁️ Deployment Options

### Option 1: Vercel (Recommended for React apps)

**Advantages**: Free tier, automatic deployments, fast CDN, zero config

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to connect your GitHub repository
```

**Configuration** (vercel.json):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Option 2: Netlify

**Advantages**: Free tier, excellent React support, form handling

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Or connect GitHub for automatic deployments:**
1. Go to netlify.com
2. Connect GitHub account
3. Select repository
4. Set build command: `npm run build`
5. Set publish directory: `dist`

### Option 3: GitHub Pages

**Advantages**: Free, tight GitHub integration

```bash
# Add to package.json
"deploy": "npm run build && npx gh-pages -d dist"

# Deploy
npm run deploy
```

**Note**: Requires repository on GitHub with gh-pages branch

### Option 4: Docker (For Advanced Users)

**Create `Dockerfile`**:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Build and run**:
```bash
docker build -t oran-drishti .
docker run -p 3000:3000 oran-drishti
```

### Option 5: AWS S3 + CloudFront

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## 🐍 Backend Deployment (Python)

### Option 1: Streamlit Cloud (Simple)

```bash
git push to GitHub
# Visit share.streamlit.io and deploy from repo
```

### Option 2: Heroku

```bash
# Create Procfile
echo "web: streamlit run oran_drishti_realtime/app.py" > Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### Option 3: DigitalOcean App Platform

1. Create DigitalOcean account
2. Connect GitHub repository
3. Select branch to deploy
4. Set environment variables
5. Deploy automatically

---

## 🔐 Production Environment Variables

Create `.env.production` with sensitive data:

```env
VITE_API_KEY=prod_key_xxx
VITE_API_BASE_URL=https://api.oran-drishti.com
VITE_STAC_API_URL=https://earth-search.aws.element84.com/v1
VITE_ENABLE_REAL_TIME_MONITORING=true
VITE_ENABLE_ALERTS=true
```

**Never commit `.env.production` to Git!**

---

## 📊 Performance Optimization

### Frontend

```bash
# Analyze bundle size
npm install -g webpack-bundle-analyzer
npm run build -- --report
```

**Optimization tips**:
- Use code splitting for large components
- Lazy load maps and charts
- Enable gzip compression in server
- Cache static assets

### Backend

- Use Python async/await
- Cache satellite data requests
- Use connection pooling
- Monitor API rate limits

---

## 🔍 Monitoring & Logging

### Recommended Tools

| Tool | Purpose | Free Tier |
|------|---------|-----------|
| Sentry | Error tracking | Yes |
| LogRocket | Frontend monitoring | Yes |
| New Relic | Performance | Yes (limited) |
| Datadog | Full observability | No |

### Setup Sentry (Error Tracking)

```bash
npm install @sentry/react @sentry/tracing

# In App.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 1.0,
});
```

---

## 🆘 Troubleshooting Deployment

| Issue | Solution |
|-------|----------|
| Build fails | Check `npm run lint`, ensure all dependencies installed |
| 404 errors | Check `.env` API URLs, verify CORS settings |
| Slow loading | Optimize bundle, enable caching, use CDN |
| Data not loading | Verify satellite API credentials, check STAC endpoint |
| Memory issues | Check for memory leaks, profile with DevTools |

---

## 📈 Scaling for Traffic

1. **CDN distribution** – CloudFront, Cloudflare, Akamai
2. **Load balancing** – Nginx, HAProxy
3. **Database caching** – Redis, Memcached
4. **API caching** – Response caching headers
5. **Async processing** – Queue long-running jobs (Celery, Bull)

---

## 🔄 Continuous Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run linter
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 📞 Support & Rollback

### If Deployment Goes Wrong

```bash
# Rollback to previous version
git revert HEAD
git push
# Redeploy with previous build

# Or manually revert on hosting platform
# (Usually one-click rollback available)
```

---

## 🎓 Resources

- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [GitHub Pages Guide](https://pages.github.com/)
- [Docker Best Practices](https://docs.docker.com/)

---

**Your Oran-Drishti instance is now live! 🚀🌿**
