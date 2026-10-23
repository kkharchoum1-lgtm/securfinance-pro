import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/PageHeader';
import { base44 } from '@/api/base44Client';
import { PROJECT_CATEGORIES } from '@/lib/options';

export default function ProjectCostDialog({ open, onOpenChange, project, onSaved }) {
  const [category, setCategory] = useState('equipment');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory('equipment');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setVendor('');
    setError('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter a cost amount greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await base44.entities.ProjectCost.create({
        project_id: project.id,
        project_name: project.name,
        category,
        description,
        amount: value,
        cost_date: date,
        vendor,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not save the cost.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[17px]">Add project cost</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map((c) => (
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
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="16 IP cameras, model AX-40" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor">
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add cost'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}