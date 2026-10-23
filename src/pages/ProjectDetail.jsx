import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Receipt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import DeleteButton from '@/components/DeleteButton';
import ProjectDialog from '@/components/ProjectDialog';
import ProjectCostDialog from '@/components/ProjectCostDialog';
import { Button } from '@/components/ui/button';
import { money, sar, shortDate } from '@/lib/format';
import { labelFor, PROJECT_CATEGORIES, PROJECT_STATUSES } from '@/lib/options';
import { cn } from '@/lib/utils';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Project.get(id),
  });

  const { data: costsPage } = useQuery({
    queryKey: ['project-costs', id],
    queryFn: () => base44.entities.ProjectCost.filter({ project_id: id }, { sort: '-cost_date', limit: 500 }),
  });

  const { data: invoicesPage } = useQuery({
    queryKey: ['project-invoices', id],
    queryFn: () => base44.entities.Invoice.filter({ project_id: id }, { sort: '-issue_date', limit: 200 }),
  });

  const costs = costsPage?.items ?? [];
  const invoices = invoicesPage?.items ?? [];

  const stats = useMemo(() => {
    const spent = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const contract = Number(project?.contract_value) || 0;
    const billed = invoices.filter((i) => i.status !== 'draft').reduce((s, i) => s + (Number(i.total) || 0), 0);
    const collected = invoices.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);
    const profit = contract - spent;
    return { spent, contract, billed, collected, profit, margin: contract > 0 ? (profit / contract) * 100 : 0 };
  }, [costs, invoices, project]);

  const byCategory = useMemo(() => {
    const map = {};
    costs.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + (Number(c.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [costs]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['project', id] });
    qc.invalidateQueries({ queryKey: ['project-costs', id] });
    qc.invalidateQueries({ queryKey: ['project-costs', 'all'] });
    qc.invalidateQueries({ queryKey: ['projects'] });
  };

  if (isLoading) return <div className="py-16 text-center text-[12px] text-muted-foreground">Loading project…</div>;
  if (!project) return <div className="py-16 text-center text-[13px]">Project not found.</div>;

  const deleteProject = async () => {
    await Promise.all(costs.map((c) => base44.entities.ProjectCost.delete(c.id)));
    await base44.entities.Project.delete(project.id);
    qc.invalidateQueries({ queryKey: ['projects'] });
    qc.invalidateQueries({ queryKey: ['project-costs', 'all'] });
    navigate('/projects');
  };

  const removeCost = async (cost) => {
    await base44.entities.ProjectCost.delete(cost.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">{labelFor(PROJECT_STATUSES, project.status)} project</div>
          <h1 className="mt-2 font-display text-[34px] leading-none sm:text-[40px]">{project.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <span>{project.client_name || 'No client'}</span>
            {project.start_date && (
              <>
                <span className="text-border">•</span>
                <span>
                  {shortDate(project.start_date)}
                  {project.end_date ? ` – ${shortDate(project.end_date)}` : ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button onClick={() => setCostOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add cost
          </Button>
          <DeleteButton onDelete={deleteProject} label="Delete" className="h-9 px-3" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/80 bg-border/70 lg:grid-cols-4">
        {[
          { label: 'Contract value', value: stats.contract },
          { label: 'Cost to date', value: stats.spent },
          { label: 'Profit', value: stats.profit, tone: stats.profit >= 0 ? 'positive' : 'danger' },
          { label: 'Billed / collected', value: stats.collected, hint: `${sar(stats.billed)} billed` },
        ].map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <div className="eyebrow">{s.label}</div>
            <div
              className={cn(
                'display-number mt-2 text-[20px]',
                s.tone === 'positive' && 'text-chart-4',
                s.tone === 'danger' && 'text-destructive'
              )}
            >
              SAR {money(s.value)}
            </div>
            {s.hint ? (
              <div className="mt-1 text-[11px] text-muted-foreground">{s.hint}</div>
            ) : s.label === 'Profit' ? (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {stats.contract > 0 ? `${stats.margin.toFixed(0)}% margin` : 'Set a contract value'}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <h2 className="eyebrow">Costs</h2>
            <button onClick={() => setCostOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {costs.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No costs recorded"
              description="Add equipment, labour and subcontractor costs to see this project's real margin."
              action={<Button variant="outline" onClick={() => setCostOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add cost</Button>}
            />
          ) : (
            <div className="divide-y divide-border/70">
              {costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px]">{c.description || labelFor(PROJECT_CATEGORIES, c.category)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {labelFor(PROJECT_CATEGORIES, c.category)}
                      {c.vendor ? ` · ${c.vendor}` : ''} · {shortDate(c.cost_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-[13px]">{money(c.amount)}</span>
                    <DeleteButton onDelete={() => removeCost(c)} label="" className="px-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-border/80 bg-card p-5">
            <h2 className="eyebrow">Where the money went</h2>
            {byCategory.length === 0 ? (
              <p className="mt-3 text-[12px] text-muted-foreground">No costs yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {byCategory.map(([cat, amount]) => {
                  const share = stats.spent > 0 ? (amount / stats.spent) * 100 : 0;
                  return (
                    <li key={cat}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="text-muted-foreground">{labelFor(PROJECT_CATEGORIES, cat)}</span>
                        <span className="tabular">{money(amount)}</span>
                      </div>
                      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-2" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/80 bg-card">
            <div className="border-b border-border/70 px-5 py-3.5">
              <h2 className="eyebrow">Linked invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <p className="px-5 py-5 text-[12px] text-muted-foreground">No invoices linked to this project yet.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link to={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50">
                      <div>
                        <div className="text-[12.5px]">{inv.invoice_number}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{shortDate(inv.issue_date)}</div>
                      </div>
                      <span className="tabular text-[12.5px]">{money(inv.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {project.notes && (
            <section className="rounded-xl border border-border/80 bg-card p-5">
              <h2 className="eyebrow">Notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">{project.notes}</p>
            </section>
          )}
        </div>
      </div>

      <ProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} onSaved={refresh} />
      <ProjectCostDialog open={costOpen} onOpenChange={setCostOpen} project={project} onSaved={refresh} />
    </div>
  );
}