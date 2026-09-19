"use client";

import { useActionState } from "react";
import { savePageAction, saveSettingsAction, type AdminState } from "@/actions/admin";
import { Button } from "./button";
import { Checkbox, Field, Input, Textarea } from "./field";

const empty: AdminState = {};

export function PageEditor({
  locale,
  defaults,
  labels,
}: {
  locale: string;
  defaults: {
    slug: string;
    titleDe: string;
    titleEn: string;
    bodyDe: string;
    bodyEn: string;
    published: boolean;
    showInFooter: boolean;
  };
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(savePageAction, empty);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {state.error ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {labels.error}
        </p>
      ) : null}

      <Field label={labels.slug} hint="a-z, 0-9, -" htmlFor="slug" required>
        <Input id="slug" name="slug" defaultValue={defaults.slug} required pattern="[a-z0-9-]+" />
      </Field>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Deutsch</p>
          <Field label={labels.title} htmlFor="titleDe" required>
            <Input id="titleDe" name="titleDe" defaultValue={defaults.titleDe} required />
          </Field>
          <Field label={labels.body} hint="Markdown" htmlFor="bodyDe" required>
            <Textarea id="bodyDe" name="bodyDe" defaultValue={defaults.bodyDe} rows={18} required className="font-mono text-xs" />
          </Field>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">English</p>
          <Field label={labels.title} htmlFor="titleEn" required>
            <Input id="titleEn" name="titleEn" defaultValue={defaults.titleEn} required />
          </Field>
          <Field label={labels.body} hint="Markdown" htmlFor="bodyEn" required>
            <Textarea id="bodyEn" name="bodyEn" defaultValue={defaults.bodyEn} rows={18} required className="font-mono text-xs" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="published" defaultChecked={defaults.published} />
          {labels.published}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="showInFooter" defaultChecked={defaults.showInFooter} />
          {labels.footer}
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {labels.save}
      </Button>
    </form>
  );
}

export function SettingsForm({
  locale,
  fee,
  flags,
  labels,
}: {
  locale: string;
  fee: { percent: number; capCents: number | null; minCents: number };
  flags: Record<string, boolean>;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveSettingsAction, empty);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-fg">{labels.feeRule}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={labels.feePercent} htmlFor="feePercent">
            <Input id="feePercent" name="feePercent" type="number" step="0.1" min="0" max="100" defaultValue={fee.percent} />
          </Field>
          <Field label={labels.feeCap} hint="CHF" htmlFor="feeCap">
            <Input id="feeCap" name="feeCap" type="number" step="1" min="0" defaultValue={fee.capCents === null ? "" : fee.capCents / 100} />
          </Field>
          <Field label={labels.feeMin} hint="CHF" htmlFor="feeMin">
            <Input id="feeMin" name="feeMin" type="number" step="1" min="0" defaultValue={fee.minCents / 100} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fg">{labels.flags}</legend>
        <p className="mb-2 text-xs text-fg-subtle">{labels.flagsHint}</p>
        {Object.entries(flags).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Checkbox name={`flag_${key}`} defaultChecked={value} />
            <span className="tabular">{key}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {labels.save}
        </Button>
        {state.ok ? <span className="text-sm text-success">{labels.saved}</span> : null}
        {state.error ? <span className="text-sm text-danger">{labels.error}</span> : null}
      </div>
    </form>
  );
}
