import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/PageHeader';
import { base44 } from '@/api/base44Client';
import { PROJECT_STATUSES } from '@/lib/options';

const blank = {
  name: '',
  client_name: '',
  status: 'active',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  contract_value: '',
  notes: '',
};

export default function ProjectDialog({ open, onOpenChange, project, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(project?.id ? { ...blank, ...project } : blank);
  }, [open, project]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Give the project a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, contract_value: Number(form.contract_value) || 0 };
      if (project?.id) await base44.entities.Project.update(project.id, payload);
      else await base44.entities.Project.create(payload);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Could not save the project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-[17px]">{project?.id ? 'Edit project' : 'New project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Project name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Northgate CCTV retrofit" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <Input value={form.client_name || ''} onChange={(e) => set('client_name', e.target.value)} placeholder="Northgate Tower" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start date">
              <Input type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.end_date || ''} onChange={(e) => set('end_date', e.target.value)} />
            </Field>
            <Field label="Contract value (SAR)" className="sm:col-span-2">
              <Input type="number" value={form.contract_value} onChange={(e) => set('contract_value', e.target.value)} className="tabular" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </Field>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}