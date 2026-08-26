# Changelog

## Unreleased

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
