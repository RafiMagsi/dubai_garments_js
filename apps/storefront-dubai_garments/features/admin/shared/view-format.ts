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
  if (!status) return 'dg-status-pill';
  if (status === 'success') return 'dg-status-pill';
  if (status === 'failed') return 'dg-status-pill dg-status-pill-LOST';
  if (status === 'running') return 'dg-status-pill dg-status-pill-NEW';
  if (status === 'queued') return 'dg-status-pill dg-status-pill-QUALIFIED';
  return 'dg-status-pill';
}
