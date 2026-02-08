export function platformToSlug(platform: string): string {
  return platform
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9-]/g, "");
}
