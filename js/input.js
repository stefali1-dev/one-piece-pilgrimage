// input.js — keydown/keyup flip flags; the loop consumes them same-frame.
window.PIL = window.PIL || {};

PIL.input = {
  keys: {},
  mute: false,
  override: null,          // set by demo mode: {x, y} normalized
  anyKey: false,
  listeners: []            // called once on the very first keydown
};

(function () {
  var MAP = {
    ArrowUp: 'n', KeyW: 'n',
    ArrowDown: 's', KeyS: 's',
    ArrowLeft: 'w', KeyA: 'w',
    ArrowRight: 'e', KeyD: 'e'
  };

  function onDown(e) {
    var k = MAP[e.code];
    if (k) {
      e.preventDefault();
      PIL.input.keys[k] = true;
      PIL.input.anyKey = true;
    }
    if (e.code === 'KeyM') {
      var m = PIL.audio.toggleMute();
      var g = document.getElementById('mute-glyph');
      if (g) {
        g.classList.remove('show', 'muted');
        void g.offsetWidth; // restart the flash animation
        if (m) g.classList.add('muted');
        g.classList.add('show');
      }
    }
    if (!PIL.input._started) {
      PIL.input._started = true;
      try { PIL.audio.init(); } catch (err) { /* audio is never fatal */ }
      for (var i = 0; i < PIL.input.listeners.length; i++) PIL.input.listeners[i]();
    }
    if (PIL.state && PIL.state.phase === 'done') PIL.finale.replay();
  }
  function onUp(e) {
    var k = MAP[e.code];
    if (k) PIL.input.keys[k] = false;
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', function () { PIL.input.keys = {}; });
})();

// normalized movement intent: keyboard axes or demo override
PIL.input.axis = function (out) {
  var o = PIL.input.override;
  if (o) { out.x = o.x; out.y = o.y; return out; }
  var k = PIL.input.keys;
  out.x = (k.e ? 1 : 0) - (k.w ? 1 : 0);
  out.y = (k.s ? 1 : 0) - (k.n ? 1 : 0);
  if (out.x && out.y) { out.x *= 0.7071; out.y *= 0.7071; }
  return out;
};
