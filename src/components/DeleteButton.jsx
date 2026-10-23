import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DeleteButton({ onDelete, className, label = 'Delete' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? onDelete() : setArmed(true))}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors',
        armed
          ? 'bg-destructive/10 text-destructive'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
      {armed ? 'Confirm delete' : label}
    </button>
  );
}