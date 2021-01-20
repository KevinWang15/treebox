# treebox

![](https://raw.githubusercontent.com/KevinWang15/treebox/master/design/logo.png)

Treebox is an interactive TreeMap visualization

- weight-aware multi-level hierarchical treemap layout
- click on a block to zoom in / "esc" to zoom out
- smooth transition
- uses canvas & requestAnimationFrame for performance
- customize text / color / weight
- fires events (so you can implement tooltip, etc.)
- no dependency (5kb gzipped)
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
      color: ({ ctx, hovering, transitionProgress, item, bounds }) => "red",
      children,
      weight: children ? null : Math.floor(10 * (1 + 2 * Math.random())),
    });
  }

  return result;
}
```

```javascript
import TreeBox from "@kevinwang15/treebox";

const pixelRatio = 2;

<div
  ref={(domElement) => {
    const treebox = new TreeBox({
      pixelRatio,
      data: genData(),
      domElement,
      eventHandler: console.log,
    });

    window.addEventListener("resize", () => {
      treebox.repaint();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        treebox.zoomOut();
      }
    });
  }}
/>;
```

# Roadmap

- better font animation that will not kill performance
- more customization options
- github.io page
- automated testing

