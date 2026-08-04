export const LESSONS = Object.freeze([
  {
    id: 'first-marks', title: 'First Marks', minutes: 8, stage: 'Trace → Assist', templateId: 'first-marks',
    description: 'Build confidence with a line, curve, ellipse, and clean stop.',
    setup: [['tool.select', { tool: 'pencil' }], ['brush.select', { brushName: 'Graphite HB' }], ['setting.set', { setting: 'symmetry', value: 'none' }], ['setting.set', { setting: 'size', value: 9 }]],
    steps: ['Trace the straight guide once while looking toward the end point.', 'Trace the curve slowly, then repeat it with one confident motion.', 'Draw around the ellipse in one continuous movement.', 'Repeat one line, curve, and ellipse without tracing.'],
  },
  {
    id: 'simple-creature', title: 'Simple Creature', minutes: 15, stage: 'Assist → Create', templateId: 'simple-creature',
    description: 'Invent a creature from gesture, body masses, limbs, and silhouette.',
    setup: [['tool.select', { tool: 'pencil' }], ['brush.select', { brushName: 'Graphite 2B' }], ['setting.set', { setting: 'symmetry', value: 'none' }], ['setting.set', { setting: 'size', value: 12 }]],
    steps: ['Draw the curved spine gesture.', 'Place head, chest, and body masses around it.', 'Add four simple limb rhythms using lines.', 'Draw one outer silhouette and skip details.', 'Change one major feature so the creature becomes yours.'],
  },
  {
    id: 'radial-mandala', title: 'Radial Mandala', minutes: 20, stage: 'Assist → Create', templateId: 'radial-mandala',
    description: 'Design one motif, repeat it radially, then add deliberate variation.',
    setup: [['tool.select', { tool: 'ink' }], ['brush.select', { brushName: 'Technical Pen Fine' }], ['setting.set', { setting: 'symmetry', value: 'radial-12' }], ['setting.set', { setting: 'size', value: 5 }]],
    steps: ['Draw one curved stem inside a wedge.', 'Attach one leaf, creature, or glyph shape.', 'Add a second ring with a different rhythm.', 'Change color or width for one focal ring.', 'Optionally finish with Orbit, Echo, Drift, or Ripple.'],
  },
]);
