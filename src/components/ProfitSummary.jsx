import { cn } from '@/lib/utils';
import { sar } from '@/lib/format';

export default function ProfitSummary({
  revenue,
  invoiced,
  collected,
  projectCosts,
  expenseTotal,
  profit,
  margin,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6">
        <div className="eyebrow">Total revenue</div>
        <div className="display-number mt-3 text-[36px] leading-none sm:text-[42px]">{sar(revenue)}</div>
        <div className="mt-2.5 text-[12px] text-muted-foreground">
          Collected from clients · {sar(invoiced)} invoiced
        </div>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(1, collected)}%` }} />
        </div>
        <div className="tabular mt-2 text-[11px] text-muted-foreground">
          {invoiced > 0 ? `${collected.toFixed(0)}% of invoiced value collected` : 'No invoices issued yet'}
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6">
        <div className="eyebrow">Net profit</div>
        <div
          className={cn(
            'display-number mt-3 text-[36px] leading-none sm:text-[42px]',
            profit > 0 && 'text-chart-4',
            profit < 0 && 'text-destructive'
          )}
        >
          {sar(profit)}
        </div>
        <div className="mt-2.5 text-[12px] text-muted-foreground">
          Revenue minus {sar(projectCosts + expenseTotal)} of costs
          {revenue > 0 && ` · ${margin.toFixed(0)}% margin`}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Project costs <span className="tabular text-foreground">{sar(projectCosts)}</span>
          </span>
          <span>
            Expenses <span className="tabular text-foreground">{sar(expenseTotal)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}