# Implementation Plan: Landing Page

## Overview

Build the public-facing landing page for MenuBuildr at `/`, redesign login as split-screen at `(auth)/login`, create registration page at `(auth)/register`, and add SEO files (sitemap.ts, robots.ts). All landing sections are Server Components; only interactive bits (mobile nav, smooth scroll, auth forms, auth redirect) are Client Components.

## Tasks

- [x] 1. Create static data constants and shared types
  - [x] 1.1 Create `dashboard/lib/constants/landing.ts` with Feature, PricingPlan, Testimonial types and static data arrays
    - Define FEATURES, PRICING_PLANS, TESTIMONIALS constants
    - _Requirements: 4.1-4.6, 5.1-5.5, 6.1-6.3_

- [x] 2. Build landing page section components
  - [x] 2.1 Create `dashboard/components/landing/json-ld.tsx` — Server Component for JSON-LD script blocks
    - Renders `<script type="application/ld+json">` with Organization, WebSite, Product structured data
    - _Requirements: 11.1-11.5_
  - [x] 2.2 Create `dashboard/components/landing/smooth-scroll-link.tsx` — Client Component for anchor scroll
    - Handles smooth scroll to section IDs, updates URL hash
    - _Requirements: 2.2, 10.3_
  - [x] 2.3 Create `dashboard/components/landing/mobile-nav-toggle.tsx` — Client Component for hamburger menu
    - Toggle open/close state, renders collapsible link list on mobile
    - _Requirements: 2.6, 8.2_
  - [x] 2.4 Create `dashboard/components/landing/navbar.tsx` — Server Component for navigation bar
    - Logo, section links (SmoothScrollLink), Login link, Get Started CTA, MobileNavToggle
    - Fixed at top, wrapped in `<header><nav aria-label="Main navigation">`
    - _Requirements: 2.1-2.6, 15.1, 15.5, 16.1-16.2_
  - [x] 2.5 Create `dashboard/components/landing/hero-section.tsx` — Server Component
    - h1 headline, subheadline, Get Started CTA (Link to /register), See Pricing (SmoothScrollLink to #pricing), hero image placeholder
    - _Requirements: 3.1-3.5, 9.1, 13.1, 15.3_
  - [x] 2.6 Create `dashboard/components/landing/features-section.tsx` — Server Component
    - h2 heading, grid of article feature cards with icons from lucide-react
    - _Requirements: 4.1-4.6, 8.3, 15.3, 15.6_
  - [x] 2.7 Create `dashboard/components/landing/pricing-section.tsx` — Server Component
    - h2 heading, grid of article pricing cards, highlighted recommended plan, fallback message
    - _Requirements: 5.1-5.5, 8.3, 15.3, 15.6_
  - [x] 2.8 Create `dashboard/components/landing/testimonials-section.tsx` — Server Component
    - h2 heading, grid of article testimonial cards with blockquote
    - _Requirements: 6.1-6.3, 15.3, 15.6_
  - [x] 2.9 Create `dashboard/components/landing/footer.tsx` — Server Component
    - Logo, description, section links, auth links, Terms/Privacy placeholders, copyright year
    - Wrapped in `<footer aria-label="Site footer">`
    - _Requirements: 7.1-7.5, 15.4, 16.3_
  - [x] 2.10 Create `dashboard/components/landing/auth-redirect.tsx` — Client Component
    - On mount checks useAuthStore().isAuthenticated(), redirects to /dashboard if true, renders null
    - _Requirements: 1.2_

- [x] 3. Assemble landing page and SEO files
  - [x] 3.1 Replace `dashboard/app/page.tsx` with Server Component landing page
    - Export metadata (title, description, OG, Twitter, canonical, robots)
    - Compose: AuthRedirect, Navbar, main(HeroSection, FeaturesSection, PricingSection, TestimonialsSection), Footer, JsonLd blocks
    - _Requirements: 1.1-1.4, 3.1-3.5, 9.2, 9.6, 12.1, 12.4, 13.6-13.7, 14.1-14.10, 15.2_
  - [x] 3.2 Create `dashboard/app/sitemap.ts` — dynamic sitemap generation
    - List public pages: /, /login, /register with lastmod, changeFrequency, priority
    - _Requirements: 12.2_
  - [x] 3.3 Create `dashboard/app/robots.ts` — robots.txt generation
    - Allow public pages, disallow /dashboard/*, reference sitemap URL
    - _Requirements: 12.3_

- [x] 4. Checkpoint — Verify landing page renders
  - Ensure all components compile without errors, ask the user if questions arise.

- [x] 5. Build auth components and pages
  - [x] 5.1 Create `dashboard/components/auth/brand-panel.tsx` — Server Component
    - Gradient background, MenuBuildr logo, tagline, feature highlights
    - Hidden on mobile (hidden md:flex), 50% width on desktop
    - _Requirements: 19.2, 20.2, 20.8_
  - [x] 5.2 Create `dashboard/components/auth/login-form.tsx` — Client Component
    - Email, password fields, Sign In button, Google OAuth button, links to /register and /
    - Connects to existing /auth/login API endpoint
    - _Requirements: 19.3-19.5, 16.4_
  - [x] 5.3 Create `dashboard/components/auth/register-form.tsx` — Client Component
    - Name, email, password, confirm password fields, Create Account button, Google OAuth button, links to /login and /
    - API call to /auth/register (form UI ready, endpoint may not exist yet)
    - _Requirements: 20.3-20.5, 16.5_
  - [x] 5.4 Create `dashboard/app/(auth)/layout.tsx` — split-screen auth layout
    - BrandPanel on left, children on right, responsive
    - _Requirements: 19.1, 19.6-19.7, 20.1, 20.6-20.7_
  - [x] 5.5 Move login page to `dashboard/app/(auth)/login/page.tsx` with metadata
    - Export noindex metadata, render LoginForm
    - _Requirements: 12.5, 19.1-19.7_
  - [x] 5.6 Create `dashboard/app/(auth)/register/page.tsx` with metadata
    - Export noindex metadata, render RegisterForm
    - _Requirements: 12.5, 20.1-20.7_

- [x] 6. Final checkpoint — Ensure all files compile
  - Ensure all components compile without errors, ask the user if questions arise.
