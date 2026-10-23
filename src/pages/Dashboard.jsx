import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, FileText, FolderKanban, Receipt, ArrowRight } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProfitSummary from '@/components/ProfitSummary';
import RevenueTrendChart from '@/components/RevenueTrendChart';
import StatusPill from '@/components/StatusPill';
import InvoiceDialog from '@/components/InvoiceDialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { balanceOf, invoiceState, money, sar, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const monthsBack = (n) => {
  const list = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
    });
  }
  return list;
};

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border/80 bg-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
        <h2 className="eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

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

export default function Dashboard() {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const qc = useQueryClient();

  const { data: invoicesPage } = useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: () => base44.entities.Invoice.filter({}, { limit: 500 }),
  });
  const { data: paymentsPage } = useQuery({
    queryKey: ['payments', 'dashboard'],
    queryFn: () => base44.entities.Payment.filter({}, { limit: 1000 }),
  });
  const { data: expensesPage } = useQuery({
    queryKey: ['expenses', 'all'],
    queryFn: () => base44.entities.Expense.filter({}, { limit: 1000 }),
  });
  const { data: costsPage } = useQuery({
    queryKey: ['project-costs', 'all'],
    queryFn: () => base44.entities.ProjectCost.filter({}, { limit: 1000 }),
  });
  const { data: projectsPage } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({}, { sort: '-created_date', limit: 200 }),
  });

  const invoices = useMemo(() => invoicesPage?.items ?? [], [invoicesPage]);
  const payments = useMemo(() => paymentsPage?.items ?? [], [paymentsPage]);
  const expenses = useMemo(() => expensesPage?.items ?? [], [expensesPage]);
  const costs = useMemo(() => costsPage?.items ?? [], [costsPage]);
  const projects = useMemo(() => projectsPage?.items ?? [], [projectsPage]);

  const costByProject = useMemo(() => {
    const map = {};
    costs.forEach((c) => {
      map[c.project_id] = (map[c.project_id] || 0) + (Number(c.amount) || 0);
    });
    return map;
  }, [costs]);

  const stats = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const receivedThisMonth = payments
      .filter((p) => String(p.payment_date || '').startsWith(monthKey))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const invoiced = invoices
      .filter((i) => i.status !== 'draft')
      .reduce((s, i) => s + (Number(i.total) || 0), 0);

    const openInvoices = invoices.filter((i) => i.status !== 'draft' && balanceOf(i) > 0);
    const outstanding = openInvoices.reduce((s, i) => s + balanceOf(i), 0);

    const projectCosts = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const profit = revenue - projectCosts - expenseTotal;

    return {
      receivedThisMonth,
      revenue,
      invoiced,
      collected: invoiced > 0 ? Math.min(100, (revenue / invoiced) * 100) : 0,
      outstanding,
      openCount: openInvoices.length,
      projectCosts,
      expenseTotal,
      totalCosts: projectCosts + expenseTotal,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }, [invoices, payments, expenses, costs]);

  const cashflow = useMemo(() => {
    const buckets = monthsBack(6).map((m) => ({ ...m, inflow: 0, outflow: 0 }));
    const find = (date) => buckets.find((b) => String(date || '').startsWith(b.key));
    payments.forEach((p) => {
      const b = find(p.payment_date);
      if (b) b.inflow += Number(p.amount) || 0;
    });
    expenses.forEach((e) => {
      const b = find(e.expense_date);
      if (b) b.outflow += Number(e.amount) || 0;
    });
    costs.forEach((c) => {
      const b = find(c.cost_date);
      if (b) b.outflow += Number(c.amount) || 0;
    });
    return buckets;
  }, [payments, expenses, costs]);

  const awaiting = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'draft' && balanceOf(i) > 0)
        .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))
        .slice(0, 4),
    [invoices]
  );

  const topProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (Number(b.contract_value) || 0) - (Number(a.contract_value) || 0))
        .slice(0, 4),
    [projects]
  );

  const isEmpty = invoices.length === 0 && projects.length === 0 && expenses.length === 0;

  const nextNumber = useMemo(() => {
    const nums = invoices
      .map((i) => parseInt(String(i.invoice_number || '').replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    return `INV-${(nums.length ? Math.max(...nums) : 2040) + 1}`;
  }, [invoices]);

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Financial overview</div>
          <h1 className="mt-2 font-display text-[38px] leading-none sm:text-[44px]">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[12px] text-muted-foreground sm:block">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <Button onClick={() => setInvoiceOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        </div>
      </header>

      <ProfitSummary
        revenue={stats.revenue}
        invoiced={stats.invoiced}
        collected={stats.collected}
        projectCosts={stats.projectCosts}
        expenseTotal={stats.expenseTotal}
        profit={stats.profit}
        margin={stats.margin}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Received this month" value={stats.receivedThisMonth} hint="Payments recorded" />
        <StatCard
          label="Outstanding"
          value={stats.outstanding}
          hint={stats.openCount === 0 ? 'Nothing owed right now' : `${stats.openCount} invoices awaiting payment`}
          tone={stats.outstanding > 0 ? 'danger' : 'default'}
        />
        <StatCard label="Total costs" value={stats.totalCosts} hint="Project costs plus expenses" />
      </div>

      <RevenueTrendChart payments={payments} />

      {isEmpty ? (
        <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-8">
          <div className="eyebrow">Start here</div>
          <h2 className="mt-2 font-display text-[26px] leading-tight">Your books are empty</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Add a project, issue an invoice, or log a bill — everything on this page builds itself from what you enter.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { to: '/projects', icon: FolderKanban, title: 'Add a project', text: 'Contract value and job costs' },
              { to: '/invoices', icon: FileText, title: 'Issue an invoice', text: 'Bill a client and track payment' },
              { to: '/expenses', icon: Receipt, title: 'Log an expense', text: 'Rent, salaries, software' },
            ].map(({ to, icon: Icon, title, text }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-lg border border-border/80 p-4 transition-colors hover:border-border hover:bg-muted/40"
              >
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
                <div className="mt-3 flex items-center gap-1.5 text-[13px] font-medium">
                  {title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted-foreground">{text}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title="Cash flow"
            action={
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-1" /> In</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-2" /> Out</span>
              </div>
            }
          >
            <div className="h-[268px] px-2 pb-3 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflow} barGap={4} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                  <Bar dataKey="inflow" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="outflow" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Awaiting payment"
            action={
              <Link to="/invoices" className="text-[11px] text-muted-foreground hover:text-foreground">All invoices</Link>
            }
          >
            {awaiting.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">Every invoice is settled.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {awaiting.map((inv) => {
                  const state = invoiceState(inv);
                  return (
                    <li key={inv.id}>
                      <Link to={`/invoices/${inv.id}`} className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-muted/50">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{inv.client_name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {inv.invoice_number} · due {shortDate(inv.due_date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="tabular text-[13px]">{sar(balanceOf(inv))}</div>
                          <div className="mt-1"><StatusPill state={state} /></div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {!isEmpty && (
        <Panel
          title="Project profitability"
          action={<Link to="/projects" className="text-[11px] text-muted-foreground hover:text-foreground">All projects</Link>}
        >
          {topProjects.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="divide-y divide-border/70">
              {topProjects.map((p) => {
                const cost = costByProject[p.id] || 0;
                const contract = Number(p.contract_value) || 0;
                const profit = contract - cost;
                const margin = contract > 0 ? (profit / contract) * 100 : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block px-5 py-4 hover:bg-muted/40">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{p.name}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.client_name || 'No client'}</div>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-4 text-[12px] tabular">
                        <span className="hidden text-muted-foreground sm:inline">{money(cost)} cost</span>
                        <span className="font-medium">{sar(profit)}</span>
                        <span className={cn('w-12 text-right', profit >= 0 ? 'text-chart-4' : 'text-destructive')}>
                          {contract > 0 ? `${margin.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', profit >= 0 ? 'bg-chart-1' : 'bg-destructive')}
                        style={{ width: `${Math.min(100, Math.max(2, margin))}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      <InvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        projects={projects}
        suggestedNumber={nextNumber}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['invoices'] });
          qc.invalidateQueries({ queryKey: ['projects'] });
        }}
      />
    </div>
  );
}