"use client";

import { useActionState } from "react";
import { requestSpecialRateAction, type SpecialRateState } from "@/actions/special-rates";
import { Button } from "./button";
import { Field, Input, Select, Textarea } from "./field";

const empty: SpecialRateState = {};

/** An organisation's owner asks refreshLab for a special rate; an admin decides. */
export function SpecialRateRequestForm({
  locale,
  organisationId,
  sides,
  labels,
}: {
  locale: string;
  organisationId: string;
  sides: { value: "seller" | "buyer"; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<SpecialRateState, FormData>(requestSpecialRateAction, empty);

  if (state.ok) return <p className="text-sm text-success">{labels.requested}</p>;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="organisationId" value={organisationId} />
      {state.error ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {labels[state.error] ?? labels.generic}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={labels.side} htmlFor={`special-side-${organisationId}`}>
          <Select id={`special-side-${organisationId}`} name="side">
            {sides.map((side) => (
              <option key={side.value} value={side.value}>
                {side.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={labels.expectedPerYear} htmlFor={`special-expected-${organisationId}`}>
          <Input id={`special-expected-${organisationId}`} name="expectedPerYear" type="number" min="0" step="1" />
        </Field>
      </div>
      <Field label={labels.message} htmlFor={`special-message-${organisationId}`}>
        <Textarea id={`special-message-${organisationId}`} name="message" rows={3} maxLength={2000} />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
