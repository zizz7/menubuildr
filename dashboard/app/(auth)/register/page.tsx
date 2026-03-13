import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Create Account — MenuBuildr',
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
