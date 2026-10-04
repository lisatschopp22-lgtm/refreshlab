import { BadgeCheck, CalendarClock, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardBody } from "./card";

/**
 * What "qualified" promises: who may offer, how long the warranty runs and
 * what it covers. Built once so the home page and the section's own page
 * never disagree.
 */
export function QualifiedFacts() {
  const t = useTranslations("qualified");
  const facts = [
    { icon: BadgeCheck, title: t("accreditedTitle"), text: t("accreditedText") },
    { icon: CalendarClock, title: t("termTitle"), text: t("termText") },
    { icon: ShieldCheck, title: t("scopeTitle"), text: t("scopeText") },
  ];

  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {facts.map((fact) => (
        <li key={fact.title}>
          <Card className="h-full">
            <CardBody className="space-y-2">
              <fact.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-fg">{fact.title}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{fact.text}</p>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
