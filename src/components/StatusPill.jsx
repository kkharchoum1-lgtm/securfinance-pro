import { cn } from '@/lib/utils';
import { STATE_STYLES } from '@/lib/format';

export default function StatusPill({ state, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium',
        STATE_STYLES[state.key] || STATE_STYLES.open,
        className
      )}
    >
      <span
        className={cn(
          'h-1 w-1 rounded-full',
          state.key === 'paid' && 'bg-chart-4',
          state.key === 'overdue' && 'bg-destructive',
          state.key === 'partial' && 'bg-chart-3',
          (state.key === 'open' || state.key === 'draft') && 'bg-muted-foreground/50'
        )}
      />
      {state.label}
    </span>
  );
}