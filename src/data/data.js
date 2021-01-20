import Color from "color";

function genColor() {
  const colors = [
    "#00B3A4",
    "#3185FC",
    "#DB1374",
    "#490092",
    "#FEB6DB",
    "#F98510",
    "#E6C220",
    "#BFA180",
    "#920000",
    "#461A0A",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const addColorStop = (
  gradient,
  offset,
  color,
  { hovering, transitionProgress }
) => {
  if (hovering) {
    const alpha = color.substr(7);
    color = Color(color).lighten(0.1).hex() + alpha;
  }

  color = Color(color).opaquer(-transitionProgress);
  gradient.addColorStop(offset, color);
};

export function genData(layers = 4) {
  const result = [];

  for (let i = 0; i < 7; i++) {
    const children = layers - 1 > 0 ? genData(layers - 1) : null;
    const c = genColor();
    result.push({
      text: `${layers}-${i}`,
      color: ({ ctx, hovering, transitionProgress, item, bounds }) => {
        const gradient = ctx.createLinearGradient(0, bounds.y1, 0, bounds.y0);

        addColorStop(gradient, 0, c + "FF", { hovering, transitionProgress });
        addColorStop(gradient, 1, c + "AA", { hovering, transitionProgress });
        return gradient;
      },
      children,
      weight: children ? null : Math.floor(10 * (1 + 2 * Math.random())),
    });
  }

  return result;
}