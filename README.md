# Multi-Restaurant Menu Management Dashboard

A full-stack menu management system with admin dashboard and customer-facing HTML menus. Supports multiple restaurants, multi-language support, advanced customization, and version control.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based

## Features

- 🏪 Multi-restaurant management (up to 5 restaurants)
- 📋 Menu management (4 menus per restaurant)
- 🌍 Multi-language support (5 languages: ENG, CHN, GER, JAP, RUS)
- 🎨 Advanced theme customization
- 📱 Mobile-first responsive menu display
- 🔄 Version control with restore capability
- 📤 Import/Export functionality
- 🎯 Allergen icon library
- 🤖 AI-powered translations

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Environment variables configured

### Installation

1. Clone the repository
2. Install root dependencies:
   ```bash
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd dashboard && npm install
   ```

4. Install server dependencies:
   ```bash
   cd server && npm install
   ```

5. Set up environment variables:
   - Copy `server/.env.example` to `server/.env` and configure
   - Copy `dashboard/.env.example` to `dashboard/.env.local` and configure

6. Set up the database:
   ```bash
   npm run db:generate
   npm run db:push
   ```

7. Start development servers:
   ```bash
   npm run dev
   ```

The dashboard will be available at `http://localhost:3000` and the API at `http://localhost:5000`.

## Project Structure

```
.
├── dashboard/          # Next.js frontend application
├── server/             # Express backend application
├── templates/          # HTML menu templates
└── package.json        # Root package.json with scripts
```

## Development Phases

- **Phase 1**: Project setup, authentication, restaurant CRUD, theme settings
- **Phase 2**: Menu management, sections, items, drag-drop, multi-language
- **Phase 3**: Translation API, import/export, version control
- **Phase 4**: HTML menu generation, styling, interactive features
- **Phase 5**: Performance optimization, offline support, testing

## License

ISC

