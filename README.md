# treebox

![](https://raw.githubusercontent.com/KevinWang15/treebox/master/design/logo.png)

Treebox is an interactive TreeMap visualization

- weight-aware multi-level hierarchical treemap layout
- click on a block to zoom in / `Esc` or scroll down to zoom out
- drag to zoom into a selected area; scroll up to retrace a zoom-out
- keyboard-focusable canvas with arrow, `Enter`, `Space`, and `Esc` controls
- pointer and touch support, with automatic container resize reflow
- smooth transition
- uses canvas & requestAnimationFrame for performance
- customize text / color / weight
- wraps long and multiline labels within their available bounds
- fires events (so you can implement tooltip, etc.)
- no runtime dependencies (about 8kb gzipped)
- MIT license

# DEMO

![](https://raw.githubusercontent.com/KevinWang15/treebox/master/demo.png)

![](https://raw.githubusercontent.com/KevinWang15/treebox/master/demo.gif)

# try it

```bash
git clone https://github.com/KevinWang15/treebox
cd treebox
yarn install
yarn start
```

# use it

```bash
npm i @kevinwang15/treebox
```

```javascript
export function genData(layers = 4) {
  const result = [];

  for (let i = 0; i < 7; i++) {
    const children = layers - 1 > 0 ? genData(layers - 1) : null;
    result.push({
      text: `${layers}-${i}`,
      color: ({ ctx, hovering, item, bounds }) => "red",
      children,
      weight: children ? null : Math.floor(10 * (1 + 2 * Math.random())),
    });
  }

  return result;
}
```

```javascript
import TreeBox from "@kevinwang15/treebox";

const domElement = document.querySelector("#treemap");
const treebox = new TreeBox({
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  data: genData(),
  domElement,
  eventHandler: (type, payload) => console.log(type, payload),
});

// Hover events receive the active item, then null when hover/focus leaves.
// Zoom events include { node, direction, depth, canZoomOut }.

// Keep the backing store sharp after browser zoom or a display change.
treebox.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

function destroyTreebox() {
  treebox.destroy();
}

// Call destroyTreebox() when the surrounding view is removed.
```

# Roadmap

- more customization options
- github.io page
- customizable transition timing
