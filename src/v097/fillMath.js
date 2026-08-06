const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const MAX_SYMMETRY_REGION_RATIO = 0.48;

export function colorMatchesBounded(data, offset, target, tolerance) {
  const resolvedTolerance = clamp(tolerance, 0, 100);
  const alpha = data[offset + 3];

  if (target[3] <= 8) {
    const transparentLimit = 8 + Math.round(resolvedTolerance * 0.18);
    return alpha <= transparentLimit;
  }

  const alphaTolerance = Math.max(8, Math.round(resolvedTolerance * 0.55));
  if (Math.abs(alpha - target[3]) > alphaTolerance) return false;

  const difference = Math.abs(data[offset] - target[0])
    + Math.abs(data[offset + 1] - target[1])
    + Math.abs(data[offset + 2] - target[2]);
  return difference <= resolvedTolerance * 3;
}

export function isEligibleSymmetryRegion({ touchesEdge, pixelCount, totalPixels }) {
  if (touchesEdge || pixelCount <= 0 || totalPixels <= 0) return false;
  return pixelCount <= Math.floor(totalPixels * MAX_SYMMETRY_REGION_RATIO);
}
