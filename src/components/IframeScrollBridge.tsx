import { useEffect } from "react";

type Props = {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onScrollChange?: (data: { scrollPercent: number }) => void;
  isActive?: boolean;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Bridges iframe scroll -> parent (ImmersiveReader)
 *
 * Notes:
 * - Same-origin works because you're using srcDoc (about:srcdoc).
 * - If the iframe navigates away to a real origin, access will be blocked and we silently stop.
 */
export default function IframeScrollBridge({ iframeRef, onScrollChange, isActive = true }: Props) {
  useEffect(() => {
    if (!isActive) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanup: (() => void) | null = null;
    let raf = 0;

    const attach = () => {
      try {
        const win = iframe.contentWindow;
        const doc = iframe.contentDocument;
        if (!win || !doc) return;

        const root = doc.scrollingElement || doc.documentElement || doc.body;
        if (!root) return;

        const emit = () => {
          // scrollTop / (scrollHeight - clientHeight)
          const denom = Math.max(1, root.scrollHeight - root.clientHeight);
          const pct = clamp01(root.scrollTop / denom);
          onScrollChange?.({ scrollPercent: Math.round(pct * 1000) / 10 }); // e.g. 33.7%
        };

        const onScroll = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(emit);
        };

        // initial emit
        emit();

        win.addEventListener("scroll", onScroll, { passive: true });
        // also listen on doc (some browsers)
        doc.addEventListener("scroll", onScroll, { passive: true });

        cleanup = () => {
          cancelAnimationFrame(raf);
          win.removeEventListener("scroll", onScroll as any);
          doc.removeEventListener("scroll", onScroll as any);
        };
      } catch {
        // cross-origin or not ready — ignore
      }
    };

    // Wait for iframe to be ready
    const onLoad = () => attach();

    iframe.addEventListener("load", onLoad);

    // Try now too (srcDoc often loads immediately)
    attach();

    return () => {
      iframe.removeEventListener("load", onLoad);
      if (cleanup) cleanup();
    };
  }, [iframeRef, onScrollChange, isActive]);

  return null;
}
