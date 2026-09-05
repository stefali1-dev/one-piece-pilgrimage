// paint.js — the V2 generated-asset pipeline.
// Impressive organic shapes from vanilla CSS: a tiny vector helper that turns a
// handful of control points into smooth Catmull-Rom polygons (clip-path), plus a
// rule injector so props/characters can register painted styles at parse time.
//
// Usage (from props.js / characters.js at parse time):
//   PIL.paint.shape('canopy-a', [[.18,.72],[.02,.4],[.3,.06],[.7,.04],[.98,.42],[.8,.78],[.5,.92]]);
//     -> .canopy-a { clip-path: polygon(...36 smooth vertices...) }
//   PIL.paint.css('.canopy-a::after{...}')   // any companion rules
//   PIL.paint.open('canopy-b', [[...]])       // open path variant (arc-like)
//
// Craft rules still apply: paint is STATIC (clip-path/gradients/shadows fine);
// anything that moves per-frame animates transform/opacity only.
window.PIL = window.PIL || {};

PIL.paint = (function () {
  var styleEl = null, pending = [];

  function ensureStyle() {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'paint-css';
      document.head.appendChild(styleEl);
    }
    return styleEl;
  }

  function flush() {
    if (pending.length) {
      ensureStyle().textContent += pending.join('\n') + '\n';
      pending.length = 0;
    }
  }

  function catmull(p0, p1, p2, p3, u) {
    var u2 = u * u, u3 = u2 * u;
    return [
      0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
      0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)
    ];
  }

  // closed smooth polygon (clip-path string, percent units) from control points in 0..1
  function polygon(ctrl, segs) {
    segs = segs || 7;
    var n = ctrl.length, pts = [];
    for (var i = 0; i < n; i++) {
      var p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (var s = 0; s < segs; s++) pts.push(catmull(p0, p1, p2, p3, s / segs));
    }
    return 'polygon(' + pts.map(function (p) {
      return (p[0] * 100).toFixed(1) + '% ' + (p[1] * 100).toFixed(1) + '%';
    }).join(',') + ')';
  }

  // open smooth path rendered as a thin ribbon between two sides (for arcs,
  // ropes, curved edges): ctrl in 0..1, thickness = half-width in same units
  function ribbon(ctrl, thickness, segs) {
    segs = segs || 9;
    var top = [], bot = [];
    var n = ctrl.length;
    for (var i = 0; i < n; i++) {
      var a = ctrl[Math.max(0, i - 1)], b = ctrl[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len * thickness, ny = dx / len * thickness;
      var p = ctrl[i];
      top.push([p[0] + nx, p[1] + ny]);
      bot.push([p[0] - nx, p[1] - ny]);
    }
    var pts = [];
    for (var s = 0; s < n - 1; s++) pts.push(catmull(top[Math.max(0, s - 1)], top[s], top[Math.min(n - 1, s + 1)], top[Math.min(n - 1, s + 2)], 0.5));
    for (var s2 = n - 1; s2 > 0; s2--) pts.push(catmull(bot[Math.min(n - 1, s2 + 1)], bot[s2], bot[Math.max(0, s2 - 1)], bot[Math.max(0, s2 - 2)], 0.5));
    return 'polygon(' + pts.map(function (p) {
      return (p[0] * 100).toFixed(1) + '% ' + (p[1] * 100).toFixed(1) + '%';
    }).join(',') + ')';
  }

  // register a class with a closed organic clip-path (+ extra declarations)
  function shape(cls, ctrl, extra, segs) {
    pending.push('.' + cls + '{clip-path:' + polygon(ctrl, segs) + (extra ? ';' + extra : '') + '}');
    flush();
    return cls;
  }

  // register a class with a ribbon clip-path
  function band(cls, ctrl, thickness, extra) {
    pending.push('.' + cls + '{clip-path:' + ribbon(ctrl, thickness) + (extra ? ';' + extra : '') + '}');
    flush();
    return cls;
  }

  // register raw CSS
  function css(rule) { pending.push(rule); flush(); }

  return { polygon: polygon, ribbon: ribbon, shape: shape, band: band, css: css };
})();
