"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth/session";
import {
  addToList,
  createList,
  deleteList,
  moveToList,
  removeFromList,
  renameList,
  toggleInList,
  toggleSaved,
  WatchListError,
} from "@/domain/watchlists";

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** The listing page and the lists page both show what is saved where. */
function refresh(locale: string, slug: string) {
  if (slug) revalidatePath(`/${locale}/geraete/${slug}`);
  revalidatePath(`/${locale}/konto/merkliste`);
  revalidatePath(`/${locale}/konto`);
}

export async function toggleSavedAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  await toggleSaved(user, field(formData, "listingId"));
  refresh(locale, field(formData, "slug"));
}

export async function toggleInListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  await toggleInList(user, field(formData, "listingId"), field(formData, "listId") || undefined);
  refresh(locale, field(formData, "slug"));
}

/** A new list, and with a listing id the listing goes straight into it. */
export async function createListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  const listingId = field(formData, "listingId");

  let listId: string;
  try {
    const list = await createList(user, field(formData, "name"));
    if (listingId) await addToList(user, listingId, list.id);
    listId = list.id;
  } catch (error) {
    if (error instanceof WatchListError) redirect(`/${locale}/konto/merkliste?fehler=${error.message}`);
    throw error;
  }

  refresh(locale, field(formData, "slug"));
  if (!listingId) redirect(`/${locale}/konto/merkliste?liste=${listId}`);
}

export async function renameListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  const listId = field(formData, "listId");
  try {
    await renameList(user, listId, field(formData, "name"));
  } catch (error) {
    if (error instanceof WatchListError) redirect(`/${locale}/konto/merkliste?liste=${listId}&fehler=${error.message}`);
    throw error;
  }
  refresh(locale, "");
}

export async function deleteListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  await deleteList(user, field(formData, "listId"));
  refresh(locale, "");
  redirect(`/${locale}/konto/merkliste`);
}

export async function removeFromListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  await removeFromList(user, field(formData, "listingId"), field(formData, "listId"));
  refresh(locale, field(formData, "slug"));
}

export async function moveToListAction(formData: FormData) {
  const locale = field(formData, "locale") || "de";
  const user = await requireUser(locale);
  await moveToList(user, field(formData, "listingId"), field(formData, "fromListId"), field(formData, "toListId"));
  refresh(locale, field(formData, "slug"));
}
