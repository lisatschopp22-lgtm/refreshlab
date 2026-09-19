"use client";

import { useState } from "react";
import { StorageImage } from "./storage-image";
import { cn } from "./cn";

export function Gallery({
  images,
  title,
}: {
  images: { id: string; storagePath: string; alt: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="aspect-[4/3] rounded-[var(--radius-lg)] bg-bg-sunken" />;
  }
  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-sunken">
        <StorageImage
          path={current.storagePath}
          alt={current.alt || title}
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
        />
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={image.alt || `${title} ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-[var(--radius-md)] border-2 bg-bg-sunken transition-colors",
                  index === active ? "border-[var(--primary)]" : "border-border hover:border-border-strong",
                )}
              >
                <StorageImage path={image.storagePath} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
