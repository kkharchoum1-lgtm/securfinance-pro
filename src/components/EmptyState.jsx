import { cn } from '@/lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/60">
          <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.6} />
        </div>
      )}
      <div className="text-[14px] font-medium">{title}</div>
      {description && <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}