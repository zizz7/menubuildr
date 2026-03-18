import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { BASE_URL } from '@/lib/constants/landing';

export const metadata: Metadata = {
  title: 'Terms of Service — MenuBuildr',
  description: 'Terms of Service for MenuBuildr digital menu platform.',
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
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
          <h1 className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4">Terms of Service</h1>
          <p className="text-warm-gray">Last updated: March 18, 2026</p>
        </div>

        <div className="prose-legal space-y-10 text-charcoal/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">1. Acceptance of Terms</h2>
            <p className="mb-3">
              By accessing or using MenuBuildr (&quot;the Service&quot;), operated by MenuBuildr (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
              you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
            </p>
            <p>
              We reserve the right to update these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the revised terms. We will notify registered users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">2. Description of Service</h2>
            <p>
              MenuBuildr is a digital menu management platform that enables restaurant owners and operators to create,
              manage, and publish digital menus. The Service includes menu creation tools, multi-language support,
              allergen management, template selection, QR code generation, and related features.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">3. Account Registration</h2>
            <p className="mb-3">
              To use certain features, you must create an account. You agree to provide accurate, current, and complete
              information during registration and to keep your account information updated.
            </p>
            <p className="mb-3">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              that occur under your account. You must notify us immediately of any unauthorized use.
            </p>
            <p>
              You must be at least 18 years old or the age of majority in your jurisdiction to create an account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">4. Subscription Plans and Billing</h2>
            <p className="mb-3">
              MenuBuildr offers Free, Pro ($29/month), and Enterprise ($79/month) subscription tiers. Features and
              limitations vary by plan as described on our pricing page.
            </p>
            <p className="mb-3">
              Paid subscriptions are billed in advance on a monthly basis. You authorize us to charge your designated
              payment method for recurring fees. All fees are non-refundable except as required by applicable law.
            </p>
            <p>
              We may change pricing with 30 days&apos; notice. You may cancel your subscription at any time, and
              cancellation will take effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-3">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Upload content that is defamatory, obscene, or infringes on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Use automated means to access the Service without our written permission</li>
              <li>Resell, sublicense, or redistribute the Service without authorization</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">6. Intellectual Property</h2>
            <p className="mb-3">
              The Service, including its design, features, templates, and underlying technology, is owned by MenuBuildr
              and protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable
              license to use the Service in accordance with these terms.
            </p>
            <p>
              You retain ownership of the content you create using the Service (menu items, descriptions, images, etc.).
              By using the Service, you grant us a limited license to host, display, and distribute your content solely
              for the purpose of providing the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">7. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our <a href="/privacy" className="text-forest font-medium border-b border-amber hover:opacity-75 transition-opacity">Privacy Policy</a>,
              which describes how we collect, use, and protect your data. By using the Service, you consent to the
              practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">8. Service Availability and Modifications</h2>
            <p className="mb-3">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. The Service may be
              temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will
              provide reasonable notice of material changes that affect your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">9. Limitation of Liability</h2>
            <p className="mb-3">
              To the maximum extent permitted by law, MenuBuildr shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or business opportunities,
              arising from your use of the Service.
            </p>
            <p>
              Our total liability for any claim arising from or related to the Service shall not exceed the amount
              you paid us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless MenuBuildr, its officers, directors, employees, and agents
              from any claims, damages, losses, or expenses (including reasonable legal fees) arising from your use
              of the Service, your content, or your violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">11. Termination</h2>
            <p className="mb-3">
              Either party may terminate this agreement at any time. You may delete your account through the Service
              settings or by contacting us. We may terminate or suspend your account for violation of these terms.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. We may retain your data for a
              reasonable period to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">12. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws. Any disputes arising
              from these terms or the Service shall be resolved through good-faith negotiation, and if necessary,
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-forest mb-4">13. Contact</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@menubuildr.com" className="text-forest font-medium border-b border-amber hover:opacity-75 transition-opacity">
                legal@menubuildr.com
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
            <a href="/terms" className="text-xs text-forest font-medium">Terms</a>
            <a href="/privacy" className="text-xs text-warm-gray hover:text-forest transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
