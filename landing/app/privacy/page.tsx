import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { BASE_URL } from '@/lib/constants/landing';

export const metadata: Metadata = {
  title: 'Privacy Policy — MenuBuildr',
  description: 'Privacy Policy for MenuBuildr digital menu platform.',
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-forest/5 bg-cream">
        <div className="mx-auto max-w-4xl px-6 py-6 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-bold text-forest">MenuBuildr</a>
          <a href="/" className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-forest transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <div className="mb-12">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">Legal</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4">Privacy Policy</h1>
          <p className="text-warm-gray">Last updated: March 18, 2026</p>
        </div>

        <div className="prose-legal space-y-10 text-charcoal/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">1. Introduction</h2>
            <p className="mb-3">
              MenuBuildr (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              use our digital menu management platform (&quot;the Service&quot;).
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do not agree,
              please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">2. Information We Collect</h2>
            <h3 className="font-serif text-lg font-semibold text-forest mb-2 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Account information: name, email address, and password</li>
              <li>Restaurant details: restaurant name, location, and branding preferences</li>
              <li>Menu content: menu items, descriptions, prices, allergen information, and translations</li>
              <li>Billing information: payment method details processed through our third-party payment provider</li>
              <li>Communications: messages you send to us for support or feedback</li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-forest mb-2 mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Device and browser information: type, operating system, and browser version</li>
              <li>Usage data: pages visited, features used, and interaction patterns</li>
              <li>Log data: IP address, access times, and referring URLs</li>
              <li>Cookies and similar technologies: session cookies for authentication and preferences</li>
            </ul>

            <h3 className="font-serif text-lg font-semibold text-forest mb-2 mt-4">2.3 Information from Third Parties</h3>
            <p>
              If you sign in using a third-party service (e.g., Google), we may receive your name, email address,
              and profile information as permitted by your third-party account settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and manage your subscription</li>
              <li>Generate and host your digital menus</li>
              <li>Send service-related communications (account verification, billing, updates)</li>
              <li>Respond to your support requests and inquiries</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li>Service providers: hosting, payment processing, analytics, and email delivery partners who assist in operating the Service</li>
              <li>Legal compliance: when required by law, regulation, legal process, or governmental request</li>
              <li>Business transfers: in connection with a merger, acquisition, or sale of assets, with notice to affected users</li>
              <li>With your consent: when you explicitly authorize sharing with a third party</li>
            </ul>
            <p>
              Your published digital menus are publicly accessible by design. Menu content (item names, descriptions,
              prices, allergens) is visible to anyone with the menu link or QR code.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">5. Data Retention</h2>
            <p className="mb-3">
              We retain your account data for as long as your account is active or as needed to provide the Service.
              If you delete your account, we will delete or anonymize your personal data within 30 days, except where
              retention is required for legal, accounting, or legitimate business purposes.
            </p>
            <p>
              Menu content and generated menus are deleted when you remove them or close your account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">6. Data Security</h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure password hashing using bcrypt</li>
              <li>Regular security assessments and monitoring</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. While we strive to protect your data,
              we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">7. Cookies</h2>
            <p className="mb-3">
              We use essential cookies for authentication and session management. These are necessary for the
              Service to function and cannot be disabled.
            </p>
            <p>
              We may use analytics cookies to understand how the Service is used. You can control cookie
              preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">8. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Request data portability (receive your data in a structured format)</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@menubuildr.com" className="text-forest font-medium border-b border-amber hover:opacity-75 transition-opacity">
                privacy@menubuildr.com
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">9. International Data Transfers</h2>
            <p>
              Your data may be processed in countries other than your own. We ensure appropriate safeguards
              are in place for international transfers, including standard contractual clauses where applicable.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect
              personal information from children. If we become aware that we have collected data from a child,
              we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users of material
              changes via email and update the &quot;Last updated&quot; date. Continued use of the Service after
              changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, contact us at{' '}
              <a href="mailto:privacy@menubuildr.com" className="text-forest font-medium border-b border-amber hover:opacity-75 transition-opacity">
                privacy@menubuildr.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-forest/5 bg-cream py-8">
        <div className="mx-auto max-w-4xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-warm-gray">&copy; {new Date().getFullYear()} MenuBuildr. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/terms" className="text-xs text-warm-gray hover:text-forest transition-colors">Terms</a>
            <a href="/privacy" className="text-xs text-forest font-medium">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
