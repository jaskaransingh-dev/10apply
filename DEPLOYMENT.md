# Deployment Guide: rec / Cross Hiring Marketplace

This repository contains the full stack application:
- **Frontend**: Next.js 14 (`frontend/`) with Tailwind CSS, Lucide icons, and zero-emoji design system.
- **Backend**: FastAPI (`backend/`) with deterministic 5-component matching engine, SQLite/PostgreSQL storage, and transactional mailer.

---

## 1. Vercel Deployment (Frontend)

The frontend is configured and optimized for Vercel.

### Quick Deploy via Vercel CLI
```bash
# Deploy to preview
vercel deploy frontend --yes

# Deploy to production
vercel deploy frontend --prod --yes
```

### Environment Variables on Vercel
Set the following environment variable in the Vercel Dashboard or CLI:
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API` | Base URL of the backend API | `https://api.yourdomain.com` (or local `http://127.0.0.1:8000`) |

### Configuration File (`frontend/vercel.json`)
```json
{
  "framework": "nextjs"
}
```

---

## 2. Cloudflare Deployment

The platform is equipped with `wrangler.toml` for Cloudflare Pages or Cloudflare Workers.

### Option A: Cloudflare Pages (Recommended)
1. **Build the Next.js static output**:
   ```bash
   cd frontend
   npm run build
   ```
2. **Deploy with Wrangler**:
   ```bash
   # Login to Cloudflare (one-time)
   wrangler login

   # Deploy the build directory to Cloudflare Pages
   wrangler pages deploy frontend/.next --project-name rec-marketplace
   ```
   Or set `CLOUDFLARE_API_TOKEN` in your environment and run:
   ```bash
   CLOUDFLARE_API_TOKEN="your_token_here" wrangler pages deploy frontend/.next --project-name rec-marketplace
   ```

### Option B: Cloudflare Pages Git Integration
1. Push this repository to GitHub.
2. In the Cloudflare Dashboard, go to **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Select this repository and set:
   - **Framework preset**: `Next.js`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Environment variable**: `NEXT_PUBLIC_API = https://api.yourdomain.com`

---

## 3. Backend Deployment (FastAPI)

The backend runs as a high-performance ASGI application with Uvicorn:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
Deploy the container to any host (e.g., Fly.io, Render, Railway, AWS ECS, or DigitalOcean) and update `NEXT_PUBLIC_API` on Vercel and Cloudflare to point to your live backend domain.
