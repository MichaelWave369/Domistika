export const KEY = 'silicon-louvre-to-domistika-v1';
export const SCHEMA = 'silicon-louvre.domistika-handoff.v1';
export const MAX_SVG_LENGTH = 350_000;
export const TTL_MS = 300_000;

export function inspectHandoff(raw, now = Date.now()) {
  if (typeof raw !== 'string' || raw.length > MAX_SVG_LENGTH + 4000) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || data.schema !== SCHEMA ||
      data.source !== 'silicon-louvre' || data.target !== 'domistika' ||
      data.width !== 800 || data.height !== 800 ||
      typeof data.svg !== 'string' || data.svg.length > MAX_SVG_LENGTH ||
      !data.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') ||
      !Number.isFinite(data.createdAt) || !Number.isFinite(data.expiresAt) ||
      data.createdAt > now + 30_000 || data.expiresAt <= now ||
      data.expiresAt - data.createdAt > TTL_MS ||
      typeof data.name !== 'string' || !data.name || data.name.length > 120 ||
      !/^[a-f0-9]{64}$/.test(data.svgSha256 || '') ||
      !data.recipe || !['bloom','clockwork','iris'].includes(data.recipe.mode)) return null;
  return data;
}

export async function sha256Hex(text, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw Error('DIGEST_UNAVAILABLE');
  const hash = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function validateStaticSvg(svg, parser) {
  if (typeof svg !== 'string' || svg.length > MAX_SVG_LENGTH ||
      /<!DOCTYPE|<!ENTITY|<\?|<!\[CDATA\[/i.test(svg)) return false;
  if (!parser?.parseFromString) return false;
  const parsed = parser.parseFromString(svg,'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg' ||
      parsed.querySelector('parsererror') || root.getAttribute('width') !== '800' ||
      root.getAttribute('height') !== '800') return false;
  const elements = parsed.querySelectorAll('*');
  // At the maximum supported 9 × 36 Iris layout, each motif has a group,
  // an eye path and three circles. That is ~1,640 static nodes. Keep a
  // bounded ceiling without rejecting valid artwork from our own generator.
  if (elements.length > 2000) return false;
  const names = new Set(['svg','title','desc','defs','radialGradient','stop','rect','g','circle','path','polygon']);
  const attributes = new Set(['xmlns','width','height','viewBox','role','aria-label','id','offset',
    'stop-color','cx','cy','r','fill','stroke','stroke-width','stroke-linejoin',
    'stroke-dasharray','d','points','transform','opacity','data-motif']);
  for (const element of elements) {
    if (element.namespaceURI !== 'http://www.w3.org/2000/svg' || !names.has(element.localName)) return false;
    for (const attr of element.attributes) {
      if (!attributes.has(attr.name)) return false;
      // The museum generator puts this inert marker on bloom paths, gear
      // polygons and iris groups. Allow exactly the documented value.
      if (attr.name === 'data-motif' && attr.value !== 'yes') return false;
      if (/javascript:|https?:\/\/|data:|expression\s*\(/i.test(attr.value) && attr.name !== 'xmlns') return false;
      if (/url\(/i.test(attr.value) && !/^url\(#[a-zA-Z0-9-]+\)$/.test(attr.value)) return false;
    }
  }
  return true;
}

export function importedProject(previous, rasterDataUrl, payload) {
  if (typeof rasterDataUrl !== 'string' || !rasterDataUrl.startsWith('data:image/png;base64,'))
    throw Error('INVALID_RASTER');
  return {
    format:'domistika-project', version:1,
    name:payload.name.slice(0,100),
    width:800,height:800,
    savedAt:new Date().toISOString(),
    settings:previous.settings || {},
    activeLayerId:'silicon-louvre-import',
    layers:[{id:'silicon-louvre-import',name:'Silicon Louvre artwork',visible:true,opacity:1,blendMode:'normal',
      role:'paint',motionPolicy:'inherit',locked:false,image:rasterDataUrl}],
  };
}
