import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { marked } from "marked";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/db/client";
import { contentPages } from "@/db/schema/operations";
import { pick } from "@/i18n/format";
import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/ui/breadcrumbs";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function getPage(slug: string) {
  const [row] = await db
    .select()
    .from(contentPages)
    .where(and(eq(contentPages.slug, slug), eq(contentPages.published, true)))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  const title = pick(page.title, locale as Locale);
  const body = pick(page.body, locale as Locale);
  return {
    title,
    description: body.replace(/[#>*`]/g, "").trim().slice(0, 200),
    alternates: { canonical: `${siteUrl}/${locale}/p/${slug}` },
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);

  const page = await getPage(slug);
  if (!page) notFound();

  const title = pick(page.title, locale);
  // Markdown comes from the admin area, which only administrators can write to.
  const html = await marked.parse(pick(page.body, locale), { async: true });

  return (
    <main className="mx-auto max-w-[760px] px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "refreshLab", href: `/${locale}` },
          { name: title, href: `/${locale}/p/${slug}` },
        ]}
      />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="prose-rl mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
