"use client";

import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { localeNames, locales, type Locale } from "@/i18n/routing";

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="relative inline-flex items-center">
      <Languages className="pointer-events-none absolute left-2 size-3.5 text-fg-subtle" aria-hidden="true" />
      <span className="sr-only">{localeNames[locale]}</span>
      <select
        value={locale}
        onChange={(event) => {
          const next = event.target.value;
          const rest = pathname.replace(/^\/[a-z]{2}/, "");
          router.push(`/${next}${rest}`);
        }}
        className="h-9 appearance-none rounded-[var(--radius-md)] bg-transparent pl-7 pr-2 text-sm text-fg-muted hover:bg-bg-subtle focus:outline-2 focus:outline-[var(--ring)]"
      >
        {locales.map((value) => (
          <option key={value} value={value}>
            {value.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
