"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { rateOrderAction, type RatingState } from "@/actions/ratings";
import { Button } from "./button";
import { Field, Textarea } from "./field";
import { cn } from "./cn";

const empty: RatingState = {};

/**
 * One to five stars as a radio group, so it works with the keyboard and
 * without JavaScript; the stars only light up what is chosen.
 */
export function RatingForm({
  locale,
  orderId,
  labels,
}: {
  locale: string;
  orderId: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<RatingState, FormData>(rateOrderAction, empty);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || score;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderId" value={orderId} />

      {state.error ? (
        <p className="rounded-[var(--radius-md)] bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
          {labels[state.error] ?? labels.generic}
        </p>
      ) : null}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-fg">
          {labels.score}
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded-[var(--radius-sm)] p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--ring)]"
                onMouseEnter={() => setHover(n)}
              >
                <input
                  type="radio"
                  name="score"
                  value={n}
                  className="sr-only"
                  checked={score === n}
                  onChange={() => setScore(n)}
                  required
                />
                <Star
                  aria-hidden="true"
                  className={cn("size-7", n <= shown ? "fill-current text-rating" : "text-border-strong")}
                />
                <span className="sr-only">{labels[`star${n}`]}</span>
              </label>
            ))}
          </div>
          <span className="text-sm text-fg-muted" aria-live="polite">
            {shown ? labels[`star${shown}`] : ""}
          </span>
        </div>
      </fieldset>

      <Field label={labels.comment} hint={labels.commentHint} htmlFor={`rating-comment-${orderId}`}>
        <Textarea id={`rating-comment-${orderId}`} name="comment" rows={3} maxLength={1000} />
      </Field>

      <Button type="submit" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
