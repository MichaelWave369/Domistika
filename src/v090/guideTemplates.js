export const GUIDE_TEMPLATES = Object.freeze({
  'first-marks': {
    title: 'First Marks',
    description: 'Practice one straight path, one curve, one ellipse, and one confident stop.',
    elements: [
      { type: 'label', x: 0.12, y: 0.12, label: '1 · Follow the line', color: '#8ff0ff' },
      { type: 'line', points: [[0.13, 0.22], [0.87, 0.22]], arrow: true },
      { type: 'label', x: 0.12, y: 0.36, label: '2 · Follow the curve', color: '#ffd27d' },
      { type: 'curve', points: [[0.13, 0.48], [0.34, 0.31], [0.65, 0.65], [0.87, 0.46]], arrow: true, color: '#ffd27d' },
      { type: 'label', x: 0.12, y: 0.70, label: '3 · Draw around the ellipse', color: '#d7a6ff' },
      { type: 'ellipse', x: 0.50, y: 0.78, width: 0.23, height: 0.11, color: '#d7a6ff' },
      { type: 'anchor', x: 0.73, y: 0.78, radius: 0.012, color: '#ff8e98' },
    ],
  },
  'simple-creature': {
    title: 'Simple Creature',
    description: 'Build an invented creature from one gesture, two body masses, and four limb rhythms.',
    elements: [
      { type: 'label', x: 0.08, y: 0.10, label: 'Start with the spine gesture', color: '#8ff0ff' },
      { type: 'curve', points: [[0.20, 0.54], [0.36, 0.25], [0.66, 0.34], [0.80, 0.52]], arrow: true },
      { type: 'circle', x: 0.31, y: 0.47, radius: 0.11, color: '#ffd27d' },
      { type: 'ellipse', x: 0.57, y: 0.52, width: 0.18, height: 0.13, rotation: 0.12, color: '#ffd27d' },
      { type: 'circle', x: 0.78, y: 0.46, radius: 0.07, color: '#d7a6ff' },
      { type: 'line', points: [[0.40, 0.58], [0.30, 0.82]], color: '#9effae' },
      { type: 'line', points: [[0.48, 0.60], [0.46, 0.84]], color: '#9effae' },
      { type: 'line', points: [[0.62, 0.61], [0.67, 0.84]], color: '#9effae' },
      { type: 'line', points: [[0.70, 0.58], [0.82, 0.78]], color: '#9effae' },
      { type: 'label', x: 0.09, y: 0.91, label: 'Change the shapes until it becomes yours.', color: '#ff9cad' },
    ],
  },
  'radial-mandala': {
    title: 'Radial Mandala',
    description: 'Draw one motif in a wedge and let radial symmetry build the full field.',
    elements: [
      { type: 'label', x: 0.07, y: 0.09, label: 'Draw only inside one wedge', color: '#8ff0ff' },
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = Math.PI * 2 * index / 12;
        return {
          type: 'line',
          points: [[0.5, 0.5], [0.5 + Math.cos(angle) * 0.44, 0.5 + Math.sin(angle) * 0.44]],
          color: index < 2 ? '#ffd27d' : '#6ee7ff',
          dashed: index >= 2,
        };
      }),
      { type: 'circle', x: 0.5, y: 0.5, radius: 0.055, color: '#ff8e98', dashed: false },
      { type: 'circle', x: 0.5, y: 0.5, radius: 0.22, color: '#d7a6ff' },
      { type: 'circle', x: 0.5, y: 0.5, radius: 0.42, color: '#9effae' },
    ],
  },
});
