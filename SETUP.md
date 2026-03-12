# Setup Instructions

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured

## Installation Steps

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd dashboard && npm install

# Backend dependencies
cd ../server && npm install
```

### 2. Database Setup

1. Create a PostgreSQL database
2. Copy `server/.env.example` to `server/.env` and configure:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/menu_management?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   PORT=5000
   FRONTEND_URL="http://localhost:3000"
   ```

3. Generate Prisma client and push schema:
   ```bash
   cd server
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

### 3. Environment Variables

**Server (`server/.env`):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS
- `TRANSLATION_API_KEY` - Optional, for AI translations
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 5242880 = 5MB)

**Frontend (`dashboard/.env.local`):**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:5000/api)

### 4. Run Development Servers

From the root directory:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

Or run separately:
```bash
# Terminal 1 - Frontend
cd dashboard && npm run dev

# Terminal 2 - Backend
cd server && npm run dev
```

### 5. Default Login Credentials

After running the seed script:
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change these credentials in production!**

## Project Structure

```
.
├── dashboard/          # Next.js frontend
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities, stores, API client
│   └── public/        # Static assets
├── server/             # Express backend
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── middleware/# Auth, validation
│   │   ├── config/    # Database, etc.
│   │   └── utils/     # Helpers
│   └── prisma/        # Database schema
└── templates/         # HTML menu templates (future)
```

## What's Implemented (Phase 1)

✅ **Backend:**
- Express.js server with TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication
- Complete REST API for:
  - Authentication (login, logout, current user)
  - Restaurants (CRUD, theme, modules)
  - Menus (CRUD, publish, duplicate, versions)
  - Sections (CRUD, reorder, duplicate)
  - Categories (CRUD, reorder)
  - Menu Items (CRUD, reorder, duplicate, bulk operations)
  - Allergens (CRUD, reorder)
  - Languages (CRUD)
  - File uploads (logo, images, illustrations, icons)
  - Search functionality
  - Translation endpoints (placeholder)

✅ **Frontend:**
- Next.js 14 with App Router
- shadcn/ui components
- Zustand state management
- Dashboard layout with sidebar navigation
- Login page
- Dashboard home page with stats
- Restaurants management page (CRUD)

## Next Steps (Phase 2-5)

- Menu management interface
- Section and item CRUD with drag-drop
- Multi-language support UI
- Theme customization page
- HTML menu generator
- Version control UI
- Import/Export functionality
- And more...

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in server/.env
- Ensure database exists

### Port Already in Use
- Change PORT in server/.env
- Update NEXT_PUBLIC_API_URL in dashboard/.env.local

### Prisma Errors
- Run `npm run db:generate` in server/
- Check schema.prisma for syntax errors
- Verify database connection

