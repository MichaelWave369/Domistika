/**
 * OverStrings v2 hand-specific heuristic controls. No pose data is stored here.
 * MIT License.
 */
const BOUNDS = Object.freeze({
  pinchRatio: [0.20, 0.65],
  extensionRatio: [1.00, 1.40],
  dwellMs: [40, 350],
  lostMs: [100, 1000]
});
export function defaultProfile() {
  return {
    version: 1,
    left: {pinchRatio: 0.35, extensionRatio: 1.17},
    right: {pinchRatio: 0.35, extensionRatio: 1.17},
    dwellMs: 95,
    lostMs: 150
  };
}
function numberInRange(value, field) {
  const [min, max] = BOUNDS[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError("Invalid calibration setting: " + field);
  }
  return value;
}
export function validateProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || input.version !== 1) {
    throw new TypeError("Unsupported calibration profile");
  }
  function hand(which) {
    const p = input[which];
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      throw new TypeError("Missing " + which + " hand calibration");
    }
    return {
      pinchRatio: numberInRange(p.pinchRatio, "pinchRatio"),
      extensionRatio: numberInRange(p.extensionRatio, "extensionRatio")
    };
  }
  return {
    version: 1, left: hand("left"), right: hand("right"),
    dwellMs: numberInRange(input.dwellMs, "dwellMs"),
    lostMs: numberInRange(input.lostMs, "lostMs")
  };
}
