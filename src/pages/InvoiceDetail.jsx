import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Banknote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import DeleteButton from '@/components/DeleteButton';
import InvoiceDialog from '@/components/InvoiceDialog';
import PaymentDialog from '@/components/PaymentDialog';
import { Button } from '@/components/ui/button';
import { balanceOf, invoiceState, money, sar, shortDate } from '@/lib/format';
import { labelFor, PAYMENT_METHODS } from '@/lib/options';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => base44.entities.Invoice.get(id),
  });

  const { data: paymentsPage } = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: () => base44.entities.Payment.filter({ invoice_id: id }, { sort: '-payment_date', limit: 100 }),
  });

  const { data: projectsPage } = useQuery({
    queryKey: ['projects', 'for-invoices'],
    queryFn: () => base44.entities.Project.filter({}, { sort: '-created_date', limit: 200 }),
  });

  const payments = paymentsPage?.items ?? [];
  const projects = projectsPage?.items ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['invoice', id] });
    qc.invalidateQueries({ queryKey: ['invoice-payments', id] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
  };

  if (isLoading) return <div className="py-16 text-center text-[12px] text-muted-foreground">Loading invoice…</div>;
  if (!invoice) return <div className="py-16 text-center text-[13px]">Invoice not found.</div>;

  const state = invoiceState(invoice);
  const balance = balanceOf(invoice);

  const removePayment = async (payment) => {
    await base44.entities.Payment.delete(payment.id);
    const paid = Math.max(0, (Number(invoice.amount_paid) || 0) - (Number(payment.amount) || 0));
    await base44.entities.Invoice.update(invoice.id, {
      amount_paid: paid,
      status: paid >= (Number(invoice.total) || 0) - 0.5 ? 'paid' : invoice.status === 'paid' ? 'sent' : invoice.status,
    });
    refresh();
  };

  const deleteInvoice = async () => {
    const related = await base44.entities.Payment.filter({ invoice_id: invoice.id }, { limit: 100 });
    await Promise.all((related.items ?? []).map((p) => base44.entities.Payment.delete(p.id)));
    await base44.entities.Invoice.delete(invoice.id);
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['payments'] });
    navigate('/invoices');
  };

  return (
    <div className="space-y-6">
      <Link to="/invoices" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All invoices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Invoice {invoice.invoice_number}</div>
          <h1 className="mt-2 font-display text-[34px] leading-none sm:text-[40px]">{invoice.client_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            <StatusPill state={state} />
            <span>Issued {shortDate(invoice.issue_date)}</span>
            <span className="text-border">•</span>
            <span>Due {shortDate(invoice.due_date)}</span>
            {invoice.project_name && (
              <>
                <span className="text-border">•</span>
                <span>{invoice.project_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          {balance > 0 && (
            <Button onClick={() => setPayOpen(true)} className="gap-2">
              <Banknote className="h-4 w-4" /> Record payment
            </Button>
          )}
          <DeleteButton onDelete={deleteInvoice} label="Delete" className="h-9 px-3" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card lg:col-span-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border/70 px-5 py-2.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="w-24 text-right">Amount</span>
          </div>
          {(invoice.items?.length ? invoice.items : [{ description: '—', quantity: 0, unit_price: 0 }]).map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/50 px-5 py-3 text-[13px] last:border-0">
              <span className="min-w-0 truncate">{item.description || '—'}</span>
              <span className="tabular text-right text-[12px] text-muted-foreground">{item.quantity || 0}</span>
              <span className="tabular w-24 text-right">
                {money((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
              </span>
            </div>
          ))}
          <div className="space-y-1.5 border-t border-border/70 bg-muted/30 px-5 py-4 text-[12px] tabular">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>SAR {money(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT ({Number(invoice.tax_rate) || 0}%)</span><span>SAR {money(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between pt-1 text-[14px] font-medium">
              <span>Total</span><span>SAR {money(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Paid</span><span>SAR {money(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between pt-1 text-[13px] font-medium">
              <span>Balance</span><span>{sar(balance)}</span>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-border/80 bg-card">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <h2 className="eyebrow">Payments</h2>
              {balance > 0 && (
                <button onClick={() => setPayOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
            {payments.length === 0 ? (
              <EmptyState title="No payments recorded" description="Record a payment when the client settles this invoice." className="py-8" />
            ) : (
              <ul className="divide-y divide-border/70">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="tabular text-[13px]">{sar(p.amount)}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {shortDate(p.payment_date)} · {labelFor(PAYMENT_METHODS, p.method)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </div>
                    </div>
                    <DeleteButton onDelete={() => removePayment(p)} label="" className="px-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {invoice.notes && (
            <section className="rounded-xl border border-border/80 bg-card p-5">
              <h2 className="eyebrow">Notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">{invoice.notes}</p>
            </section>
          )}
        </div>
      </div>

      <InvoiceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoice={invoice}
        projects={projects}
        suggestedNumber={invoice.invoice_number}
        onSaved={refresh}
      />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} invoice={invoice} onSaved={refresh} />
    </div>
  );
}