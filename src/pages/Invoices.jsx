import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatusPill from '@/components/StatusPill';
import InvoiceDialog from '@/components/InvoiceDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invoiceState, sar, shortDate, money } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'draft', label: 'Drafts' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function buildQuery(tab, search) {
  const clauses = [];
  if (tab === 'unpaid') clauses.push({ status: 'sent' });
  if (tab === 'paid') clauses.push({ status: 'paid' });
  if (tab === 'draft') clauses.push({ status: 'draft' });
  if (tab === 'overdue') {
    clauses.push({ status: 'sent' });
    clauses.push({ due_date: { $lt: todayISO() } });
  }
  const q = search.trim();
  if (q) {
    clauses.push({
      $or: [
        { client_name: { $regex: q, $options: 'i' } },
        { invoice_number: { $regex: q, $options: 'i' } },
      ],
    });
  }
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

export default function Invoices() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allPage } = useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: () => base44.entities.Invoice.filter({}, { limit: 500 }),
  });

  const { data: page, isLoading } = useQuery({
    queryKey: ['invoices', tab, debounced],
    queryFn: () => base44.entities.Invoice.filter(buildQuery(tab, debounced), { sort: '-issue_date', limit: 200 }),
  });

  const { data: projectsPage } = useQuery({
    queryKey: ['projects', 'for-invoices'],
    queryFn: () => base44.entities.Project.filter({}, { sort: '-created_date', limit: 200 }),
  });

  const invoices = page?.items ?? [];
  const allInvoices = allPage?.items ?? [];
  const projects = projectsPage?.items ?? [];

  const summary = useMemo(() => {
    const live = allInvoices.filter((i) => i.status !== 'draft');
    const invoiced = live.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const collected = live.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);
    return { invoiced, collected, outstanding: invoiced - collected };
  }, [allInvoices]);

  const nextNumber = useMemo(() => {
    const nums = allInvoices
      .map((i) => parseInt(String(i.invoice_number || '').replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    return `INV-${(nums.length ? Math.max(...nums) : 2040) + 1}`;
  }, [allInvoices]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Every quote and invoice issued, what has been collected, and what clients still owe."
        action={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New invoice
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 sm:grid-cols-3">
        {[
          { label: 'Invoiced', value: summary.invoiced },
          { label: 'Collected', value: summary.collected },
          { label: 'Outstanding', value: summary.outstanding, danger: true },
        ].map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <div className="eyebrow">{s.label}</div>
            <div className={cn('display-number mt-2 text-[22px]', s.danger && summary.outstanding > 0 && 'text-destructive')}>
              SAR {money(s.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] transition-colors',
                tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or number"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
        <div className="hidden grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_1fr] gap-4 border-b border-border/70 px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:grid">
          <span>Client</span>
          <span>Issued</span>
          <span>Due</span>
          <span className="text-right">Total</span>
          <span className="text-right">Balance</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-14 text-center text-[12px] text-muted-foreground">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={allInvoices.length === 0 ? 'No invoices yet' : 'Nothing matches this view'}
            description={
              allInvoices.length === 0
                ? 'Create your first invoice and it will show up here with its payment status.'
                : 'Try another filter or a different search term.'
            }
            action={
              allInvoices.length === 0 ? (
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> New invoice
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y divide-border/70">
            {invoices.map((inv) => {
              const state = invoiceState(inv);
              const balance = (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0);
              return (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-muted/50 sm:grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_1fr] sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{inv.client_name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{inv.invoice_number}</div>
                  </div>
                  <div className="hidden text-[12px] text-muted-foreground sm:block">{shortDate(inv.issue_date)}</div>
                  <div className="hidden text-[12px] text-muted-foreground sm:block">{shortDate(inv.due_date)}</div>
                  <div className="tabular hidden text-right text-[13px] sm:block">SAR {money(inv.total)}</div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="tabular text-[13px] sm:hidden">SAR {money(balance)}</span>
                    <div className="text-right">
                      <div className="tabular hidden text-[13px] sm:block">{sar(balance)}</div>
                      <div className="mt-1 sm:mt-0.5">
                        <StatusPill state={state} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects}
        suggestedNumber={nextNumber}
        onSaved={() => qc.invalidateQueries({ queryKey: ['invoices'] })}
      />
    </div>
  );
}