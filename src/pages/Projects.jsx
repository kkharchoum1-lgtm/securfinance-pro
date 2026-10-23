import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ProjectDialog from '@/components/ProjectDialog';
import { Button } from '@/components/ui/button';
import { money, sar } from '@/lib/format';
import { labelFor, PROJECT_STATUSES } from '@/lib/options';
import { cn } from '@/lib/utils';

export default function Projects() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: projectsPage, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({}, { sort: '-created_date', limit: 200 }),
  });
  const { data: costsPage } = useQuery({
    queryKey: ['project-costs', 'all'],
    queryFn: () => base44.entities.ProjectCost.filter({}, { limit: 1000 }),
  });

  const projects = projectsPage?.items ?? [];
  const costs = costsPage?.items ?? [];

  const costByProject = useMemo(() => {
    const map = {};
    costs.forEach((c) => {
      map[c.project_id] = (map[c.project_id] || 0) + (Number(c.amount) || 0);
    });
    return map;
  }, [costs]);

  const totals = useMemo(() => {
    const contract = projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);
    const spent = projects.reduce((s, p) => s + (costByProject[p.id] || 0), 0);
    return { contract, spent, profit: contract - spent };
  }, [projects, costByProject]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job costing"
        title="Projects"
        description="Each installation job with its contract value, what it has cost so far, and the margin it is making."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 sm:grid-cols-3">
        {[
          { label: 'Contract value', value: totals.contract },
          { label: 'Cost to date', value: totals.spent },
          { label: 'Profit', value: totals.profit, positive: true },
        ].map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <div className="eyebrow">{s.label}</div>
            <div className={cn('display-number mt-2 text-[22px]', s.positive && totals.profit >= 0 && 'text-chart-4')}>
              SAR {money(s.value)}
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border/80 bg-card py-16 text-center text-[12px] text-muted-foreground">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Add a job, add its equipment and labour costs, and the margin is calculated for you."
            action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New project</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const cost = costByProject[p.id] || 0;
            const contract = Number(p.contract_value) || 0;
            const profit = contract - cost;
            const margin = contract > 0 ? (profit / contract) * 100 : 0;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="group rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium">{p.name}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{p.client_name || 'No client'}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {labelFor(PROJECT_STATUSES, p.status)}
                  </span>
                </div>

                <div className="mt-5 flex items-baseline justify-between">
                  <span className="display-number text-[22px]">{sar(profit, { compact: true })}</span>
                  <span className={cn('tabular text-[12px]', profit >= 0 ? 'text-chart-4' : 'text-destructive')}>
                    {contract > 0 ? `${margin.toFixed(0)}% margin` : 'No contract value'}
                  </span>
                </div>
                <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', profit >= 0 ? 'bg-chart-1' : 'bg-destructive')}
                    style={{ width: `${Math.min(100, Math.max(3, margin))}%` }}
                  />
                </div>
                <div className="tabular mt-3 flex justify-between text-[11px] text-muted-foreground">
                  <span>Cost {money(cost)}</span>
                  <span>Contract {money(contract)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ['projects'] })} />
    </div>
  );
}