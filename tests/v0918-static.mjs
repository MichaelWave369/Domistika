import assert from 'node:assert/strict';
import fs from 'node:fs';

const performance = fs.readFileSync(new URL('../src/DomistikaVisualPerformanceV0918.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.18');
assert.match(index, /DomistikaVisualPerformanceV0918\.js/);
assert.ok(index.indexOf('DomistikaMindMeltV0917.js') < index.indexOf('DomistikaVisualPerformanceV0918.js'));
assert.ok(index.indexOf('DomistikaVisualPerformanceV0918.js') < index.indexOf('main.js'));

assert.match(performance, /Particle Sparks/);
assert.match(performance, /Color Breathing/);
assert.match(performance, /Beat Glow \/ Flash/);
assert.match(performance, /Photosensitivity guard/);
assert.match(performance, /Fractal Echo/);
assert.match(performance, /Saved Performance Slots/);
assert.match(performance, /Performance Autoplay/);
assert.match(performance, /Particle Portal/);
assert.match(performance, /Fractal Bloom/);
assert.match(performance, /Aurora Breath/);
assert.match(performance, /Cosmic Pulse/);
assert.match(performance, /captureStream/);
assert.match(performance, /MediaRecorder/);
assert.match(performance, /localStorage/);
assert.match(performance, /window\.domistikaVisualPerformanceV0918/);
assert.match(performance, /domistika:visual-performance-ready/);

console.log('v0.9.18 Visual Performance Lab static checks passed');
