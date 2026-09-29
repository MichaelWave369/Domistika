const VERSION = '0.1.1';
const SCHEMA = 'domistika.site-tools.v1';
const INSTALL_FLAG = '__domistikaWebMcpSiteToolsV0929Installed';
const MAX_SEARCH_RESULTS = 20;
const MAX_STROKE_POINTS = 1024;

const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

function modelContextFor(doc = globalThis.document, nav = globalThis.navigator) {
  if (doc?.modelContext?.registerTool) return doc.modelContext;
  if (nav?.modelContext?.registerTool) return nav.modelContext;
  return null;
}

function requireApi(api = globalThis.window?.Domistika) {
  if (!api?.schema || api.schema !== 'domistika.sdk.v1') {
    throw new Error('DOMISTIKA_SITE_TOOLS_SDK_UNAVAILABLE');
  }
  return api;
}

function requireReady(api) {
  if (!api.ready?.()) throw new Error('DOMISTIKA_SITE_TOOLS_STUDIO_NOT_READY');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function cleanString(value, max = 160) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max);
}

function safeJson(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, item) => {
    if (typeof item === 'string' && /^data:[^,]+;base64,/i.test(item)) {
      return '[omitted data URL]';
    }
    if (typeof Blob !== 'undefined' && item instanceof Blob) {
      return { type: item.type || 'application/octet-stream', bytes: item.size };
    }
    if (item && typeof item === 'object') {
      if (seen.has(item)) return '[circular]';
      seen.add(item);
    }
    return item;
  });
}

function ok(data = {}) {
  return safeJson({ ok: true, ...data });
}

function slimCapabilities(api) {
  const caps = api.capabilities();
  return {
    schema: caps.schema,
    sdkVersion: caps.sdkVersion,
    appVersion: caps.appVersion,
    ready: caps.ready,
    tools: [...(caps.tools || [])],
    drawTools: [...(caps.drawTools || [])],
    layerRoles: [...(caps.layerRoles || [])],
    commandCount: Array.isArray(caps.commands) ? caps.commands.length : 0,
    spiro: caps.spiro,
    colors: caps.colors,
    motion: caps.motion,
    capture: caps.capture,
    playground: caps.playground,
    bridge: caps.bridge,
  };
}

function slimState(api) {
  const canvas = api.canvas.info();
  const layers = api.layers.list();
  return {
    canvas,
    color: api.colors.current(),
    tool: api.tool.get(),
    layers,
    motion: api.motion.state(),
    playground: api.playground.state(),
  };
}

function normalizedPoints(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_STROKE_POINTS) {
    throw new Error('DOMISTIKA_SITE_TOOLS_STROKE_POINTS_INVALID');
  }
  return points.map((point) => {
    const x = Number(point?.x);
    const y = Number(point?.y);
    const p = point?.p == null ? 1 : Number(point.p);
    if (![x, y, p].every(Number.isFinite)) {
      throw new Error('DOMISTIKA_SITE_TOOLS_STROKE_POINT_INVALID');
    }
    return { x, y, p: clamp(p, 0.08, 1) };
  });
}

