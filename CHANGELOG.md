# Changelog

## 0.1.3 - 2026-08-26

- Harden pointer, touch, wheel, and keyboard navigation, including rapid and
  interrupted zoom transitions.
- Improve accessibility, responsive layout, high-DPI rendering, and label
  readability in the interactive demo.
- Validate hierarchy data, colors, event handlers, and zoom viewports before
  mutating or rendering state.
- Export the TreeBox constructor directly for CommonJS and browser-global
  consumers, and trim the published package payload.
- Replace the legacy Create React App toolchain with Vite and Vitest, update the
  demo to React 19, and resolve all dependency audit findings.
