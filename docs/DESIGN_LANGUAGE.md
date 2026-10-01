# MDX Studio Design Language — "Patina"

Status: **adopted for the dark theme** (stages 0–7: tokens, primitives, shell, visualization
primitives, motif library, Dashboard, Monitor; plus the brand mark and app icon). The remaining views
still render with the re-themed primitives but have not been recomposed yet. The light theme is
deferred (stage 9) and is kept functional, not polished.

## 1. Intent

Premium scientific instrumentation translated into desktop software: a machined instrument panel in
a dark lab, not a gaming rig and not a SaaS console.

- **Quiet chrome, loud data.** Chrome stays in the warm-black range. Saturation is spent on telemetry
  and state, and only there.
- **Every glyph is honest.** Values carry units and origin. Status words appear only where the
  runtime classifies a state. Numbers never tween through values that were never measured.
- **Depth, not decoration.** Atmosphere comes from surface layering, hairlines and a single espresso
  wash. Motifs are molecular-dynamics concepts, used sparingly and never behind precise content.
- **Luxurious and minimal before decorative.** When in doubt, remove.

The name is the metaphor: **bronze** is the instrument (the MDX-accelerated path); **verdigris**, the
patina bronze grows, is its natural complement and represents the **native GROMACS reference**.

## 2. Non-negotiable invariants

These carry product semantics and outrank any aesthetic rule.

1. **Hatch means simulated.** The diagonal hatch texture is reserved for simulated/mock provenance.
   Nothing else may use it. It is deliberately faint; the text ("Simulated", "Simulated runtime.")
   and the ◆ glyph are the authoritative signal. Texture must never be the only cue, nor noisy.
2. **The disclosure ribbon is always rendered** by the shell (`role="status"` inside the
   `banner`), derived from what the runtime reports about itself.
3. **Status is never colour alone.** Every status carries a glyph and a text label.
4. **Status colours are reserved.** pass / warn / fail / info are never reused as data-series colours.
5. **No invented thresholds.** Gauges and meters show bounded fractions on a neutral scale. Redlines,
   limits and tolerance bands appear only when the runtime supplies them (the protocol has none yet).
6. **No fake telemetry semantics.** Charts plot what the runtime sent. Any client-side processing
   (for example a rolling mean) must be labelled on the chart.
7. **Numbers do not animate.** Numerals switch to the new sample; they never interpolate.
8. **Bronze vs verdigris is the MDX-vs-Native pair.** When a view compares the two paths, MDX is
   bronze and native is verdigris, everywhere.

## 3. Colour

All tokens live in `packages/ui/src/styles/tokens.css`. Components consume **semantic** tokens
(`--mdx-*`); primitive tokens (`--p-*`) exist only to define them.

### Obsidian surfaces (warm-tinted, never neutral grey)

| Token                              | Value                             | Use                                                   |
| ---------------------------------- | --------------------------------- | ----------------------------------------------------- |
| `--mdx-bg`                         | `#0A0908`                         | window background                                     |
| `--mdx-shell`                      | `#0D0B0A`                         | sidebar                                               |
| `--mdx-surface`                    | `#141110`                         | cards (top of a ≤3 % vertical gradient)               |
| `--mdx-surface-raised`             | `#1B1714`                         | hover, popovers, raised controls                      |
| `--mdx-surface-sunken`             | `#0B0908`                         | plots, inputs, code (inset)                           |
| `--mdx-border`                     | warm ivory at 7 % alpha           | default hairline                                      |
| `--mdx-border-strong`              | 12 %                              | control outlines                                      |
| `--mdx-border-hover`               | 20 %                              | hover                                                 |
| `--mdx-text` / `-muted` / `-faint` | `#EEE7DE` / `#A99E92` / `#958B80` | ivory, not pure white; faint ≥ 5.3:1 on every surface |

The **espresso wash** is a single fixed radial gradient on the app background (top-left, ~8 %
alpha of a warm brown) plus a faint vignette. Brown lives in the undertone of every surface; it is
never painted as tan panels.

### Bronze (brand and interaction — sparingly)

| Token              | Value     | Use                                         |
| ------------------ | --------- | ------------------------------------------- |
| `--mdx-bronze-300` | `#E3C08F` | champagne: focus ring, selected text, links |
| `--mdx-bronze-400` | `#D19E5E` | primary button fill (espresso text, 7.7:1)  |
| `--mdx-bronze-500` | `#C1843C` | active nav tick, MDX series                 |
| `--mdx-bronze-800` | `#3A2616` | selected-row / active-nav tint              |

`--mdx-accent` maps to bronze so any legacy `accent` usage re-themes automatically.

### Data colours

**Comparison pair (semantic).** `--mdx-series-mdx` `#C1843C` (bronze) and `--mdx-series-native`
`#1FA38F` (verdigris). Used whenever MDX and native results are shown together.

