"use client";

import { useActionState, useState } from "react";
import { proposeModelAction, type FormState } from "@/actions/listings";
import { NEW_MANUFACTURER } from "@/domain/proposal";
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
  categories: { id: string; name: string; children: { id: string; name: string }[] }[];
  manufacturers: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(proposeModelAction, {});
  const [manufacturerId, setManufacturerId] = useState("");
  const addsManufacturer = manufacturerId === NEW_MANUFACTURER;

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
        <Select
          id="manufacturerId"
          name="manufacturerId"
          required
          value={manufacturerId}
          onChange={(event) => setManufacturerId(event.target.value)}
        >
          <option value="" disabled>
            —
          </option>
          <option value={NEW_MANUFACTURER}>{labels.manufacturerNew}</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </Select>
      </Field>
      {addsManufacturer ? (
        <div className="space-y-4 rounded-[var(--radius-md)] border border-border bg-bg-subtle p-3">
          <Field label={labels.manufacturerName} htmlFor="manufacturerName" required>
            <Input id="manufacturerName" name="manufacturerName" required minLength={2} maxLength={120} />
          </Field>
          <Field label={labels.manufacturerWebsite} htmlFor="manufacturerWebsite" hint={labels.manufacturerWebsiteHint}>
            <Input id="manufacturerWebsite" name="manufacturerWebsite" type="url" placeholder="https://" />
          </Field>
        </div>
      ) : null}
      <Field label={labels.category} htmlFor="categoryId" required>
        <Select id="categoryId" name="categoryId" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              <option value={category.id}>
                {category.name} ({labels.categoryGeneral})
              </option>
              {category.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
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
