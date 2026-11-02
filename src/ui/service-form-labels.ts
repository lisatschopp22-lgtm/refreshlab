import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/** The labels every service request form shares, in the page's language; error codes map to their texts. */
export async function serviceFormLabels(locale: Locale): Promise<Record<string, string>> {
  const t = await getTranslations({ locale, namespace: "serviceRequest" });
  return {
    name: t("name"),
    email: t("email"),
    organisation: t("organisation"),
    organisationOptional: t("organisationOptional"),
    phone: t("phone"),
    location: t("location"),
    message: t("message"),
    submit: t("submit"),
    sent: t("sent"),
    privacy: t("privacy"),
    invalid: t("errorInvalid"),
    chemicals_rules: t("errorChemicals"),
    generic: t("errorGeneric"),
  };
}
