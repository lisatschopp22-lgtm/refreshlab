import { cn } from "../cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold tracking-tight", className)}>
      <span className="text-fg">refresh</span>
      <span className="text-primary">Lab</span>
    </span>
  );
}
