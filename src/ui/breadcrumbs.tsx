import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-muted">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden="true" /> : null}
            {index === items.length - 1 ? (
              <span className="text-fg">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:text-fg hover:underline">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
