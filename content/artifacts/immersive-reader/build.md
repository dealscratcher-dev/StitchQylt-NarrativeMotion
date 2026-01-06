# Build

**Run:** `#012`  **Seed:** `1243`  **Mode:** `Dramatic`  **Sandbox:** `Green`  
[Run] · [Snapshot] · [Copy repro] · [Repo ▾]

> This panel describes how the artifact is assembled: **Inputs → Transforms → Outputs**.  
> The demo runs isolated in an iframe.

---

| **Inputs** | **Transforms** | **Outputs** |
|---|---|---|
| **Source**  <br> • **URL**: `https://example.com/article` <br> • **Text**: *(optional paste)*  <br><br> **Style**  <br> • Mode: `Quirky` / `Minimal` / **`Dramatic`** <br><br> **Params**  <br> • Seed: `1243` <br> • Intensity: `0.75` <br> • Pace: `Slow` <br> • Max scenes: `12` <br><br> **Dataset (optional)**  <br> • `default` <br> • *(swap dataset)* | <details open> <summary><strong>1) Fetch + Sanitize</strong> <em>✓ 120ms</em></summary> <br> **Consumes:** URL / Text <br> **Does:** Fetches content (if URL), removes unsafe markup, normalizes text. <br> **Produces:** `clean_html`, `clean_text` </details> <br> <details> <summary><strong>2) Extract Blocks</strong> <em>✓ 42 blocks</em></summary> <br> **Consumes:** `clean_html` <br> **Does:** Identifies headings, paragraphs, lists, quotes; builds reading blocks. <br> **Produces:** `blocks[]` </details> <br> <details> <summary><strong>3) Segment Scenes</strong> <em>✓ 7 scenes</em></summary> <br> **Consumes:** `blocks[]` <br> **Does:** Groups blocks into meaningful “beats” (not random chopping). <br> **Produces:** `scenes[]`, `scene_map.json` </details> <br> <details> <summary><strong>4) Motion Map</strong> <em>✓ pacing: “bold”</em></summary> <br> **Consumes:** `scenes[]`, `mode`, `intensity`, `pace` <br> **Does:** Assigns motion behaviors per scene: calm → lift → release. <br> **Produces:** `motion_plan`, `storyboard.json` </details> <br> <details> <summary><strong>5) Render</strong> <em>✓ ready</em></summary> <br> **Consumes:** `motion_plan`, `blocks[]` <br> **Does:** Renders the reading experience + overlays; syncs motion with scroll. <br> **Produces:** iframe demo, `trace.log` </details> <br><br> _Tip: Click each step to expand._ | **Live preview** <br> • iframe demo: **Stories That Move** <br> • View modes: Quirky / Minimal / Dramatic <br><br> **Artifacts** <br> • `storyboard.json`  [↧] <br> • `scene_map.json`  [↧] <br> • `trace.log`  [↧] <br><br> **Snapshots** <br> • `#012` — Dramatic (seed `1243`)  [Open] |

---

## Reproduce locally

```bash
# from repo root
npm install
npm run dev
