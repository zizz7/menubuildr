'use client';

import { useScrollReveal } from '@/lib/hooks/useScrollReveal';

export function ScrollRevealWrapper({ children }: { children: React.ReactNode }) {
  useScrollReveal();
  return <>{children}</>;
}
