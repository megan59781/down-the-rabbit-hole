// Where the site lives, for links on share cards and in share captions from NEXT_PUBLIC_SITE_URL
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return typeof location !== "undefined" ? location.origin : "";
}

/** The link as people read it: no https://, no trailing slash. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
