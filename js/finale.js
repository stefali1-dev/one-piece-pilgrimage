// finale.js — the Merry: moored promise at Syrup, boardable at the night dock.
// Sequence: crew boards one by one -> Luffy at the bow -> sail drops -> glide
// north under stars -> slow fade to a gentle starlit idle. Any key = replay.
window.PIL = window.PIL || {};

PIL.finale = {
  started: false,
  sailing: false,
  fading: false,
  merrys: [],
  main: null,          // { el, stand, x, y }
  speed: 0,
  wakeT: 0,

  // deck spots, Merry-local px (x from centerline, y up from waterline) —
  // spread along the deck ellipse (local x 55..385) so silhouettes never stack
  SPOTS: {
    luffy: [-150, -132], zoro: [-40, -118],
    usopp: [75, -112], nami: [120, -102], sanji: [150, -96]
  },

  buildMerrys: function () {
    var ents = document.getElementById('entities');
    var spots = [
      { x: 150, y: -11720, cls: 'merry-syrup' },     // the promise, Syrup harbor
      { x: 10, y: -15750, cls: 'merry-dock' }         // the boarding, night dock
    ];
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      // .merry self-rotates and self-anchors — mount her markup directly
      var bb = PIL.makeBillboard(PIL.PROPS.merry, s.cls);
      ents.appendChild(bb);
      var m = { el: bb, sail: bb.querySelector('.merry-sail'), x: s.x, y: s.y };
      if (m.sail) m.sail.style.transform = 'scaleY(0.22)'; // furled until departure
      this.merrys.push(m);
      PIL.setBillboard(bb, s.x, s.y, 1, 0);
    }
    this.main = this.merrys[1];
    // the night dock Merry stays hidden until her arrival handoff — the
    // traveling Merry BECOMES her, so two are never on screen (or in memory)
    var dock = this.merrys[1];
    dock.el.style.visibility = 'hidden';
    dock._vis = 'hidden';
  },

  update: function (dt, t) {
    if (!this.started && PIL.state.phase === 'walk' && !PIL.state.locked &&
        PIL.player.y < -15400 && !PIL.player.riding && !PIL.player.aboard) {
      this.start(t);
    }
    if (this.sailing) this.sail(dt, t);
    this.sailAway(dt, t);
  },

  // After Usopp joins, the Syrup Merry casts off and sails north — but her
  // journey is driven by YOUR progress, so she is always a glimpse ahead,
  // pulls into the night dock exactly as you approach it, and becomes the
  // dock Merry at the moment of arrival. One ship, three sightings, no
  // teleport, never two at once.
  sailAway: function (dt, t) {
    var m0 = this.merrys[0], m1 = this.merrys[1];
    if (!m0 || !m1) return;
    if (!this.departing && !this.arrived && !this.started &&
        PIL.convoy.count() >= 3 && PIL.player.y < -11800) {
      this.departing = true;
      if (m0._vis === 'hidden') { m0._vis = 'visible'; m0.el.style.visibility = 'visible'; }
      m1.el.style.visibility = 'hidden'; m1._vis = 'hidden'; // she IS the dock Merry now
      if (m0.sail) {
        var sail = m0.sail;
        PIL.tween({
          dur: 2.2, ease: PIL.smoothstep,
          update: function (v) { sail.style.transform = 'scaleY(' + (0.22 + 0.78 * v).toFixed(3) + ')'; }
        });
      }
    }
    if (this.departing) {
      // progress 0 at the harbor, 1 short of the dock — she is moored and
      // settled a beat before you arrive, so the handoff never pops on screen.
      // (player.y is negative and decreases northward: invert the span.)
      var pgs = PIL.smoothstep((-11800 - PIL.player.y) / 3000);
      m0.y = PIL.lerp(-11720, -15750, pgs);
      m0.x = PIL.lerp(150, 10, pgs) + Math.sin(pgs * Math.PI) * 130; // swings east, comes back in
      var near = PIL.smoothstep((pgs - 0.75) / 0.25); // settle the rock at the dock
      PIL.setBillboardScaled(m0.el, m0.x, m0.y, 1 + Math.sin(t * 1.1) * 1.8 * (1 - near),
        Math.sin(t * 0.9) * 0.008 * (1 - near), 1);
      this.wakeT2 = (this.wakeT2 || 0) - dt;
      if (this.wakeT2 <= 0 && pgs > 0.04 && pgs < 0.9) {
        this.wakeT2 = 0.55;
        var w = document.createElement('div');
        w.className = 'wake';
        w.style.left = (m0.x + (Math.random() * 50 - 25)).toFixed(1) + 'px';
        w.style.top = (m0.y + 185).toFixed(1) + 'px';
        document.getElementById('entities').appendChild(w);
        setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 1900);
      }
      if (pgs >= 1) {
        // arrival: the traveling Merry becomes the moored dock Merry
        this.arrived = true;
        this.departing = false;
        m0.el.style.visibility = 'hidden'; m0._vis = 'hidden';
        m1.el.style.visibility = 'visible'; m1._vis = 'visible';
        if (m1.sail) m1.sail.style.transform = 'scaleY(0.22)'; // furled at anchor
      }
    }
  },

  // safeguard: if the finale starts while she is still under way, complete
  // the handoff instantly so exactly one Merry is ever at the dock
  forceDock: function () {
    if (this.departing) {
      var m0 = this.merrys[0], m1 = this.merrys[1];
      this.arrived = true; this.departing = false;
      if (m0) { m0.el.style.visibility = 'hidden'; m0._vis = 'hidden'; }
      if (m1) { m1.el.style.visibility = 'visible'; m1._vis = 'visible'; }
    }
  },

  start: function (t) {
    this.started = true;
    this.forceDock(); // exactly one Merry at the dock, always
    PIL.state.phase = 'finale';
    PIL.state.locked = true;
    var self = this, m = this.main, p = PIL.player;
    var followers = PIL.convoy.list().slice().reverse(); // last joined boards first

    // the crew gathers at the dock edge, facing her, before anyone boards
    followers.slice().reverse().forEach(function (f, i) {
      f.boarding = true; // convoy hands off — tweens own them from here
      var g = PIL.clampWalkable(-52 + i * 38, -15296 + (i % 2) * 28);
      var gx = g.x, gy = g.y;
      var x0 = f.x, y0 = f.y;
      f.charEl.classList.add('is-walk');
      PIL.tween({
        dur: 1.0, delay: i * 0.12, ease: PIL.smoothstep,
        update: function (v) {
          f.x = PIL.lerp(x0, gx, v); f.y = PIL.lerp(y0, gy, v);
          PIL.setBillboard(f.el, f.x, f.y, 1, 0);
        },
        done: function () { f.charEl.classList.remove('is-walk'); }
      });
    });
    // Luffy steps to the dock center, gazing up at her
    var px0 = p.x, py0 = p.y;
    var pc = PIL.clampWalkable(14, -15250);
    PIL.tween({
      dur: 0.9, ease: PIL.smoothstep,
      update: function (v) {
        p.x = PIL.lerp(px0, pc.x, v); p.y = PIL.lerp(py0, pc.y, v);
        PIL.setBillboard(p.el, p.x, p.y, 1, 0);
      }
    });

    // each crew member walks to the Merry and hops aboard
    var GATHER = 2100;
    followers.forEach(function (f, i) {
      var at = GATHER + 300 + i * 480;
      setTimeout(function () { self.boardMember(f, at / 1000); }, at);
    });

    // Luffy boards last, to the bow
    setTimeout(function () {
      var spot = self.SPOTS.luffy, x0 = p.x, y0 = p.y;
      PIL.tween({
        dur: 1.15, delay: 0.15, ease: PIL.smoothstep,
        update: function (v) {
          p.x = PIL.lerp(x0, m.x + spot[0], v); p.y = PIL.lerp(y0, m.y + spot[1], v);
          PIL.setBillboard(p.el, p.x, p.y, 1 + Math.max(0, v - 0.7) / 0.3 * 30, 0);
        },
        done: function () {
          p.aboard = true;
          m.el.appendChild(p.el);
          PIL.setBillboard(p.el, spot[0], spot[1], 1, 0);
        }
      });
    }, GATHER + 300 + followers.length * 480 + 250);

    // sail drops, then she glides
    var sailAt = GATHER + 300 + followers.length * 480 + 1900;
    setTimeout(function () {
      var m2 = self.main;
      if (m2.sail) {
        PIL.tween({
          dur: 1.6, ease: PIL.smoothstep,
          update: function (v) { m2.sail.style.transform = 'scaleY(' + (0.22 + 0.78 * v).toFixed(3) + ')'; }
        });
      }
      if (PIL.audio.chime) { try { PIL.audio.chime('board'); } catch (err) {} }
      self.sailing = true;
    }, sailAt);
  },

  boardMember: function (f, at) {
    var m = this.main;
    var spot = this.SPOTS[f.name] || [0, -100];
    var x0 = f.x, y0 = f.y;
    f.charEl.classList.add('is-walk');
    PIL.tween({
      dur: 1.1, ease: PIL.smoothstep,
      update: function (v) {
        f.x = PIL.lerp(x0, m.x + spot[0], v); f.y = PIL.lerp(y0, m.y + spot[1], v);
        PIL.setBillboard(f.el, f.x, f.y, 1 + Math.sin(Math.max(0, v - 0.75) / 0.25 * Math.PI) * 28, 0);
      },
      done: function () {
        f.charEl.classList.remove('is-walk');
        f.aboard = true;
        m.el.appendChild(f.el); // rides the Merry from here on
        PIL.setBillboard(f.el, spot[0], spot[1], 1, 0);
      }
    });
  },

  sail: function (dt, t) {
    var m = this.main, p = PIL.player;
    this.speed = PIL.damp(this.speed, this.fading ? 70 : 190, 0.5, dt);
    m.y -= this.speed * dt;
    var rock = Math.sin(t * 0.85) * 0.010;
    var bob = 1 + Math.sin(t * 1.1) * 2.5;
    // she owns the frame under sail — 18% up, scale riding the billboard transform
    PIL.setBillboardScaled(m.el, m.x, m.y, bob, rock, 1.18);

    // Luffy rides the bow; camera + sky track him
    p.x = m.x + this.SPOTS.luffy[0]; p.y = m.y + this.SPOTS.luffy[1];
    PIL.state.x = p.x; PIL.state.y = p.y;

    // wake ripples at the stern
    this.wakeT -= dt;
    if (this.wakeT <= 0 && !this.fading) {
      this.wakeT = 0.5;
      var w = document.createElement('div');
      w.className = 'wake';
      w.style.left = (m.x + (Math.random() * 40 - 20)).toFixed(1) + 'px';
      w.style.top = (m.y + 195).toFixed(1) + 'px';
      document.getElementById('entities').appendChild(w);
      setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 1900);
    }

    if (!this.fading && m.y < -17500) {
      this.fading = true;
      PIL.audio.intensity = 0.5; // settle the mix as the stars take over
      var fade = document.getElementById('fade');
      fade.style.animation = 'none';
      fade.style.transition = 'opacity 6.5s linear';
      void fade.offsetWidth;
      fade.style.opacity = '0.9'; // stars bleed through the veil a while longer
      var self = this;
      setTimeout(function () {
        PIL.state.phase = 'done';
        PIL.state.locked = false; // keydown now means replay
        fade.style.transition = 'opacity 9s ease-in';
        fade.style.opacity = '1';
      }, 6700);
    }
  },

  replay: function () {
    location.reload();
  }
};
