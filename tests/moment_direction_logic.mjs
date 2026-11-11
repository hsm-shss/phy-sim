/**
 * 力矩方向（均勻長棍）——核心計算。
 * 與此檔相同的公式亦寫在 moment_direction.html，方便單檔離線使用。
 *
 * 約定：
 * - 位置以長棍左端為 0，向右為正，單位 m。
 * - 力的方向只有鉛直向上或向下。
 * - 力矩只對支點計算。M = F × d，d = |x − x_pivot|（鉛直力的力臂）。
 * - 符號慣例（可選）：以逆時針為正（右手定則）。
 *
 * 方向規則（標準側視：左／右、向下為畫面下方）：
 * - 向下的力在支點右側 → 順時針
 * - 向下的力在支點左側 → 逆時針
 * - 向上的力則方向相反
 * - 力作用在支點上，或力臂為 0 → 該力力矩為 0
 */

/** |淨力矩| 小於此值（N m）視為平衡 */
export const EQUILIBRIUM_TOL = 0.005;

/** 位置重合容差 (m)：視為「作用在支點上」 */
export const POSITION_EPS = 1e-9;

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function leverArm(x, xPivot) {
  return Math.abs(x - xPivot);
}

/**
 * 計算單一鉛直力對支點的力矩。
 * @param {number} Fmag 力的大小（N），必須 ≥ 0
 * @param {'down'|'up'} dir
 * @param {number} x 作用位置（由左端計，m）
 * @param {number} xPivot 支點位置（由左端計，m）
 * @returns {{ arm: number, magnitude: number, direction: 'clockwise'|'anticlockwise'|'zero', signedCcw: number }}
 */
export function momentOfForce(Fmag, dir, x, xPivot) {
  const arm = leverArm(x, xPivot);
  const mag = Math.max(0, Number(Fmag) || 0);
  const magnitude = mag * arm;
  const atPivot = Math.abs(x - xPivot) < POSITION_EPS;
  if (magnitude === 0 || atPivot || mag === 0 || arm === 0) {
    return { arm: atPivot ? 0 : arm, magnitude: 0, direction: 'zero', signedCcw: 0 };
  }
  const onRight = x > xPivot;
  // 向下：右側順時針、左側逆時針；向上則相反
  const clockwise = dir === 'down' ? onRight : !onRight;
  const direction = clockwise ? 'clockwise' : 'anticlockwise';
  const signedCcw = clockwise ? -magnitude : magnitude;
  return { arm, magnitude, direction, signedCcw };
}

export function directionLabel(direction) {
  if (direction === 'clockwise') return '順時針';
  if (direction === 'anticlockwise') return '逆時針';
  if (direction === 'zero') return '力矩為 0';
  if (direction === 'equilibrium') return '平衡';
  return String(direction);
}

export function netEffectLabel(effect) {
  if (effect === 'clockwise') return '順時針轉動';
  if (effect === 'anticlockwise') return '逆時針轉動';
  if (effect === 'equilibrium') return '平衡';
  return String(effect);
}

/**
 * 分析均勻長棍對支點的力矩。
 * 重量 Mg 向下作用於中點 G。支點反作用力不列入（力臂必為 0）。
 * showWeight 為 false 時，暫時不計重力（課堂鷹架用）。
 */
export function analyze(state) {
  const L = state.L;
  const M = state.M;
  const g = state.g;
  const xPivot = state.xPivot;
  const F = Math.max(0, Number(state.F) || 0);
  const xF = state.xF;
  const Fdir = state.Fdir === 'up' ? 'up' : 'down';
  const showWeight = state.showWeight !== false;

  const weight = M * g;
  const xG = L / 2;

  const weightMoment = showWeight
    ? momentOfForce(weight, 'down', xG, xPivot)
    : { arm: leverArm(xG, xPivot), magnitude: 0, direction: 'zero', signedCcw: 0, hidden: true };

  const forceMoment = momentOfForce(F, Fdir, xF, xPivot);

  let cwTotal = 0;
  let ccwTotal = 0;
  for (const m of [weightMoment, forceMoment]) {
    if (m.direction === 'clockwise') cwTotal += m.magnitude;
    if (m.direction === 'anticlockwise') ccwTotal += m.magnitude;
  }
  const netSignedCcw = ccwTotal - cwTotal;
  let netEffect = 'equilibrium';
  if (Math.abs(netSignedCcw) >= EQUILIBRIUM_TOL) {
    netEffect = netSignedCcw > 0 ? 'anticlockwise' : 'clockwise';
  }

  return {
    weight,
    xG,
    weightMoment,
    forceMoment,
    cwTotal,
    ccwTotal,
    netSignedCcw,
    netEffect,
  };
}

/**
 * 五個課堂示範。示範 5 的施力大小取 M·g，使兩邊力矩在任何 g 下都剛好相等。
 * 位置以預設 L = 2.0 m 為準；若改 L，呼叫端應按比例或重新指定。
 */
export function presetParams(id, g = 9.81, L = 2.0, M = 2.0) {
  const mid = L / 2;
  switch (String(id)) {
    case '1':
      // 支點在中點，施力在右端向下 → 重力力矩 0，施力順時針
      return { L, M, g, xPivot: mid, xF: L, F: 10, Fdir: 'down', showWeight: true };
    case '2':
      // 支點在中點，施力在左端向下 → 施力逆時針
      return { L, M, g, xPivot: mid, xF: 0, F: 10, Fdir: 'down', showWeight: true };
    case '3':
      // 支點偏左，施力為 0 → 重力（在支點右側向下）順時針
      return { L, M, g, xPivot: L * 0.25, xF: L, F: 0, Fdir: 'down', showWeight: true };
    case '4':
      // 支點偏右，施力為 0 → 重力（在支點左側向下）逆時針
      return { L, M, g, xPivot: L * 0.75, xF: L, F: 0, Fdir: 'down', showWeight: true };
    case '5':
      // 平衡：支點在 0.25L，重力在中點向下；等大的力在左端向下
      // Mg × (mid − 0.25L) = F × 0.25L  →  F = Mg（當 mid = 0.5L）
      return { L, M, g, xPivot: L * 0.25, xF: 0, F: M * g, Fdir: 'down', showWeight: true };
    default:
      throw new Error('未知示範：' + id);
  }
}
