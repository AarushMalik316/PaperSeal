export function shortHex(value: string, head = 6, tail = 4): string {
  if (!value) return "";
  return value.length <= head + tail + 2 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatTimestamp(seconds: number): string {
  if (!seconds) return "—";
  const d = new Date(seconds * 1000);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function formatUtc(seconds: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function sameAddress(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}
