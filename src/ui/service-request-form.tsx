"use client";

import { useActionState } from "react";
import { CircleCheck } from "lucide-react";
import { serviceRequestAction, type ServiceRequestState } from "@/actions/service-requests";
import type { ServiceKind } from "@/domain/service-requests";
import { Button } from "./button";
import { Checkbox, Field, Input, Select, Textarea } from "./field";

export type ServiceField =
  | { name: string; label: string; type: "text"; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { name: string; label: string; type: "check"; required?: boolean };

const empty: ServiceRequestState = {};

/**
 * One form for every service request. Name, e-mail and message are always
 * asked; each kind adds its own fields. Works for visitors without an account.
 */
export function ServiceRequestForm({
  kind,
  fields,
  organisationRequired = false,
  defaults,
  labels,
}: {
  kind: ServiceKind;
  fields: ServiceField[];
  organisationRequired?: boolean;
  defaults: { name?: string; email?: string; organisation?: string };
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ServiceRequestState, FormData>(serviceRequestAction, empty);
  const id = (name: string) => `${kind}-${name}`;

  if (state.ok) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-[var(--radius-md)] bg-success-subtle px-4 py-3 text-sm text-success">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {labels.sent}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {state.error ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {labels[state.error] ?? labels.generic}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.name} htmlFor={id("name")} required>
          <Input id={id("name")} name="contactName" required minLength={2} defaultValue={defaults.name} autoComplete="name" />
        </Field>
        <Field label={labels.email} htmlFor={id("email")} required>
          <Input id={id("email")} name="email" type="email" required defaultValue={defaults.email} autoComplete="email" />
        </Field>
        <Field
          label={organisationRequired ? labels.organisation : labels.organisationOptional}
          htmlFor={id("organisation")}
          required={organisationRequired}
        >
          <Input
            id={id("organisation")}
            name="organisationName"
            required={organisationRequired}
            defaultValue={defaults.organisation}
            autoComplete="organization"
          />
        </Field>
        <Field label={labels.phone} htmlFor={id("phone")}>
          <Input id={id("phone")} name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label={labels.location} htmlFor={id("location")}>
          <Input id={id("location")} name="location" autoComplete="address-level2" />
        </Field>
        {fields.map((field) =>
          field.type === "text" ? (
            <Field key={field.name} label={field.label} htmlFor={id(field.name)} required={field.required}>
              <Input
                id={id(field.name)}
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
                maxLength={300}
              />
            </Field>
          ) : field.type === "select" ? (
            <Field key={field.name} label={field.label} htmlFor={id(field.name)}>
              <Select id={id(field.name)} name={field.name}>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null,
        )}
      </div>

      {fields
        .filter((field) => field.type === "check")
        .map((field) => (
          <label key={field.name} className="flex items-start gap-2 text-sm text-fg">
            <Checkbox name={field.name} value="yes" required={"required" in field && field.required} className="mt-0.5" />
            <span>
              {field.label}
              {"required" in field && field.required ? (
                <span className="ml-0.5 text-danger" aria-hidden="true">
                  *
                </span>
              ) : null}
            </span>
          </label>
        ))}

      <Field label={labels.message} htmlFor={id("message")}>
        <Textarea id={id("message")} name="message" rows={4} maxLength={4000} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {labels.submit}
        </Button>
        <p className="text-xs text-fg-subtle">{labels.privacy}</p>
      </div>
    </form>
  );
}
