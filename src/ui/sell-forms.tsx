"use client";

import { useActionState } from "react";
import { Trash2, Upload } from "lucide-react";
import {
  deleteImageAction,
  publishListingAction,
  saveConditionAction,
  savePriceAction,
  uploadAttachmentAction,
  uploadListingImageAction,
  type FormState,
} from "@/actions/listings";
import { Button } from "./button";
import { Field, Input, Select, Textarea } from "./field";
import { StorageImage } from "./storage-image";

const empty: FormState = {};

function fieldError(state: FormState, field: string, message: string) {
  return state.fields?.includes(field) ? message : undefined;
}

export function ConditionForm({
  locale,
  listingId,
  defaults,
  conditions,
  labels,
}: {
  locale: string;
  listingId: string;
  defaults: {
    title: string;
    condition: string;
    conditionNotes: string;
    scopeOfDelivery: string;
    description: string;
    year: number | null;
    operatingHours: number | null;
  };
  conditions: { value: string; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveConditionAction, empty);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />

      <Field label={labels.titleField} htmlFor="title" required error={fieldError(state, "title", labels.tooShort!)}>
        <Input id="title" name="title" defaultValue={defaults.title} required minLength={3} />
      </Field>

      <Field label={labels.conditionTitle} htmlFor="condition" required>
        <Select id="condition" name="condition" defaultValue={defaults.condition}>
          {conditions.map((condition) => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={labels.conditionNotes}
        hint={labels.conditionNotesHint}
        htmlFor="conditionNotes"
        required
        error={fieldError(state, "conditionNotes", labels.tooShort!)}
      >
        <Textarea
          id="conditionNotes"
          name="conditionNotes"
          defaultValue={defaults.conditionNotes}
          required
          minLength={10}
          rows={4}
        />
      </Field>

      <Field label={labels.scopeOfDelivery} hint={labels.scopeHint} htmlFor="scopeOfDelivery">
        <Textarea id="scopeOfDelivery" name="scopeOfDelivery" defaultValue={defaults.scopeOfDelivery} rows={3} />
      </Field>

      <Field label={labels.description} htmlFor="description">
        <Textarea id="description" name="description" defaultValue={defaults.description} rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.year} htmlFor="year">
          <Input id="year" name="year" type="number" min={1950} max={2030} defaultValue={defaults.year ?? ""} />
        </Field>
        <Field label={labels.operatingHours} htmlFor="operatingHours">
          <Input
            id="operatingHours"
            name="operatingHours"
            type="number"
            min={0}
            defaultValue={defaults.operatingHours ?? ""}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="submit" size="lg" disabled={pending}>
          {labels.continueToPrice}
        </Button>
        <Button type="submit" name="intent" value="draft" variant="secondary" size="lg" disabled={pending}>
          {labels.saveDraft}
        </Button>
        {state.ok ? <span className="self-center text-sm text-success">{labels.draftSaved}</span> : null}
      </div>
    </form>
  );
}

export function ImageUploader({
  locale,
  listingId,
  images,
  labels,
}: {
  locale: string;
  listingId: string;
  images: { id: string; storagePath: string; alt: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadListingImageAction, empty);

  return (
    <div className="space-y-3">
      {images.length ? (
        <ul className="flex flex-wrap gap-2">
          {images.map((image) => (
            <li key={image.id} className="relative">
              <span className="relative block size-24 overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg-sunken">
                <StorageImage path={image.storagePath} alt={image.alt} sizes="96px" />
              </span>
              <form action={deleteImageAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="imageId" value={image.id} />
                <button
                  type="submit"
                  aria-label={labels.remove}
                  className="absolute right-1 top-1 rounded-[var(--radius-sm)] bg-bg-elevated/90 p-1 text-fg-muted hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="space-y-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="listingId" value={listingId} />
        <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-bg-subtle px-3 py-3 text-sm text-fg-muted hover:border-[var(--primary)]">
          <Upload className="size-4" aria-hidden="true" />
          <span>{labels.addImage}</span>
          <input
            type="file"
            name="files"
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
        </label>
        <p className="text-xs text-fg-subtle">{labels.imagesHint}</p>
        {pending ? <p className="text-xs text-fg-subtle">…</p> : null}
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {labels.uploadFailed}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function AttachmentUploader({
  locale,
  listingId,
  kinds,
  labels,
}: {
  locale: string;
  listingId: string;
  kinds: { value: string; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadAttachmentAction, empty);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      <Field label={labels.attachments} htmlFor="kind" className="w-48">
        <Select id="kind" name="kind" defaultValue={kinds[0]?.value}>
          {kinds.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </Select>
      </Field>
      <input
        type="file"
        name="file"
        className="h-[var(--control-h)] max-w-56 text-sm text-fg-muted file:mr-2 file:rounded-[var(--radius-sm)] file:border-0 file:bg-bg-sunken file:px-2 file:py-1 file:text-fg"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {labels.upload}
      </Button>
      {state.ok ? <span className="self-center text-sm text-success">{labels.saved}</span> : null}
      {state.error ? <span className="self-center text-sm text-danger">{labels.uploadFailed}</span> : null}
    </form>
  );
}

export function PriceForm({
  locale,
  listingId,
  defaults,
  saleModes,
  countries,
  suggestion,
  labels,
}: {
  locale: string;
  listingId: string;
  defaults: {
    price: string;
    currency: string;
    minPrice: string;
    negotiable: string;
    locationCity: string;
    locationCountry: string;
    warrantyMonths: number;
  };
  saleModes: { value: string; label: string }[];
  countries: string[];
  suggestion?: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePriceAction, empty);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />

      {suggestion ? (
        <p className="rounded-[var(--radius-md)] bg-info-subtle px-3 py-2 text-sm text-info">{suggestion}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label={labels.price} htmlFor="price" required error={fieldError(state, "price", labels.priceInvalid!)}>
          <Input id="price" name="price" defaultValue={defaults.price} required placeholder="7900" />
        </Field>
        <Field label={labels.currency} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={defaults.currency}>
            <option value="CHF">CHF</option>
            <option value="EUR">EUR</option>
          </Select>
        </Field>
      </div>

      <Field label={labels.saleMode} htmlFor="negotiable">
        <Select id="negotiable" name="negotiable" defaultValue={defaults.negotiable}>
          {saleModes.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={labels.minPrice} hint={labels.minPriceHint} htmlFor="minPrice">
        <Input id="minPrice" name="minPrice" defaultValue={defaults.minPrice} placeholder="6500" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label={labels.locationCity} htmlFor="locationCity" required>
          <Input id="locationCity" name="locationCity" defaultValue={defaults.locationCity} required minLength={2} />
        </Field>
        <Field label={labels.locationCountry} htmlFor="locationCountry">
          <Select id="locationCountry" name="locationCountry" defaultValue={defaults.locationCountry || "CH"}>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={labels.warranty} htmlFor="warrantyMonths">
        <Input
          id="warrantyMonths"
          name="warrantyMonths"
          type="number"
          min={0}
          max={60}
          defaultValue={defaults.warrantyMonths}
        />
      </Field>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="submit" size="lg" disabled={pending}>
          {labels.continueToReview}
        </Button>
        <Button type="submit" name="intent" value="draft" variant="secondary" size="lg" disabled={pending}>
          {labels.saveDraft}
        </Button>
        {state.ok ? <span className="self-center text-sm text-success">{labels.draftSaved}</span> : null}
      </div>
    </form>
  );
}

export function PublishForm({
  locale,
  listingId,
  labels,
}: {
  locale: string;
  listingId: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(publishListingAction, empty);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      {state.error === "incomplete" ? (
        <div className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          <p className="font-medium">{labels.incomplete}</p>
          <ul className="mt-1 list-inside list-disc">
            {state.fields?.map((field) => (
              <li key={field}>{labels[field] ?? field}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {labels.publish}
      </Button>
    </form>
  );
}
