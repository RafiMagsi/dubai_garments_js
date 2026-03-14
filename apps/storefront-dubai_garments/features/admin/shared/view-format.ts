import { statusBadgeClass as sharedStatusBadgeClass } from '@/lib/ui/status-badge';

export function titleCase(value: string) {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export function shortCode(value?: string | null, size = 6) {
  if (!value) return '-';
  return value.slice(0, size).toUpperCase();
}

export function statusBadgeClass(status?: string | null) {
  return sharedStatusBadgeClass(status);
}
