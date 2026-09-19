import { supabaseAdmin } from "@/auth/supabase-server";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export class UploadError extends Error {}

export async function uploadImage(file: File, prefix: string) {
  if (!IMAGE_TYPES.includes(file.type)) throw new UploadError("type");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("size");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${prefix}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseAdmin()
    .storage.from("images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new UploadError(error.message);
  return path;
}

export async function uploadAttachment(file: File, prefix: string) {
  if (file.size > MAX_FILE_BYTES) throw new UploadError("size");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseAdmin()
    .storage.from("attachments")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new UploadError(error.message);
  return path;
}

/** Private bucket, so documents need a short-lived signed URL. */
export async function signedAttachmentUrl(path: string, seconds = 300) {
  const { data } = await supabaseAdmin().storage.from("attachments").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function removeImage(path: string) {
  await supabaseAdmin().storage.from("images").remove([path]);
}
