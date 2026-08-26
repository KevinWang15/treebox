import { layoutLayer } from "./layout";

test("lays out empty data without failing", () => {
  expect(() =>
    layoutLayer([], { x0: 0, x1: 100, y0: 0, y1: 50, depth: 0 })
  ).not.toThrow();
});

test("supplies safe leaf weights without changing input order", () => {
  const first = { text: "first", children: null };
  const second = { text: "second", weight: 4, children: null };
  const data = [first, second];

  layoutLayer(data, { x0: 0, x1: 100, y0: 0, y1: 50, depth: 0 });

  expect(data).toEqual([first, second]);
  expect(first.weight).toBe(1);
  for (const item of data) {
    expect(item.x0).toEqual(expect.any(Number));
    expect(item.x1).toEqual(expect.any(Number));
    expect(item.y0).toEqual(expect.any(Number));
    expect(item.y1).toEqual(expect.any(Number));
  }
});
