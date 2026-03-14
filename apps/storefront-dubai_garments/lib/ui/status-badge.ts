export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

function normalizeStatus(status?: string | null) {
  return (status || '').trim().toLowerCase();
}

export function getStatusTone(status?: string | null): StatusTone {
  const normalized = normalizeStatus(status);

  if (!normalized) return 'neutral';
  if (['new', 'running', 'queued', 'draft', 'active'].includes(normalized)) return 'info';
  if (['qualified', 'quoted', 'negotiation', 'sent', 'pending'].includes(normalized)) return 'warning';
  if (['won', 'approved', 'success', 'healthy', 'completed'].includes(normalized)) return 'success';
  if (['lost', 'failed', 'rejected', 'error', 'down'].includes(normalized)) return 'danger';
  if (['expired', 'inactive', 'archived'].includes(normalized)) return 'neutral';

  return 'neutral';
}

export function statusBadgeClass(status?: string | null) {
  const tone = getStatusTone(status);
  return `dg-status-pill dg-status-pill-${tone}`;
}
