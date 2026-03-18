import { TEMPLATES, APP_URL } from '@/lib/constants/landing';

function ClassicPreview() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="240" fill="#FAFAF8"/>
      {/* Header */}
      <rect x="0" y="0" width="320" height="44" fill="#1A3C2E"/>
      <rect x="24" y="16" width="60" height="6" rx="3" fill="rgba(249,246,240,0.6)"/>
      <rect x="240" y="14" width="56" height="10" rx="5" fill="rgba(232,168,56,0.5)"/>
      <rect x="100" y="18" width="30" height="4" rx="2" fill="rgba(249,246,240,0.3)"/>
      <rect x="140" y="18" width="30" height="4" rx="2" fill="rgba(249,246,240,0.3)"/>
      {/* Section title */}
      <rect x="24" y="60" width="80" height="8" rx="4" fill="#1A3C2E" opacity="0.7"/>
      <rect x="24" y="74" width="120" height="4" rx="2" fill="#1A3C2E" opacity="0.15"/>
      {/* Menu items - classic list style */}
      <rect x="24" y="96" width="140" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="106" width="200" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="270" y="96" width="28" height="5" rx="2.5" fill="#E8A838" opacity="0.6"/>
      <line x1="24" y1="118" x2="296" y2="118" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="24" y="126" width="120" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="136" width="180" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="270" y="126" width="28" height="5" rx="2.5" fill="#E8A838" opacity="0.6"/>
      <line x1="24" y1="148" x2="296" y2="148" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="24" y="156" width="160" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="166" width="220" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="270" y="156" width="28" height="5" rx="2.5" fill="#E8A838" opacity="0.6"/>
      <line x1="24" y1="178" x2="296" y2="178" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="24" y="186" width="100" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="196" width="190" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="270" y="186" width="28" height="5" rx="2.5" fill="#E8A838" opacity="0.6"/>
      {/* Allergen dots */}
      <circle cx="30" cy="210" r="4" fill="#E8A838" opacity="0.25"/>
      <circle cx="42" cy="210" r="4" fill="#1A3C2E" opacity="0.15"/>
      <circle cx="54" cy="210" r="4" fill="#8BAF9C" opacity="0.3"/>
    </svg>
  );
}

function CardBasedPreview() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="240" fill="#F5F5F0"/>
      {/* Top bar */}
      <rect x="0" y="0" width="320" height="40" fill="#1A3C2E"/>
      <rect x="16" y="14" width="50" height="5" rx="2.5" fill="rgba(249,246,240,0.6)"/>
      <rect x="250" y="12" width="50" height="9" rx="4.5" fill="rgba(232,168,56,0.5)"/>
      {/* Tab pills */}
      <rect x="16" y="50" width="50" height="18" rx="9" fill="#1A3C2E" opacity="0.8"/>
      <rect x="72" y="50" width="50" height="18" rx="9" fill="#1A3C2E" opacity="0.1"/>
      <rect x="128" y="50" width="50" height="18" rx="9" fill="#1A3C2E" opacity="0.1"/>
      {/* Cards grid */}
      <rect x="16" y="80" width="140" height="68" rx="10" fill="white" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="24" y="88" width="60" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="98" width="110" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="24" y="106" width="90" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="24" y="130" width="32" height="10" rx="5" fill="#E8A838" opacity="0.3"/>
      <circle cx="130" cy="135" r="5" fill="#E8A838" opacity="0.2"/>
      <circle cx="142" cy="135" r="5" fill="#8BAF9C" opacity="0.2"/>

      <rect x="164" y="80" width="140" height="68" rx="10" fill="white" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="172" y="88" width="70" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="172" y="98" width="100" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="172" y="106" width="80" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="172" y="130" width="32" height="10" rx="5" fill="#E8A838" opacity="0.3"/>

      <rect x="16" y="158" width="140" height="68" rx="10" fill="white" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="24" y="166" width="80" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="24" y="176" width="100" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="24" y="184" width="70" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="24" y="208" width="32" height="10" rx="5" fill="#E8A838" opacity="0.3"/>

      <rect x="164" y="158" width="140" height="68" rx="10" fill="white" stroke="#1A3C2E" strokeOpacity="0.06"/>
      <rect x="172" y="166" width="55" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="172" y="176" width="110" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="172" y="184" width="85" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="172" y="208" width="32" height="10" rx="5" fill="#E8A838" opacity="0.3"/>
    </svg>
  );
}

