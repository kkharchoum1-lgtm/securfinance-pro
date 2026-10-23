import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, sar } from '@/lib/format';

function buildMonths(count) {
  const rows = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      full: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      revenue: 0,
    });
  }
  return rows;
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm">
      <div className="mb-1 text-[11px] text-muted-foreground">{row.full}</div>
      <div className="tabular text-[12px]">{sar(row.revenue)}</div>
    </div>
  );
}

export default function RevenueTrendChart({ payments }) {
  const data = useMemo(() => {
    const rows = buildMonths(12);
    const byKey = new Map(rows.map((r) => [r.key, r]));
    (payments || []).forEach((p) => {
      const row = byKey.get(String(p.payment_date || '').slice(0, 7));
      if (row) row.revenue += Number(p.amount) || 0;
    });
    return rows;
  }, [payments]);

  const total = data.reduce((s, r) => s + r.revenue, 0);
  const best = data.reduce((a, b) => (b.revenue > a.revenue ? b : a), data[0]);

  return (
    <section className="rounded-xl border border-border/80 bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="eyebrow">Revenue trend</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="display-number text-[22px] leading-none">{sar(total)}</span>
            <span className="text-[11px] text-muted-foreground">last 12 months</span>
          </div>
        </div>
        {total > 0 && (
          <div className="text-[11px] text-muted-foreground">
            Best month <span className="text-foreground">{best.full}</span> · {money(total / 12)} avg per month
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="px-5 py-12 text-center text-[12px] text-muted-foreground">
          No payments recorded in the last 12 months.
        </p>
      ) : (
        <div className="h-[248px] px-2 pb-3 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={46}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'hsl(var(--chart-1))', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#revenueFill)"
                activeDot={{ r: 4, fill: 'hsl(var(--chart-1))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}