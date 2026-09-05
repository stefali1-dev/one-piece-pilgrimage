// characters.js — V2 rig factory + parse-time paint registrations (rig specialist).
//
// CONTRACT (unchanged from the engine):
//   PIL.makeCharacter(name) -> div.char.char-<name>, innerHTML from PIL.RIGS[name].
//   Base states: is-walk (walk cycle), is-left (scaleX(-1) mirror on .rig).
//   Gestures — luffy: is-cheer, is-point · zoro: is-stance, is-nod ·
//     nami: is-toss, is-hip · usopp: is-aim, is-proud, is-point ·
//     sanji: is-set, is-nod, is-flourish · zeff: is-nod, is-wave, is-tear.
//   (is-nod is additionally defined for EVERY rig — encounter beats call it on
//    nami and usopp as a resting close; zeff's is a deeper, slower bow.)
//
// Rig structure: .char (engine-owned) > .rig (flip ONLY, never animated)
//   > .fig (bob / breathe / full-body gestures) > legs + .upper (bow group:
//   far arm, torso, hip gear, .headw, near arm) + fig-level hand props.
//   .headw groups head + headgear (hair, hats, bandana, nose, goatee, tear)
//   so nods and head tilts carry everything above the neck.
//
// V2 LOOK — every major mass is a painted Catmull-Rom silhouette generated at
// parse time via PIL.paint.shape (heads, hair, torsos, hat, skirt, nose,
// goatee) or PIL.paint.band (ribbons: neckerchief, straps); limbs stay
// gradient cylinders. LAW: painted parts are CHILDLESS — clip-path clips
// descendants, so detail on a painted part lives in ::before/::after kept
// inside its silhouette, and anything that must overflow is a sibling.
// Proportions are genuinely different per character (see characters.css):
// slim Luffy, broad Zoro, slim Nami, lanky Usopp, straight Sanji, barrel Zeff.
// No text, no emoji, no images. Nothing that animates carries a filter,
// blur or box-shadow.

window.PIL = window.PIL || {};

(function () {
  var P = PIL.paint, S = P.shape, B = P.band, C = P.css;

  /* ================= LUFFY — straw hat, open red vest, blue shorts ========= */
  S('lf-hair', [[.03,.6],[.12,.2],[.3,.04],[.45,.2],[.58,.02],[.75,.15],[.92,.06],[1,.5],[.87,.9],[.66,.68],[.5,.94],[.32,.66],[.13,.96]]);
  S('lf-head', [[.09,.35],[.27,.05],[.73,.05],[.91,.35],[.87,.72],[.52,.98],[.15,.73]]);
  S('lf-brim', [[.02,.5],[.15,.15],[.5,.03],[.85,.15],[.98,.5],[.85,.85],[.5,.97],[.15,.85]]);
  S('lf-crown', [[.08,.92],[.05,.5],[.14,.18],[.5,.02],[.86,.18],[.95,.5],[.92,.92]]);
  S('lf-vest', [[.06,.1],[.5,.02],[.94,.1],[.99,.44],[.89,.72],[.93,.99],[.5,1],[.07,.99],[.11,.72],[.01,.44]]);

  /* ================= ZORO — cropped green hair, bandana at neck, 3 swords == */
  S('zo-head', [[.08,.3],[.28,.04],[.72,.04],[.92,.3],[.9,.66],[.66,.97],[.34,.97],[.1,.66]]);
  S('zo-hair', [[.05,.5],[.13,.18],[.38,.03],[.62,.03],[.87,.18],[.95,.5],[.94,.96],[.72,.56],[.5,.62],[.28,.56],[.06,.96]]);
  S('zo-torso', [[.04,.05],[.5,0],[.96,.05],[1,.4],[.93,.72],[.86,1],[.5,1],[.14,1],[.07,.72],[0,.4]]);
  B('zo-band', [[.04,.5],[.5,.32],[.96,.5]], .34);

  /* ================= NAMI — orange hair to the shoulders, mini-skirt ====== */
  S('na-hair', [[.2,.12],[.38,.02],[.62,.02],[.8,.1],[.94,.3],[.99,.55],[1,.8],[.91,.98],[.78,.8],[.72,.55],[.28,.55],[.22,.8],[.09,.98],[0,.8],[.02,.5],[.06,.28]]);
  S('na-head', [[.12,.3],[.33,.04],[.67,.04],[.88,.3],[.9,.68],[.5,.98],[.1,.68]]);
  S('na-torso', [[.16,.05],[.5,0],[.84,.05],[.97,.35],[.8,.6],[.9,.98],[.5,1],[.1,.98],[.2,.6],[.03,.35]]);
  S('na-skirt', [[.14,.04],[.86,.04],[.99,.86],[.84,.98],[.62,.9],[.5,.96],[.38,.9],[.16,.98],[.01,.86]]);

  /* ================= USOPP — curls under the bandana, THE NOSE, overalls === */
  /* hair = black curls peeking at the SIDES below the bandana line */
  S('us-hair', [[.04,.3],[.1,.66],[.02,.9],[.16,.74],[.2,.98],[.32,.8],[.36,.99],[.5,.82],[.64,.99],[.68,.8],[.8,.98],[.84,.74],[.98,.9],[.9,.66],[.96,.3],[.84,.12],[.6,.04],[.36,.04],[.14,.12]]);
  S('us-head', [[.1,.3],[.3,.05],[.7,.05],[.9,.3],[.9,.7],[.66,.96],[.34,.96],[.1,.7]]);
  /* bandana = the olive plaid cap that owns the top of the head, knot at back */
  S('us-band', [[.06,.62],[.02,.3],[.16,.08],[.4,0],[.66,.04],[.9,.14],[.98,.4],[.94,.66],[.8,.5],[.6,.42],[.4,.44],[.2,.5]]);
  /* nose = tapered, gentle droop, rounded tip — reads Pinocchio, not a stick */
  S('us-nose', [[.02,.38],[.2,.14],[.52,.04],[.8,.1],[.97,.3],[1,.55],[.9,.78],[.6,.9],[.3,.84],[.08,.66]]);
  S('us-torso', [[.2,.06],[.5,0],[.8,.06],[.92,.35],[.85,.68],[.9,.98],[.5,1],[.1,.98],[.15,.68],[.08,.35]]);
  /* one-shoulder overall bib (khaki) + satchel ribbon (dark) — pseudo clip
     paths on the painted torso, drawn INSIDE its silhouette */
  C('.char-usopp .torso::before{content:"";position:absolute;left:0;top:0;width:100%;height:100%;'
    + 'background:linear-gradient(100deg,#b1a266,#8f8450);'
    + 'clip-path:' + P.polygon([[.55,.02],[.8,.04],[.73,.42],[.7,1],[.3,1],[.3,.46]], 3) + ';}');
  C('.char-usopp .torso::after{content:"";position:absolute;left:0;top:0;width:100%;height:100%;'
    + 'background:linear-gradient(90deg,#4e3c28,#6a5438);'
    + 'clip-path:' + P.ribbon([[.84,.08],[.5,.5],[.16,.9]], .06) + ';}');

  /* ================= SANJI — blond fringe over one eye, black suit ======== */
  S('sa-hair', [[.3,.06],[.55,0],[.8,.04],[.96,.22],[.99,.46],[.9,.4],[.88,.66],[.8,.52],[.72,.88],[.58,.98],[.46,.78],[.36,.95],[.22,.68],[.1,.8],[.02,.5],[.1,.22]]);
  S('sa-head', [[.12,.28],[.33,.04],[.67,.04],[.88,.28],[.9,.66],[.5,.97],[.1,.66]]);
  S('sa-torso', [[.08,.06],[.5,0],[.92,.06],[.97,.45],[.94,.97],[.5,1],[.06,.97],[.03,.45]]);

  /* ================= ZEFF — long blond hair, chef whites, peg leg ========= */
  S('ze-hair', [[.22,.1],[.36,.02],[.5,.08],[.64,.02],[.78,.1],[.9,.3],[.96,.55],[.98,.85],[.9,.98],[.8,.84],[.74,.6],[.66,.9],[.6,.7],[.4,.7],[.34,.9],[.26,.6],[.2,.84],[.1,.98],[.02,.85],[.04,.5],[.1,.28]]);
  S('ze-head', [[.1,.26],[.3,.04],[.7,.04],[.9,.26],[.92,.62],[.68,.96],[.32,.96],[.08,.62]]);
  S('ze-torso', [[.05,.12],[.3,.02],[.7,.02],[.95,.12],[1,.45],[.95,.78],[.84,1],[.5,1],[.16,1],[.05,.78],[0,.45]]);
  S('ze-beard', [[.18,.02],[.82,.02],[.96,.4],[.78,.95],[.5,.78],[.22,.95],[.04,.4]]);
})();

