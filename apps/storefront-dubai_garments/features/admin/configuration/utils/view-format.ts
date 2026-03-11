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
  if (!status) return 'dg-status-pill';
  if (status === 'success') return 'dg-status-pill';
  if (status === 'failed') return 'dg-status-pill dg-status-pill-LOST';
  if (status === 'running') return 'dg-status-pill dg-status-pill-NEW';
  if (status === 'queued') return 'dg-status-pill dg-status-pill-QUALIFIED';
  return 'dg-status-pill';
}
