"use client";

import { useActionState } from "react";
import { proposeModelAction, type FormState } from "@/actions/listings";
import { Button } from "./button";
import { Field, Input, Select } from "./field";

export function ProposeModelForm({
  locale,
  categories,
  manufacturers,
  organisations,
  labels,
}: {
  locale: string;
  categories: { id: string; name: string }[];
  manufacturers: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(proposeModelAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <p className="rounded-[var(--radius-md)] bg-info-subtle px-3 py-2 text-sm text-info">{labels.note}</p>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {labels.error}
        </p>
      ) : null}
      <Field label={labels.manufacturer} htmlFor="manufacturerId" required>
        <Select id="manufacturerId" name="manufacturerId" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.category} htmlFor="categoryId" required>
        <Select id="categoryId" name="categoryId" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.name} htmlFor="name" required>
        <Input id="name" name="name" required minLength={2} placeholder="Centrifuge 5910 Ri" />
      </Field>
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
      <Button type="submit" size="lg" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
