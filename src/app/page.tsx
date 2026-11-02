import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";

/** Coming to the site without a path opens the opener; it leads on to the marketplace. */
export default function RootPage() {
  redirect(`/${defaultLocale}/willkommen`);
}
