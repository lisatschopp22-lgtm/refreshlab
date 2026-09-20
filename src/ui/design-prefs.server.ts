import { cookies } from "next/headers";
import { parsePrefs, COOKIE, type DesignPrefs } from "./design-prefs";

/** Server-only: the chosen look must be in the first HTML, not applied by JS. */
export async function readDesignPrefs(): Promise<DesignPrefs> {
  const store = await cookies();
  return parsePrefs(store.get(COOKIE)?.value);
}
