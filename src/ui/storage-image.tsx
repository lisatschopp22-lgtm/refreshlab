import Image from "next/image";
import { cn } from "./cn";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export function storageUrl(path: string | null | undefined, bucket = "images") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function StorageImage({
  path,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  fill = true,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
}) {
  const url = storageUrl(path);
  if (!url) {
    return (
      <div
        className={cn("flex items-center justify-center bg-bg-sunken text-xs text-fg-subtle", className)}
        aria-hidden="true"
      >
        —
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized
      className={cn("object-cover", className)}
    />
  );
}
