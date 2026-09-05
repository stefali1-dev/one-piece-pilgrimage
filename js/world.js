// world.js — scene build, player, camera, sky/time-of-day, the one rAF loop.
// Owns: #ground zones, entity billboards, world transform (camera), state.
window.PIL = window.PIL || {};

(function () {
  var SPEED = 300, K_ACC = 26, K_DEC = 9;      // feel law: ~100ms to full, ~250ms glide
  var LOOK_MIN = 90, LOOK_SPAN = 50;           // northward camera lookahead px
  var BOUND_X = 950, SOUTH_Y = 120;            // soft roam bounds
  var BEACH_Y = -2830;                         // boat lands here (dawn north edge)
  var TILT = ' rotateZ(';

  // ---------------- zone table (single source of truth) ----------------
  PIL.ZONES = [
    { id: 'dawn', y0: 400, y1: -3000, px0: 0, px1: 90,
      sky: 'linear-gradient(#070a18 0%, #141a3c 55%, #3a2a52 78%, #8a4a62 100%)',
      tint: 'rgba(84,62,124,0.10)',
      npc: null },
    { id: 'shells', y0: -3000, y1: -6000, px0: 90, px1: -110,
      sky: 'linear-gradient(#4a8fbe 0%, #a8d4e8 60%, #f2e9cf 100%)',
      tint: 'rgba(255,230,170,0.05)',
      npc: { name: 'zoro', x: 170, y: -4660 } },
    { id: 'tangerine', y0: -6000, y1: -9000, px0: -110, px1: 70,
      sky: 'linear-gradient(#4fa8e0 0%, #9fd6f0 55%, #e8f4f0 100%)',
      tint: 'rgba(255,255,240,0.02)',
      npc: { name: 'nami', x: -180, y: -7420 } },
    { id: 'syrup', y0: -9000, y1: -12000, px0: 70, px1: -50,
      sky: 'linear-gradient(#6b5a94 0%, #c98a6a 55%, #f0b878 100%)',
      tint: 'rgba(255,170,90,0.12)',
      npc: { name: 'usopp', x: 150, y: -10620 } },
    { id: 'baratie', y0: -12000, y1: -15000, px0: -50, px1: 10,
      sky: 'linear-gradient(#2c2350 0%, #7a4470 60%, #e08a5e 100%)',
      tint: 'rgba(130,70,120,0.14)',
      npc: { name: 'sanji', x: -48, y: -13580 } },
    { id: 'finale', y0: -15000, y1: -18000, px0: 10, px1: 0,
      sky: 'linear-gradient(#0a1024 0%, #101a36 55%, #243054 100%)',
      tint: 'rgba(30,40,80,0.18)',
      npc: null }
  ];

  // prop markup per zone lives in props.js (diorama specialist owns it)

  // ---------------- state ----------------
  PIL.state = { x: 0, y: 0, zone: 0, locked: false, phase: 'walk' };
  PIL.player = { x: 0, y: 0, vx: 0, vy: 0, el: null, charEl: null, riding: true, bob: 0, rock: 0 };
  PIL.cam = { x: 0, y: 0 };
  PIL.ents = [];   // all billboard entities (npcs etc.), not the player

  var ground, worldEl, skyA, skyB, tintA, tintB, celestial, sunEl, moonEl, starsEl, stageEl;
  var skyPos = -1; // continuous sky position: floor = A, ceil = B
  var vw = window.innerWidth, vh = window.innerHeight;
  var entsLayerEl = null, puffT = 0;
  window.addEventListener('resize', function () { vw = window.innerWidth; vh = window.innerHeight; });

  // ---------------- build ----------------
  function el(id) { return document.getElementById(id); }

  function makeBillboard(html, cls) {
    var b = document.createElement('div');
    b.className = 'billboard' + (cls ? ' ' + cls : '');
    b.innerHTML = html;
    return b;
  }
  PIL.makeBillboard = makeBillboard;

  function spawnNPC(npc) {
    var b = makeBillboard('', 'npc');
    var sh = document.createElement('div');
    sh.className = 'drop-shadow';
    b.appendChild(sh);
    var c = PIL.makeCharacter(npc.name);
    b.appendChild(c);
    b._ent = { name: npc.name, x: npc.x, y: npc.y, vx: 0, vy: 0, el: b, charEl: c, joined: false };
    PIL.ents.push(b._ent);
    PIL.setBillboard(b, npc.x, npc.y, 1, 0);
    return b._ent;
  }

  function build() {
    worldEl = el('world'); ground = el('ground'); stageEl = el('stage');
    skyA = el('skyA'); skyB = el('skyB'); tintA = el('tintA'); tintB = el('tintB');
    celestial = el('celestial'); sunEl = celestial.querySelector('.sun');
    moonEl = celestial.querySelector('.moon'); starsEl = celestial.querySelector('.stars');

    var frag = document.createDocumentFragment();
    for (var i = 0; i < PIL.ZONES.length; i++) {
      var z = PIL.ZONES[i];
      var d = document.createElement('div');
      d.className = 'zone zone-' + z.id;
      d.style.top = z.y1 + 'px';
      d.style.height = (z.y0 - z.y1) + 'px';
      d.innerHTML = PIL.PROPS[z.id] || '';
      frag.appendChild(d);
      if (z.npc) { var e = spawnNPC(z.npc); e.zone = i; frag.appendChild(e.el); }
    }
    var entsLayer = document.createElement('div');
    entsLayer.id = 'entities';
    // 0x0 anchor at world (0,0): children position in world coords, not ground-tile coords
    entsLayer.style.cssText = 'position:absolute;left:1300px;top:19200px;width:0;height:0;transform-style:preserve-3d;';
    ground.appendChild(entsLayer);

    // player + boat
    var p = PIL.player;
    p.el = makeBillboard(PIL.PROPS.playerBoat, 'player');
    var psh = document.createElement('div');
    psh.className = 'drop-shadow';
    p.el.insertBefore(psh, p.el.firstChild);
    p.charEl = PIL.makeCharacter('luffy');
    p.el.appendChild(p.charEl);
    entsLayer.appendChild(frag);
    entsLayer.appendChild(p.el);
    entsLayerEl = entsLayer;

    // cloud shadows drifting over the trail (position via top; CSS animates transform)
    var cs1 = document.createElement('div'); cs1.className = 'cloud-shadow';
    cs1.style.top = '-5000px';
    var cs2 = document.createElement('div'); cs2.className = 'cloud-shadow cs-b';
    cs2.style.top = '-13000px';
    entsLayer.appendChild(cs1); entsLayer.appendChild(cs2);

    applySky(0);
    PIL.setBillboard(p.el, p.x, p.y, 1, 0);
  }

  // ---------------- sky / time of day ----------------
  function zoneAt(y) {
    for (var i = 0; i < PIL.ZONES.length; i++) {
      var z = PIL.ZONES[i];
      if (y <= z.y0 && y > z.y1) return i;
    }
    return y <= PIL.ZONES[5].y1 ? 5 : 0;
  }

  function applySky(iBase) {
    var zs = PIL.ZONES;
    var a = zs[PIL.clamp(iBase, 0, 5)], b = zs[PIL.clamp(iBase + 1, 0, 5)];
    skyA.style.background = a.sky; tintA.style.background = a.tint;
    skyB.style.background = b.sky; tintB.style.background = b.tint;
  }
  PIL.clamp = PIL.clamp || function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  function updateSky() {
    var y = PIL.state.y;
    var i = zoneAt(y);
    if (i !== PIL.state.zone) {
      PIL.state.zone = i;
      PIL.audio.setZoneMood(i);
      stageEl.className = 'z' + i; // drives rays, shadow stretch, per-zone stage art
    }
    var z = PIL.ZONES[i];
    var p = (z.y0 - y) / (z.y0 - z.y1);              // 0 south edge -> 1 north edge
    var s = i + PIL.smoothstep((p - 0.55) / 0.45);   // blend near the north edge
    var fl = Math.floor(s);
    if (fl !== skyPos) { skyPos = fl; applySky(fl); }
    var fr = s - fl;
    skyA.style.opacity = (1 - fr).toFixed(3);
    skyB.style.opacity = fr.toFixed(3);
    tintA.style.opacity = (1 - fr).toFixed(3);
    tintB.style.opacity = fr.toFixed(3);

    // celestial arc across the whole journey (g: 0 dawn -> 1 starlit).
    // Positions move via transform only (left/top are layout — never per-frame).
    var g = PIL.clamp(-y / 15600, 0, 1);
    var seg = PIL.clamp(g * 5, 0, 4.999);
    var i0 = seg | 0, ft = seg - i0;
    var sx = [70, 58, 46, 34, 24, 16], sy = [66, 42, 22, 34, 62, 88];
    var dx = PIL.lerp(sx[i0], sx[i0 + 1], ft) - 50;
    var dy = PIL.lerp(sy[i0], sy[i0 + 1], ft) - 42;
    sunEl.style.transform = 'translate3d(' + (dx * vw).toFixed(1) + 'px,' + (dy * vh).toFixed(1) + 'px,0)';
    sunEl.style.opacity = (1 - PIL.smoothstep((g - 0.8) / 0.12)).toFixed(3);
    var mr = PIL.smoothstep((g - 0.76) / 0.24);
    moonEl.style.opacity = PIL.smoothstep((g - 0.76) / 0.12).toFixed(3);
    moonEl.style.transform = 'translate3d(0,' + ((58 - 34 * mr - 42) * vh).toFixed(1) + 'px,0)';
    starsEl.style.opacity = PIL.smoothstep((g - 0.84) / 0.12).toFixed(3);
    celestial.style.transform = 'translate3d(0,' + (PIL.cam.y * 0.018).toFixed(1) + 'px,0)';
  }
  PIL.smoothstep = PIL.smoothstep || function (t) { t = PIL.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // ---------------- walkable corridors & prop collision ----------------
  // On water, planks are the only ground: polyline corridors with half-widths
  // softly pull the player back when she strays. PIL.clampWalkable(x, y, out)
  // is shared with the encounter staging so beats never land anyone on water.
  var CORRIDORS = [
    { pts: [[-50, -11900], [-46, -11750], [-42, -11560]], hw: 78 },          // syrup dock
    { pts: [[-20, -12030], [-16, -13500], [-8, -14990]], hw: 96 },           // baratie boardwalk
    { pts: [[-8, -14990], [4, -15140], [10, -15440]], hw: 118 }              // finale dock
  ];
  var tmpPt = { x: 0, y: 0 }, sPt = { x: 0, y: 0 };

  function nearestOnSegment(px, py, ax, ay, bx, by, out) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = PIL.clamp(t, 0, 1);
    out.x = ax + dx * t; out.y = ay + dy * t;
    return t;
  }
  function corridorAt(y) {
    for (var i = 0; i < CORRIDORS.length; i++) {
      var pts = CORRIDORS[i].pts;
      if (y <= pts[0][1] + 200 && y >= pts[pts.length - 1][1] - 200) return CORRIDORS[i];
    }
    return null;
  }
  // is this world y inside a walkable-corridor span (bridge/dock)?
  PIL.inCorridor = function (y) { return !!corridorAt(y); };

  // nearest corridor by DISTANCE to its polyline — junction-safe (spans
  // overlap at docks; picking by y-order once yanked walkers backwards).
  // interiorT flags whether the closest point is inside a segment (not an
  // end cap): end caps are free passage, never a pinning ring.
  function nearestCorridor(px, py) {
    var best = 1e12, bc = null, bx = px, by = py, bInterior = false;
    for (var i = 0; i < CORRIDORS.length; i++) {
      var pts = CORRIDORS[i].pts;
      for (var j = 0; j < pts.length - 1; j++) {
        var t = nearestOnSegment(px, py, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], sPt);
        var dd = (px - sPt.x) * (px - sPt.x) + (py - sPt.y) * (py - sPt.y);
        if (dd < best) {
          best = dd; bc = CORRIDORS[i]; bx = sPt.x; by = sPt.y;
          bInterior = t > 0.02 && t < 0.98;
        }
      }
    }
    return { c: bc, x: bx, y: by, d2: best, interior: bInterior };
  }
  // snap a point into the active corridor (identity on land; end caps free)
  PIL.clampWalkable = function (x, y, out) {
    out = out || tmpPt;
    out.x = x; out.y = y;
    var r = nearestCorridor(x, y);
    if (!r.c || !r.interior) return out;
    var d = Math.sqrt(r.d2);
    if (d > r.c.hw) {
      var s = r.c.hw / d;
      out.x = r.x + (x - r.x) * s;
      out.y = r.y + (y - r.y) * s;
    }
    return out;
  };

  function applyConstraints(dt) {
    var p = PIL.player;
    // corridor pull (softer than a clamp — a gentle current back to the planks)
    if (!p.riding && !p.aboard) {
      var r = nearestCorridor(p.x, p.y);
      if (r.c && r.interior) {
        var hw = r.c.hw;
        var dd = Math.sqrt(r.d2);
        if (dd > hw) {
          var ddx = p.x - r.x, ddy = p.y - r.y;
          var pull = PIL.damp(0, dd - hw, 9, dt);
          p.x -= (ddx / dd) * pull; p.y -= (ddy / dd) * pull;
          // hard ceiling: soft current near the edge, but never more than 26px past the planks
          var ex = p.x - r.x, ey = p.y - r.y;
          var ed2 = Math.sqrt(ex * ex + ey * ey);
          if (ed2 - hw > 26) {
            var s2 = (hw + 26) / ed2;
            p.x = r.x + ex * s2;
            p.y = r.y + ey * s2;
          }
        }
      }
    }
    // soft collision with standing props — walk around, never through
    if (PIL.COLLIDERS && !p.aboard) {
      for (var i = 0; i < PIL.COLLIDERS.length; i++) {
        var co = PIL.COLLIDERS[i];
        var cx = p.x - co.x, cy = p.y - co.y;
        var r2 = co.r + 16;
        var dist2 = cx * cx + cy * cy;
        if (dist2 < r2 * r2 && dist2 > 1) {
          var dist = Math.sqrt(dist2);
          var push = PIL.damp(0, r2 - dist, 14, dt);
          p.x += (cx / dist) * push; p.y += (cy / dist) * push;
        }
      }
    }
  }
  PIL.COLLIDERS = PIL.COLLIDERS || []; // props.js may register colliders before us

  // ---------------- player ----------------
  var axis = { x: 0, y: 0 };
  function updatePlayer(dt, t) {
    var p = PIL.player, st = PIL.state;
    if (p.aboard) { st.x = p.x; st.y = p.y; return; } // finale: Luffy rides the Merry
    PIL.input.axis(axis);
    if (st.locked || st.phase === 'finale' || st.phase === 'done') { axis.x = 0; axis.y = 0; }
    var moving = axis.x !== 0 || axis.y !== 0;
    var k = moving ? K_ACC : K_DEC;
    p.vx = PIL.damp(p.vx, axis.x * SPEED, k, dt);
    p.vy = PIL.damp(p.vy, axis.y * SPEED, k, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;

    // soft bounds
    if (p.x > BOUND_X || p.x < -BOUND_X) p.x = PIL.damp(p.x, PIL.clamp(p.x, -BOUND_X, BOUND_X), 10, dt);
    if (p.y > SOUTH_Y) { p.y = SOUTH_Y; if (p.vy > 0) p.vy = 0; }

    // walkable corridors + standing-prop collision
    if (!p.riding) applyConstraints(dt);

    var spd2 = p.vx * p.vx + p.vy * p.vy;
    p.charEl.classList.toggle('is-walk', spd2 > 1600 && !p.riding); // no leg-pedaling in the boat
    if (Math.abs(p.vx) > 60) p.charEl.classList.toggle('is-left', p.vx < 0);

    // footstep puffs on land, ripples on water
    if (!p.riding) {
      puffT -= dt;
      if (spd2 > 32400 && puffT <= 0) {
        puffT = 0.27;
        var d = document.createElement('div');
        d.className = PIL.state.zone === 0 ? 'step-ripple' : 'puff';
        d.style.left = (p.x + (Math.random() * 16 - 8)).toFixed(1) + 'px';
        d.style.top = (p.y + 8).toFixed(1) + 'px';
        entsLayerEl.appendChild(d);
        (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 800); })(d);
      }
    }

    // the dinghy is hidden the moment riding ends, for any reason
    if (!p.riding && !p._boatHidden) {
      p._boatHidden = true;
      var hb = p.el.querySelector('.boat');
      if (hb) hb.style.display = 'none';
    }

    // boat riding + landing
    if (p.riding) {
      if (p.y < BEACH_Y) {
        p.riding = false;
        var bb = makeBillboard(PIL.PROPS.beachedBoat, 'beach-boat');
        PIL.setBillboard(bb, p.x, p.y - 26, 1, 0); // .beached carries its own lean
        ground.querySelector('#entities').appendChild(bb);
        p.charEl.style.transform = '';
      } else {
        p.bob = Math.sin(t * 1.7) * 2.2;
        p.rock = Math.sin(t * 1.28) * 0.022;
        // hero scale at the opening: the boat starts large (a protagonist, not
        // a speck) and the camera relaxes to walking scale as the journey begins
        var S = 1 + 0.62 * (1 - PIL.smoothstep(-p.y / 2100));
        PIL.setBillboardScaled(p.el, p.x, p.y, 1 + p.bob, p.rock, S);
        // soft wake behind the dinghy
        puffT -= dt;
        if (puffT <= 0) {
          puffT = 0.6;
          var wr = document.createElement('div');
          wr.className = 'step-ripple';
          wr.style.left = (p.x + (Math.random() * 20 - 10)).toFixed(1) + 'px';
          wr.style.top = (p.y + 44).toFixed(1) + 'px';
          entsLayerEl.appendChild(wr);
          (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 800); })(wr);
        }
        st.x = p.x; st.y = p.y;
        return;
      }
    }
    PIL.setBillboard(p.el, p.x, p.y, 1, 0);
    st.x = p.x; st.y = p.y;
  }

  // ---------------- camera ----------------
  function updateCamera(dt) {
    var p = PIL.player;
    var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy) / SPEED;
    // keep the whole convoy in frame: bias south as the crew grows
    var bias = Math.min(PIL.convoy.count() * 24, 110);
    var tx = p.x, ty = p.y - (LOOK_MIN + LOOK_SPAN * spd) + bias;
    if (PIL.finale.sailing) { tx = PIL.finale.main.x + 40; ty = PIL.finale.main.y - 130; }
    PIL.cam.x = PIL.damp(PIL.cam.x, tx, 5, dt);
    PIL.cam.y = PIL.damp(PIL.cam.y, ty, 5, dt);
  }

  // ---------------- loop ----------------
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = (now - last) / 1000;
    if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.001;
    last = now;
    var t = now / 1000;

    PIL.updateTweens(dt);
    updatePlayer(dt, t);
    PIL.encounters.update(dt, t);
    PIL.convoy.update(dt, t);
    PIL.finale.update(dt, t);
    updateCamera(dt);

    worldEl.style.transform = 'rotateX(55deg) translate3d(' + (-Math.round(PIL.cam.x * 10) / 10) + 'px,' +
      (-Math.round(PIL.cam.y * 10) / 10) + 'px,0)';
    updateSky();
  }

  build();
  PIL.boot = function () {
    PIL.encounters.init();
    requestAnimationFrame(frame);
  };
})();
