# MenuBuildr

A full-stack menu management system with an admin dashboard and customer-facing HTML menus. MenuBuildr supports multiple restaurants, multi-language translation, advanced customization, and robust version control.

Recently redesigned strictly adhering to **Uncodixfy** principles for a highly functional, premium "Normal" UI, alongside a comprehensive security audit securing the backend infrastructure.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based (Strict secure implementation)

## Features

- 🏪 **Multi-Restaurant Management:** Manage up to 5 restaurants from a single admin account.
- 📋 **Menu Management:** Up to 4 menus per restaurant with section and item drag-and-drop.
- 🌍 **Multi-Language Support:** Instant AI-powered translations into 5 languages (ENG, CHN, GER, JAP, RUS).
- 🎨 **Uncodixfied Premium UI:** Standardized 6px corner radii, distraction-free neutral interfaces without blurs or extreme shadows, providing a highly productive user experience.
- 📱 **Mobile-First Responsive Menus:** Real-time mobile previews and HTML generation.
- 🔄 **Version Control:** Snapshot versioning with restore capabilities.
- 📤 **Import/Export:** Bulk import via Excel or JSON, with secure CSV extraction.
- 🎯 **Allergen Library:** Built-in allergen icon library management.
- 🔒 **Hardened Security:** Built-in rate-limiting, strict JWT enforcement, safe Stripe ID handling, strict Zod payloads, sanitized CSS injection points, and Helmet HTTP protections.

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
   *Note: Repeat for `landing/` if applicable.*

4. Install server dependencies:
   ```bash
   cd server && npm install
   ```

5. Set up environment variables:
   - Copy `server/.env.example` to `server/.env` and securely configure secrets (e.g. `JWT_SECRET`).
   - Copy `dashboard/.env.example` to `dashboard/.env.local` and configure.

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
├── dashboard/          # Next.js frontend dashboard (Uncodixfied UI)
├── landing/            # Landing page platform
├── server/             # Express backend API (Hardened Security)
├── templates/          # Base HTML menu templates
└── package.json        # Root workspace configuration
```

## Recent Milestones

- **Security Hardening (v1.1):** Implemented strict route validation and payload destructuring, patched regex vulnerabilities, restricted mass-assignment, applied CSRF/XSS strict mitigations, and implemented `express-rate-limit`.
- **Uncodixfy Redesign (v1.2):** Unified UI system across Landing and Dashboard per Uncodixfy standards (replaced arbitrary radii with strict `6px`, removed non-functional blurs, integrated standardized neutral tones, and optimized interaction states).

## License

ISC
