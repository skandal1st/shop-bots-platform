# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Development vs Production

**This is a development machine.** The actual project runs on a **separate production server**.
- Do NOT try to run/start/restart Docker, services, or the project locally
- After making code changes, provide instructions for the user to deploy on the server
- To deploy changes: `git push`, then on server: `git pull && docker-compose build --no-cache && docker-compose up -d`

## Project Overview

Sellio is a platform for creating Telegram shop bots without coding. Users can sell physical goods, digital products, and services through Telegram bots with a web admin panel.

**Website:** https://getsellio.ru

## Tech Stack

- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Frontend:** Next.js 14 + React 18 + Ant Design + React Hook Form
- **Bot:** node-telegram-bot-api with multi-bot management
- **Monorepo:** npm workspaces (backend, frontend, bot)

## Common Commands

```bash
# Install all dependencies
npm run install:all

# Development (runs all services concurrently)
npm run dev

# Run individual services
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :3000
npm run dev:bot        # Telegram bots

# Build
npm run build

# Database
cd backend
npx prisma migrate dev       # Run migrations
npx prisma studio            # Database GUI
npx prisma generate          # Regenerate client

# Docker (on production server)
docker-compose up -d                          # Production
docker-compose -f docker-compose.dev.yml up   # Development
docker-compose build --no-cache               # Rebuild without cache
```

## Architecture

### Multi-Service Structure

```
sellio/
├── backend/     # Express API server (:3001)
├── frontend/    # Next.js admin panel (:3000)
├── bot/         # Multi-bot Telegram manager
├── miniapp/     # Telegram Mini App (static HTML/JS catalog)
└── uploads/     # User-uploaded files (images, digital content)
```

### Backend API Routes

All routes prefixed with `/api/`:
- `/auth` - JWT authentication
- `/bots` - Bot CRUD, requires auth
- `/products`, `/categories`, `/orders`, `/customers` - CRUD operations
- `/public` - Public endpoints for bots (no auth required)
- `/subscriptions`, `/webhooks/yookassa` - Payment/subscription handling
- `/admin` - Superadmin endpoints

### Multi-Bot Architecture

The `bot/` module manages multiple Telegram bots dynamically:
- `BotManager` loads active bots from database every 30 seconds
- Each `ShopBot` instance handles one Telegram bot with polling
- Bots communicate with backend via REST API at `/api/public/*`

### Database Schema

Key models in `backend/prisma/schema.prisma`:
- `User` - Platform users (shop owners)
- `Bot` - Telegram bots with tokens
- `Product` - Three types: PHYSICAL, DIGITAL, SERVICE
- `DigitalContent` - Keys/files for digital products
- `Customer` - Bot customers (Telegram users)
- `Order` - Orders with status history
- `Subscription/Payment` - YooKassa integration

### Frontend Structure

- `/app/dashboard` - Main dashboard
- `/app/bots` - Bot management
- `/app/products`, `/orders`, `/customers`, `/categories` - CRUD pages
- `/app/broadcasts` - Mass messaging
- `/app/subscription` - Premium plans
- `/lib/api.ts` - Axios instance with auth interceptors

## Environment Variables

Backend (`backend/.env`):
```
DATABASE_URL="postgresql://user:password@localhost:5432/sellio"
JWT_SECRET="..."
PORT=3001
YOOKASSA_SHOP_ID="..."
YOOKASSA_SECRET_KEY="..."
```

Frontend (`frontend/.env`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Bot (`bot/.env`):
```
API_URL=http://localhost:3001
```

## Key Patterns

- All API responses follow format: `{ data: ..., message?: string }`
- Authentication via JWT Bearer token in Authorization header
- Bot tokens stored encrypted in database
- Product images stored in `/uploads/` with URLs like `/uploads/products/...`
- Digital products support text keys (one-time delivery) or files
