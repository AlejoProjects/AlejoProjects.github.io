(function () {
  let audioContext = null;
  let lastClickSound = 0;

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function makeGain(context, startGain, endGain, duration) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(startGain, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), context.currentTime + duration);
    return gain;
  }

  function playSciFiClick() {
    const now = performance.now();
    if (now - lastClickSound < 80) return;
    lastClickSound = now;

    const context = getAudioContext();
    if (!context) return;
    const duration = 0.18;
    const start = context.currentTime;
    const osc = context.createOscillator();
    const mod = context.createOscillator();
    const modGain = context.createGain();
    const gain = makeGain(context, 0.08, 0.0001, duration);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(740, start);
    osc.frequency.exponentialRampToValueAtTime(1760, start + 0.055);
    osc.frequency.exponentialRampToValueAtTime(420, start + duration);

    mod.type = "sine";
    mod.frequency.setValueAtTime(72, start);
    modGain.gain.setValueAtTime(42, start);
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    mod.start(start);
    osc.stop(start + duration);
    mod.stop(start + duration);
  }

  function playAbsorbSwoosh() {
    const context = getAudioContext();
    if (!context) return;
    const duration = 0.34;
    const start = context.currentTime;
    const noiseLength = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      const fade = 1 - i / noiseLength;
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = makeGain(context, 0.09, 0.0001, duration);
    const tone = context.createOscillator();
    const toneGain = makeGain(context, 0.035, 0.0001, duration * 0.82);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1550, start);
    filter.frequency.exponentialRampToValueAtTime(280, start + duration);
    filter.Q.setValueAtTime(1.6, start);
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    tone.type = "sine";
    tone.frequency.setValueAtTime(520, start);
    tone.frequency.exponentialRampToValueAtTime(120, start + duration * 0.82);
    tone.connect(toneGain);
    toneGain.connect(context.destination);

    noise.start(start);
    tone.start(start);
    noise.stop(start + duration);
    tone.stop(start + duration * 0.82);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) playSciFiClick();
  }, true);

  window.siteAudio = {
    click: playSciFiClick,
    swoosh: playAbsorbSwoosh
  };
})();
