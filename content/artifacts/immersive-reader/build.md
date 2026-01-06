# Build

**Run:** `#012`  **Seed:** `1243`  **Mode:** `Dramatic`  **Sandbox:** `Green`  
[Run] · [Snapshot] · [Copy repro] · [Repo]

This page describes how the artifact is assembled: **Inputs → Transforms → Outputs**.  
The demo runs isolated in an iframe.

---

## Inputs

- **Source**
  - URL: `https://example.com/article`
  - Text: *(optional paste)*
- **Style**
  - Mode: `Quirky` / `Minimal` / **`Dramatic`**
- **Params**
  - Seed: `1243`
  - Intensity: `0.75`
  - Pace: `Slow`
  - Max scenes: `12`
- **Dataset (optional)**
  - `default`
  - *(swap dataset)*

---

## Transforms

1. **Fetch + Sanitize** (✓ ~120ms)  
   - Consumes: URL / Text  
   - Does: Fetches content (if URL), removes unsafe markup, normalizes text  
   - Produces: `clean_html`, `clean_text`

2. **Extract Blocks** (✓ ~42 blocks)  
   - Consumes: `clean_html`  
   - Does: Identifies headings, paragraphs, lists, quotes; builds reading blocks  
   - Produces: `blocks[]`

3. **Segment Scenes** (✓ ~7 scenes)  
   - Consumes: `blocks[]`  
   - Does: Groups blocks into meaningful “beats” (not random chopping)  
   - Produces: `scenes[]`, `scene_map.json`

4. **Motion Map** (✓ pacing: “bold”)  
   - Consumes: `scenes[]`, `mode`, `intensity`, `pace`  
   - Does: Assigns motion behaviors per scene (calm → lift → release)  
   - Produces: `motion_plan`, `storyboard.json`

5. **Render** (✓ ready)  
   - Consumes: `motion_plan`, `blocks[]`  
   - Does: Renders the reading experience + overlays; syncs motion with scroll  
   - Produces: iframe demo, `trace.log`

---

## Outputs

- **Live preview**
  - iframe demo: **Stories That Move**
- **Artifacts**
  - `storyboard.json`
  - `scene_map.json`
  - `trace.log`
- **Snapshots**
  - `#012` — Dramatic (seed `1243`)

---

## Reproduce locally

```bash
npm install
npm run dev
