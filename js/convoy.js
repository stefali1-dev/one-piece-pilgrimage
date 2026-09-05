// convoy.js — breadcrumb snake-follow. Each follower eases toward where the one
// ahead was (i+1)*0.45s ago, per-character phase, critically damped.
window.PIL = window.PIL || {};

PIL.convoy = (function () {
  var STEP = 0.06, N = 400;
  var xs = new Float32Array(N), ys = new Float32Array(N);
  var head = 0, filled = 0, timer = 0;
  var followers = [];

  function sampleAt(age, out) {
    var back = Math.min(N - 1, Math.round(age / STEP));
    if (back > filled) back = filled;
    var idx = head - back; if (idx < 0) idx += N;
    out.x = xs[idx]; out.y = ys[idx];
    return out;
  }
  function dirAt(age, out) {
    var a = sampleAt(age + STEP, tmpA), b = sampleAt(age - STEP, tmpB);
    var dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
    out.x = dx / l; out.y = dy / l;
    return out;
  }
  var tmpA = { x: 0, y: 0 }, tmpB = { x: 0, y: 0 }, s = { x: 0, y: 0 }, d = { x: 0, y: 0 };

  return {
    count: function () { return followers.length; },
    list: function () { return followers.slice(); },
    add: function (ent, x, y) {
      if (followers.indexOf(ent) !== -1) return; // idempotent: a racing beat must not double-add
      ent.x = x; ent.y = y;
      ent.follow = { side: followers.length % 2 ? -1 : 1, phase: Math.random() * 6.28 };
      followers.push(ent);
    },
    update: function (dt, t) {
      // record player breadcrumb
      timer += dt;
      while (timer >= STEP) {
        timer -= STEP; head = (head + 1) % N; filled = Math.min(filled + 1, N - 1);
        xs[head] = PIL.player.x; ys[head] = PIL.player.y;
      }
      for (var i = 0; i < followers.length; i++) {
        var f = followers[i], cfg = f.follow;
        if (f.aboard || f.boarding) continue; // riding the Merry / in a boarding tween
        var age = 0.38 + i * 0.30 + (cfg.phase % 1) * 0.05;
        sampleAt(age, s); dirAt(age, d);
        // on the planks the line tightens so the bridge never reads as clutter
        var onPlanks = PIL.inCorridor && PIL.inCorridor(ty);
        var lat = cfg.side * (onPlanks ? (16 + i * 5) : (30 + i * 10));
        var tx = s.x - d.y * lat, ty = s.y + d.x * lat;
        if (PIL.state.locked) ty += 115; // beats need room: the crew holds back
        // anti-z-fight: at rest the trail collapses to a point, which once made
        // every follower converge and flicker. Keep >=52px of ground behind the
        // one ahead — strict depth order, always, plus a slight diagonal stagger.
        var refX = (i === 0) ? PIL.player.x : followers[i - 1].x;
        var refY = (i === 0) ? PIL.player.y : followers[i - 1].y;
        if (ty < refY + 52) {
          ty = refY + 52;
          tx = refX + (i % 2 ? 30 : -30);
        }
        // never step off the planks: followers obey the same corridors you do
        if (onPlanks || (PIL.inCorridor && PIL.inCorridor(ty))) {
          var wc = PIL.clampWalkable(tx, ty);
          tx = wc.x; ty = wc.y;
        }
        var px = f.x, py = f.y;
        f.x = PIL.damp(f.x, tx, 9, dt); f.y = PIL.damp(f.y, ty, 9, dt);
        var vx = (f.x - px) / dt, vy = (f.y - py) / dt;
        var bob = Math.sin(t * 9 + cfg.phase) * 1.4; // breathing offset so the line never locks
        f.charEl.classList.toggle('is-walk', vx * vx + vy * vy > 2000);
        if (Math.abs(vx) > 50) f.charEl.classList.toggle('is-left', vx < 0);
        PIL.setBillboard(f.el, f.x, f.y, 1 + bob * 0.4, 0);
      }
    }
  };
})();
