"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  magicLinkAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type ActionState,
} from "@/actions/auth";
import { Button } from "./button";
import { Field, Input } from "./field";

const initial: ActionState = {};

function ErrorNote({ error, labels }: { error?: string; labels: Record<string, string> }) {
  if (!error) return null;
  const message =
    error === "credentials" ? labels.invalidCredentials
    : error === "password" ? labels.passwordTooShort
    : error === "suspended" ? labels.suspended
    : labels.emailInvalid;
  return (
    <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function SignInForm({
  locale,
  next,
  labels,
}: {
  locale: string;
  next?: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(signInAction, initial);
  const [magicState, magicAction, magicPending] = useActionState(magicLinkAction, initial);
  const [resetState, resetAction, resetPending] = useActionState(resetPasswordAction, initial);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <ErrorNote error={state.error} labels={labels} />
        <Field label={labels.email} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={labels.password} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {labels.signIn}
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-5">
        <form action={magicAction} className="flex gap-2">
          <input type="hidden" name="locale" value={locale} />
          <Input name="email" type="email" placeholder={labels.email} required className="flex-1" />
          <Button type="submit" variant="secondary" disabled={magicPending}>
            {labels.magicLink}
          </Button>
        </form>
        {magicState.ok ? <p className="text-sm text-success">{labels.magicLinkSent}</p> : null}

        <form action={resetAction} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value="" />
          <button type="submit" className="text-primary hover:underline" disabled={resetPending}>
            {labels.forgotPassword}
          </button>
        </form>
        {resetState.ok ? <p className="text-sm text-success">{labels.resetSent}</p> : null}
        <p className="text-xs text-fg-subtle">{labels.checkMailpit}</p>
      </div>

      <p className="text-sm text-fg-muted">
        {labels.noAccount}{" "}
        <Link href={`/${locale}/registrieren`} className="font-medium text-primary hover:underline">
          {labels.signUp}
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ locale, labels }: { locale: string; labels: Record<string, string> }) {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <ErrorNote error={state.error} labels={labels} />
        <Field label={labels.displayName} htmlFor="displayName" required>
          <Input id="displayName" name="displayName" autoComplete="name" required minLength={2} />
        </Field>
        <Field label={labels.email} htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={labels.password} htmlFor="password" hint={labels.passwordTooShort} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {labels.signUp}
        </Button>
      </form>
      <p className="text-sm text-fg-muted">
        {labels.hasAccount}{" "}
        <Link href={`/${locale}/anmelden`} className="font-medium text-primary hover:underline">
          {labels.signIn}
        </Link>
      </p>
    </div>
  );
}
