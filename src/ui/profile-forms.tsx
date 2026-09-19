"use client";

import { useActionState } from "react";
import {
  addMemberAction,
  createOrganisationAction,
  saveProfileAction,
  type ProfileState,
} from "@/actions/profile";
import { Button } from "./button";
import { Field, Input, Select, Textarea } from "./field";

const empty: ProfileState = {};

export function ProfileForm({
  locale,
  defaults,
  labels,
}: {
  locale: string;
  defaults: { displayName: string; bio: string; city: string; country: string; uiLocale: string };
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, empty);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={labels.displayName} htmlFor="displayName" required>
        <Input id="displayName" name="displayName" defaultValue={defaults.displayName} required minLength={2} />
      </Field>
      <Field label={labels.bio} htmlFor="bio">
        <Textarea id="bio" name="bio" defaultValue={defaults.bio} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label={labels.city} htmlFor="city">
          <Input id="city" name="city" defaultValue={defaults.city} />
        </Field>
        <Field label={labels.country} htmlFor="country">
          <Input id="country" name="country" defaultValue={defaults.country} maxLength={2} />
        </Field>
      </div>
      <Field label={labels.language} htmlFor="uiLocale">
        <Select id="uiLocale" name="uiLocale" defaultValue={defaults.uiLocale}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </Select>
      </Field>
      <Field label={labels.avatar} htmlFor="avatar">
        <input
          id="avatar"
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          className="h-[var(--control-h)] w-full text-sm text-fg-muted file:mr-2 file:rounded-[var(--radius-sm)] file:border-0 file:bg-bg-sunken file:px-2 file:py-1 file:text-fg"
        />
      </Field>
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

export function CreateOrganisationForm({
  locale,
  types,
  labels,
}: {
  locale: string;
  types: { value: string; label: string }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(createOrganisationAction, empty);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={labels.organisationName} htmlFor="org-name" required>
        <Input id="org-name" name="name" required minLength={2} />
      </Field>
      <Field label={labels.organisationType} htmlFor="org-type">
        <Select id="org-type" name="type" defaultValue="lab">
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label={labels.city} htmlFor="org-city">
          <Input id="org-city" name="city" />
        </Field>
        <Field label={labels.country} htmlFor="org-country">
          <Input id="org-country" name="country" defaultValue="CH" maxLength={2} />
        </Field>
      </div>
      <Field label={labels.about} htmlFor="org-about">
        <Textarea id="org-about" name="about" rows={3} />
      </Field>
      {state.error ? <p className="text-sm text-danger">{labels.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {labels.createOrganisation}
      </Button>
    </form>
  );
}

export function AddMemberForm({
  locale,
  organisationId,
  labels,
}: {
  locale: string;
  organisationId: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(addMemberAction, empty);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="organisationId" value={organisationId} />
      <Field label={labels.email} htmlFor={`member-${organisationId}`} className="min-w-56 flex-1">
        <Input id={`member-${organisationId}`} name="email" type="email" required />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {labels.invite}
      </Button>
      {state.ok ? <span className="self-center text-sm text-success">{labels.saved}</span> : null}
      {state.error ? <span className="self-center text-sm text-danger">{labels.notFound}</span> : null}
    </form>
  );
}
