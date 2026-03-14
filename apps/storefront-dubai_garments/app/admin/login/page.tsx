'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldError, FieldGroup, FieldHint, FieldLabel, TextField } from '@/components/ui';

export default function AdminLoginPage() {
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
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.message || 'Login failed.');
        return;
      }
      router.replace('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Unable to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Backoffice Login</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Access the private admin and sales workspace.
        </p>

        {error ? <FieldError className="dg-alert-error">{error}</FieldError> : null}

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <TextField id="email" name="email" type="email" autoComplete="email" />
            <FieldHint>Use your admin or sales account email.</FieldHint>
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <TextField id="password" name="password" type="password" autoComplete="current-password" />
            <FieldHint>Minimum 8 characters.</FieldHint>
          </FieldGroup>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
