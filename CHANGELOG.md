# Changelog

## Unreleased

- Add `zoomTo(item, { animate })` for zooming straight to any item, or back to
  the top with `null`, so a treemap can follow navigation outside it. It
  animates through every level in between, and its zoom event's direction is
  `"to"`.

## 0.2.0 - 2026-10-20

- Add a `style` option and `setStyle()` for gaps, corner radius, label font,
  size range, color, outline, alignment and padding, and hover appearance.
  The defaults keep the previous look.
- Breaking: the `BOX_MARGIN` field is replaced by `style.gap`. The default gap
  of 2 matches the old margin of 1 on each side.
- Add an `open` event, fired by Ctrl/Cmd-click or Shift+Enter on a block,
  for opening a detail view without zooming.

## 0.1.5 - 2026-08-26

- Queue a stationary click made during a zoom transition and replay it against
  the next level after the animation settles.

## 0.1.4 - 2026-08-26

- Allow consecutive stationary clicks to keep zooming after each transition
  settles.
- Cull offscreen nodes, cache label layout, and avoid resetting unchanged
  canvas backing stores during repaints.
- Cache canvas geometry per animation frame and use a spatial hit-test index
  for large sibling layers.
- Reduce large-layer layout work with one stable sort, normalized prefix sums,
  and range partitioning; add repeatable performance benchmarks.

## 0.1.3 - 2026-08-26

- Harden pointer, touch, wheel, and keyboard navigation, including rapid and
  interrupted zoom transitions.
- Improve accessibility, responsive layout, high-DPI rendering, and label
  readability in the interactive demo.
- Validate hierarchy data, colors, event handlers, and zoom viewports before
  mutating or rendering state.
- Export the TreeBox constructor directly for CommonJS and browser-global
  consumers while preserving the legacy `.default` alias, and trim the
  published package payload.
- Replace the legacy Create React App toolchain with Vite and Vitest, update the
  demo to React 19, standardize reproducible installs on npm, and resolve all
  dependency audit findings.
