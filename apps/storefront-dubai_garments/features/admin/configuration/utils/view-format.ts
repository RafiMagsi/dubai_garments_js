import { statusBadgeClass as sharedStatusBadgeClass } from '@/lib/ui/status-badge';

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusBadgeClass(status?: string | null) {
  return sharedStatusBadgeClass(status);
}