**Standalone telemetry** (a single throughput / network-style trace that is not a comparison) does
not have to be bronze. It uses the restrained **smoked plum** treatment: `--mdx-trace` `#9A7CCB` line
over a plum area that fades to transparent (`--mdx-trace-fill-top` → `--mdx-trace-fill-bottom`).
Gauges use **champagne** (`--mdx-gauge` `#D9AE74`). This keeps bronze meaningful.

**Generic slots** (`--mdx-chart-1…4`, fixed order, never cycled; used by the legacy `LineChart`):
plum `#9A7CCB`, verdigris `#1FA38F`, bronze `#C1843C`, rose `#C45F86`. Validated as a set with the
dataviz palette validator against the card surface `#141110` (dark): lightness band, chroma floor,
adjacent-pair CVD separation (worst ΔE 9.4, deutan), normal-vision floor and contrast all pass. Rose
collapses against verdigris under deuteranopia, so a 4-series chart must be direct-labelled.

### Status (reserved)

| Status | Token              | Value     | Glyph | Notes                            |
| ------ | ------------------ | --------- | ----- | -------------------------------- |
| pass   | `--mdx-pass`       | `#8FBF72` | ✓     | sage                             |
| warn   | `--mdx-warn`       | `#E2B340` | ▲     | sulfur — more yellow than bronze |
| fail   | `--mdx-fail`       | `#E5654B` | ✕     | cinnabar                         |
| info   | `--mdx-info`       | `#9A9FE6` | ●     | running/in progress; not "good"  |
| demo   | hatch + ivory text | —         | ◆     | never amber — see invariant 1    |

Glyphs are inline SVG (Geist has no ◆ ✓ ✕), so they render identically on every host.

### Glow

Exactly two uses: the live-edge dot of a trace and the end cap of a live gauge arc. Low alpha, small
radius. Never on text, borders or cards.

## 4. Typography

- **Geist** (UI) and **Geist Mono** (identifiers, hashes, versions, tabular values), vendored as
  variable woff2 in `packages/ui/src/fonts/` under the SIL OFL 1.1 (see `OFL.txt` there). Fallbacks:
  Segoe UI Variable, Cascadia Mono.
- Numerals use `font-variant-numeric: tabular-nums` (Geist supports `tnum`).

| Role            | Size / weight         | Notes                                   |
| --------------- | --------------------- | --------------------------------------- |
| Eyebrow         | 11 px / 500, +0.08 em | uppercase; sparingly, not on every card |
| Label           | 12 px / 450           |                                         |
| Body            | 13 px / 400           |                                         |
| Card title      | 15 px / 500           | sentence case                           |
| Page title      | 28 px / 500, −0.02 em |                                         |
| Hero numeral    | 44–52 px / 300        | tabular, −0.03 em                       |
| Readout numeral | 20–24 px / 350        | tabular                                 |

## 5. Space, shape, depth

- 4-point grid. Card padding 20 px (hero 24 px). Grid gutter 12 px. Section gap 24 px. Page padding
  28 px.
- Radii: cards 12 px, inner tiles and controls 8 px, chips fully rounded.
- Elevation:
  - **e0 inset** — plots, inputs: sunken fill, hairline, no shadow.
  - **e1 card** — hairline + 1 px inner top highlight (light catching a machined edge) + soft ambient
    shadow.
  - **e2 overlay** — stronger shadow; the only place a backdrop blur is permitted.
- No glassmorphism on cards.

## 6. Interaction states

| State         | Treatment                                                               |
| ------------- | ----------------------------------------------------------------------- |
| hover         | one surface step up, border → `--mdx-border-hover`; no scale transforms |
| pressed       | inset (sunken fill)                                                     |
| focus-visible | 2 px champagne ring, 2 px offset — always visible for keyboard users    |
| selected      | bronze tint + 2 px bronze tick                                          |
| disabled      | 45 % opacity + an explanatory `title`                                   |
| error         | cinnabar hairline + callout                                             |
| motion        | 120–180 ms ease-out; none under `prefers-reduced-motion`                |

Card-level navigation links ("Open monitor →") are ink at rest with a bronze underline on hover, so
bronze stays reserved for brand, selection and primary action. Table rows take the same faint tint
on hover and on keyboard focus within the row.

## 7. Visualization grammar

Primitives live in `packages/ui/src/viz/`. Each keeps its geometry in pure, unit-tested functions.

- **TraceChart** — rolling time-series. 1.5 px line, horizontal hairline grid only, y-scale labels in
  a gutter (never over the trace), relative time axis ending at "now", a live-edge dot when the
  caller says the source is live, optional area fill where the area encodes magnitude.
- **RadialGauge** — 240° dial with minor ticks every 10 % and majors every 50 %. **Bounded fractions
  only** (utilization, occupancy, progress). No redlines until the runtime supplies limits.
  `role="meter"` with `aria-valuenow`.
- **Meter** — 4 px linear fraction bar with a numeric readout; neutral scale, no thresholds.
- **TrajectoryRuler** — simulated-time progress: a ruled ns axis from 0 to target, filled span,
  current marker. `role="progressbar"`.
