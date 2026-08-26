export function validateHierarchy(
  data,
  ancestors = new Set(),
  seenItems = new Set(),
) {
  if (!Array.isArray(data)) {
    throw new TypeError("Treemap layer data must be an array");
  }
  if (ancestors.has(data)) {
    throw new TypeError("Treemap data must not contain cycles");
  }

  ancestors.add(data);
  try {
    for (const item of data) {
      if (!item || typeof item !== "object") {
        throw new TypeError("Treemap items must be objects");
      }
      if (seenItems.has(item)) {
        throw new TypeError("Treemap data must not reuse item objects");
      }
      if (item.children) {
        validateHierarchy(item.children, ancestors, seenItems);
      }
      seenItems.add(item);
    }
  } finally {
    ancestors.delete(data);
  }
}

export function layoutLayer(data, { x0, x1, y0, y1, depth }) {
  if (!Array.isArray(data)) {
    throw new TypeError("Treemap layer data must be an array");
  }
  if (!data.length) {
    return;
  }

  for (let item of data) {
    if (!item || typeof item !== "object") {
      throw new TypeError("Treemap items must be objects");
    }
    if (!Number.isFinite(item.weight) || item.weight <= 0) {
      item.weight = calculateWeight(item);
    }
  }

  if (data.length === 1) {
    layoutRange(data, 0, 1, { x0, x1, y0, y1, depth }, null);
    return;
  }

  const items = [...data].sort((a, b) => {
    if (a.weight === b.weight) {
      return 0;
    }
    return a.weight > b.weight ? -1 : 1;
  });
  layoutRange(
    items,
    0,
    items.length,
    { x0, x1, y0, y1, depth },
    createWeightTable(items, 0, items.length),
  );
}

function layoutRange(items, start, end, bounds, weightTable) {
  const { x0, x1, y0, y1, depth } = bounds;
  if (end - start === 1) {
    const item = items[start];
    item.x0 = x0;
    item.x1 = x1;
    item.y0 = y0;
    item.y1 = y1;
    item.w = x1 - x0;
    item.h = y1 - y0;
    item.layoutOk = true;

    if (item.children && item.children.length) {
      layoutLayer(item.children, {
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        depth: depth + 1,
      });
    }
    return;
  }

  let totalWeight = rangeWeight(weightTable, start, end);
  if (!(totalWeight > 0)) {
    // Very small weights can disappear behind a much larger prefix sum.
    // Rebase that isolated range so its internal proportions remain usable.
    weightTable = createWeightTable(items, start, end);
    totalWeight = rangeWeight(weightTable, start, end);
  }
  const split = findWeightSplit(weightTable, start, end, totalWeight / 2);
  const group1Share = rangeWeight(weightTable, start, split) / totalWeight;

  const width = x1 - x0;
  const height = y1 - y0;

  if (width > height) {
    //left-right
    const g1width = Math.round(width * group1Share);
    layoutRange(
      items,
      start,
      split,
      { x0, x1: x0 + g1width, y0, y1, depth },
      weightTable,
    );
    layoutRange(
      items,
      split,
      end,
      { x0: x0 + g1width, x1, y0, y1, depth },
      weightTable,
    );
  } else {
    //top-bottom
    const g1height = Math.round(height * group1Share);
    layoutRange(
      items,
      start,
      split,
      { x0, x1, y0, y1: y0 + g1height, depth },
      weightTable,
    );
    layoutRange(
      items,
      split,
      end,
      { x0, x1, y0: y0 + g1height, y1, depth },
      weightTable,
    );
  }
}

function createWeightTable(items, start, end) {
  const scale = items[start].weight;
  const prefix = new Float64Array(end - start + 1);
  for (let index = start; index < end; index++) {
    prefix[index - start + 1] =
      prefix[index - start] + items[index].weight / scale;
  }
  return { offset: start, prefix };
}

function rangeWeight({ offset, prefix }, start, end) {
  return prefix[end - offset] - prefix[start - offset];
}

function findWeightSplit(weightTable, start, end, targetWeight) {
  let low = start + 1;
  let high = end;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (rangeWeight(weightTable, start, middle) < targetWeight) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return Math.min(low, end - 1);
}

function calculateWeight(item) {
  if (Number.isFinite(item.weight) && item.weight > 0) {
    return item.weight;
  }

  if (!Array.isArray(item.children) || !item.children.length) {
    return 1;
  }

  let w = 0;
  for (let child of item.children) {
    const childWeight = calculateWeight(child);
    if (!Number.isFinite(child.weight) || child.weight <= 0) {
      child.weight = childWeight;
    }
    if (w > Number.MAX_VALUE - childWeight) {
      return Number.MAX_VALUE;
    }
    w += childWeight;
  }
  return w;
}
