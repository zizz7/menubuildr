import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Log In — MenuBuildr',
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginForm />;
}
