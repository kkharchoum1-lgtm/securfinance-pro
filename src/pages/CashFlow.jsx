import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

const monthsBack = (n) => {
  const list = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      full: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    });
  }
  return list;
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tabular text-[12px]">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: p.color }} />
          <span className="capitalize text-muted-foreground">{p.dataKey}</span> SAR {money(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function CashFlow() {
  const range = useMemo(() => monthsBack(6), []);
  const from = `${range[0].key}-01`;

  const { data: paymentsPage, isLoading: loadingIn } = useQuery({
    queryKey: ['payments', 'cashflow', from],
    queryFn: () => base44.entities.Payment.filter({ payment_date: { $gte: from } }, { limit: 1000 }),
  });
  const { data: expensesPage } = useQuery({
    queryKey: ['expenses', 'cashflow', from],
    queryFn: () => base44.entities.Expense.filter({ expense_date: { $gte: from } }, { limit: 1000 }),
  });
  const { data: costsPage } = useQuery({
    queryKey: ['project-costs', 'cashflow', from],
    queryFn: () => base44.entities.ProjectCost.filter({ cost_date: { $gte: from } }, { limit: 1000 }),
  });

  const rows = useMemo(() => {
    const buckets = range.map((m) => ({ ...m, inflow: 0, operating: 0, projects: 0, outflow: 0, net: 0 }));
    const find = (date) => buckets.find((b) => String(date || '').startsWith(b.key));

    (paymentsPage?.items ?? []).forEach((p) => {
      const b = find(p.payment_date);
      if (b) b.inflow += Number(p.amount) || 0;
    });
    (expensesPage?.items ?? []).forEach((e) => {
      const b = find(e.expense_date);
      if (b) b.operating += Number(e.amount) || 0;
    });
    (costsPage?.items ?? []).forEach((c) => {
      const b = find(c.cost_date);
      if (b) b.projects += Number(c.amount) || 0;
    });

    buckets.forEach((b) => {
      b.outflow = b.operating + b.projects;
      b.net = b.inflow - b.outflow;
    });
    return buckets;
  }, [range, paymentsPage, expensesPage, costsPage]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          inflow: acc.inflow + r.inflow,
          outflow: acc.outflow + r.outflow,
          operating: acc.operating + r.operating,
          projects: acc.projects + r.projects,
        }),
        { inflow: 0, outflow: 0, operating: 0, projects: 0 }
      ),
    [rows]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Six month view"
        title="Cash flow"
        description="Money that actually moved: payments received against expenses and project costs."
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 sm:grid-cols-3">
        {[
          { label: 'Cash in', value: totals.inflow },
          { label: 'Cash out', value: totals.outflow },
          { label: 'Net', value: totals.inflow - totals.outflow, signed: true },
        ].map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <div className="eyebrow">{s.label}</div>
            <div
              className={cn(
                'display-number mt-2 text-[22px]',
                s.signed && totals.inflow - totals.outflow < 0 && 'text-destructive',
                s.signed && totals.inflow - totals.outflow >= 0 && 'text-chart-4'
              )}
            >
              SAR {money(s.value)}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border/80 bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <h2 className="eyebrow">Monthly movement</h2>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-1" /> In</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-2" /> Out</span>
          </div>
        </div>
        <div className="h-[280px] px-2 pb-3 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barGap={4} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={6} />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={46}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="inflow" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="outflow" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border/80 bg-card">
        <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-border/70 px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:grid">
          <span>Month</span>
          <span className="text-right">Received</span>
          <span className="text-right">Expenses</span>
          <span className="text-right">Project costs</span>
          <span className="text-right">Net</span>
        </div>
        {loadingIn ? (
          <div className="py-14 text-center text-[12px] text-muted-foreground">Loading cash flow…</div>
        ) : (
          <div className="divide-y divide-border/70">
            {[...rows].reverse().map((r) => (
              <div key={r.key} className="grid grid-cols-2 items-center gap-2 px-5 py-3 text-[12.5px] sm:grid-cols-[1fr_1fr_1fr_1fr_1fr] sm:gap-4">
                <div className="font-medium">{r.full}</div>
                <div className="tabular text-right">{money(r.inflow)}</div>
                <div className="tabular text-right text-muted-foreground">{money(r.operating)}</div>
                <div className="tabular text-right text-muted-foreground">{money(r.projects)}</div>
                <div className={cn('tabular col-span-2 text-right font-medium sm:col-span-1', r.net >= 0 ? 'text-chart-4' : 'text-destructive')}>
                  {r.net < 0 ? '−' : ''}
                  {money(Math.abs(r.net))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}