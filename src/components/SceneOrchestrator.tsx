// src/components/SceneOrchestrator.tsx
import { useEffect, useMemo, useRef } from "react";
import type { StoryboardScene } from "../types/storyboard";

type Waypoint = {
  id?: string;
  at: number; // 0..100 scroll percent
  scene: StoryboardScene;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * SceneOrchestrator
 * - Given waypoints [{at: 0..100, scene}], picks the current scene based on scrollPercent
 * - Calls onActiveSceneChange when it changes
 * - Optional debugMode to visualize scroll + selected scene
 */
export default function SceneOrchestrator({
  waypoints,
  scrollPercent,
  onActiveSceneChange,
  debugMode = false,
}: {
  waypoints: Waypoint[];
  scrollPercent: number;
  onActiveSceneChange: (scene: StoryboardScene | null) => void;
  debugMode?: boolean;
}) {
  const lastIdRef = useRef<string | null>(null);

  const sorted = useMemo(() => {
    const arr = Array.isArray(waypoints) ? [...waypoints] : [];
    arr.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
    return arr;
  }, [waypoints]);

  const current = useMemo(() => {
    if (!sorted.length) return null;

    const sp = clamp(scrollPercent ?? 0, 0, 100);

    // Find the last waypoint with at <= sp
    let chosen = sorted[0];
    for (const wp of sorted) {
      if ((wp.at ?? 0) <= sp) chosen = wp;
      else break;
    }
    return chosen?.scene ?? null;
  }, [sorted, scrollPercent]);

  useEffect(() => {
    const sceneId =
      (current as any)?.id ||
      (current as any)?.scene_id ||
      (current as any)?.key ||
      JSON.stringify(current)?.slice(0, 80) ||
      null;

    if (sceneId !== lastIdRef.current) {
      lastIdRef.current = sceneId;
      onActiveSceneChange(current);
    }
  }, [current, onActiveSceneChange]);

  if (!debugMode) return null;

  return (
    <div className="pointer-events-none fixed top-4 left-4 z-[9999]">
      <div className="bg-black/70 text-white text-xs rounded-lg border border-white/10 p-3 space-y-2 w-72">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Scene Debug</div>
          <div className="opacity-80">{Math.round(scrollPercent)}%</div>
        </div>

        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60"
            style={{ width: `${clamp(scrollPercent ?? 0, 0, 100)}%` }}
          />
        </div>

        <div className="opacity-90">
          <div className="opacity-70 mb-1">Active scene</div>
          <div className="font-mono break-words">
            {(current as any)?.title ||
              (current as any)?.label ||
              (current as any)?.id ||
              "—"}
          </div>
        </div>

        <div className="opacity-70">
          Waypoints: {sorted.length}
        </div>
      </div>
    </div>
  );
}