function CoraflowPreview() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="320" height="240" fill="white"/>
      {/* Gradient header */}
      <defs>
        <linearGradient id="coraGrad" x1="0" y1="0" x2="320" y2="0">
          <stop offset="0%" stopColor="#04BFAE"/>
          <stop offset="100%" stopColor="#06d6a0"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="44" fill="url(#coraGrad)"/>
      <rect x="16" y="16" width="50" height="5" rx="2.5" fill="rgba(255,255,255,0.7)"/>
      <rect x="250" y="12" width="50" height="10" rx="5" fill="rgba(255,255,255,0.3)"/>
      {/* Floating orbs */}
      <circle cx="280" cy="20" r="60" fill="#F1A0C0" opacity="0.06"/>
      <circle cx="40" cy="200" r="80" fill="#A0DBF8" opacity="0.06"/>
      {/* Section tabs */}
      <rect x="16" y="54" width="55" height="20" rx="10" fill="#04BFAE" opacity="0.8"/>
      <rect x="78" y="54" width="55" height="20" rx="10" fill="#F3955F" opacity="0.15"/>
      <rect x="140" y="54" width="55" height="20" rx="10" fill="#F1A0C0" opacity="0.15"/>
      {/* Flowing items with colored accents */}
      <rect x="16" y="86" width="288" height="60" rx="12" fill="#FAFAF8" stroke="#04BFAE" strokeOpacity="0.12"/>
      <rect x="28" y="96" width="80" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="28" y="106" width="180" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="28" y="114" width="140" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="250" y="96" width="36" height="14" rx="7" fill="#04BFAE" opacity="0.15"/>
      <rect x="256" y="100" width="24" height="5" rx="2.5" fill="#04BFAE" opacity="0.5"/>
      <circle cx="28" cy="134" r="5" fill="#F3955F" opacity="0.3"/>
      <circle cx="42" cy="134" r="5" fill="#A0DBF8" opacity="0.3"/>

      <rect x="16" y="156" width="288" height="60" rx="12" fill="#FAFAF8" stroke="#F3955F" strokeOpacity="0.12"/>
      <rect x="28" y="166" width="100" height="5" rx="2.5" fill="#1A3C2E" opacity="0.5"/>
      <rect x="28" y="176" width="160" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="28" y="184" width="120" height="3" rx="1.5" fill="#1A3C2E" opacity="0.12"/>
      <rect x="250" y="166" width="36" height="14" rx="7" fill="#F3955F" opacity="0.15"/>
      <rect x="256" y="170" width="24" height="5" rx="2.5" fill="#F3955F" opacity="0.5"/>
    </svg>
  );
}

const PREVIEW_MAP: Record<string, React.ComponentType> = {
  Classic: ClassicPreview,
  'Card Based': CardBasedPreview,
  Coraflow: CoraflowPreview,
};

export function TemplatesSection() {
  return (
    <section
      id="templates"
      aria-labelledby="templates-heading"
      className="py-24 lg:py-32 bg-cream-dark"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono text-xs tracking-widest text-amber uppercase mb-4">
            Templates
          </p>
          <h2
            id="templates-heading"
            className="font-serif text-4xl lg:text-5xl font-bold text-forest mb-4"
          >
            Designed to impress
          </h2>
          <p className="text-warm-gray">
            Three professionally crafted templates to match any restaurant style.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {TEMPLATES.map((template) => {
            const Preview = PREVIEW_MAP[template.name];
            return (
              <div
                key={template.name}
                className="feature-card group rounded-2xl border border-forest/5 bg-white overflow-hidden"
              >
                <div className="aspect-[4/3] bg-forest/[0.02] flex items-center justify-center relative overflow-hidden p-4">
                  {Preview && <Preview />}
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl font-semibold text-forest mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-warm-gray leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a
            href={`${APP_URL}/register`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-forest/20 px-8 text-sm font-medium text-forest hover:bg-forest hover:text-cream transition-colors"
          >
            Try All Templates Free
          </a>
        </div>
      </div>
    </section>
  );
}
