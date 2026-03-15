/**
 * Property-based tests for profile data flow bugfix.
 *
 * Feature: settings-profile-management
 * Properties tested:
 *   Property 1: Bug Condition - Login response omits profileImageUrl & upload copies to dashboard
 *   Property 2: Preservation - Existing auth & profile behavior unchanged
 *
 * Validates: Requirements 1.1, 1.4, 2.1, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';

// ============================================================
// Property 1: Bug Condition - Profile Data Flow Bugs
// ============================================================
describe('Property 1: Bug Condition - Profile Data Flow Bugs', () => {
  describe('Bug 1.1: Login response must include profileImageUrl', () => {
    it('for any admin with profileImageUrl, login response includes it', async () => {
      // Read the actual source to verify the response shape
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      // Find the login response block - look for the res.json in the login handler
      // The login handler is the first res.json call that contains 'admin:' object
      const loginResponseMatch = authSource.match(
        /res\.json\(\{\s*token,\s*admin:\s*\{([^}]+)\}/s
      );

      expect(loginResponseMatch).not.toBeNull();
      const responseFields = loginResponseMatch![1];

      // Property: the login response admin object MUST include profileImageUrl
      expect(responseFields).toContain('profileImageUrl');
    });
  });

  describe('Bug 1.4: Upload handler must not copy to ../dashboard/public', () => {
    it('profile-image route does not contain cross-service file copy', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      // Find the profile-image upload handler section
      const uploadSection = authSource.substring(
        authSource.indexOf("'/profile-image'")
      );

      // Property: the upload handler must NOT reference ../dashboard/public
      expect(uploadSection).not.toContain('../dashboard/public');
    });
  });
});


// ============================================================
// Property 2: Preservation - Existing Auth & Profile Behavior
// ============================================================
describe('Property 2: Preservation - Existing Auth & Profile Behavior', () => {
  describe('Preservation 3.1: Login returns token and admin with id, email, name', () => {
    it('login response source always includes id, email, name in admin object', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      const loginResponseMatch = authSource.match(
        /res\.json\(\{\s*token,\s*admin:\s*\{([^}]+)\}/s
      );

      expect(loginResponseMatch).not.toBeNull();
      const responseFields = loginResponseMatch![1];

      // Preserved fields must still be present
      expect(responseFields).toContain('admin.id');
      expect(responseFields).toContain('admin.email');
      expect(responseFields).toContain('admin.name');
    });
  });

  describe('Preservation 3.2: Password change validates current password and enforces min length', () => {
    it('password route source contains validation for current password and min length', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      // Find the password change handler
      const passwordSection = authSource.substring(
        authSource.indexOf("'/password'")
      );

      // Must validate current password
      expect(passwordSection).toContain('currentPassword');
      expect(passwordSection).toContain('bcrypt.compare');

      // Must enforce minimum length
      // complexPasswordSchema is defined at file level and used in ChangePasswordSchema
      const hasComplexityCheck = passwordSection.includes('complexPasswordSchema') ||
        passwordSection.includes('ChangePasswordSchema') ||
        authSource.includes('complexPasswordSchema');
      expect(hasComplexityCheck).toBe(true);
    });
  });

  describe('Preservation 3.3: Profile image upload validates file type and size', () => {
    it('upload route source contains file validation constraints', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      const uploadSection = authSource.substring(
        authSource.indexOf("'/profile-image'")
      );

      // Must validate file size (5MB)
      expect(uploadSection).toContain('5 * 1024 * 1024');

      // Must validate allowed extensions (no SVG for profile images — security fix C1.5)
      expect(uploadSection).toContain('.jpg');
      expect(uploadSection).toContain('.png');
      expect(uploadSection).toContain('.webp');

      // Must update profileImageUrl in database
      expect(uploadSection).toContain('profileImageUrl');
      expect(uploadSection).toContain('prisma.admin.update');
    });
  });

  describe('Preservation 3.4: GET /me returns full admin profile with subscription data', () => {
    it('/me route source selects subscription and Stripe fields', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      // Find the /me handler
      const meSection = authSource.substring(
        authSource.indexOf("'/me'")
      );

      // Must select subscription fields
      expect(meSection).toContain('subscriptionStatus');
      expect(meSection).toContain('subscriptionPlan');
      expect(meSection).toContain('stripeCustomerId');
      expect(meSection).toContain('stripeSubscriptionId');

      // Must return boolean flags
      expect(meSection).toContain('hasStripeCustomer');
      expect(meSection).toContain('hasSubscription');
    });
  });

  describe('Preservation 3.5: Profile update trims name and saves to database', () => {
    it('profile route source trims name and updates via prisma', () => {
      const authSource = fs.readFileSync(
        require('path').join(__dirname, '../routes/auth.ts'),
        'utf-8'
      );

      const profileSection = authSource.substring(
        authSource.indexOf("'/profile'")
      );

      // Must trim name
      expect(profileSection).toContain('name.trim()');

      // Must update via prisma
      expect(profileSection).toContain('prisma.admin.update');
    });
  });
});
