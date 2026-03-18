import { BrandPanel } from '@/components/auth/brand-panel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <BrandPanel />
      <div className="auth-right">
        <div className="auth-form-enter w-full max-w-[380px] relative z-[1]">
          {children}
        </div>
      </div>
    </div>
  );
}
