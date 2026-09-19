import { redirect } from "next/navigation";

export default async function ManufacturersIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/katalog`);
}
