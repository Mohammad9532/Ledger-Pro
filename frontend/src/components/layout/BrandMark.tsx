import { cn } from '@/lib/utils';

/** Ledger Pro mark: three ruled lines and a tick, on the lime brand tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('relative flex items-center justify-center rounded-lg bg-lime text-lime-foreground shrink-0', className)}
    >
      <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7h14" />
        <path d="M5 12h9" />
        <path d="M5 17h5" />
        <path d="m14 17 2.2 2.2L21 14.5" />
      </svg>
    </div>
  );
}