- **StatusDot** — dot + word, used inside cards where a full badge would be too loud.
- **Scale honesty.** A fitted scale may enforce a minimum span relative to the data magnitude
  (`minRelativeSpan`, e.g. 6 % for ns/day) so sample-to-sample jitter is not magnified into
  full-height noise. Only the scale changes; every sample is drawn as received, and the y-labels
  always show the actual scale.
- Legacy `LineChart` remains exported from `@mdx-studio/ui` and re-themed through tokens only; no
  desktop view uses it any more.

Anti-patterns: dual y-axes; rainbow palettes; colour-only identity; decorative micro-charts without
units; a number on every point; axis labels over data.

## 8. Motifs

Deterministic, seeded SVG in `packages/ui/src/motifs/`, drawn with `currentColor`, rendered at
4–8 % opacity, masked away from text, static, `aria-hidden`. No raster assets, no WebGL.

| Motif                | Concept                                              | Used on                          |
| -------------------- | ---------------------------------------------------- | -------------------------------- |
| `UnitCellMotif`      | isometric periodic box (GROMACS box types)           | Active-run / Simulation hero     |
| `ParticleFieldMotif` | seeded point cloud with a soft density gradient      | behind the unit cell in the hero |
| `CutoffRingsMotif`   | concentric cutoff spheres (rc / rlist) around a site | behind the MDX radial gauges     |
| `RdfCurveMotif`      | radial distribution function g(r), first shells      | idle / empty states (Monitor)    |
| `FilamentsMotif`     | faint bundle of trajectory streamlines               | quiet cards (validation summary) |

**Never** behind tables, charts' plot areas, forms, the MDP editor, validation numbers, hashes or
logs.

## 9. Brand mark and app icon

The mark is the unit cell as a lattice: a bronze hexagonal rim, three inner edges meeting at the
centre, faces filled with translucent bronze lit from the upper left (top 32 %, left 15 %, right
6 %), and one champagne particle at the centre, separated from the edges by a clearance gap.

- **One source.** `apps/desktop/src/brand/mark.ts` is the only definition. The sidebar draws it as
  SVG (`BrandMark`), and `pnpm --filter @mdx-studio/desktop brand:icons` rasterises the same
  geometry into every icon file. Never edit the icon files by hand.
- **App icon** = the mark on a rounded obsidian plate (espresso → obsidian vertical gradient, faint
  champagne hairline), filling the canvas below 32 px so the cell stays as large as possible.
- **Small sizes are drawn, not shrunk.** Edges are whole device pixels, snapped so vertical edges
  land on pixel boundaries; below a ~9 px cell radius the particle is omitted (it would only blur
  the centre). Each ICO size from 16 to 256 px is rendered individually.
- No letterforms, no wordmark inside the icon, no gradients on the lattice itself.

## 10. Monitor composition

A 12-column grid, densest information top-left, read like an instrument rack:

| Row | Panels (columns)                                                                               |
| --- | ---------------------------------------------------------------------------------------------- |
| 1   | Simulation hero (8) — simulated time, ruler, step / elapsed / ETA / mode · Throughput (4)      |
| 2   | Thermodynamics (12) — temperature, pressure, potential and total energy tiles                  |
| 3   | MDX pipeline (7) — utilization dial, state, meters, pair throughput · Accelerator hardware (5) |
| 4   | Event log (8) · Host (4) — CPU, memory, GPU                                                    |

- Every panel plots only what the runtime sent. The one client-side computation is the **window
  statistics** (mean, σ, min, max over the samples on screen), always labelled as such.
- MDX and hardware panels appear only when the latest sample carries them; a native run says so in
  words instead of showing empty instruments.
- The run picker and Stop live in the page header; Stop appears only when the runtime's
  `allowedActions` includes it and always asks for confirmation. A run that ends stays on screen so
  a stop or fault is visible; a newly started live run takes over.
- Below 1280 px every panel spans the full width; below 760 px the inner tiles stack to one column.

## 11. Components

Preserved APIs, restyled: `Panel` (+ `variant`, `description`, `motif`), `Button` (+ link-button class
fix), `Badge` / `StatusPill` / `OriginBadge`, `KeyValueList`, `DataTable`, `Tabs`,
`SegmentedControl`, `Field`, `Callout`, `MetricTile`, `ProgressBar`, `StateStrip`, `LineChart`.

Introduced: `TraceChart`, `RadialGauge`, `Meter`, `TrajectoryRuler`, `StatusDot`, the motif set,
the shell's disclosure ribbon (with the active demo scenario), sidebar runtime footer, brand mark and
the "Simulated run" notice.

## 12. Deferred

- Light "Paper" theme parity (stage 9). The light token block keeps every semantic token defined so
  nothing breaks, but it is not art-directed.
- Monitor follow-ups: stale-sample detection, event tick marks on the run timeline, rolling-mean
  envelopes for thermostat quantities, GPU telemetry (needs a protocol field).
- Remaining views (stage 8); Windows custom titlebar / Mica evaluation (stage 9).
- Device limits: no protocol change yet; gauges show no redlines.
