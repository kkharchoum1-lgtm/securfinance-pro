import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/PageHeader';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/format';

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const blank = (number) => ({
  invoice_number: number || '',
  client_name: '',
  project_id: '',
  project_name: '',
  issue_date: todayISO(),
  due_date: plusDays(30),
  items: [{ description: '', quantity: 1, unit_price: 0 }],
  tax_rate: 15,
  notes: '',
  status: 'sent',
  amount_paid: 0,
});

export default function InvoiceDialog({ open, onOpenChange, invoice, projects = [], suggestedNumber, onSaved }) {
  const [form, setForm] = useState(blank(suggestedNumber));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (invoice?.id) {
      setForm({
        ...blank(suggestedNumber),
        ...invoice,
        tax_rate: invoice.tax_rate ?? 15,
        items: invoice.items?.length ? invoice.items : [{ description: '', quantity: 1, unit_price: 0 }],
      });
    } else {
      setForm(blank(suggestedNumber));
    }
  }, [open, invoice, suggestedNumber]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (i, key, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }));

  const subtotal = useMemo(
    () => form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0),
    [form.items]
  );
  const taxAmount = (subtotal * (Number(form.tax_rate) || 0)) / 100;
  const total = subtotal + taxAmount;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.invoice_number.trim()) {
      setError('Client name and invoice number are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        tax_rate: Number(form.tax_rate) || 0,
        subtotal,
        tax_amount: taxAmount,
        total,
        amount_paid: Number(form.amount_paid) || 0,
        items: form.items.filter((i) => i.description || Number(i.unit_price)),
      };
      if (invoice?.id) await base44.entities.Invoice.update(invoice.id, payload);
      else await base44.entities.Invoice.create(payload);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not save the invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[17px]">
            {invoice?.id ? `Invoice ${form.invoice_number}` : 'New invoice'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <Input value={form.client_name} onChange={(e) => set('client_name', e.target.value)} placeholder="Northgate Tower" />
            </Field>
            <Field label="Invoice number">
              <Input value={form.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} />
            </Field>
            <Field label="Project (optional)">
              <Select
                value={form.project_id || 'none'}
                onValueChange={(v) => {
                  const p = projects.find((x) => x.id === v);
                  setForm((f) => ({ ...f, project_id: v === 'none' ? '' : v, project_name: p?.name || '' }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Issue date">
              <Input type="date" value={form.issue_date || ''} onChange={(e) => set('issue_date', e.target.value)} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Line items</div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }))}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => setItem(i, 'description', e.target.value)}
                    placeholder="CCTV cameras + installation"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => setItem(i, 'quantity', e.target.value)}
                    className="w-16 tabular"
                    aria-label="Quantity"
                  />
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => setItem(i, 'unit_price', e.target.value)}
                    className="w-24 tabular"
                    aria-label="Unit price"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, idx) => idx !== i) : f.items }))}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-muted/40 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <Field label="VAT %" className="w-24">
              <Input type="number" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} className="tabular" />
            </Field>
            <div className="tabular space-y-1 text-[12px]">
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>Subtotal</span><span>SAR {money(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>VAT</span><span>SAR {money(taxAmount)}</span>
              </div>
              <div className="flex justify-between gap-8 pt-1 text-[13px] font-medium">
                <span>Total</span><span>SAR {money(total)}</span>
              </div>
            </div>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Payment terms, scope notes…" />
          </Field>

          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}