function makeTools(api) {
  return [
    {
      name: 'domistika_get_capabilities',
      title: 'Get Domistika capabilities',
      description: 'Read the live Domistika stable-SDK capabilities. Use this before choosing tools or commands. This does not modify the artwork.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false },
      execute: async () => ok({ capabilities: slimCapabilities(api) }),
    },
    {
      name: 'domistika_search_commands',
      title: 'Search Domistika commands',
      description: 'Search Domistika’s live semantic command catalog by intent. Returns command IDs that may then be executed through domistika_execute_command.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 120, description: 'Intent or feature to search for, such as portal, color, motion record, or return artwork.' },
          limit: { type: 'integer', minimum: 1, maximum: MAX_SEARCH_RESULTS, default: 8 },
        },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async ({ query, limit = 8 }) => {
        const results = api.commands.search(cleanString(query, 120), clamp(limit, 1, MAX_SEARCH_RESULTS));
        return ok({ results });
      },
    },
    {
      name: 'domistika_get_state',
      title: 'Get Domistika canvas state',
      description: 'Read the current canvas, drawing color, selected tool, layer metadata, Motion state, and Playground state. This does not return raw pixels.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: async () => {
        requireReady(api);
        return ok({ state: slimState(api) });
      },
    },
    {
      name: 'domistika_draw_stroke',
      title: 'Draw a bounded stroke',
      description: 'Draw a bounded semantic stroke on the active Domistika layer through the stable SDK. This modifies the current artwork and is intended for deliberate drawing actions.',
      inputSchema: {
        type: 'object',
        properties: {
          points: {
            type: 'array',
            minItems: 2,
            maxItems: MAX_STROKE_POINTS,
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                p: { type: 'number', minimum: 0.08, maximum: 1 },
              },
              required: ['x', 'y'],
              additionalProperties: false,
            },
          },
          tool: { type: 'string', enum: ['pencil', 'ink', 'marker', 'airbrush', 'eraser'] },
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          size: { type: 'number', minimum: 1, maximum: 240 },
          opacity: { type: 'number', minimum: 0.01, maximum: 1 },
          smoothing: { type: 'number', minimum: 0, maximum: 100 },
          symmetry: { type: 'string', maxLength: 64 },
          space: { type: 'string', enum: ['normalized', 'canvas'], default: 'normalized' },
        },
        required: ['points'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async (input, { signal } = {}) => {
        requireReady(api);
        if (signal?.aborted) throw new DOMException('Tool execution cancelled', 'AbortError');
        const options = {
          space: input.space || 'normalized',
          message: 'WebMCP site-tool stroke',
        };
        for (const key of ['tool', 'color', 'size', 'opacity', 'smoothing', 'symmetry']) {
          if (input[key] != null) options[key] = input[key];
        }
        const result = api.stroke(normalizedPoints(input.points), options);
        return ok({ result });
      },
    },
    {
      name: 'domistika_set_color',
      title: 'Set Domistika drawing color',
      description: 'Set the live Domistika drawing color using a six-digit HEX value. This changes the active drawing setting but does not paint by itself.',
      inputSchema: {
        type: 'object',
        properties: {
          color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        },
        required: ['color'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async ({ color }) => {
        requireReady(api);
        const result = api.colors.set(String(color).toLowerCase());
        return ok({ color: result });
      },
    },
    {
      name: 'domistika_apply_gradient',
      title: 'Apply Domistika gradient',
      description: 'Apply one of Domistika Color Studio’s real gradient presets to the active layer. Mode behind preserves existing painted pixels; replace replaces the active layer.',
      inputSchema: {
        type: 'object',
        properties: {
          gradientId: { type: 'string', minLength: 1, maxLength: 80 },
          mode: { type: 'string', enum: ['behind', 'replace'], default: 'behind' },
        },
        required: ['gradientId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async ({ gradientId, mode = 'behind' }) => {
        requireReady(api);
        const result = api.colors.applyGradient(cleanString(gradientId, 80), { mode });
        return ok({ result });
      },
    },
    {
      name: 'domistika_place_spiro',
      title: 'Place Domistika Spiro form',
      description: 'Place a bounded Spiro preset through Domistika’s stable SDK on the active layer.',
      inputSchema: {
        type: 'object',
        properties: {
          preset: { type: 'string', minLength: 1, maxLength: 80 },
          x: { type: 'number' },
          y: { type: 'number' },
          space: { type: 'string', enum: ['normalized', 'canvas'], default: 'normalized' },
          lineWidth: { type: 'number', minimum: 1, maximum: 80 },
          opacity: { type: 'number', minimum: 0.01, maximum: 1 },
          scale: { type: 'number', minimum: 0.05, maximum: 8 },
          rotation: { type: 'number', minimum: -3600, maximum: 3600 },
        },
        required: ['preset', 'x', 'y'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async (input) => {
        requireReady(api);
        const options = {
          x: Number(input.x),
          y: Number(input.y),
          space: input.space || 'normalized',
        };
        for (const key of ['lineWidth', 'opacity', 'scale', 'rotation']) {
          if (input[key] != null) options[key] = Number(input[key]);
        }
        const result = api.spiro.place(cleanString(input.preset, 80), options);
        return ok({ result });
      },
    },
    {
      name: 'domistika_set_layer_role',
      title: 'Set Domistika layer role',
      description: 'Assign a semantic role to an existing Domistika layer. motion-ignore keeps that layer static above Kinetic Motion.',
      inputSchema: {
        type: 'object',
        properties: {
          layerId: { type: 'string', minLength: 1, maxLength: 160 },
          role: { type: 'string', enum: ['paint', 'guide', 'type', 'motion-ignore'] },
        },
        required: ['layerId', 'role'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async ({ layerId, role }) => {
        requireReady(api);
        const result = api.layers.role(cleanString(layerId, 160), role);
        return ok({ layerId, role: result });
      },
    },
    {
      name: 'domistika_transfer_to_auralith',
      title: 'Transfer artwork to Auralith',
      description: 'Create and store a hash-bound Creative Bridge v2 package for Auralith369. Protected type and semantic overlay layers are separated from the graded base artwork.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async () => {
        requireReady(api);
        if (!api.bridge?.auralith?.transfer) throw new Error('DOMISTIKA_SITE_TOOLS_AURALITH_BRIDGE_UNAVAILABLE');
        const result = await api.bridge.auralith.transfer();
        return ok({ transfer: result });
      },
    },
    {
      name: 'domistika_execute_command',
      title: 'Execute Domistika semantic command',
      description: 'Execute one command from Domistika.commands. Search first when the command ID is unknown. Commands are bounded application actions, not arbitrary JavaScript.',
      inputSchema: {
        type: 'object',
        properties: {
          commandId: { type: 'string', minLength: 1, maxLength: 180 },
          args: { type: 'object', additionalProperties: true, default: {} },
        },
        required: ['commandId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: async ({ commandId, args = {} }, { signal } = {}) => {
        requireReady(api);
        if (signal?.aborted) throw new DOMException('Tool execution cancelled', 'AbortError');
        const id = cleanString(commandId, 180);
        if (!api.commands.list().includes(id)) throw new Error('DOMISTIKA_SITE_TOOLS_COMMAND_UNKNOWN');
        const result = await api.commands.execute(id, args && typeof args === 'object' ? args : {});
        return ok({ commandId: id, result });
      },
    },
  ];
}

async function registerTools(modelContext, tools, controller) {
  const registered = [];
  for (const tool of tools) {
    await modelContext.registerTool(tool, { signal: controller.signal });
    registered.push(tool.name);
  }
  return registered;
}

export function createDomistikaSiteTools(api = globalThis.window?.Domistika) {
  return freeze(makeTools(requireApi(api)));
}

export async function installDomistikaSiteTools({
  api = globalThis.window?.Domistika,
  modelContext = modelContextFor(),
} = {}) {
  const stable = requireApi(api);
  if (!modelContext?.registerTool) {
    return freeze({
      version: VERSION,
      schema: SCHEMA,
      available: false,
      registered: Object.freeze([]),
      reason: 'WebMCP modelContext unavailable in this browser',
    });
  }

  const controller = new AbortController();
  const tools = makeTools(stable);
  const registered = await registerTools(modelContext, tools, controller);
  const state = {
    version: VERSION,
    schema: SCHEMA,
    available: true,
    registered: Object.freeze([...registered]),
    stop() {
      controller.abort();
      return true;
    },
  };
  return freeze(state);
}

async function autoInstall() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  try {
    const state = await installDomistikaSiteTools();
    window.domistikaSiteToolsV0929 = state;
    window.dispatchEvent(new CustomEvent('domistika:site-tools-ready', {
      detail: {
        version: VERSION,
        schema: SCHEMA,
        available: state.available,
        registered: [...state.registered],
      },
    }));
  } catch (error) {
    window.domistikaSiteToolsV0929 = freeze({
      version: VERSION,
      schema: SCHEMA,
      available: false,
      registered: Object.freeze([]),
      reason: String(error?.message || error),
    });
    console.warn('Domistika WebMCP site tools unavailable', error);
  }
}

autoInstall();

export { VERSION, SCHEMA, MAX_SEARCH_RESULTS, MAX_STROKE_POINTS, modelContextFor };
