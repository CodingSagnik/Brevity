# Brevity

A modern, privacy-first URL shortener with user authentication, analytics, and a Neo-Brutalist design language. Brevity transforms long URLs into concise, shareable links while providing registered users with detailed analytics and link management capabilities.

**Live Demo:** https://usebrevity.vercel.app

---

## Features

### Core URL Shortening
- Generate short, memorable 6-character identifiers for any URL
- Instant redirect with 302 Found status (ensuring analytics accuracy across sessions)
- Automatic URL validation using the WHATWG URL standard
- Anonymous URL shortening without registration

### User Authentication
- Secure user registration and login with JWT-based authentication
- Password hashing using bcryptjs (bcrypt algorithm)
- Stateless token-based sessions stored in browser localStorage
- Protected dashboard accessible only to authenticated users

### Analytics & Insights
- Real-time click tracking with timestamp and User-Agent capture
- Dashboard displaying:
  - Total URLs created by user
  - Total clicks across all user links
  - Average clicks per link
  - Detailed history of all shortened URLs with click counts
- Paginated link history with sorting and search capabilities
- Non-blocking analytics processing using Node.js event loop

### Performance & Reliability
- Redis caching layer with Cache-Aside pattern (5-minute TTL)
- MongoDB connection with automatic retry logic (5 attempts with 3-second delays)
- Increased DNS timeout (30 seconds) for reliable MongoDB Atlas SRV lookups
- Asynchronous analytics writes to prevent blocking main request-response cycle

### User Experience
- Responsive design optimized for desktop, tablet, and mobile
- Dark mode toggle with persistent localStorage preference
- Neo-Brutalist design aesthetic with bold borders and offset shadows
- Material UI component library for consistent interactions
- Copy-to-clipboard functionality for shortened URLs
- Loading states and error handling throughout

### Frontend Routing
- Vercel Edge Function rewrites route short IDs (/:shortId) to backend
- Seamless API proxying through Vercel (no additional domain needed)
- Single Page Application with client-side routing for dashboard and authentication

---

## Tech Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Caching:** Redis with ioredis driver
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **Utilities:** dotenv, nanoid, CORS
- **Container:** Docker and Docker Compose

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **UI Component Library:** Material UI (MUI)
- **Styling:** MUI System (sx prop with theme integration)
- **State Management:** React Context API (AuthContext, ThemeContext)
- **HTTP Client:** Fetch API
- **Container:** Docker with multi-stage build (Node.js build, Nginx serve)
- **Deployment:** Vercel Static Site

### Infrastructure
- **Backend Hosting:** Render (Docker Web Service)
- **Frontend Hosting:** Vercel (Static Site)
- **Database:** MongoDB Atlas (M0 free tier)
- **Cache:** Upstash Redis (serverless, free tier)
- **Short Domain:** Vercel rewrites from usebrevity.vercel.app

---

## Project Structure

```
link_management/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # Register, login routes
│   │   │   ├── url.controller.js         # URL shortening and redirection
│   │   │   └── dashboard.controller.js   # Analytics endpoints
│   │   ├── models/
│   │   │   ├── User.js                   # User schema (email, password)
│   │   │   ├── Url.js                    # Shortened URL schema
│   │   │   └── Analytics.js              # Click tracking schema
│   │   ├── middleware/
│   │   │   └── auth.middleware.js        # JWT verification
│   │   ├── services/
│   │   │   ├── cache.service.js          # Redis caching logic
│   │   │   └── analytics.service.js      # Analytics tracking
│   │   └── utils/
│   │       └── validators.js             # URL validation
│   ├── server.js                         # Express app entry point
│   ├── .env                              # Environment variables (local)
│   ├── Dockerfile                        # Multi-stage Docker build
│   ├── package.json                      # Dependencies
│   └── package-lock.json                 # Lock file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                # Top navigation with auth UI
│   │   │   ├── Dashboard.jsx             # Protected analytics dashboard
│   │   │   ├── AuthModal.jsx             # Login/register modal
│   │   │   └── ResultCard.jsx            # Shortened URL display
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # User auth state
│   │   │   └── ThemeContext.jsx          # Dark mode management
│   │   ├── config/
│   │   │   └── api.js                    # API base URL config
│   │   ├── App.jsx                       # Main app component
│   │   └── main.jsx                      # React entry point
│   ├── vercel.json                       # Vercel Edge rewrites config
│   ├── vite.config.js                    # Vite configuration
│   ├── index.html                        # HTML template
│   ├── Dockerfile                        # Multi-stage Docker build
│   ├── nginx.conf                        # Nginx config (local Docker)
│   ├── package.json                      # Dependencies
│   └── package-lock.json                 # Lock file
│
├── docker-compose.yml                    # Multi-service orchestration
└── render.yaml                           # Render Blueprint IaC config
```

