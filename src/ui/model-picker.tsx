"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { searchModels, startListingAction, type FormState } from "@/actions/listings";
import { Button, ButtonLink } from "./button";
import { Field, Input, Select } from "./field";
import { StorageImage } from "./storage-image";
import { cn } from "./cn";

type Model = Awaited<ReturnType<typeof searchModels>>[number];

export function ModelPicker({
  locale,
  organisations,
  labels,
  proposeHref,
}: {
  locale: string;
  organisations: { id: string; name: string }[];
  labels: Record<string, string>;
  proposeHref: string;
}) {
  const [term, setTerm] = useState("");
  const [fetched, setFetched] = useState<Model[]>([]);
  const [selected, setSelected] = useState<Model | null>(null);
  const [searching, startSearch] = useTransition();
  const [state, action, pending] = useActionState<FormState, FormData>(startListingAction, {});

  // Anything shorter than two characters simply has no results; deriving that
  // avoids clearing state from inside the effect.
  const ready = term.trim().length >= 2;
  const results = ready ? fetched : [];

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      startSearch(async () => setFetched(await searchModels(term)));
    }, 200);
    return () => clearTimeout(timer);
  }, [term, ready]);

  return (
    <div className="space-y-5">
      <Field label={labels.modelSearch} hint={labels.identifyText} htmlFor="model-search">
        <Input
          id="model-search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setSelected(null);
          }}
          placeholder="Eppendorf 5810 R"
          autoComplete="off"
        />
      </Field>

      {searching && !results.length ? <p className="text-sm text-fg-subtle">…</p> : null}

      {results.length > 0 ? (
        <ul className="space-y-1.5">
          {results.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                onClick={() => setSelected(model)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-2.5 text-left transition-colors",
                  selected?.id === model.id
                    ? "border-[var(--primary)] bg-primary-subtle"
                    : "border-border bg-bg-elevated hover:border-border-strong",
                )}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-bg-sunken">
                  <StorageImage path={model.imagePath} alt="" sizes="48px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">
                    {model.manufacturerName} {model.name}
                  </span>
                  <span className="tabular block text-xs text-fg-subtle">{model.recordNumber}</span>
                </span>
                {selected?.id === model.id ? (
                  <span className="text-xs font-medium text-primary">{labels.select}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {term.trim().length >= 2 && !searching && results.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-bg-subtle px-3 py-3 text-sm text-fg-muted">
          {labels.modelNotFound}{" "}
          <a href={proposeHref} className="font-medium text-primary hover:underline">
            {labels.proposeModel}
          </a>
        </p>
      ) : null}

      <form action={action} className="space-y-4 border-t border-border pt-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="modelId" value={selected?.id ?? ""} />
        {organisations.length ? (
          <Field label={labels.sellAs} htmlFor="organisationId">
            <Select id="organisationId" name="organisationId" defaultValue="">
              <option value="">{labels.asPrivate}</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {labels.selectFirst}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={!selected || pending}>
          {labels.continueToCondition}
        </Button>
      </form>

      {/* Always offered, not only after a failed search: some sellers know the catalogue lacks their instrument. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-bg-subtle px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{labels.newDeviceTitle}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{labels.newDeviceText}</p>
        </div>
        <ButtonLink href={proposeHref} variant="secondary" size="sm">
          {labels.newDeviceButton}
        </ButtonLink>
      </div>
    </div>
  );
}
