# Requirements Document

## Introduction

User registration for MenuBuildr, enabling new restaurant owners to sign up as admins. Currently the app only supports login for pre-seeded admins. This feature adds a self-service registration flow with a sign-up form on the dashboard and a corresponding API endpoint on the server. Registration supports both email/password and Google OAuth methods. Email/password registrations require email verification before full account access. Upon registration, new admins start with no subscription (status "none") and no restaurants, matching the existing Admin model defaults.

## Glossary

- **Registration_API**: The Express server endpoint at `/auth/register` that handles new admin account creation via email/password
- **Registration_Form**: The client-side UI on the dashboard that collects sign-up information and submits it to the Registration_API
- **Admin**: A user account in the system that owns restaurants and manages menus (Prisma `Admin` model)
- **Dashboard**: The Next.js frontend application at app.menubuildr.com
- **Auth_Store**: The client-side Zustand store that holds the authenticated admin and JWT token
- **OAuth_Provider**: The Express server integration with Google OAuth 2.0 (using passport-google-oauth20) that handles Google-based authentication
- **Verification_Service**: The server-side service responsible for generating email verification tokens, sending verification emails, and confirming email addresses
- **Verification_Token**: A unique, time-limited token stored in the database and sent to the user's email for address confirmation

## Requirements

### Requirement 1: Registration API Endpoint

**User Story:** As a new restaurant owner, I want to create an account via an API endpoint, so that I can access the MenuBuildr dashboard.

#### Acceptance Criteria

1. WHEN a valid registration request with name, email, and password is received, THE Registration_API SHALL create a new Admin record with the provided name, email, and a bcrypt-hashed password
2. WHEN a new Admin record is created via email/password, THE Registration_API SHALL return a JWT token and the admin profile (id, email, name, emailVerified) in the response
3. WHEN a registration request contains an email that already exists in the database, THE Registration_API SHALL return a 409 status code with an error message indicating the email is already registered
4. WHEN a registration request is missing name, email, or password, THE Registration_API SHALL return a 400 status code with an error message indicating the missing fields
5. THE Registration_API SHALL hash passwords using bcrypt before storing them in the database

### Requirement 2: Password Validation

**User Story:** As a new user, I want clear password requirements during registration, so that I create a secure account.

#### Acceptance Criteria

1. WHEN a registration request contains a password shorter than 8 characters, THE Registration_API SHALL return a 400 status code with an error message indicating the minimum length requirement
2. THE Registration_API SHALL accept passwords that are 8 characters or longer

### Requirement 3: Email Validation

**User Story:** As a new user, I want email validation during registration, so that I provide a correctly formatted email address.

#### Acceptance Criteria

1. WHEN a registration request contains an email that does not match a valid email format, THE Registration_API SHALL return a 400 status code with an error message indicating the email format is invalid
2. THE Registration_API SHALL normalize email addresses to lowercase before storing them

### Requirement 4: Registration Form UI

**User Story:** As a new restaurant owner, I want a sign-up form on the dashboard, so that I can register without needing a pre-seeded account.

#### Acceptance Criteria

1. THE Registration_Form SHALL display input fields for name, email, password, and password confirmation
2. THE Registration_Form SHALL include a "Sign up with Google" button above the email/password fields
3. THE Registration_Form SHALL include a link to navigate to the existing login page
4. WHEN the user submits the Registration_Form with valid data, THE Dashboard SHALL send a registration request to the Registration_API and store the returned JWT token and admin profile in the Auth_Store
5. WHEN the Registration_API returns a successful response, THE Dashboard SHALL redirect the user to an email verification pending page
6. WHEN the Registration_API returns an error response, THE Registration_Form SHALL display the error message to the user
7. WHILE the registration request is in progress, THE Registration_Form SHALL disable the submit button and display a loading indicator

### Requirement 5: Login Page Update

**User Story:** As a visitor, I want a link to the registration page and Google sign-in from the login page, so that I can easily access the platform.

#### Acceptance Criteria

1. THE Dashboard SHALL display a prominent "Don't have an account? Sign up" link on the login page that navigates to the registration page
2. THE Dashboard SHALL display a "Sign in with Google" button on the login page
3. WHEN the user clicks the "Sign in with Google" button on the login page, THE Dashboard SHALL initiate the Google OAuth flow via the OAuth_Provider

### Requirement 6: Client-Side Password Confirmation

**User Story:** As a new user, I want to confirm my password before submitting, so that I avoid typos in my password.

