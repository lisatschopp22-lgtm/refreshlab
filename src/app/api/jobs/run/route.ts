import { NextResponse } from "next/server";
import { runOutbox } from "@/domain/outbox";

export const dynamic = "force-dynamic";

/** Drains the transactional outbox. Triggered by the dev interval or by hand. */
export async function GET() {
  const result = await runOutbox();
  return NextResponse.json(result);
}

export async function POST() {
  return GET();
}
