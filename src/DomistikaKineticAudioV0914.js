const VERSION = '0.9.14';
const INSTALL_FLAG = '__domistikaKineticAudioV0914Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const audio = {
    context: null,
    analyser: null,
    sourceNode: null,
    micStream: null,
    mediaElement: null,
    mediaUrl: null,
    frequencyData: null,
    connectedKind: null,
    smoothing: 0.78,
    gain: 1,
  };

  const $ = (selector) => document.querySelector(selector);
  const runtime = () => window.domistikaKineticExpansionV0914 || null;
  const status = (message) => window.__domistikaStatus?.(message);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function injectStyles() {
    if ($('#kineticAudioStyles')) return;
    const style = document.createElement('style');
    style.id = 'kineticAudioStyles';
    style.textContent = `
      .kinetic-audio-box{display:grid;gap:8px;padding:9px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025)}
      .kinetic-audio-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.kinetic-audio-actions button{border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);padding:8px;cursor:pointer}
      .kinetic-audio-actions button.active{background:rgba(255,191,105,.14);border-color:rgba(255,191,105,.5)}
      .kinetic-audio-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kinetic-audio-controls label{display:grid;gap:5px;color:var(--muted);font-size:10px}.kinetic-audio-status{font-size:10px;color:var(--muted);line-height:1.4}.kinetic-audio-status strong{color:var(--ink)}
      @media(max-width:900px){.kinetic-audio-actions,.kinetic-audio-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function ensureContext() {
    if (!audio.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio API is unavailable');
      audio.context = new AudioContextClass();
    }
    if (audio.context.state === 'suspended') await audio.context.resume();
    return audio.context;
  }

  function createAnalyser(context) {
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -18;
    analyser.smoothingTimeConstant = audio.smoothing;
    audio.analyser = analyser;
    audio.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    return analyser;
  }

  function disconnectSource() {
    try { audio.sourceNode?.disconnect(); } catch {}
    try { audio.analyser?.disconnect(); } catch {}
    if (audio.micStream) {
      audio.micStream.getTracks().forEach((track) => track.stop());
      audio.micStream = null;
    }
    if (audio.mediaElement) {
      audio.mediaElement.pause();
      audio.mediaElement.src = '';
      audio.mediaElement.load();
      audio.mediaElement = null;
    }
    if (audio.mediaUrl) {
      URL.revokeObjectURL(audio.mediaUrl);
      audio.mediaUrl = null;
    }
    audio.sourceNode = null;
    audio.analyser = null;
    audio.frequencyData = null;
    audio.connectedKind = null;
    runtime()?.clearAudioProvider?.();
    syncUi();
  }

  function meanRange(data, startRatio, endRatio) {
    if (!data?.length) return 0;
    const start = Math.max(0, Math.floor(data.length * startRatio));
    const end = Math.min(data.length, Math.max(start + 1, Math.floor(data.length * endRatio)));
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += data[index];
    return sum / (end - start) / 255;
  }

  function readLevels() {
    if (!audio.analyser || !audio.frequencyData) return { low: 0, mid: 0, high: 0 };
    audio.analyser.getByteFrequencyData(audio.frequencyData);
    const gain = audio.gain;
    return {
      low: clamp(meanRange(audio.frequencyData, 0.002, 0.055) * gain, 0, 1),
      mid: clamp(meanRange(audio.frequencyData, 0.055, 0.28) * gain, 0, 1),
      high: clamp(meanRange(audio.frequencyData, 0.28, 0.78) * gain, 0, 1),
    };
  }

  function connectRuntime(kind) {
    audio.connectedKind = kind;
    runtime()?.setAudioProvider?.(readLevels);
    runtime()?.setAudioReactive?.(true);
    syncUi();
  }

  async function useMicrophone() {
    disconnectSource();
    try {
      const context = await ensureContext();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const analyser = createAnalyser(context);
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      audio.micStream = stream;
      audio.sourceNode = source;
      connectRuntime('microphone');
      status('Audio Reactive connected to microphone');
    } catch (error) {
      disconnectSource();
      status(`Microphone connection failed: ${error.message}`);
    }
  }

  async function useAudioFile(file) {
    if (!file) return;
    disconnectSource();
    try {
      const context = await ensureContext();
      const analyser = createAnalyser(context);
      const element = new Audio();
      const url = URL.createObjectURL(file);
      element.src = url;
      element.loop = true;
      element.preload = 'auto';
      element.volume = 0.9;
      const source = context.createMediaElementSource(element);
      source.connect(analyser);
      analyser.connect(context.destination);
      audio.mediaElement = element;
      audio.mediaUrl = url;
      audio.sourceNode = source;
      connectRuntime('audio file');
      await element.play();
      status(`Audio Reactive playing ${file.name}`);
    } catch (error) {
      disconnectSource();
      status(`Audio file connection failed: ${error.message}`);
    }
  }

  function syncUi() {
    const mic = $('#kineticUseMic');
    const stop = $('#kineticStopAudio');
    const label = $('#kineticAudioStatus');
    if (mic) mic.classList.toggle('active', audio.connectedKind === 'microphone');
    if (stop) stop.disabled = !audio.connectedKind;
    if (label) {
      label.innerHTML = audio.connectedKind
        ? `<strong>Connected:</strong> ${audio.connectedKind}`
        : '<strong>Disconnected.</strong> Mic audio stays local in the browser; uploaded audio is read locally.';
    }
  }

  function buildUi() {
    const mount = $('#kineticAudioMount');
    if (!mount || $('#kineticAudioBox')) return false;
    injectStyles();
    mount.innerHTML = `<div id="kineticAudioBox" class="kinetic-audio-box">
      <div class="kinetic-audio-actions"><button id="kineticUseMic">🎙 Use microphone</button><button id="kineticChooseAudio">♫ Choose audio file</button><button id="kineticAudioPlayPause">Ⅱ Pause / Play file</button><button id="kineticStopAudio">Disconnect audio</button></div>
      <input id="kineticAudioFile" type="file" accept="audio/*" hidden>
      <div class="kinetic-audio-controls">
        <label>Spectrum smoothing <input id="kineticAudioSmoothing" type="range" min="0" max="0.98" step="0.01" value="0.78"></label>
        <label>Input gain <input id="kineticAudioGain" type="range" min="0.25" max="3" step="0.05" value="1"></label>
      </div>
      <div id="kineticAudioStatus" class="kinetic-audio-status"></div>
    </div>`;

    $('#kineticUseMic').addEventListener('click', useMicrophone);
    $('#kineticChooseAudio').addEventListener('click', () => $('#kineticAudioFile').click());
    $('#kineticAudioFile').addEventListener('change', (event) => {
      const [file] = event.target.files || [];
      useAudioFile(file);
      event.target.value = '';
    });
    $('#kineticStopAudio').addEventListener('click', () => {
      disconnectSource();
      status('Audio Reactive disconnected');
    });
    $('#kineticAudioPlayPause').addEventListener('click', async () => {
      if (!audio.mediaElement) return status('Choose an audio file first');
      if (audio.mediaElement.paused) {
        await ensureContext();
        await audio.mediaElement.play();
        status('Audio file playing');
      } else {
        audio.mediaElement.pause();
        status('Audio file paused');
      }
    });
    $('#kineticAudioSmoothing').addEventListener('input', (event) => {
      audio.smoothing = Number(event.target.value);
      if (audio.analyser) audio.analyser.smoothingTimeConstant = audio.smoothing;
    });
    $('#kineticAudioGain').addEventListener('input', (event) => { audio.gain = Number(event.target.value); });
    syncUi();
    return true;
  }

  function install() {
    if (!runtime() || !$('#kineticAudioMount')) return false;
    if (!buildUi()) return false;
    window.domistikaKineticAudioV0914 = {
      version: VERSION,
      useMicrophone,
      useAudioFile,
      disconnect: disconnectSource,
      levels: readLevels,
      get connected() { return audio.connectedKind; },
    };
    document.documentElement.dataset.kineticAudio = VERSION;
    window.dispatchEvent(new CustomEvent('domistika:kinetic-audio-ready', { detail: { version: VERSION } }));
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:kinetic-expansion-ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
