import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Non-blocking side drawer (no backdrop): the page stays usable while it is open. */
export function Drawer({ title, onClose, children, labelId }: { title: string; onClose: () => void; children: ReactNode; labelId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelId}
      className="fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-[min(100vw,560px)] flex-col border-l-[1.5px] border-edge bg-obsidian outline-none"
    >
      <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-edge bg-panel px-5 py-3.5">
        <h2 id={labelId} className="text-[20px] font-semibold tracking-tight">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-edge bg-panel hover:bg-obsidian" aria-label={`Close ${title}`}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </aside>
  );
}
