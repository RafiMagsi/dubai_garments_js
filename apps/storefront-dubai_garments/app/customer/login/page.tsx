'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import StorefrontShell from '@/components/layout/storefront-shell';
import { Button, Card, FieldLabel, TextField } from '@/components/ui';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || 'Login failed.');
        return;
      }
      router.replace('/customer/dashboard');
      router.refresh();
    } catch {
      setError('Unable to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <StorefrontShell>
      <main className="dg-main">
        <section className="dg-section">
          <div className="dg-container flex justify-center">
            <Card className="w-full max-w-md">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Customer Login</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Login to access your customer dashboard.
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]">
                  {error}
                </div>
              )}

              <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                <div>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <TextField id="email" name="email" type="email" autoComplete="email" />
                </div>
                <div>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <TextField id="password" name="password" type="password" autoComplete="current-password" />
                </div>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Card>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
