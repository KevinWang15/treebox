export function validateHierarchy(
  data,
  ancestors = new Set(),
  seenItems = new Set()
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
    const item = data[0];
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
  const [group1, group2] = divideIntoTwoGroups(data);

  const width = x1 - x0;
  const height = y1 - y0;

  if (width > height) {
    //left-right
    const g1width = Math.round(width * calcWeightShare(group1, data));
    layoutLayer(group1, { x0, x1: x0 + g1width, y0, y1, depth });
    layoutLayer(group2, { x0: x0 + g1width, x1, y0, y1, depth });
  } else {
    //top-bottom
    const g1height = Math.round(height * calcWeightShare(group1, data));
    layoutLayer(group1, { x0, x1, y0, y1: y0 + g1height, depth });
    layoutLayer(group2, { x0, x1, y0: y0 + g1height, y1, depth });
  }
}

function divideIntoTwoGroups(data) {
  const totalWeight = calcTotalWeight(data);
  const scale = Number.isFinite(totalWeight) ? 1 : calcMaxWeight(data);
  const targetWeightForGroup1 =
    (Number.isFinite(totalWeight)
      ? totalWeight
      : calcScaledTotalWeight(data, scale)) / 2;
  const group1 = [];
  const group2 = [];
  let currentWeight = 0;
  const array = [...data].sort((x, y) => {
    return y.weight - x.weight;
  });
  for (let item of array) {
    if (currentWeight < targetWeightForGroup1) {
      group1.push(item);
    } else {
      group2.push(item);
    }
    currentWeight += item.weight / scale;
  }
  if (group1.length === 0) {
    group1.push(group2.shift());
  } else if (group2.length === 0) {
    group2.push(group1.shift());
  }
  return [group1, group2];
}

function calcTotalWeight(data) {
  let result = 0;
  for (let item of data) {
    result += item.weight;
  }
  return result;
}

function calcMaxWeight(data) {
  let result = 0;
  for (const item of data) {
    result = Math.max(result, item.weight);
  }
  return result;
}

function calcScaledTotalWeight(data, scale) {
  let result = 0;
  for (const item of data) {
    result += item.weight / scale;
  }
  return result;
}

function calcWeightShare(group, data) {
  const totalWeight = calcTotalWeight(data);
  const groupWeight = calcTotalWeight(group);
  if (Number.isFinite(totalWeight) && Number.isFinite(groupWeight)) {
    return groupWeight / totalWeight;
  }

  const scale = calcMaxWeight(data);
  return (
    calcScaledTotalWeight(group, scale) / calcScaledTotalWeight(data, scale)
  );
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
    if (w > Number.MAX_VALUE - childWeight) {
      return Number.MAX_VALUE;
    }
    w += childWeight;
  }
  return w;
}
