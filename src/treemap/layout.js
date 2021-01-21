export function layoutLayer(data, { x0, x1, y0, y1, depth }) {
  for (let item of data) {
    if (!item.weight) {
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
    item.layoutOk = true;

    if (item.children) {
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
    const width = x1 - x0;
    const g1width = Math.round(
      (width * calcTotalWeight(group1)) / calcTotalWeight(data)
    );
    layoutLayer(group1, { x0, x1: x0 + g1width, y0, y1, depth });
    layoutLayer(group2, { x0: x0 + g1width, x1, y0, y1, depth });
  } else {
    //top-bottom
    const height = y1 - y0;
    const g1height = Math.round(
      (height * calcTotalWeight(group1)) / calcTotalWeight(data)
    );
    layoutLayer(group1, { x0, x1, y0, y1: y0 + g1height, depth });
    layoutLayer(group2, { x0, x1, y0: y0 + g1height, y1, depth });
  }
}

function divideIntoTwoGroups(data) {
  const targetWeightForGroup1 = calcTotalWeight(data) / 2;
  const group1 = [];
  const group2 = [];
  let currentWright = 0;
  const array = data.sort((x, y) => {
    return y.weight - x.weight;
  });
  for (let item of array) {
    if (currentWright < targetWeightForGroup1) {
      group1.push(item);
    } else {
      group2.push(item);
    }
    currentWright += item.weight;
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

function calculateWeight(item) {
  if (item.weight) {
    return item.weight;
  }

  let w = 0;
  for (let child of item.children) {
    w += calculateWeight(child);
  }
  return w;
}
