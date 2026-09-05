// util.js — allocation-light math helpers. No DOM here.
window.PIL = window.PIL || {};

PIL.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
PIL.lerp = function (a, b, t) { return a + (b - a) * t; };
// critically-damped approach; k ≈ rate (higher = tighter)
PIL.damp = function (cur, target, k, dt) { return cur + (target - cur) * (1 - Math.exp(-k * dt)); };
PIL.dist2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
PIL.smoothstep = function (t) { t = PIL.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// tiny tween runner: { dur, delay, ease, update(p), done() } — created per beat, not per frame
PIL.tweens = [];
PIL.tween = function (cfg) { cfg.t = -(cfg.delay || 0); PIL.tweens.push(cfg); return cfg; };
PIL.updateTweens = function (dt) {
  for (var i = PIL.tweens.length - 1; i >= 0; i--) {
    var tw = PIL.tweens[i];
    tw.t += dt;
    if (tw.t < 0) continue;
    var p = PIL.clamp(tw.t / tw.dur, 0, 1);
    tw.update((tw.ease || PIL.smoothstep)(p));
    if (p >= 1) { PIL.tweens.splice(i, 1); if (tw.done) tw.done(); }
  }
};

// billboard transform writer — the ONLY per-frame style write per entity
PIL.setBillboard = function (el, x, y, z, rot) {
  el.style.transform = 'translate3d(' + (Math.round(x * 10) / 10) + 'px,' +
    (Math.round(y * 10) / 10) + 'px,' + (z || 1) + 'px)' +
    (rot ? ' rotateZ(' + rot + 'rad)' : '');
};
// scaled variant (opening hero scale, sailing Merry) — scale3d, NOT scale:
// scale() skips the z axis, which is where an upright billboard's height lives,
// so it stretched characters sideways. scale3d grows them truly uniformly.
PIL.setBillboardScaled = function (el, x, y, z, rot, s) {
  el.style.transform = 'translate3d(' + (Math.round(x * 10) / 10) + 'px,' +
    (Math.round(y * 10) / 10) + 'px,' + (z || 1) + 'px)' +
    (rot ? ' rotateZ(' + rot + 'rad)' : '') + ' scale3d(' + s + ',' + s + ',' + s + ')';
};
