import assert from 'assert';
import {
  EQUILIBRIUM_TOL,
  analyze,
  momentOfForce,
  presetParams,
  directionLabel,
  netEffectLabel,
} from './moment_direction_logic.mjs';

const g = 9.81;
const L = 2.0;
const M = 2.0;

function almostEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

// ----- 單一力：方向規則與支點上力矩為 0 -----
{
  const mid = 1.0;
  const downRight = momentOfForce(10, 'down', 2.0, mid);
  assert.strictEqual(downRight.direction, 'clockwise', '向下的力在支點右側 → 順時針');
  assert.ok(almostEqual(downRight.magnitude, 10 * 1.0));
  assert.ok(almostEqual(downRight.signedCcw, -10));

  const downLeft = momentOfForce(10, 'down', 0, mid);
  assert.strictEqual(downLeft.direction, 'anticlockwise', '向下的力在支點左側 → 逆時針');
  assert.ok(almostEqual(downLeft.signedCcw, 10));

  const upRight = momentOfForce(10, 'up', 2.0, mid);
  assert.strictEqual(upRight.direction, 'anticlockwise', '向上的力在支點右側 → 逆時針（與向下相反）');

  const upLeft = momentOfForce(10, 'up', 0, mid);
  assert.strictEqual(upLeft.direction, 'clockwise', '向上的力在支點左側 → 順時針（與向下相反）');

  const atPivot = momentOfForce(25, 'down', mid, mid);
  assert.strictEqual(atPivot.direction, 'zero', '力作用在支點上 → 力矩為 0');
  assert.strictEqual(atPivot.magnitude, 0);
  assert.strictEqual(atPivot.arm, 0);

  const zeroF = momentOfForce(0, 'down', 2.0, mid);
  assert.strictEqual(zeroF.direction, 'zero', '力為 0 → 力矩為 0');
}

// ----- 示範 1：支點在中點，施力在右端向下 -----
{
  const r = analyze(presetParams(1, g, L, M));
  assert.strictEqual(r.weightMoment.direction, 'zero', '示範 1：支點在重心，重力力矩為 0');
  assert.strictEqual(r.weightMoment.magnitude, 0);
  assert.strictEqual(r.forceMoment.direction, 'clockwise', '示範 1：右端向下施力 → 順時針');
  assert.ok(almostEqual(r.forceMoment.magnitude, 10 * 1.0));
  assert.ok(almostEqual(r.cwTotal, 10));
  assert.ok(almostEqual(r.ccwTotal, 0));
  assert.strictEqual(r.netEffect, 'clockwise');
  assert.strictEqual(netEffectLabel(r.netEffect), '順時針轉動');
  assert.strictEqual(directionLabel(r.forceMoment.direction), '順時針');
}

// ----- 示範 2：支點在中點，施力在左端向下 -----
{
  const r = analyze(presetParams(2, g, L, M));
  assert.strictEqual(r.weightMoment.direction, 'zero', '示範 2：重力力矩為 0');
  assert.strictEqual(r.forceMoment.direction, 'anticlockwise', '示範 2：左端向下施力 → 逆時針');
  assert.ok(almostEqual(r.forceMoment.magnitude, 10 * 1.0));
  assert.ok(almostEqual(r.ccwTotal, 10));
  assert.ok(almostEqual(r.cwTotal, 0));
  assert.strictEqual(r.netEffect, 'anticlockwise');
  assert.strictEqual(netEffectLabel(r.netEffect), '逆時針轉動');
}

// ----- 示範 3：支點偏左，施力為 0，只計重力 -----
{
  const p = presetParams(3, g, L, M);
  assert.strictEqual(p.F, 0);
  const r = analyze(p);
  assert.strictEqual(r.forceMoment.direction, 'zero', '示範 3：施力為 0');
  assert.strictEqual(r.weightMoment.direction, 'clockwise', '示範 3：重力在支點右側向下 → 順時針');
  // d = 1.0 − 0.5 = 0.5 m；Mg = 19.62 N → 9.81 N m
  assert.ok(almostEqual(r.weightMoment.arm, 0.5));
  assert.ok(almostEqual(r.weightMoment.magnitude, M * g * 0.5));
  assert.strictEqual(r.netEffect, 'clockwise');
  assert.ok(almostEqual(r.ccwTotal, 0));
}

