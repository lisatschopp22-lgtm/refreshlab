/**
 * Development only: the prototype has no separate worker process, so the
 * outbox is drained on an interval inside the Next server. Production would
 * run `apps/worker` from the architecture instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") return;
  if (process.env.DISABLE_OUTBOX_WORKER === "1") return;

  const { runOutbox } = await import("./domain/outbox");
  const tick = async () => {
    try {
      const result = await runOutbox(20);
      if (result.processed || result.failed) {
        console.log(`[outbox] processed ${result.processed}, failed ${result.failed}`);
      }
    } catch (error) {
      console.error("[outbox] run failed", error);
    }
  };

  setInterval(tick, 5000).unref();
}
