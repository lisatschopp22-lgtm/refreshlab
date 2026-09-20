"use client";

import { useSyncExternalStore } from "react";
import { Logo, logoVariants, type LogoSize, type LogoVariant } from "./logo";

/**
 * Palette, typeface and the rest are CSS attributes the switcher writes onto
 * <html>, so they take effect the moment they change. The logo is a component,
 * which would otherwise only follow on the next navigation.
 *
 * Rather than re-deriving the precedence rules, this subscribes to the very
 * attribute the switcher maintains. One owner of the state, and both a query
 * parameter and a click in the panel are picked up immediately.
 */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-logo"],
  });
  return () => observer.disconnect();
}

export function SwitchableLogo({
  initial,
  size,
  className,
}: {
  initial: LogoVariant;
  size?: LogoSize;
  className?: string;
}) {
  const current = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.logo ?? initial,
    // On the server there is no DOM: render the stored choice.
    () => initial,
  );

  const variant = (logoVariants as readonly string[]).includes(current)
    ? (current as LogoVariant)
    : initial;

  return <Logo variant={variant} size={size} className={className} />;
}
