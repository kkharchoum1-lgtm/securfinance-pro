import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import DeleteButton from '@/components/DeleteButton';
import ExpenseDialog from '@/components/ExpenseDialog';
import { Button } from '@/components/ui/button';
import { money, shortDate } from '@/lib/format';
import { EXPENSE_CATEGORIES, labelFor } from '@/lib/options';
import { cn } from '@/lib/utils';

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function Expenses() {
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: allPage } = useQuery({
    queryKey: ['expenses', 'all'],
    queryFn: () => base44.entities.Expense.filter({}, { limit: 1000 }),
  });

  const { data: page, isLoading } = useQuery({
    queryKey: ['expenses', category],
    queryFn: () =>
      base44.entities.Expense.filter(
        category === 'all' ? {} : { category },
        { sort: '-expense_date', limit: 300 }
      ),
  });

  const all = allPage?.items ?? [];
  const expenses = page?.items ?? [];

  const stats = useMemo(() => {
    const thisMonth = monthKey(new Date());
    const month = all.filter((e) => String(e.expense_date || '').startsWith(thisMonth));
    const monthTotal = month.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const total = all.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { monthTotal, monthCount: month.length, total };
  }, [all]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['expenses', 'all'] });
  };

  const remove = async (expense) => {
    await base44.entities.Expense.delete(expense.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Running costs"
        title="Expenses"
        description="Rent, salaries, software and everything else the business spends outside a project."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 sm:grid-cols-2">
        <div className="bg-card px-5 py-4">
          <div className="eyebrow">This month</div>
          <div className="display-number mt-2 text-[22px]">SAR {money(stats.monthTotal)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{stats.monthCount} entries</div>
        </div>
        <div className="bg-card px-5 py-4">
          <div className="eyebrow">Logged all time</div>
          <div className="display-number mt-2 text-[22px]">SAR {money(stats.total)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{all.length} entries</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ value: 'all', label: 'All' }, ...EXPENSE_CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11.5px] transition-colors',
              category === c.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
        {isLoading ? (
          <div className="py-16 text-center text-[12px] text-muted-foreground">Loading expenses…</div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={all.length === 0 ? 'No expenses yet' : 'Nothing in this category'}
            description={
              all.length === 0
                ? 'Log a bill and it will feed straight into your monthly cash flow.'
                : 'Pick another category to see those entries.'
            }
            action={
              all.length === 0 ? (
                <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Add expense
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="divide-y divide-border/70">
            {expenses.map((e) => (
              <div key={e.id} className="group flex items-center justify-between gap-4 px-5 py-3.5">
                <button
                  onClick={() => { setEditing(e); setOpen(true); }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[13px]">{e.description || labelFor(EXPENSE_CATEGORIES, e.category)}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {labelFor(EXPENSE_CATEGORIES, e.category)}
                    {e.vendor ? ` · ${e.vendor}` : ''} · {shortDate(e.expense_date)}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular text-[13px]">SAR {money(e.amount)}</span>
                  <DeleteButton onDelete={() => remove(e)} label="" className="px-1.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseDialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        expense={editing}
        onSaved={refresh}
      />
    </div>
  );
}