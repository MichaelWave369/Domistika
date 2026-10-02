import {
  VERSION,
  RECEIPT_SCHEMA,
  buildSymmetryReceipt,
  verifySymmetryReceipt,
  rememberArtDirectorPlan,
  clearArtDirectorPlan,
  receiptHashAnchor,
} from './symmetryReceipts.js';

function onArtDirected(event) {
  rememberArtDirectorPlan(event?.detail?.plan || null);
}

function onRecipeChanged() {
  clearArtDirectorPlan();
}

if (typeof document !== 'undefined') {
  document.addEventListener('domistika:art-directed', onArtDirected);
  document.addEventListener('domistika:v0932-symmetry-recipe', onRecipeChanged);
}

if (typeof window !== 'undefined') {
  window.domistikaSymmetryReceiptsV0936 = Object.freeze({
    version: VERSION,
    schema: RECEIPT_SCHEMA,
    current: buildSymmetryReceipt,
    verify: verifySymmetryReceipt,
    anchor: receiptHashAnchor,
  });
}
