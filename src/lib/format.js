export function money(value, { compact = false } = {}) {
  const n = Number(value) || 0;
  if (compact) {
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

export function sar(value, opts) {
  return `SAR ${money(value, opts)}`;
}

export function pct(value) {
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function shortDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MS_DAY = 86400000;

export function daysUntil(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / MS_DAY);
}

export function invoiceState(invoice) {
  const total = Number(invoice?.total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  if (invoice?.status === 'draft') return { key: 'draft', label: 'Draft' };
  if (total > 0 && paid >= total - 0.5) return { key: 'paid', label: 'Paid' };
  const days = daysUntil(invoice?.due_date);
  if (days !== null && days < 0) return { key: 'overdue', label: `${Math.abs(days)}d overdue` };
  if (paid > 0) return { key: 'partial', label: 'Part paid' };
  return { key: 'open', label: 'Open' };
}

export function balanceOf(invoice) {
  const total = Number(invoice?.total) || 0;
  const paid = Number(invoice?.amount_paid) || 0;
  return Math.max(0, total - paid);
}

export const STATE_STYLES = {
  paid: 'bg-chart-4/10 text-chart-4 border-chart-4/25',
  overdue: 'bg-destructive/8 text-destructive border-destructive/25',
  partial: 'bg-chart-3/12 text-[hsl(28,88%,34%)] dark:text-[hsl(28,95%,68%)] border-chart-3/35',
  open: 'bg-secondary text-secondary-foreground border-border',
  draft: 'bg-muted text-muted-foreground border-border',
};