// ----- 示範 4：支點偏右，施力為 0 -----
{
  const r = analyze(presetParams(4, g, L, M));
  assert.strictEqual(r.forceMoment.direction, 'zero', '示範 4：施力為 0');
  assert.strictEqual(r.weightMoment.direction, 'anticlockwise', '示範 4：重力在支點左側向下 → 逆時針');
  assert.ok(almostEqual(r.weightMoment.arm, 0.5));
  assert.ok(almostEqual(r.weightMoment.magnitude, M * g * 0.5));
  assert.strictEqual(r.netEffect, 'anticlockwise');
}

// ----- 示範 5：平衡（順時針總力矩 = 逆時針總力矩） -----
{
  const r = analyze(presetParams(5, g, L, M));
  assert.strictEqual(r.weightMoment.direction, 'clockwise', '示範 5：重力順時針');
  assert.strictEqual(r.forceMoment.direction, 'anticlockwise', '示範 5：左端向下施力逆時針');
  assert.ok(almostEqual(r.cwTotal, r.ccwTotal), '示範 5：兩邊總力矩相等');
  assert.ok(almostEqual(r.cwTotal, M * g * 0.5));
  assert.ok(Math.abs(r.netSignedCcw) < EQUILIBRIUM_TOL);
  assert.strictEqual(r.netEffect, 'equilibrium');
  assert.strictEqual(netEffectLabel(r.netEffect), '平衡');
}

// 示範 5 在 g = 10 時仍平衡
{
  const r = analyze(presetParams(5, 10, L, M));
  assert.ok(almostEqual(r.cwTotal, r.ccwTotal));
  assert.ok(almostEqual(r.cwTotal, 20 * 0.5));
  assert.strictEqual(r.netEffect, 'equilibrium');
}

// ----- 支點在重心時重力力矩為 0（即使施力不在支點） -----
{
  const r = analyze({
    L, M, g, xPivot: L / 2, xF: 1.7, F: 8, Fdir: 'up', showWeight: true,
  });
  assert.strictEqual(r.weightMoment.direction, 'zero');
  assert.strictEqual(r.forceMoment.direction, 'anticlockwise', '向上、右側');
}

// ----- 隱藏重力時只計施力（鷹架） -----
{
  const r = analyze({
    L, M, g, xPivot: 0.4, xF: 2, F: 10, Fdir: 'down', showWeight: false,
  });
  assert.strictEqual(r.weightMoment.direction, 'zero');
  assert.ok(r.weightMoment.hidden);
  assert.strictEqual(r.forceMoment.direction, 'clockwise');
  assert.ok(almostEqual(r.cwTotal, 10 * (2 - 0.4)));
  assert.strictEqual(r.netEffect, 'clockwise');
}

// ----- 接近平衡的容差：|淨力矩| < 0.005 N m 視為平衡 -----
{
  // 刻意造一個極小淨力矩（遠小於一般課堂數值，但大於 0）
  const rEq = analyze({
    L, M, g: 9.81, xPivot: 1, xF: 1, F: 0, Fdir: 'down', showWeight: true,
  });
  assert.strictEqual(rEq.netEffect, 'equilibrium', '支點在 G 且 F 在支點上 → 平衡');

  // 0.004 N m 的淨順時針力矩應視為平衡；0.006 則否
  const tiny = momentOfForce(0.004, 'down', 2, 1); // 0.004 × 1 = 0.004 N m
  assert.ok(tiny.magnitude < EQUILIBRIUM_TOL);
  const rTiny = analyze({
    L: 2, M: 0, g, xPivot: 1, xF: 2, F: 0.004, Fdir: 'down', showWeight: true,
  });
  assert.strictEqual(rTiny.netEffect, 'equilibrium', '|M| = 0.004 N m → 平衡');

  const rNot = analyze({
    L: 2, M: 0, g, xPivot: 1, xF: 2, F: 0.006, Fdir: 'down', showWeight: true,
  });
  assert.strictEqual(rNot.netEffect, 'clockwise', '|M| = 0.006 N m → 順時針轉動');
}

console.log('OK  力矩方向：示範 1–5、支點上力矩為 0、向上反向、鷹架隱藏重力、平衡容差');
