"use client";

import { useActionState, useState } from "react";
import {
  makeOfferAction,
  moveOrderAction,
  respondOfferAction,
  startPaymentAction,
  type TxState,
} from "@/actions/transactions";
import { Button } from "./button";
import { Field, Input, Textarea } from "./field";
import { cn } from "./cn";

const empty: TxState = {};

function errorText(state: TxState, labels: Record<string, string>) {
  if (!state.error) return null;
  return (
    <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
      {labels[state.error] ?? labels.generic}
    </p>
  );
}

export function OfferForm({
  locale,
  listingId,
  currency,
  askingPrice,
  labels,
}: {
  locale: string;
  listingId: string;
  currency: string;
  askingPrice: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<TxState, FormData>(makeOfferAction, empty);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="listingId" value={listingId} />
      {errorText(state, labels)}
      <p className="text-sm text-fg-muted">
        {labels.listPrice}: <span className="tabular font-medium text-fg">{askingPrice}</span>
      </p>
      <Field label={`${labels.amount} (${currency})`} htmlFor="amount" required>
        <Input id="amount" name="amount" required placeholder="7200" autoComplete="off" />
      </Field>
      <Field label={labels.messageOptional} htmlFor="offer-message">
        <Textarea id="offer-message" name="message" rows={3} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}

export function OfferActions({
  locale,
  offerId,
  role,
  status,
  currency,
  labels,
}: {
  locale: string;
  offerId: string;
  role: "buyer" | "seller";
  status: string;
  currency: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<TxState, FormData>(respondOfferAction, empty);
  const [countering, setCountering] = useState(false);

  const canSellerAct = role === "seller" && status === "open";
  const canBuyerAct = role === "buyer" && status === "countered";
  const canWithdraw = role === "buyer" && status === "open";

  if (!canSellerAct && !canBuyerAct && !canWithdraw) return null;

  return (
    <div className="space-y-2">
      {errorText(state, labels)}
      <div className="flex flex-wrap gap-2">
        {(canSellerAct || canBuyerAct) && (
          <>
            <form action={action}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="offerId" value={offerId} />
              <input type="hidden" name="intent" value="accepted" />
              <Button type="submit" size="sm" disabled={pending}>
                {labels.accept}
              </Button>
            </form>
            <form action={action}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="offerId" value={offerId} />
              <input type="hidden" name="intent" value="rejected" />
              <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                {labels.reject}
              </Button>
            </form>
          </>
        )}
        {canSellerAct ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCountering((value) => !value)}
          >
            {labels.counter}
          </Button>
        ) : null}
        {canWithdraw ? (
          <form action={action}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="offerId" value={offerId} />
            <input type="hidden" name="intent" value="withdrawn" />
            <Button type="submit" size="sm" variant="ghost" disabled={pending}>
              {labels.withdraw}
            </Button>
          </form>
        ) : null}
      </div>

      {countering ? (
        <form action={action} className="flex flex-wrap items-end gap-2 pt-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="offerId" value={offerId} />
          <input type="hidden" name="intent" value="countered" />
          <Field label={`${labels.counterAmount} ${currency}`} htmlFor={`counter-${offerId}`} className="w-40">
            <Input id={`counter-${offerId}`} name="counterAmount" required placeholder="7600" />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {labels.sendCounter}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function PaymentMethodForm({
  locale,
  orderId,
  methods,
  labels,
}: {
  locale: string;
  orderId: string;
  methods: { value: string; label: string; hint?: string; recommended?: boolean }[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<TxState, FormData>(startPaymentAction, empty);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderId" value={orderId} />
      {errorText(state, labels)}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-fg">{labels.paymentMethod}</legend>
        {methods.map((method, index) => (
          <label
            key={method.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border p-3",
              "hover:border-border-strong has-checked:border-[var(--primary)] has-checked:bg-primary-subtle",
            )}
          >
            <input
              type="radio"
              name="method"
              value={method.value}
              defaultChecked={index === 0}
              className="mt-1 accent-[var(--primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{method.label}</span>
              {method.hint ? <span className="block text-xs text-fg-subtle">{method.hint}</span> : null}
            </span>
            {method.recommended ? (
              <span className="ml-auto rounded-[var(--radius-full)] bg-info-subtle px-2 py-0.5 text-[0.6875rem] text-info">
                {labels.recommended}
              </span>
            ) : null}
          </label>
        ))}
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {labels.payNow}
      </Button>
      <p className="text-xs text-fg-subtle">{labels.simulated}</p>
    </form>
  );
}

export function OrderActionButton({
  locale,
  orderId,
  to,
  label,
  variant = "primary",
  withTracking,
  withReason,
  labels,
}: {
  locale: string;
  orderId: string;
  to: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  withTracking?: boolean;
  withReason?: boolean;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<TxState, FormData>(moveOrderAction, empty);
  const [open, setOpen] = useState(false);

  if ((withTracking || withReason) && !open) {
    return (
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="to" value={to} />
      {errorText(state, labels)}
      {withTracking ? (
        <Field label={labels.trackingReference} htmlFor={`tracking-${orderId}`}>
          <Input id={`tracking-${orderId}`} name="trackingReference" placeholder="CH-1234-5678" />
        </Field>
      ) : null}
      {withReason ? (
        <Field label={labels.disputeReason} htmlFor={`reason-${orderId}`} required>
          <Textarea id={`reason-${orderId}`} name="reason" rows={3} required minLength={10} />
        </Field>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant={variant} disabled={pending}>
          {label}
        </Button>
        {open ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {labels.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
