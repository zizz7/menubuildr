import { Building2, Globe, Layers } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Building2, bold: 'Manage menus', text: 'across all your locations' },
  { icon: Globe, bold: 'Multi-language support', text: 'for global reach' },
  { icon: Layers, bold: 'Built-in allergen', text: 'management' },
];

const MENU_ITEMS = [
  { dish: 'Truffle Risotto', price: '$28' },
  { dish: 'Seared Sea Bass', price: '$34' },
  { dish: 'Crème Brûlée', price: '$12' },
];

export function BrandPanel() {
  return (
    <div className="auth-left hidden md:flex flex-col justify-between">
      {/* Decorative elements */}
      <div className="absolute bottom-[-120px] right-[-120px] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,168,56,0.14) 0%, transparent 70%)' }} />
      <div className="absolute top-[-80px] left-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,168,56,0.07) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[80px] right-[-80px] w-[340px] h-[340px] rounded-full border pointer-events-none"
        style={{ borderColor: 'rgba(232,168,56,0.12)' }} />
      <div className="absolute bottom-[120px] right-[-40px] w-[220px] h-[220px] rounded-full border pointer-events-none"
        style={{ borderColor: 'rgba(232,168,56,0.08)' }} />

      {/* Logo */}
      <a href="https://menubuildr.com" className="relative z-[1] flex items-center gap-3 no-underline">
        <div className="w-[38px] h-[38px] bg-[#E8A838] rounded-[9px] flex items-center justify-center flex-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 5h18M3 10h18M3 15h12M3 20h8" stroke="#1A3C2E" strokeWidth="2.3" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-[var(--font-cormorant)] text-2xl font-bold text-[#F9F6F0] tracking-tight">
          MenuBuildr
        </span>
      </a>

      {/* Main content */}
      <div className="relative z-[1] flex-1 flex flex-col justify-center py-8">
        <h1 className="font-[var(--font-cormorant)] text-[clamp(2rem,3.2vw,2.75rem)] font-bold text-[#F9F6F0] leading-[1.1] tracking-tight mb-5">
          Beautiful digital menus<br/>for your <em className="text-[#E8A838]">restaurants</em>
        </h1>
        <p className="text-[0.9rem] text-[rgba(249,246,240,0.55)] leading-[1.7] max-w-[320px] mb-12">
          Create, manage, and publish stunning menus that your customers will love — from one location to many.
        </p>

        {/* Feature list */}
        <ul className="list-none flex flex-col gap-[18px] mb-14">
          {HIGHLIGHTS.map((item) => (
            <li key={item.bold} className="flex items-center gap-[14px]">
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-none"
                style={{ background: 'rgba(232,168,56,0.12)', border: '1px solid rgba(232,168,56,0.2)' }}>
                <item.icon className="w-[15px] h-[15px] text-[#E8A838]" strokeWidth={1.8} />
              </div>
              <span className="text-[0.875rem] text-[rgba(249,246,240,0.7)]">
                <strong className="text-[rgba(249,246,240,0.9)] font-medium">{item.bold}</strong> {item.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Floating menu card */}
        <div className="menu-card-float max-w-[300px] rounded-[14px] p-5 backdrop-blur-[8px]"
          style={{ background: 'rgba(249,246,240,0.05)', border: '1px solid rgba(249,246,240,0.1)' }}>
          <div className="font-[var(--font-dm-mono)] text-[9.5px] tracking-[0.12em] uppercase text-[rgba(232,168,56,0.7)] mb-3 flex items-center gap-[6px]">
            <span className="live-dot-pulse w-[5px] h-[5px] rounded-full bg-[#4ade80]" />
            Live menu · Updated just now
          </div>
          {MENU_ITEMS.map((item) => (
            <div key={item.dish} className="flex justify-between items-center py-2"
              style={{ borderBottom: '1px solid rgba(249,246,240,0.07)' }}>
              <span className="font-[var(--font-cormorant)] text-[0.95rem] text-[rgba(249,246,240,0.85)]">
                {item.dish}
              </span>
              <span className="font-[var(--font-dm-mono)] text-[0.8rem] text-[#E8A838]">
                {item.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-[1] font-[var(--font-dm-mono)] text-[9.5px] tracking-[0.1em] uppercase text-[rgba(249,246,240,0.22)]">
        © 2026 MenuBuildr · Engineered for growth
      </div>
    </div>
  );
}
