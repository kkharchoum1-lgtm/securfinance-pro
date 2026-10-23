import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/PageHeader';
import { base44 } from '@/api/base44Client';
import { balanceOf, money } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/options';

export default function PaymentDialog({ open, onOpenChange, invoice, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount(String(balanceOf(invoice) || ''));
    setDate(new Date().toISOString().slice(0, 10));
    setMethod('bank_transfer');
    setReference('');
    setError('');
  }, [open, invoice]);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await base44.entities.Payment.create({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        amount: value,
        payment_date: date,
        method,
        reference,
      });
      const paid = (Number(invoice.amount_paid) || 0) + value;
      await base44.entities.Invoice.update(invoice.id, {
        amount_paid: paid,
        status: paid >= (Number(invoice.total) || 0) - 0.5 ? 'paid' : invoice.status,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[17px]">Record payment</DialogTitle>
        </DialogHeader>
        <div className="-mt-2 text-[12px] text-muted-foreground">
          {invoice.client_name} · balance <span className="tabular text-foreground">SAR {money(balanceOf(invoice))}</span>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (SAR)">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" autoFocus />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Method">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer ref" />
            </Field>
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}