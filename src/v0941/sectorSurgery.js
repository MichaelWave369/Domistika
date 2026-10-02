import {
  plateById,
  resolveCompositionRegion,
} from '../v0935/compositionPlates.js';
import { parseFormula } from '../v0932/symmetryRecipes.js';

export const VERSION = '0.9.41';
export const SCHEMA = 'domistika.sector-surgery.v1';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

export function radialCountFromFormula(formula) {
  if (!String(formula || '').trim()) return 0;
  let operations;
  try {
    operations = parseFormula(formula);
  } catch {
    return 0;
  }
  const radial = operations.find((operation) => operation.op === 'RADIAL');
  if (!radial) return 0;
  return clamp(Math.round(Number(radial.args?.[0]) || 12), 2, 96);
}

export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  let value = Number(angle) % tau;
  if (value < 0) value += tau;
  return value;
}

export function sectorIndexAtPoint(point, width, height, count) {
  const sectors = clamp(Math.round(Number(count) || 0), 2, 96);
  const cx = Number(width) / 2;
  const cy = Number(height) / 2;
  const angle = normalizeAngle(Math.atan2(Number(point?.y) - cy, Number(point?.x) - cx));
  return Math.min(sectors - 1, Math.floor(angle / (Math.PI * 2 / sectors)));
}

export function sectorAngles(index, count) {
  const sectors = clamp(Math.round(Number(count) || 0), 2, 96);
  const normalizedIndex = ((Math.round(Number(index) || 0) % sectors) + sectors) % sectors;
  const span = Math.PI * 2 / sectors;
  return Object.freeze({
    index: normalizedIndex,
    count: sectors,
    start: normalizedIndex * span,
    end: (normalizedIndex + 1) * span,
    span,
  });
}

export function describeSectorTarget(plateInput, point, width, height) {
  const plate = typeof plateInput === 'string' ? plateById(plateInput) : plateInput;
  if (!plate) return null;
  const region = resolveCompositionRegion(plate, point, width, height);
  if (!region || region.excluded || !region.formula) return null;
  const count = radialCountFromFormula(region.formula);
  if (!count) return null;
  const index = sectorIndexAtPoint(point, width, height, count);
  const angles = sectorAngles(index, count);
  return Object.freeze({
    plateId: plate.id,
    plateLabel: plate.label,
    regionId: region.id,
    regionLabel: region.label,
    regionGeometry: region.geometry,
    formula: region.formula,
    sectorIndex: index,
    sectorCount: count,
    startAngle: angles.start,
    endAngle: angles.end,
    span: angles.span,
  });
}

export function rotationForSectorCopy(sourceIndex, targetIndex, count) {
  const sectors = clamp(Math.round(Number(count) || 0), 2, 96);
  const source = ((Math.round(Number(sourceIndex) || 0) % sectors) + sectors) % sectors;
  const target = ((Math.round(Number(targetIndex) || 0) % sectors) + sectors) % sectors;
  return (target - source) * (Math.PI * 2 / sectors);
}
