/**
 * Copies text to the clipboard using navigator.clipboard when permitted,
 * falling back to a hidden textarea + execCommand("copy") in iframes or
 * non-HTTPS local origins where Clipboard API is restricted.
 */
export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall back to execCommand */
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "-9999px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  const prevFocus = document.activeElement as HTMLElement | null;
  ta.focus({ preventScroll: true });
  ta.select();
  ta.setSelectionRange(0, value.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
    prevFocus?.focus?.({ preventScroll: true });
  }
  return ok;
}
