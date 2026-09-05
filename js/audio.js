// audio.js — the sound world: ocean, wind, gulls, and the zone mood spine.
// Contract: PIL.audio.init() (first keydown), setZoneMood(i) 0..5, toggleMute(),
// .intensity 0..1 (finale writes it), chime(kind) — optional, safe uncalled.
// Synthesized only. Graph built once; setTargetAtTime / linearRamp ramps only;
// ambient events (gulls, intensity fold) run on our own timers, never the game
// loop. Without WebAudio everything degrades to silent no-ops and never throws.

window.PIL = window.PIL || {};

(function () {
  var A = PIL.audio = {
    muted: false,
    ready: false,
    intensity: 1,

    init: function () {
      if (started) return;
      started = true;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        if (ctx.state === 'suspended' && ctx.resume) {
          var p = ctx.resume();
          if (p && p.catch) p.catch(function () {});
        }
        buildGraph();
        A.ready = true;
      } catch (e) {
        ctx = null; // silent mode: never fatal, never throw
        A.ready = false;
      }
    },

    setZoneMood: function (i) {
      zone = i < 0 ? 0 : (i > 5 ? 5 : Math.floor(i));
      if (!ctx) return; // remembered; applied when the graph exists
      applyZone(zone, false);
    },

    toggleMute: function () {
      A.muted = !A.muted;
      if (ctx) muteGain.gain.setTargetAtTime(A.muted ? 0 : 1, ctx.currentTime, 0.07);
      return A.muted;
    },

    // kind 'join' — soft major-third woodblock double blip (encounters).
    // kind 'board' — warm low marimba tone (finale boarding). Optional to call.
    chime: function (kind) {
      if (!ctx) return;
      var now = ctx.currentTime;
      if (kind === 'board') {
        blip('sine', 196.00, now, 0.09, 0.16, 0.9);        // G3 body
        blip('sine', 392.00, now, 0.035, 0.14, 0.7);       // octave shimmer of the mallet
      } else {
        blip('triangle', 659.26, now, 0.05, 0.045, 0.35);        // E5
        blip('triangle', 830.61, now + 0.15, 0.05, 0.045, 0.35); // G#5, a soft major third up
      }
    }
  };

  // ---------------- state ----------------
  var ctx = null;
  var started = false;
  var zone = 0;                 // current (or pending) zone mood
  var gullZone = true;          // gulls live in zones 0-2 only
  var gullTimer = 0, condTimer = 0, pluckTimer = 0;
  var lastEnergy = 1.0, lastPadSwell = 1.25; // node defaults at intensity 1

  // graph nodes
  var mixBus, energyGain, fadeGain, muteGain; // master chain
  var windLevel;                               // breeze strength per zone
  var gullBus, chimeBus;
  var padFilter, padSwell, wetGain;
  var banks = [];                              // per-zone pad crossfade gains

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------------- zone mood table (the emotional spine) ----------------
  // f: voice frequencies, v: voice gain, sh: shimmer LFO Hz.
  // Warm consonant centers, one voice per chord, triangle/sine alternating,
  // each voice slightly detuned against its neighbors for handcrafted warmth.
  // V2 warmth pass: register raised (sub-110Hz roots read as gloomy at low
  // volume), brighter voicings, plus a sparse major-pentatonic pluck motif.
  var MOODS = [
    { f: [110.00, 220.00, 329.63],         v: 0.030, sh: 0.060 },            // dawn: A2 A3 E4, airy open fifth
    { f: [130.81, 261.63, 392.00],         v: 0.036, sh: 0.105 },            // shells: C3 C4 G4, clean marine morning
    { f: [220.00, 349.23, 440.00],         v: 0.038, sh: 0.135, neighbor: 1, pluck: 0 }, // tangerine: A3 F4 A4, bright noon
    { f: [146.83, 246.94, 392.00, 493.88], v: 0.040, sh: 0.090, pluck: 1 },  // syrup: D3 B3 G4 B4, golden glow
    { f: [164.81, 246.94, 415.30, 523.25], v: 0.040, sh: 0.075, pluck: 2 },  // baratie: E3 B3 G#4 C5, supper-club maj6
    { f: [146.83, 246.94, 329.63, 1568.0], v: 0.034, sh: 0.050, star: true } // finale: D3 B3 E4 + one barely-audible star
  ];
  // hopeful major-pentatonic pluck sets per pluck-enabled zone (random walk)
  var PLUCK_SETS = [
    [440.00, 493.88, 554.37, 659.26, 739.99],  // tangerine: A major penta
    [392.00, 440.00, 493.88, 587.33, 659.26],  // syrup: G major penta
    [329.63, 369.99, 415.30, 493.88, 554.37]   // baratie: E major penta
  ];
  var VOICE_TYPES = ['triangle', 'sine', 'triangle', 'sine'];
  var VOICE_DETUNE = [5, -4, 7, -6]; // cents

  // ---------------- brown noise loop (shared by ocean + wind) ----------------
  function makeNoiseBuffer() {
    var len = Math.floor(ctx.sampleRate * 4);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    var drift = d[len - 1] - d[0]; // detrend so the loop wraps without a thump
    for (var j = 0; j < len; j++) d[j] -= drift * (j / len);
    return buf;
  }

  // ---------------- build the whole graph, start everything once ----------------
  function buildGraph() {
    var now = ctx.currentTime;

    // master chain: everything -> mixBus -> energyGain -> fadeGain -> muteGain -> out
    mixBus = ctx.createGain();
    energyGain = ctx.createGain(); energyGain.gain.value = lastEnergy;
    fadeGain = ctx.createGain(); fadeGain.gain.value = 0; // the ~2.5s fade-in
    muteGain = ctx.createGain(); muteGain.gain.value = A.muted ? 0 : 1;
    mixBus.connect(energyGain); energyGain.connect(fadeGain); fadeGain.connect(muteGain);
    muteGain.connect(ctx.destination);

    // shared noise voice
    var noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer();
    noise.loop = true;

    // ocean bed: brown noise through a soft lowpass, swelling on a ~9-13s LFO
    var oceanLP = ctx.createBiquadFilter();
    oceanLP.type = 'lowpass'; oceanLP.frequency.value = 420; oceanLP.Q.value = 0.6;
    var oceanGain = ctx.createGain(); oceanGain.gain.value = 0.30;
    var oceanLFO = ctx.createOscillator(); oceanLFO.frequency.value = 1 / rnd(9, 13);
    var oceanDepth = ctx.createGain(); oceanDepth.gain.value = 0.12;
    oceanLFO.connect(oceanDepth); oceanDepth.connect(oceanGain.gain);
    noise.connect(oceanLP); oceanLP.connect(oceanGain); oceanGain.connect(mixBus);

    // wind: bandpass slice of the same noise, quieter, its own slow ~17-23s swell
    var windBP = ctx.createBiquadFilter();
    windBP.type = 'bandpass'; windBP.frequency.value = 700; windBP.Q.value = 1.4;
    var windGain = ctx.createGain(); windGain.gain.value = 0.11;
    var windLFO = ctx.createOscillator(); windLFO.frequency.value = 1 / rnd(17, 23);
    var windDepth = ctx.createGain(); windDepth.gain.value = 0.05;
    windLFO.connect(windDepth); windDepth.connect(windGain.gain);
    windLevel = ctx.createGain(); windLevel.gain.value = 0.7; // zones 2-3 breathe harder
    noise.connect(windBP); windBP.connect(windGain); windGain.connect(windLevel);
    windLevel.connect(mixBus);

    // pads: every zone bank exists and runs; crossfade is bank gain only
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 1900; padFilter.Q.value = 0.7;
    padSwell = ctx.createGain(); padSwell.gain.value = lastPadSwell; // conductor lifts this with intensity
    padFilter.connect(padSwell); padSwell.connect(mixBus);

    // synthetic air: one feedback delay fed from the pads only
    var delay = ctx.createDelay(1.0); delay.delayTime.value = 0.28;
    var fbLP = ctx.createBiquadFilter();
    fbLP.type = 'lowpass'; fbLP.frequency.value = 1600;
    var fb = ctx.createGain(); fb.gain.value = 0.25;
    wetGain = ctx.createGain(); wetGain.gain.value = 0.15;
    padFilter.connect(delay);
    delay.connect(fbLP); fbLP.connect(fb); fb.connect(delay);
    delay.connect(wetGain); wetGain.connect(mixBus);

    for (var z = 0; z < MOODS.length; z++) banks.push(buildBank(z));

    // one-shot buses
    gullBus = ctx.createGain(); gullBus.gain.value = 0.8; gullBus.connect(mixBus);
    chimeBus = ctx.createGain(); chimeBus.gain.value = 0.9; chimeBus.connect(mixBus);

    // start every persistent source exactly once
    noise.start(now);
    oceanLFO.start(now);
    windLFO.start(now);

    // fade the whole bed in over ~2.5s
    fadeGain.gain.setValueAtTime(0, now);
    fadeGain.gain.linearRampToValueAtTime(1, now + 2.5);

    // ambient timers (ours, not the game loop's)
    condTimer = setInterval(conduct, 600);
    setTimeout(earlyGull, rnd(2500, 6000)); // the world introduces itself
    gullLoop();
    pluckLoop();
  }

  // ---------------- pluck motif: sparse hopeful notes, major pentatonic ----------
  // A soft sine pluck wandering stepwise through the zone's pentatonic set —
  // gentle motion so the bed breathes hope instead of hanging still.
  var pluckStep = 2;
  function pluckNote(set, f) {
    var t = ctx.currentTime + 0.05;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.4);
    o.connect(g); g.connect(padFilter);
    o.start(t); o.stop(t + 1.5);
    // a faint octave shimmer an octave up, even quieter
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.014, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0003, t + 0.9);
    o2.connect(g2); g2.connect(padFilter);
    o2.start(t); o2.stop(t + 1.0);
  }
  function pluckLoop() {
    pluckTimer = setTimeout(function () {
      var m = MOODS[zone];
      if (ctx && !A.muted && m && m.pluck !== undefined && A.intensity > 0.85 &&
          !document.hidden && m.pluck < PLUCK_SETS.length) {
        var set = PLUCK_SETS[m.pluck];
        pluckStep = Math.min(set.length - 1, Math.max(0, pluckStep + (Math.random() < 0.5 ? -1 : 1)));
        pluckNote(set, set[pluckStep]);
      }
      pluckLoop();
    }, rnd(2600, 5200));
  }

  function buildBank(z) {
    var m = MOODS[z];

    // per-bank shimmer: one slow LFO breathes the whole chord in and out
    var shimmer = ctx.createGain(); shimmer.gain.value = 1.0;
    var shLFO = ctx.createOscillator(); shLFO.frequency.value = m.sh;
    var shDepth = ctx.createGain(); shDepth.gain.value = 0.18;
    shLFO.connect(shDepth); shDepth.connect(shimmer.gain);

    var bus = ctx.createGain(); bus.gain.value = z === zone ? 1 : 0; // pending zone honored at build
    shimmer.connect(bus); bus.connect(padFilter);

    for (var i = 0; i < m.f.length; i++) {
      var isStar = m.star && i === m.f.length - 1;
      var o = ctx.createOscillator();
      o.type = isStar ? 'sine' : VOICE_TYPES[i % VOICE_TYPES.length];
      o.frequency.value = m.f[i];
      o.detune.value = isStar ? 0 : VOICE_DETUNE[i % VOICE_DETUNE.length];
      var g = ctx.createGain(); g.gain.value = isStar ? 0.008 : m.v;
      o.connect(g); g.connect(shimmer);
      o.start(ctx.currentTime);

      // tangerine: the top voice lazily leans toward its upper neighbor and back
      if (m.neighbor === i) {
        var nLFO = ctx.createOscillator();
        nLFO.type = 'triangle'; nLFO.frequency.value = 0.032; // ~31s per lean
        var nDepth = ctx.createGain(); nDepth.gain.value = 28; // ~A4 <-> Bb4
        nLFO.connect(nDepth); nDepth.connect(o.frequency);
        nLFO.start(ctx.currentTime);
      }
    }
    shLFO.start(ctx.currentTime);
    return { bus: bus };
  }

  // ---------------- zone crossfade (~4s) + wind strength + gull gate ----------------
  function applyZone(i, fast) {
    var now = ctx.currentTime;
    for (var k = 0; k < banks.length; k++) {
      banks[k].bus.gain.setTargetAtTime(k === i ? 1 : 0, now, fast ? 0.25 : 1.3);
    }
    windLevel.gain.setTargetAtTime((i === 2 || i === 3) ? 1.15 : 0.7, now, 2.5);
    gullZone = i <= 2;
  }

  // ---------------- gulls: sparse descending pitch-bent blips ----------------
  function gullLoop() {
    gullTimer = setTimeout(function () {
      if (ctx && gullZone) gullCall();
      gullLoop();
    }, rnd(9000, 22000));
  }

  function earlyGull() {
    if (ctx && gullZone) gullCall();
  }

  function gullCall() {
    var t = ctx.currentTime + 0.05;
    var dest = gullBus, pan = null;
    if (ctx.createStereoPanner) { // guarded: subtle placement off the center line
      pan = ctx.createStereoPanner();
      pan.pan.value = rnd(-0.5, 0.5);
      pan.connect(gullBus);
      dest = pan;
    }
    var n = 2 + (Math.random() * 3 | 0); // 2-4 blips per call
    for (var i = 0; i < n; i++) {
      var f0 = rnd(1400, 1900), dur = rnd(0.08, 0.14);
      var o = ctx.createOscillator();
      o.type = Math.random() < 0.5 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * rnd(0.55, 0.7), t + dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rnd(0.04, 0.065), t + 0.012);
      g.gain.setTargetAtTime(0, t + 0.02, 0.03);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.06);
      t += dur + rnd(0.03, 0.07); // tiny gap between blips
    }
  }

  // ---------------- conductor: folds .intensity into the master, softly ----------------
  function conduct() {
    if (!ctx) return;
    var I = A.intensity < 0 ? 0 : (A.intensity > 1 ? 1 : A.intensity);
    var e = 0.8 + 0.2 * I;      // gentle overall swell
    var ps = 0.9 + 0.35 * I;    // strings breathe wider at high intensity
    var now = ctx.currentTime;
    if (Math.abs(e - lastEnergy) > 0.01) { energyGain.gain.setTargetAtTime(e, now, 0.9); lastEnergy = e; }
    if (Math.abs(ps - lastPadSwell) > 0.01) { padSwell.gain.setTargetAtTime(ps, now, 1.2); lastPadSwell = ps; }
  }

  // ---------------- chime voice helper ----------------
  function blip(type, f, t0, peak, tau, hold) {
    var o = ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
    g.gain.setTargetAtTime(0, t0 + 0.01, tau);
    o.connect(g); g.connect(chimeBus);
    o.start(t0); o.stop(t0 + hold);
  }
})();