#### Acceptance Criteria

1. WHEN the password and password confirmation fields do not match, THE Registration_Form SHALL display a validation error and prevent form submission
2. WHEN the password and password confirmation fields match, THE Registration_Form SHALL allow form submission

### Requirement 7: New Admin Default State

**User Story:** As a newly registered admin, I want my account initialized with sensible defaults, so that I can start using the platform immediately.

#### Acceptance Criteria

1. WHEN a new Admin is created, THE Registration_API SHALL set subscriptionStatus to "none" and leave stripeCustomerId, stripeSubscriptionId, and subscriptionPlan as null
2. WHEN a new Admin is created, THE Registration_API SHALL set the createdAt timestamp to the current time
3. WHEN a new Admin is created via email/password, THE Registration_API SHALL set emailVerified to false
4. WHEN a new Admin is created via Google OAuth, THE OAuth_Provider SHALL set emailVerified to true

### Requirement 8: Google OAuth Registration and Login

**User Story:** As a new restaurant owner, I want to sign up and log in using my Google account, so that I can access MenuBuildr without creating a separate password.

#### Acceptance Criteria

1. WHEN the user clicks "Sign up with Google" on the Registration_Form, THE Dashboard SHALL redirect the user to the Google OAuth consent screen via the OAuth_Provider
2. WHEN Google returns a valid OAuth callback with profile information, THE OAuth_Provider SHALL create a new Admin record using the Google profile email and name if no Admin with that email exists
3. WHEN Google returns a valid OAuth callback and an Admin with that email already exists, THE OAuth_Provider SHALL link the Google account to the existing Admin and log the user in
4. WHEN a new Admin is created via Google OAuth, THE OAuth_Provider SHALL store the Google account ID (googleId) on the Admin record and leave passwordHash as null
5. WHEN Google OAuth authentication succeeds, THE OAuth_Provider SHALL return a JWT token and the admin profile (id, email, name, emailVerified) to the Dashboard
6. WHEN Google OAuth authentication fails or the user denies consent, THE OAuth_Provider SHALL redirect the user back to the login page with an error message
7. THE OAuth_Provider SHALL use the passport-google-oauth20 strategy with the server's Google client credentials

### Requirement 9: Email Verification on Registration

**User Story:** As a platform operator, I want new email/password registrations to verify their email address, so that fake accounts are prevented.

#### Acceptance Criteria

1. WHEN a new Admin is created via email/password registration, THE Verification_Service SHALL generate a unique Verification_Token and store it in the database with an expiration time of 24 hours
2. WHEN a Verification_Token is generated, THE Verification_Service SHALL send a verification email to the Admin's registered email address containing a verification link with the token
3. WHEN the Admin clicks the verification link, THE Verification_Service SHALL validate the token, mark the Admin's emailVerified field as true, and delete the used token
4. WHEN the Admin clicks a verification link with an expired or invalid token, THE Verification_Service SHALL return an error message indicating the token is invalid or expired
5. WHEN an unverified Admin requests a new verification email, THE Verification_Service SHALL invalidate any existing tokens and generate a new Verification_Token with a fresh 24-hour expiration

### Requirement 10: Unverified Account Access Restrictions

**User Story:** As a platform operator, I want unverified accounts to have limited access, so that users are motivated to verify their email.

#### Acceptance Criteria

1. WHILE an Admin's emailVerified field is false, THE Dashboard SHALL display a banner prompting the Admin to verify their email address
2. WHILE an Admin's emailVerified field is false, THE Dashboard SHALL provide a "Resend verification email" button in the banner
3. WHEN an unverified Admin logs in, THE Dashboard SHALL redirect the Admin to an email verification pending page instead of the main dashboard
4. WHEN the Admin's emailVerified field becomes true, THE Dashboard SHALL allow full access to all dashboard features

### Requirement 11: Google OAuth and Email/Password Account Merging

**User Story:** As a user who registered with email/password, I want to later sign in with Google using the same email, so that I have a seamless login experience.

#### Acceptance Criteria

1. WHEN a Google OAuth callback returns an email that matches an existing email/password Admin, THE OAuth_Provider SHALL link the Google account by storing the googleId on the existing Admin record
2. WHEN a Google OAuth account is linked to an existing email/password Admin, THE OAuth_Provider SHALL set emailVerified to true on that Admin record
3. WHEN an Admin has both a passwordHash and a googleId, THE Dashboard SHALL allow the Admin to log in using either email/password or Google OAuth