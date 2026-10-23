import { cn } from '@/lib/utils';
import { sar } from '@/lib/format';

export default function StatCard({ label, value, hint, tone = 'default', compact = false }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-5">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          'display-number mt-3 text-[28px] leading-none sm:text-[32px]',
          tone === 'danger' && 'text-destructive',
          tone === 'positive' && 'text-chart-4'
        )}
      >
        {compact ? sar(value, { compact: true }) : sar(value)}
      </div>
      {hint && <div className="mt-2.5 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}