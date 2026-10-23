import { cn } from '@/lib/utils';

export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-2 font-display text-[36px] leading-none sm:text-[42px]">{title}</h1>
        {description && <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Field({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}