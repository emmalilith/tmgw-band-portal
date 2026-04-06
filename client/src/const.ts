export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the path to the local login page.
 * Replaces the Manus OAuth URL for external deployment.
 */
export function getLoginUrl(returnPath?: string): string {
  const base = "/login";
  if (returnPath) return `${base}?returnTo=${encodeURIComponent(returnPath)}`;
  return base;
}