---

## Local Development Setup

### Prerequisites
- Node.js v18 or later
- Docker and Docker Compose
- Git

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/CodingSagnik/Brevity.git
cd link_management

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

**Backend (`backend/.env`)**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://mongodb:27017/brevity
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=7d
BASE_URL=http://localhost:5000
CLIENT_ORIGIN=http://localhost:5173
CACHE_TTL_SECONDS=300
```

**Frontend (`frontend/.env.local`)**
```env
VITE_API_BASE=/api
```

### Step 3: Run with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173
- **MongoDB:** mongodb://localhost:27017
- **Redis:** redis://localhost:6379

### Step 4: Test the Application

1. Open http://localhost:5173 in your browser
2. Create a shortened URL (anonymous)
3. Register an account and create authenticated shortened URLs
4. Visit the dashboard to view analytics
5. Toggle dark mode and verify styling

---

## API Documentation

### Authentication

**POST /api/auth/register**
- Register a new user account
- Body: `{ email: string, password: string }`
- Returns: User object and JWT token

**POST /api/auth/login**
- Authenticate and receive JWT token
- Body: `{ email: string, password: string }`
- Returns: User object and JWT token

### URL Shortening

**POST /api/shorten**
- Create a shortened URL
- Header: `Authorization: Bearer <token>` (optional)
- Body: `{ url: string }`
- Returns: `{ shortId, shortUrl, originalUrl }`

**GET /:shortId**
- Redirect to original URL (proxied through Vercel)
- Response: 302 redirect to original URL
- Side effect: Analytics event recorded asynchronously

### Dashboard (Protected)

**GET /api/dashboard/stats**
- Requires authentication
- Returns: `{ totalUrls, totalClicks, avgClicksPerLink }`

**GET /api/dashboard/history?page=1&limit=10**
- Requires authentication
- Returns: Paginated list of user's shortened URLs with click counts

---

## Environment Variables

### Backend

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Express server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/brevity` |
| `REDIS_URL` | Redis connection URL | `rediss://default:token@host:6379` |
| `JWT_SECRET` | Secret key for token signing | 64-character hex string |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `BASE_URL` | Frontend domain for short link generation | `https://usebrevity.vercel.app` |
| `CLIENT_ORIGIN` | CORS origin for frontend requests | `https://usebrevity.vercel.app` |
| `CACHE_TTL_SECONDS` | Redis cache time-to-live | `300` |

### Frontend

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (optional, proxied via vercel.json) | `https://brevity-backend-sea3.onrender.com` |

---

## Deployment

### MongoDB Atlas Setup

1. Create free M0 cluster at https://cloud.mongodb.com
2. Create database user with secure password
3. Configure Network Access to allow `0.0.0.0/0`
4. Copy MongoDB URI connection string
5. Add to Render environment variables as `MONGO_URI`

### Upstash Redis Setup

1. Create serverless Redis instance at https://upstash.com
2. Select optimal region for latency
3. Copy Redis connection URL
4. Add to Render environment variables as `REDIS_URL`

### Render Backend Deployment