/* ---------------------------------------------------------------------------
   RIG MARKUP — leaf budget <= 22 per character (pseudo-elements are free).
   luffy 9 · zoro 11 · nami 9 · usopp 12 · sanji 9 · zeff 9.
   --------------------------------------------------------------------------- */
PIL.RIGS = {

  luffy:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso lf-vest"></div>' +
        '<div class="headw">' +
          '<div class="part lf-hair"></div>' +
          '<div class="part head lf-head"></div>' +
          '<div class="part lf-brim"></div>' +
          '<div class="part lf-crown"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
    '</div></div>',

  zoro:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso zo-torso"></div>' +
        '<div class="part zo-sw1"></div><div class="part zo-sw2"></div>' +
        '<div class="headw">' +
          '<div class="part head zo-head"></div>' +
          '<div class="part zo-band"></div><div class="part zo-tail"></div>' +
          '<div class="part zo-hair"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
    '</div></div>',

  nami:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso na-torso"></div>' +
        '<div class="part na-skirt"></div>' +
        '<div class="headw">' +
          '<div class="part na-hair"></div>' +
          '<div class="part head na-head"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
      '<div class="part na-tang"></div>' +
    '</div></div>',

  usopp:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso us-torso"></div>' +
        '<div class="headw">' +
          '<div class="part us-hair"></div>' +
          '<div class="part head us-head"></div>' +
          '<div class="part us-band"></div>' +
          '<div class="part us-nose"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
      '<div class="part us-sling"><div class="sling-band"></div></div>' +
    '</div></div>',

  sanji:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso sa-torso"></div>' +
        '<div class="headw">' +
          '<div class="part head sa-head"></div>' +
          '<div class="part sa-hair"></div>' +
          '<div class="part sa-cig"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
      '<div class="part sa-tray"></div>' +
    '</div></div>',

  zeff:
    '<div class="rig"><div class="fig">' +
      '<div class="part leg leg-a"></div><div class="part leg leg-b"></div>' +
      '<div class="upper">' +
        '<div class="part arm arm-a"></div>' +
        '<div class="part torso ze-torso"></div>' +
        '<div class="headw">' +
          '<div class="part ze-hair"></div>' +
          '<div class="part head ze-head"></div>' +
          '<div class="part ze-beard"></div>' +
          '<div class="part ze-tear"></div>' +
        '</div>' +
        '<div class="part arm arm-b"></div>' +
      '</div>' +
    '</div></div>'
};

PIL.makeCharacter = function (name) {
  var el = document.createElement('div');
  el.className = 'char char-' + name;
  el.innerHTML = PIL.RIGS[name];
  return el;
};
