// src/components/SceneOverlay.tsx
import type { StoryboardScene } from "../types/storyboard";

export default function SceneOverlay({
  scene,
  isActive,
}: {
  scene: StoryboardScene | null;
  isActive: boolean;
}) {
  if (!isActive || !scene) return null;

  // Render a simple overlay card. You can expand this later to support
  // scene.type animations, highlights, tooltips, etc.
  const title = (scene as any)?.title || (scene as any)?.label || "Scene";
  const subtitle = (scene as any)?.subtitle || (scene as any)?.note || "";

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-auto md:w-[480px]">
        <div className="bg-slate-950/70 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl">
          <div className="text-slate-100 font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-slate-300 text-sm mt-1 leading-relaxed">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}