export const PROJECT_CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'labour', label: 'Labour' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'permits', label: 'Permits' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'software', label: 'Software' },
  { value: 'fuel', label: 'Fuel & vehicles' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
];

export function labelFor(list, value) {
  return list.find((x) => x.value === value)?.label || value || '—';
}