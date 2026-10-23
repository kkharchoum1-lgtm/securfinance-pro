import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/PageHeader';
import { base44 } from '@/api/base44Client';
import { EXPENSE_CATEGORIES } from '@/lib/options';

export default function ExpenseDialog({ open, onOpenChange, expense, onSaved }) {
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setCategory(expense?.category || 'other');
    setDescription(expense?.description || '');
    setAmount(expense?.amount != null ? String(expense.amount) : '');
    setDate(expense?.expense_date || new Date().toISOString().slice(0, 10));
    setVendor(expense?.vendor || '');
    setNotes(expense?.notes || '');
  }, [open, expense]);

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
      const payload = { category, description, amount: value, expense_date: date, vendor, notes };
      if (expense?.id) await base44.entities.Expense.update(expense.id, payload);
      else await base44.entities.Expense.create(payload);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not save the expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[17px]">{expense?.id ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount (SAR)">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular" autoFocus />
            </Field>
          </div>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Office rent — October" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paid to">
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}