1. Connect GitHub repository to Render
2. Create new Web Service from `render.yaml` Blueprint
3. Set environment variables:
   - `MONGO_URI` (from MongoDB Atlas)
   - `REDIS_URL` (from Upstash)
   - `JWT_SECRET` (64-character hex: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
   - `BASE_URL` (your Vercel frontend URL)
   - `CLIENT_ORIGIN` (same as BASE_URL)
4. Deploy service (first deploy may take 5-10 minutes)

### Vercel Frontend Deployment

1. Connect GitHub repository to Vercel
2. Set Build settings:
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
   - Root directory: `frontend`
3. Deploy
4. Update Render `BASE_URL` to match Vercel domain
5. Redeploy Render backend

### Vercel Rewrites (vercel.json)

The `frontend/vercel.json` file automatically routes:
- `/api/*` to Render backend API
- `/:shortId` to Render backend redirect handler

No additional configuration needed after deployment.

---

## Architecture

### Caching Layer (Cache-Aside Pattern)

When a short link is accessed:

1. Check Redis cache for short ID
2. If found: return cached original URL and redirect (fast path)
3. If miss: query MongoDB, cache result with 5-minute TTL, redirect
4. Fail-open: if Redis is unavailable, gracefully fall through to MongoDB

Benefits:
- Reduces MongoDB queries for popular links
- Sub-millisecond response times for cached hits
- Transparent failover if cache is unavailable

### Authentication Flow

1. User registers or logs in → JWT token issued
2. Token stored in browser localStorage
3. Each API request includes `Authorization: Bearer <token>` header
4. Backend middleware verifies token and attaches userId to request
5. Dashboard routes check userId to ensure authorization

### Analytics Processing

When a short link is accessed:

1. Backend immediately returns 302 redirect (user sees result instantly)
2. Fire-and-forget event queued to update analytics asynchronously
3. Analytics worker increments clickCount and pushes clickEvent to MongoDB
4. No blocking of main request-response cycle (Node.js event loop)
5. User Agent and timestamp captured for each click

---

## Database Schemas

### User

```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  password: String (hashed with bcrypt),
  createdAt: Date
}
```

### Url

```javascript
{
  _id: ObjectId,
  originalUrl: String,
  shortId: String (unique, 6 chars),
  userId: ObjectId (optional, for registered users),
  createdAt: Date
}
```

### Analytics

```javascript
{
  _id: ObjectId,
  shortId: String (reference to Url.shortId),
  clickCount: Number,
  clickEvents: [
    {
      timestamp: Date,
      userAgent: String
    }
  ]
}
```

---

## Performance Considerations

- **DNS Resolution:** 30-second timeout for MongoDB Atlas SRV lookups (handles cold starts)
- **Connection Retry Logic:** 5 attempts with 3-second delays for resilient deployments
- **Redis Caching:** 5-minute TTL balances freshness with cache hit rate
- **Aggregation Pipelines:** MongoDB $group and $lookup operations minimize data transfer
- **Asynchronous Analytics:** Non-blocking writes using Node.js event loop
- **Frontend Optimization:**
  - Vite code splitting for faster initial loads
  - Material UI lazy component loading
  - Context API memoization to prevent unnecessary re-renders
  - Nginx compression in Docker build

---

## Security

- **Password Hashing:** bcryptjs with salt rounds = 10
- **JWT Signing:** HS256 algorithm with 64-character secret
- **CORS:** Restricted to configured CLIENT_ORIGIN
- **URL Validation:** WHATWG URL constructor prevents malformed URLs
- **Environment Variables:** Sensitive data never committed to repository
- **HTTPS:** Both Render and Vercel enforce SSL/TLS
- **Rate Limiting:** Consider implementing in production for abuse prevention

---

## Development

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run test
```

### Code Quality

```bash
# Lint backend
cd backend
npm run lint

# Lint frontend
cd frontend
npm run lint

# Format with Prettier
npm run format
```

### Building for Production

```bash
# Backend (Docker build)
cd backend
docker build -t brevity-backend .

# Frontend (Vite build)
cd frontend
npm run build
```

---

## Troubleshooting

### MongoDB Connection Error: `querySrv ENOTFOUND`

**Cause:** SRV DNS lookup failed or timed out  
**Solution:** Use standard `mongodb://` connection string instead of `mongodb+srv://`, or increase `serverSelectionTimeoutMS` to 30 seconds

### Redis Connection Refused

**Cause:** Upstash Redis URL incorrect or regional endpoint unreachable  
**Solution:** Copy URL from Upstash dashboard (ensure `rediss://` protocol for TLS), verify IP allowlist

### CORS Error: Cross-Origin Request Blocked

**Cause:** Frontend origin not in backend `CLIENT_ORIGIN`  
**Solution:** Update `CLIENT_ORIGIN` in Render environment to match Vercel domain

### Analytics Not Incrementing

**Cause:** Browser caching 301 Moved Permanently responses  
**Solution:** Backend returns 302 Found (non-cacheable) by default; verify in logs

### Short Links Not Working on Vercel

**Cause:** `vercel.json` rewrites not configured  
**Solution:** Ensure `frontend/vercel.json` exists and routes `/:shortId` to backend

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: describe feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Contact

For questions, issues, or feedback, please open an issue on GitHub or contact the maintainers.

**Repository:** https://github.com/CodingSagnik/Brevity

---

## Acknowledgments

- Material UI for React component library
- MongoDB Atlas for database hosting
- Upstash for serverless Redis
- Render for Docker deployment
- Vercel for frontend hosting
