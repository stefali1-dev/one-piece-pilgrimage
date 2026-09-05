// encounters.js — proximity triggers + wordless join beats; hands NPCs to the convoy.
// Beats: recognition -> gesture exchange -> joining. 2.5-3.2s each, input locked.
window.PIL = window.PIL || {};

PIL.encounters = {
  R2: 240 * 240,
  BYPASS: 340, // can't sneak past a beat by walking wide: passing y triggers it too

  init: function () {
    // The Merry waits at the finale dock (and her promise moors at Syrup harbor)
    PIL.finale.buildMerrys();

    // Chef Zeff watches from the Baratie terrace the whole evening
    var zb = PIL.makeBillboard('', 'npc zeff');
    var zsh = document.createElement('div');
    zsh.className = 'drop-shadow';
    zb.appendChild(zsh);
    var zc = PIL.makeCharacter('zeff');
    zb.appendChild(zc);
    document.getElementById('entities').appendChild(zb);
    PIL.zeff = { el: zb, charEl: zc, x: 300, y: -13930 }; // on his side-deck
    PIL.setBillboard(zb, PIL.zeff.x, PIL.zeff.y, 1, 0);

    // each crew member animates their signature idle while waiting
    var IDLE = { zoro: 'is-stance', nami: 'is-hip', usopp: 'is-aim', sanji: 'is-set' };
    setInterval(function () {
      for (var i = 0; i < PIL.ents.length; i++) {
        var e = PIL.ents[i];
        if (!e.joined && !e.busy && !document.hidden) {
          e.charEl.classList.remove('is-cheer', 'is-point', 'is-wave', 'is-bow', 'is-stance',
            'is-nod', 'is-toss', 'is-hip', 'is-aim', 'is-proud', 'is-set', 'is-flourish');
          void e.charEl.offsetWidth;
          e.charEl.classList.add(IDLE[e.name]);
        }
      }
    }, 4300);
  },

  update: function (dt, t) {
    var p = PIL.player, camY = PIL.cam.y;
    for (var i = 0; i < PIL.ents.length; i++) {
      var e = PIL.ents[i];
      if (!e.joined && !e.busy) {
        var near = PIL.dist2(p.x, p.y, e.x, e.y) < this.R2;
        var passed = p.y < e.y - this.BYPASS;
        if (near || passed) this.run(e);
      }
      // cull far NPCs (state-guarded — write only when crossing)
      if (!e.joined) {
        var vis = Math.abs(e.y - camY) < 2400 ? 'visible' : 'hidden';
        if (e._vis !== vis) { e._vis = vis; e.el.style.visibility = vis; }
      }
    }
    // the Syrup Merry: culled by distance until she casts off — after her
    // journey she has BECOME the dock Merry, so never re-reveal her
    var ms = PIL.finale.merrys[0];
    if (ms && !PIL.finale.departing && !PIL.finale.arrived) {
      var mvis = Math.abs(ms.y - camY) < 2600 ? 'visible' : 'hidden';
      if (ms._vis !== mvis) { ms._vis = mvis; ms.el.style.visibility = mvis; }
    }
    // Chef Zeff watches from the Baratie terrace
    if (PIL.zeff) {
      var zvis = Math.abs(PIL.zeff.y - camY) < 2400 ? 'visible' : 'hidden';
      if (PIL.zeff._vis !== zvis) { PIL.zeff._vis = zvis; PIL.zeff.el.style.visibility = zvis; }
    }
  },

  // ---- helpers ----
  faceEachOther: function (e) {
    var p = PIL.player;
    if (e.x > p.x) e.charEl.classList.add('is-left');
    p.charEl.classList.toggle('is-left', p.x > e.x);
  },
  // Luffy takes a few steps so pairs face ACROSS the depth axis (>=64px lateral);
  // targets clamp into walkable space so nobody ever stages onto open water.
  sidestepTo: function (x, y) {
    var c = PIL.clampWalkable(x, y);
    x = c.x; y = c.y;
    var p = PIL.player, x0 = p.x, y0 = p.y;
    p.charEl.classList.add('is-walk');
    PIL.tween({
      dur: 0.55, ease: PIL.smoothstep,
      update: function (v) {
        p.x = PIL.lerp(x0, x, v); p.y = PIL.lerp(y0, y, v);
        PIL.setBillboard(p.el, p.x, p.y, 1, 0);
      },
      done: function () { p.charEl.classList.remove('is-walk'); }
    });
  },
  gesture: function (charEl, cls, dur) {
    charEl.classList.remove('is-cheer', 'is-point', 'is-wave', 'is-bow', 'is-stance',
      'is-nod', 'is-toss', 'is-hip', 'is-aim', 'is-proud', 'is-set', 'is-flourish', 'is-tear');
    void charEl.offsetWidth;
    charEl.classList.add(cls);
    setTimeout(function () { charEl.classList.remove(cls); }, dur);
  },
  walkTo: function (e, x, y, dur, withWalk) {
    var c = PIL.clampWalkable(x, y);
    x = c.x; y = c.y;
    var x0 = e.x, y0 = e.y;
    if (withWalk) e.charEl.classList.add('is-walk');
    PIL.tween({
      dur: dur, ease: PIL.smoothstep,
      update: function (v) {
        e.x = PIL.lerp(x0, x, v); e.y = PIL.lerp(y0, y, v);
        PIL.setBillboard(e.el, e.x, e.y, 1, 0);
      },
      done: function () { if (withWalk) e.charEl.classList.remove('is-walk'); }
    });
  },
  tossTangerine: function (fromEnt) {
    var p = PIL.player;
    var dot = PIL.makeBillboard('<div class="toss-dot"></div>', 'toss');
    document.getElementById('entities').appendChild(dot);
    var x0 = fromEnt.x + 6, y0 = fromEnt.y - 6;
    PIL.tween({
      dur: 0.7, ease: PIL.smoothstep,
      update: function (v) {
        var z = Math.sin(v * Math.PI) * 46;
        PIL.setBillboard(dot, PIL.lerp(x0, p.x, v), PIL.lerp(y0, p.y - 14, v), 1 + z, 0);
      },
      done: function () { if (dot.parentNode) dot.parentNode.removeChild(dot); }
    });
  },
  finishJoin: function (e) {
    e.joined = true; e.busy = false;
    PIL.audio.intensity = 1;
    if (PIL.audio.chime) { try { PIL.audio.chime('join'); } catch (err) {} }
    PIL.convoy.add(e, e.x, e.y);
    PIL.state.locked = false;
  },

  // ---- beats ----
  run: function (e) {
    e.busy = true;
    PIL.state.locked = true;
    var self = this, p = PIL.player;
    e._hx = e.x; e._hy = e.y;
    this.faceEachOther(e);

    if (e.name === 'zoro') {
      this.sidestepTo(e.x - 76, e.y + 34);
      this.gesture(e.charEl, 'is-stance', 1000);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 800); }, 1500);
      setTimeout(function () { self.gesture(p.charEl, 'is-cheer', 800); }, 1900);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 700); }, 2700); // resting pair
      setTimeout(function () { self.finishJoin(e); }, 3400);

    } else if (e.name === 'nami') {
      this.sidestepTo(e.x + 108, e.y + 36); // clear of the canopy — her hat must read
      this.gesture(e.charEl, 'is-hip', 800);
      setTimeout(function () {
        self.gesture(e.charEl, 'is-toss', 900);
        self.tossTangerine(e);
      }, 900);
      setTimeout(function () { self.gesture(p.charEl, 'is-cheer', 800); }, 1900);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 700); }, 2700);
      setTimeout(function () { self.finishJoin(e); }, 3400);

    } else if (e.name === 'usopp') {
      this.sidestepTo(e.x + 84, e.y + 34);
      this.gesture(e.charEl, 'is-aim', 1000);
      setTimeout(function () { self.gesture(e.charEl, 'is-proud', 900); }, 1100);
      setTimeout(function () { self.gesture(e.charEl, 'is-point', 1100); }, 2000);
      setTimeout(function () { self.gesture(p.charEl, 'is-point', 900); }, 2400);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 700); }, 3300);
      setTimeout(function () { self.finishJoin(e); }, 4000);

    } else if (e.name === 'sanji') {
      this.sidestepTo(e.x - 84, e.y + 36);
      PIL.audio.intensity = 1.25; // warm swell under the farewell
      this.gesture(e.charEl, 'is-set', 1500);
      setTimeout(function () { if (PIL.zeff) self.gesture(PIL.zeff.charEl, 'is-wave', 1700); }, 1300);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 700); }, 1600);
      setTimeout(function () { self.gesture(e.charEl, 'is-flourish', 900); }, 2400);
      setTimeout(function () { if (PIL.zeff) self.gesture(PIL.zeff.charEl, 'is-nod', 1200); }, 2900);
      setTimeout(function () { self.gesture(e.charEl, 'is-nod', 700); }, 3300);
      setTimeout(function () { self.finishJoin(e); }, 4000);
      // the goodbye: as the crew turns north, one tear finds Zeff
      setTimeout(function () {
        if (PIL.zeff) self.gesture(PIL.zeff.charEl, 'is-tear', 2800);
      }, 4700);
    }
  }
};
