import { getEngine, setStatus } from '../v093/runtime.js';
import {
  VERSION,
  SCHEMA,
  qualificationCheck,
  finalizeQualificationReceipt,
  sha256Bytes,
} from './fieldQualification.js';

let lastReceipt = null;
let running = false;

function requireApi(api = globalThis.window?.Domistika) {
  if (!api?.schema || api.schema !== 'domistika.sdk.v1') {
    throw new Error('DOMISTIKA_QUALIFICATION_SDK_UNAVAILABLE');
  }
  if (!api.ready?.()) throw new Error('DOMISTIKA_QUALIFICATION_STUDIO_NOT_READY');
  return api;
}

function engine() {
  const current = getEngine();
  if (!current) throw new Error('DOMISTIKA_QUALIFICATION_ENGINE_UNAVAILABLE');
  return current;
}

async function canvasHash(canvas) {
  const ctx = canvas?.getContext?.('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('DOMISTIKA_QUALIFICATION_CANVAS_UNAVAILABLE');
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return 'sha256:' + await sha256Bytes(image.data);
}

function layerById(id) {
  return engine().layers.find((layer) => layer.id === id) || null;
}

function record(checks, id, passed, evidence = {}, detail = '') {
  const check = qualificationCheck(id, passed, evidence, detail);
  checks.push(check);
  if (!check.passed) {
    const error = new Error(`DOMISTIKA_QUALIFICATION_FAILED:${check.id}`);
    error.qualificationCheck = check;
    throw error;
  }
  return check;
}

function cleanQualificationProject() {
  return {
    format: 'domistika-project',
    version: 1,
    name: 'Domistika Field Qualification',
    width: 512,
    height: 512,
    activeLayerId: 'qualification-base',
    settings: {
      color: '#1b1820',
      size: 12,
      opacity: 1,
      smoothing: 28,
      pressure: true,
      symmetry: 'none',
      grid: false,
      gridSize: 64,
      compositionPlateId: null,
      draftingGuide: null,
      sectorSurgery: null,
      symmetryRecipeId: null,
      symmetryRecipeFormula: null,
      symmetryReceiptDirector: null,
    },
    layerGroups: [],
    layers: [{
      id: 'qualification-base',
      name: 'Qualification Base',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      role: 'paint',
      motionPolicy: 'inherit',
      locked: false,
      groupId: null,
      semanticOverlays: [],
      image: null,
    }],
  };
}

function restoredLayerEvidence(project, sourceLayerId, repairLayerId) {
  const source = project.layers.find((layer) => layer.id === sourceLayerId);
  const repair = project.layers.find((layer) => layer.id === repairLayerId);
  const provenance = repair?.semanticOverlays?.find((overlay) => overlay?.kind === 'sector-surgery') || null;
  return {
    plateId: project.settings?.compositionPlateId || null,
    sourcePresent: Boolean(source),
    sourceVisible: source?.visible !== false,
    sourceLocked: source?.locked === true,
    repairPresent: Boolean(repair),
    repairLocked: repair?.locked === true,
    provenance: provenance ? {
      kind: provenance.kind,
      plateId: provenance.plateId,
      regionId: provenance.regionId,
      sectorIndex: provenance.sectorIndex,
      sectorCount: provenance.sectorCount,
    } : null,
  };
}

export async function runFieldQualification(apiInput = null) {
  if (running) throw new Error('DOMISTIKA_QUALIFICATION_ALREADY_RUNNING');
  const api = requireApi(apiInput || globalThis.window?.Domistika);
  running = true;

  const startedAt = new Date().toISOString();
  const checks = [];
  const evidence = {};
  let originalProject = null;
  let fatal = null;

  setStatus('Field Qualification running · disposable project');

  try {
    originalProject = await api.project.serialize({ embedMotion: true });
    record(checks, 'transaction.snapshot', Boolean(originalProject?.layers?.length), {
      layerCount: originalProject?.layers?.length || 0,
      name: originalProject?.name || null,
    }, 'Current project captured before qualification.');

    await api.project.restore(cleanQualificationProject());
    record(checks, 'transaction.disposable-project', api.canvas.info().width === 512 && api.canvas.info().height === 512, {
      canvas: api.canvas.info(),
    }, 'Qualification runs on an isolated 512×512 project.');

    const plate = api.compositionPlates.apply('mandala');
    record(checks, 'plate.apply', plate?.id === 'mandala', {
      plateId: plate?.id || null,
      regionCount: plate?.regionCount || 0,
    }, 'Mandala Composition Plate is active.');

    const directed = await api.art.direct({
      prompt: 'field qualification sacred calm mandala',
      mood: 'sacred calm',
      symmetry: 'mandala',
      palette: 'moon-glass',
      seed: 'domistika-v0942-field-qualification',
      density: 0.52,
      complexity: 0.46,
      surprise: 0.08,
    });
    const directorLayerId = directed?.targetLayer;
    const directorLayer = layerById(directorLayerId);
    record(checks, 'director.generate-and-lock', Boolean(
      directed?.ok
      && directorLayerId
      && directed?.targetLayerLocked === true
      && directorLayer?.locked === true
    ), {
      targetLayerId: directorLayerId || null,
      targetLayerLocked: directed?.targetLayerLocked === true,
      strokeCount: directed?.artifact?.strokeCount || 0,
    }, 'Art Director generated a dedicated layer and stopped with it locked.');

    const symmetryReceipt = await api.symmetryReceipts.current();
    const symmetryVerified = await api.symmetryReceipts.verify(symmetryReceipt);
    record(checks, 'receipt.symmetry', symmetryVerified === true, {
      contentHash: symmetryReceipt?.contentHash || null,
      plateId: symmetryReceipt?.plateId || null,
      formulaAuthority: symmetryReceipt?.formulaAuthority || null,
    }, 'Symmetry receipt verifies before repair.');

    api.layers.activate(directorLayerId);
    const lockedBefore = await canvasHash(directorLayer.canvas);
    let lockError = null;
    try {
      api.stroke([
        { x: 0.50, y: 0.50 },
        { x: 0.55, y: 0.51 },
      ], {
        space: 'normalized',
        tool: 'ink',
        color: '#ff006e',
        size: 18,
        opacity: 1,
        history: false,
      });
    } catch (error) {
      lockError = error;
    }
    const lockedAfter = await canvasHash(directorLayer.canvas);
    record(checks, 'authority.lock-refusal', Boolean(
      lockError
      && /DOMISTIKA_SDK_LAYER_LOCKED/.test(String(lockError.message))
      && lockedBefore === lockedAfter
    ), {
      error: lockError?.message || null,
      before: lockedBefore,
      after: lockedAfter,
    }, 'A direct SDK write to the locked generated layer is refused with no pixel change.');

    const surgery = api.sectorSurgery.begin({ x: 0.62, y: 0.50 }, { space: 'normalized' });
    const repairLayerId = surgery?.repairLayerId;
    const repairLayer = layerById(repairLayerId);
    const protectedSource = layerById(directorLayerId);
    record(checks, 'sector.begin', Boolean(
      surgery
      && surgery.plateId === 'mandala'
      && surgery.regionId === 'core'
      && surgery.sectorCount === 12
      && repairLayer
      && repairLayer.locked !== true
      && protectedSource?.locked === true
      && protectedSource?.visible === false
    ), {
      regionId: surgery?.regionId || null,
      sectorIndex: surgery?.sectorIndex ?? null,
      sectorCount: surgery?.sectorCount || null,
      sourceLocked: protectedSource?.locked === true,
      sourceHidden: protectedSource?.visible === false,
      repairLayerId,
    }, 'Exactly one radial sector is opened on a replacement copy while the source stays protected.');

    const outsideBefore = await canvasHash(repairLayer.canvas);
    api.stroke([
      { x: 0.34, y: 0.50 },
      { x: 0.29, y: 0.52 },
    ], {
      space: 'normalized',
      tool: 'ink',
      color: '#00f5d4',
      size: 22,
      opacity: 1,
      smoothing: 0,
      history: false,
      message: 'Qualification outside-sector probe',
    });
    const outsideAfter = await canvasHash(repairLayer.canvas);
    record(checks, 'sector.outside-write-no-effect', outsideBefore === outsideAfter, {
      before: outsideBefore,
      after: outsideAfter,
    }, 'A write outside the authorized sector produces no pixel mutation.');

    const repairBefore = outsideAfter;
    api.stroke([
      { x: 0.555, y: 0.502 },
      { x: 0.645, y: 0.522 },
    ], {
      space: 'normalized',
      tool: 'ink',
      color: '#ff006e',
      size: 20,
      opacity: 1,
      smoothing: 0,
      history: true,
      message: 'Qualification sector redraw',
    });
    const drawHash = await canvasHash(repairLayer.canvas);
    record(checks, 'sector.inside-redraw', drawHash !== repairBefore, {
      before: repairBefore,
      after: drawHash,
    }, 'A redraw inside the authorized sector changes pixels.');

    api.stroke([
      { x: 0.575, y: 0.507 },
      { x: 0.620, y: 0.516 },
    ], {
      space: 'normalized',
      tool: 'eraser',
      size: 9,
      opacity: 1,
      smoothing: 0,
      history: true,
      message: 'Qualification sector erase',
    });
    const eraseHash = await canvasHash(repairLayer.canvas);
    record(checks, 'sector.inside-erase', eraseHash !== drawHash, {
      before: drawHash,
      after: eraseHash,
    }, 'Eraser mutation is real inside the replacement-copy sector.');

    api.stroke([
      { x: 0.580, y: 0.509 },
      { x: 0.625, y: 0.517 },
    ], {
      space: 'normalized',
      tool: 'ink',
      color: '#ffd166',
      size: 7,
      opacity: 1,
      smoothing: 0,
      history: true,
      message: 'Qualification sector redraw after erase',
    });
    const preRefoldHash = await canvasHash(repairLayer.canvas);
    record(checks, 'sector.erase-then-redraw', preRefoldHash !== eraseHash, {
      before: eraseHash,
      after: preRefoldHash,
    }, 'The erased area can be deliberately redrawn before promotion.');

    const refoldReceipt = api.sectorSurgery.refold();
    const refoldHash = await canvasHash(repairLayer.canvas);
    record(checks, 'sector.refold', Boolean(
      refoldReceipt?.action === 'refold'
      && refoldReceipt?.copies === 12
      && refoldReceipt?.repairLayerLocked === true
      && repairLayer.locked === true
      && refoldHash !== preRefoldHash
    ), {
      copies: refoldReceipt?.copies || 0,
      repairLayerLocked: repairLayer.locked === true,
      before: preRefoldHash,
      after: refoldHash,
    }, 'The repaired wedge is explicitly promoted across the radial count and relocked.');

    await api.canvas.undo();
    const undoHash = await canvasHash(repairLayer.canvas);
    record(checks, 'history.undo-refold', undoHash === preRefoldHash, {
      expected: preRefoldHash,
      actual: undoHash,
    }, 'Undo restores the one-sector pre-refold repair state.');

    await api.canvas.redo();
    const redoHash = await canvasHash(repairLayer.canvas);
    record(checks, 'history.redo-refold', redoHash === refoldHash, {
      expected: refoldHash,
      actual: redoHash,
    }, 'Redo reproduces the refolded repair exactly.');

    api.draftingGuides.apply('horizontal-ruler', { snap: true, visible: true });
    const motionIgnore = api.layers.create('Qualification · Motion Ignore');
    api.layers.motionPolicy(motionIgnore.id, 'ignore');
    api.layers.lock(motionIgnore.id, true);
    api.layers.activate(repairLayerId);

    const savedProject = await api.project.serialize({ embedMotion: false });
    evidence.savedProject = {
      layerCount: savedProject.layers.length,
      plateId: savedProject.settings?.compositionPlateId || null,
      repairLayerId,
      sourceLayerId: directorLayerId,
    };
    await api.project.restore(savedProject);

    const restoredProject = await api.project.serialize({ embedMotion: false });
    const restoredEvidence = restoredLayerEvidence(restoredProject, directorLayerId, repairLayerId);
    record(checks, 'project.save-restore', Boolean(
      restoredEvidence.plateId === 'mandala'
      && restoredEvidence.sourcePresent
      && restoredEvidence.sourceVisible === false
      && restoredEvidence.sourceLocked
      && restoredEvidence.repairPresent
      && restoredEvidence.repairLocked
      && restoredEvidence.provenance?.kind === 'sector-surgery'
      && restoredEvidence.provenance?.sectorCount === 12
    ), restoredEvidence, 'Canonical .domistika serialization restores plate state, locks, hidden source, and surgery provenance.');

    const layeredAudit = api.export.inspectLayered();
    const guideExcluded = layeredAudit.excluded.some((item) => item.reason === 'guide');
    const motionExcluded = layeredAudit.excluded.some((item) => item.reason === 'motion-ignore');
    const includedArePaint = layeredAudit.included.every((item) => item.role === 'paint' && item.motionPolicy !== 'ignore');
    record(checks, 'export.psd-audit', guideExcluded && motionExcluded && includedArePaint, {
      included: layeredAudit.included.map((item) => ({ id: item.id, role: item.role, motionPolicy: item.motionPolicy })),
      excluded: layeredAudit.excluded.map((item) => ({ id: item.id, reason: item.reason })),
    }, 'Layered exit admits eligible paint only and excludes guide + motion-ignore scaffolding.');

    const psd = api.export.psd();
    record(checks, 'export.psd-write', Boolean(
      psd?.blob
      && psd.blob.size > 0
      && psd?.manifest?.included?.length === layeredAudit.included.length
    ), {
      bytes: psd?.blob?.size || 0,
      includedLayerCount: psd?.manifest?.included?.length || 0,
      excludedLayerCount: psd?.manifest?.excluded?.length || 0,
    }, 'The audited paint stack writes to a non-empty layered PSD in memory.');

    evidence.symmetryReceiptHash = symmetryReceipt?.contentHash || null;
    evidence.sectorReceipt = refoldReceipt || null;
    evidence.refoldPixelHash = refoldHash;
    evidence.psdBytes = psd?.blob?.size || 0;
  } catch (error) {
    fatal = error;
    if (!error?.qualificationCheck) {
      checks.push(qualificationCheck('runtime.fatal', false, {
        message: error?.message || String(error),
      }, 'Qualification aborted by an unexpected runtime failure.'));
    }
  } finally {
    if (originalProject) {
      try {
        await api.project.restore(originalProject);
        checks.push(qualificationCheck('transaction.restore-original', true, {
          layerCount: originalProject.layers?.length || 0,
          name: originalProject.name || null,
        }, 'Original project restored after qualification.'));
      } catch (restoreError) {
        checks.push(qualificationCheck('transaction.restore-original', false, {
          message: restoreError?.message || String(restoreError),
        }, 'Original project restoration failed.'));
        fatal ||= restoreError;
      }
    }
    running = false;
  }

  lastReceipt = await finalizeQualificationReceipt({
    startedAt,
    completedAt: new Date().toISOString(),
    appVersion: api.appVersion,
    sdkVersion: api.sdkVersion,
    checks,
    evidence,
    error: fatal,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('domistika:v0942-field-qualification', {
      detail: lastReceipt,
    }));
  }

  setStatus(`Field Qualification ${lastReceipt.status} · ${lastReceipt.summary.passed}/${lastReceipt.summary.total} checks`);
  return lastReceipt;
}

export function lastFieldQualification() {
  return lastReceipt;
}

export function qualificationRunning() {
  return running;
}

if (typeof window !== 'undefined') {
  window.domistikaFieldQualificationV0942 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    run: runFieldQualification,
    last: lastFieldQualification,
    running: qualificationRunning,
  });
}
