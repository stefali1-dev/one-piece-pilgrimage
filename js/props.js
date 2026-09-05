// props.js — V2 zone dioramas: painted silhouettes (PIL.paint), organic ribbons,
// feathered terrain, the rebuilt pier / Baratie / Kaya's mansion / boats / Merry.
//
// CONTRACT (geometry unchanged from V1):
//   PIL.PROPS[zoneId] = HTML string placed inside .zone-<id> (2600px wide;
//   zone-local TOP = NORTH = zone.y1; world x = local left - 1300;
//   world y = zone.y1 + local top). Standing props carry "st" (upright
//   billboard, bottom-center anchored at inline left/top + half width/height).
//   Boats ride inside character billboards; .merry (440x380, bottom-center =
//   waterline) is mounted by finale.js — class names kept intact.
//
// THE WALKABLE CORRIDOR (world coords, joined end to end — no gaps):
//   sugar path   ( 70,-9000) -> (-50,-11600)  core box local 1160/400/300x2640, rot -2.60deg
//                                     south end 1310+sin(2.60)*1320 = 1370 = px0+1300
//                                     north end 1310-sin(2.60)*1320 = 1250 = px1+1300
//   sugar pier   deck local 1150..1350 x -20..480 -> world x -150..+50 (center -50),
//                                     y -12020..-11520; path's north tip (y -11600)
//                                     hides under the pier deck (overlap 80px)
//   baratie walk boardwalk local 1168/1340x224, top -20 h 3040, rot 1.13deg about
//                                     (1280,1500): south tip (-50,-11980) overlaps the
//                                     pier north tip (-50,-12020) by 40px; north tip
//                                     (10,-15020): 1310+1300... = local 1310 -> world 10 = px1
//   finale dock  local 1150..1470 x 2540..3010 -> world x -150..+170 (center 10),
//                                     y -15460..-14990; the walk's north tip (10,-15020)
//                                     sits 30px inside the dock's south end. ONE corridor.
//
// PIL.COLLIDERS — world-coord soft-collision circles (r = push-out radius) for
// every significant standing prop; the director walks players AROUND these.
window.PIL = window.PIL || {};

(function () {
  var P = PIL.paint;

  /* ================================================================
     1 - PAINTED SILHOUETTES (registered at parse time via paint.js)
     Organic multi-vertex Catmull-Rom blobs replace V1 rectangles. All
     control points live inside 0..1 so nothing paints outside its box
     (the V1 "clipped canopy" bug cannot recur: gradients fill the box,
     the clip only carves the organic silhouette).
     ================================================================ */

  // -- winding trail ribbons (~300px boxes; wavy flanks, anchored ends) --
  P.shape('pw-a', [[.20, .999], [.15, .87], [.225, .75], [.145, .63], [.21, .51], [.14, .39], [.205, .27], [.165, .15], [.20, .02],
                    [.80, .02], [.855, .15], [.79, .27], [.86, .39], [.80, .51], [.865, .63], [.785, .75], [.85, .87], [.80, .999]], null, 5);
  P.shape('pw-b', [[.22, .999], [.16, .88], [.23, .76], [.15, .64], [.22, .52], [.145, .40], [.215, .28], [.175, .16], [.21, .02],
                    [.79, .02], [.84, .16], [.775, .28], [.845, .40], [.79, .52], [.855, .64], [.78, .76], [.86, .88], [.81, .999]], null, 5);

  // -- dawn beach: dry-sand crown + wet band, scalloped waterline --
  P.shape('bsand', [[.002, .002], [.45, .001], [.998, .003], [.997, .52], [.94, .66], [.88, .55], [.80, .72], [.71, .58],
                     [.62, .74], [.53, .59], [.44, .73], [.35, .57], [.26, .71], [.17, .56], [.09, .70], [.002, .50]], null, 6);
  P.shape('bwet',  [[.002, .002], [.5, .001], [.998, .002], [.997, .58], [.94, .72], [.88, .61], [.80, .78], [.71, .64],
                     [.62, .80], [.53, .65], [.44, .79], [.35, .63], [.26, .77], [.17, .62], [.09, .76], [.002, .56]], null, 6);

  // -- distant isle hump --
  P.shape('isle-sh', [[.5, .98], [.1, .64], [.22, .24], [.5, .03], [.8, .26], [.93, .66]], null, 6);

  // -- syrup harbor: an open bay whose organic south shore meets the land --
  P.shape('harbor-sh', [[.13, 1.0], [.5, .985], [.87, 1.0], [.985, .66], [.955, .28], [.84, .05], [.5, .01], [.16, .05], [.045, .28], [.015, .66]], null, 7);
  P.shape('shore-sh',  [[.10, 1.0], [.5, .99], [.90, 1.0], [.99, .70], [.97, .30], [.86, .07], [.5, .02], [.14, .07], [.03, .30], [.008, .68]], null, 7);

  // -- grove tree canopies (clip sits on ::so the pot/trunk stay unclipped) --
  P.css('.p-tree::before{content:"";position:absolute;left:0;top:0;width:100%;height:80%;' +
        'background:var(--cnpy);clip-path:' +
        P.polygon([[.30, .10], [.55, .02], [.82, .12], [.96, .38], [.88, .62], [.94, .84], [.68, .96], [.42, .93], [.14, .82], [.04, .55], [.10, .30]], 6) + '}');
  P.css('.p-tree.tvb::before{clip-path:' +
        P.polygon([[.36, .06], [.62, .01], [.88, .16], [.97, .42], [.90, .66], [.72, .90], [.48, .97], [.22, .88], [.05, .62], [.09, .32]], 6) + '}');
  P.css('.p-tree::after{content:"";position:absolute;left:40px;bottom:0;width:92px;height:58px;' +
        'background:linear-gradient(90deg,#7a5a38,#5c4226) 50% 0/12px 34px no-repeat,' +
        'linear-gradient(to bottom,#d67c4e 0 4px,#cd7448 4px 42%,#8e4226) 0 100%/92px 40px no-repeat;' +
        'clip-path:polygon(41% 0,59% 0,59% 30%,95% 30%,80% 100%,20% 100%,5% 30%,41% 30%)}');

  // -- the grand tree (syrup): big lobed canopy + wide trunk --
  P.css('.p-gtree::before{content:"";position:absolute;left:0;top:0;width:100%;height:76%;' +
        'background:var(--gcn);clip-path:' +
        P.polygon([[.28, .12], [.5, .02], [.72, .10], [.93, .22], [.99, .44], [.90, .62], [.97, .82], [.76, .93], [.52, .98], [.28, .92], [.10, .78], [.02, .52], [.08, .28]], 6) + '}');
  P.css('.p-gtree::after{content:"";position:absolute;left:152px;bottom:0;width:56px;height:118px;' +
        'background:linear-gradient(90deg,#6a4c34,#4c3422);' +
        'clip-path:polygon(26% 0,74% 0,100% 100%,0 100%)}');

  // -- village rooftops (flat on the slope) --
  P.shape('v-roof', [[.04, .9], [.5, .98], [.96, .9], [.99, .5], [.72, .14], [.5, .03], [.28, .14], [.01, .5]], null, 5);

  // -- Kaya's mansion roof: hip roof with wide eaves --
  P.shape('ka-roof', [[.06, 1.0], [.5, .94], [.94, 1.0], [.99, .62], [.86, .30], [.62, .10], [.5, .04], [.38, .10], [.14, .30], [.01, .62]], null, 6);

  // -- the Baratie: rounded fish hull + forked tail fin --
  P.shape('br-hull', [[.02, .55], [.10, .30], [.30, .14], [.52, .07], [.74, .10], [.93, .22], [.998, .45], [.99, .68], [.90, .86], [.70, .96], [.48, 1.0], [.26, .97], [.10, .88], [.03, .72]], null, 7);
  P.shape('br-tail', [[.02, .50], [.20, .30], [.06, .04], [.42, .18], [.70, .42], [.98, .06], [.86, .40], [.99, .74], [.68, .64], [.40, .86], [.05, .98], [.18, .72]], null, 6);

  // -- terrace lantern strings (sagging ribbons) --
  P.band('str-1', [[.02, .14], [.3, .44], [.62, .52], [.98, .18]], .11);
  P.band('str-2', [[.02, .22], [.35, .55], [.68, .48], [.98, .10]], .10);

  // -- mooring ropes, pier bollards -> the Merry's gunwale --
  P.band('rope-a', [[.11, .23], [.17, .34], [.25, .42], [.36, .48]], .02);
  P.band('rope-b', [[.11, .69], [.18, .68], [.28, .62], [.38, .55]], .018);

  // -- the Merry's hull: curved sheer, no clipped planks --
  P.shape('m-hull', [[.005, .38], [.06, .14], [.28, .03], [.60, .005], [.86, .04], [.998, .22], [.99, .52], [.90, .80], [.64, .99], [.34, .99], [.12, .86], [.02, .62]], null, 6);

  // -- Luffy's sail: canvas hanging from the yard, curved foot --
  P.shape('b-sail', [[.03, .05], [.5, .02], [.97, .09], [.90, .42], [.83, .72], [.60, .88], [.30, .80], [.05, .50]], null, 5);

  /* ================================================================
     2 - ZONE MARKUP
     ================================================================ */
  PIL.PROPS = {

    // 0 - dawn: layered indigo-rose sea, light pillar at the waterline,
    //    a WIDER painted beach (dry crown / wet band / foam / strand scatter)
    dawn:
      '<div class="wclip">' +
        '<div class="wave-sheet ws-a"></div>' +
        '<div class="wave-sheet ws-b"></div>' +
        '<div class="water-shimmer"></div>' +
      '</div>' +
      '<div class="p-pillar"></div>' +
      '<div class="sparkle sp-a" style="top:820px;height:2500px"></div>' +
      '<div class="sparkle sp-b" style="top:980px;height:2300px"></div>' +
      '<div class="isle isle-sh" style="left:1760px;top:800px"></div>' +
      '<div class="isle isle-sh isle-b" style="left:400px;top:830px"></div>' +
      '<div class="isle isle-sh" style="left:2010px;top:870px;width:120px;height:34px;opacity:0.35"></div>' +
      '<div class="p-drift" style="left:1060px;top:980px"></div>' +
      '<div class="p-drift drift-r" style="left:1600px;top:1120px"></div>' +
      '<div class="p-wet bwet"></div>' +
      '<div class="p-beach bsand"></div>' +
      '<div class="p-foam"></div>' +
      '<div class="p-strand"></div>' +
      '<div class="path-dust"></div>' +
      '<div class="path-core pw-a"></div>',

    // 1 - shells: marine lawn; feathered sand->lawn at the south, painted path,
    //    wall + cap + gate posts + pennant mast + training posts around Zoro
    //    (Zoro at world 170,-4660 = local 1470,1340 — posts keep 100px clear)
    shells:
      '<div class="p-fade" style="top:2720px;height:280px"></div>' +
      '<div class="p-fade f-flip" style="top:2650px;height:300px"></div>' +
      '<div class="p-scat" style="top:2620px;height:380px"></div>' +
      '<div class="path-dust"></div>' +
      '<div class="path-core pw-b"></div>' +
      '<div class="st p-tower" style="left:620px;top:300px"></div>' +
      '<div class="st p-tower tw-s" style="left:2140px;top:280px"></div>' +
      '<div class="p-shadow" style="left:1530px;top:480px;width:440px;height:64px"></div>' +
      '<div class="st p-wall" style="left:1740px;top:420px"></div>' +
      '<div class="p-shadow" style="left:1550px;top:688px;width:110px;height:40px"></div>' +
      '<div class="st p-mast" style="left:1490px;top:430px"></div>' +
      '<div class="st p-crate" style="left:1680px;top:660px"></div>' +
      '<div class="st p-crate cr-s" style="left:1735px;top:742px"></div>' +
      '<div class="st p-gpost" style="left:1270px;top:2380px"></div>' +
      '<div class="st p-gpost gp-e" style="left:1410px;top:2405px"></div>' +
      '<div class="st p-tpost" style="left:1346px;top:1338px"></div>' +
      '<div class="st p-tpost tp-b" style="left:1566px;top:1308px"></div>' +
      '<div class="st p-tpost tp-b" style="left:1376px;top:1188px"></div>' +
      '<div class="st p-tpost" style="left:1526px;top:1178px"></div>' +
      '<div class="p-tuft" style="left:640px;top:1180px"></div>' +
      '<div class="p-tuft" style="left:2130px;top:2080px"></div>' +
      '<div class="p-tuft" style="left:820px;top:2540px"></div>' +
      '<div class="p-tuft" style="left:1760px;top:1620px"></div>',

    // 2 - tangerine: grove rows with painted canopies (nothing clips now),
    //    whitewashed house, Nami's ladder (Nami at local 1120,1580)
    tangerine:
      '<div class="p-scat" style="top:2700px;height:300px"></div>' +
      '<div class="p-scat sc-n" style="top:20px;height:300px"></div>' +
      '<div class="path-dust"></div>' +
      '<div class="path-core pw-a"></div>' +
      '<div class="p-rim"></div>' +
      '<div class="st p-ftree" style="left:640px;top:120px"></div>' +
      '<div class="st p-ftree ft-b" style="left:1000px;top:46px"></div>' +
      '<div class="st p-ftree ft-b" style="left:2130px;top:96px"></div>' +
      '<div class="p-shadow" style="left:990px;top:900px;width:190px;height:60px"></div>' +
      '<div class="p-shadow" style="left:1160px;top:840px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:980px;top:1190px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:1480px;top:840px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:1710px;top:1120px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:990px;top:1780px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:1500px;top:1790px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:1620px;top:1320px;width:180px;height:56px"></div>' +
      '<div class="p-shadow" style="left:1700px;top:1200px;width:230px;height:70px"></div>' +
      '<div class="st p-tree" style="left:970px;top:715px"></div>' +
      '<div class="st p-tree tvb" style="left:1140px;top:655px"></div>' +
      '<div class="st p-tree tvb" style="left:970px;top:1005px"></div>' +
      '<div class="st p-tree tvb" style="left:1460px;top:655px"></div>' +
      '<div class="st p-tree" style="left:1690px;top:935px"></div>' +
      '<div class="st p-tree tvb" style="left:980px;top:1595px"></div>' +
      '<div class="st p-tree" style="left:1490px;top:1605px"></div>' +
      '<div class="st p-tree tvb" style="left:1610px;top:1135px"></div>' +
      '<div class="st p-house" style="left:1690px;top:980px"></div>' +
      '<div class="st p-ladder" style="left:1068px;top:1652px"></div>' +
      '<div class="p-tuft" style="left:600px;top:1200px"></div>' +
      '<div class="p-tuft" style="left:2100px;top:1600px"></div>' +
      '<div class="p-tuft" style="left:760px;top:2300px"></div>',

    // 3 - syrup: golden-hour slope; organic harbor + CURVED PIER with pilings,
    //    bollards and rope moorings to the Merry (150,-11720 = local 1450,280),
    //    Kaya's mansion on the east hill above Usopp (local 1120,1500)
    syrup:
      '<div class="p-scat" style="top:150px;height:520px"></div>' +
      '<div class="path-dust"></div>' +
      '<div class="path-core pw-b"></div>' +
      '<div class="p-rim p-rim-w"></div>' +
      '<div class="p-rim p-rim-e"></div>' +
      '<div class="st p-ftree" style="left:280px;top:100px"></div>' +
      '<div class="st p-ftree ft-b" style="left:2300px;top:80px"></div>' +
      '<div class="p-shore shore-sh"></div>' +
      '<div class="p-harbor harbor-sh"><div class="wave-sheet ws-b"></div></div>' +
      '<div class="p-foamh"></div>' +
      '<div class="p-hglint"></div>' +
      '<div class="sparkle sp-a" style="top:60px;height:400px"></div>' +
      '<div class="p-sdock-halo"></div>' +
      '<div class="p-sdock"></div>' +
      '<div class="p-rings" style="left:1100px;top:60px;width:340px;height:460px"></div>' +
      '<div class="st p-pile" style="left:1139px;top:188px"></div>' +
      '<div class="st p-pile" style="left:1379px;top:218px"></div>' +
      '<div class="st p-pile" style="left:1139px;top:388px"></div>' +
      '<div class="st p-pile" style="left:1379px;top:413px"></div>' +
      '<div class="st p-bollard" style="left:1180px;top:120px"></div>' +
      '<div class="st p-bollard" style="left:1182px;top:330px"></div>' +
      '<div class="st p-ropes"><div class="rope rope-a"></div><div class="rope rope-b"></div></div>' +
      '<div class="p-glong" style="left:1060px;top:860px;width:420px;height:64px;transform:rotate(-4deg)"></div>' +
      '<div class="p-glong" style="left:1240px;top:1480px;width:760px;height:78px;transform:rotate(-14deg)"></div>' +
      '<div class="p-glong" style="left:820px;top:1980px;width:560px;height:60px;transform:rotate(-8deg)"></div>' +
      '<div class="p-shadow" style="left:770px;top:900px;width:330px;height:70px;transform:rotate(-4deg)"></div>' +
      '<div class="st p-gtree" style="left:740px;top:560px"></div>' +
      '<div class="p-dapple" style="left:900px;top:1050px;width:420px;height:260px"></div>' +
      '<div class="p-glong" style="left:1660px;top:1560px;width:640px;height:74px;transform:rotate(-11deg)"></div>' +
      '<div class="st p-mansion" style="left:1700px;top:1200px">' +
        '<div class="ka-chim"></div>' +
        '<div class="ka-wall"></div>' +
        '<div class="ka-roof"></div>' +
        '<div class="ka-balc"></div>' +
        '<div class="ka-kaya"></div>' +
      '</div>' +
      '<div class="p-roof v-roof" style="left:1850px;top:2350px;width:150px;height:90px"></div>' +
      '<div class="p-roof v-roof" style="left:2050px;top:2455px;width:130px;height:80px"></div>' +
      '<div class="p-roof v-roof" style="left:1720px;top:2565px;width:140px;height:84px"></div>' +
      '<div class="p-rock" style="left:620px;top:1500px;width:90px;height:44px"></div>' +
      '<div class="p-rock" style="left:2260px;top:1100px;width:70px;height:36px"></div>' +
      '<div class="p-tuft" style="left:520px;top:900px"></div>' +
      '<div class="p-tuft" style="left:2140px;top:1900px"></div>',

    // 4 - baratie: dusk teal water, the plank boardwalk IS the path; the
    //    restaurant hero stands east (prop 940x560 at local 1500,850 ->
    //    terrace SW corner = local 1650,1150 = world 350,-13850 where Zeff
    //    spawns). Sanji idles at world -120,-13600 = local 1180,1400, on the
    //    walk's west rail.
    baratie:
      '<div class="wclip">' +
        '<div class="wave-sheet ws-a"></div>' +
        '<div class="wave-sheet ws-b"></div>' +
        '<div class="water-shimmer"></div>' +
      '</div>' +
      '<div class="p-fade f-flip fb-w" style="top:0;height:220px"></div>' +
      '<div class="sparkle sp-a" style="top:0;height:3000px"></div>' +
      '<div class="sparkle sp-b" style="top:200px;height:2800px"></div>' +
      '<div class="p-walk-halo"></div>' +
      '<div class="p-boardwalk"></div>' +
      '<div class="p-brrefl" style="left:1560px;top:1390px"></div>' +
      '<div class="st p-baratie" style="left:1500px;top:850px">' +
        '<div class="br-tail"></div>' +
        '<div class="br-hull"></div>' +
        '<div class="br-ports"></div>' +
        '<div class="br-terrace"></div>' +
        '<div class="br-str str-1"></div>' +
        '<div class="br-str str-2"></div>' +
        '<div class="br-mast"></div>' +
      '</div>' +
      '<div class="br-zeff-spot" style="left:1650px;top:1150px"></div>' +
      // Zeff's side-deck: a small plank landing on piles jutting from the
      // restaurant toward the walk — he stands ON this, never on open water
      '<div class="zeff-deck" style="left:1500px;top:1010px"></div>' +
      '<div class="p-glow" style="left:1127px;top:640px"></div>' +
      '<div class="st p-lantern" style="left:1169px;top:540px"></div>' +
      '<div class="p-glow" style="left:1335px;top:1600px"></div>' +
      '<div class="st p-lantern ln-e" style="left:1377px;top:1500px"></div>' +
      '<div class="p-glow" style="left:1089px;top:2480px"></div>' +
      '<div class="st p-lantern" style="left:1131px;top:2380px"></div>' +
      '<div class="st p-bpost" style="left:1391px;top:954px"></div>' +
      '<div class="st p-bpost" style="left:1160px;top:1954px"></div>',

    // 5 - finale: silver-indigo night; moonglint column, quiet dock joined to
    //    the boardwalk (dock local 1150..1470 x 2540..3010; Merry at 10,-15750)
    finale:
      '<div class="wclip">' +
        '<div class="wave-sheet ws-a"></div>' +
        '<div class="wave-sheet ws-b"></div>' +
        '<div class="water-shimmer"></div>' +
      '</div>' +
      '<div class="p-fade f-flip fb-n" style="top:0;height:200px"></div>' +
      '<div class="sparkle sp-a" style="top:0;height:2900px"></div>' +
      '<div class="sparkle sp-b" style="top:100px;height:2900px"></div>' +
      '<div class="p-moonglint"></div>' +
      '<div class="p-rock" style="left:480px;top:320px;width:120px;height:52px"></div>' +
      '<div class="p-rock" style="left:2180px;top:520px;width:90px;height:42px"></div>' +
      '<div class="p-fdock-halo"></div>' +
      '<div class="p-fdock"></div>' +
      '<div class="p-rings" style="left:1100px;top:2500px;width:380px;height:540px"></div>' +
      '<div class="st p-pile" style="left:1159px;top:2548px"></div>' +
      '<div class="st p-pile" style="left:1441px;top:2568px"></div>' +
      '<div class="st p-pile" style="left:1159px;top:2908px"></div>' +
      '<div class="st p-bollard" style="left:1196px;top:2560px"></div>' +
      '<div class="st p-bollard" style="left:1392px;top:2560px"></div>' +
      '<div class="p-glow" style="left:1117px;top:2710px"></div>' +
      '<div class="st p-lantern" style="left:1159px;top:2610px"></div>' +
      '<div class="p-glow" style="left:1393px;top:2770px"></div>' +
      '<div class="st p-lantern ln-e" style="left:1435px;top:2670px"></div>',

    // Luffy's dinghy: clear rig — mast + YARD spar + cream sail with seams
    // and a patch, stern lantern glowing at dawn. Bow faces west.
    playerBoat:
      '<div class="boat">' +
        '<div class="boat-hull"></div>' +
        '<div class="boat-mast"></div>' +
        '<div class="boat-yard"></div>' +
        '<div class="boat-sail b-sail"></div>' +
      '</div>',

    // the boat left behind on the beach (same art, beached lean, slack sail)
    beachedBoat:
      '<div class="boat beached">' +
        '<div class="boat-hull"></div>' +
        '<div class="boat-mast"></div>' +
        '<div class="boat-yard"></div>' +
        '<div class="boat-sail b-sail"></div>' +
      '</div>',

    // the Going Merry — hero billboard, 440x380, bottom-center = waterline.
    // finale.js drives .merry-sail (scaleY unfurl), .merry-pennant (flutter)
    // and the .merry-crew-dot anchors. Sugar's copy leans against the quay
    // via .merry-syrup .merry { rotateZ } — markup identical for both.
    merry:
      '<div class="merry">' +
        '<div class="merry-deck"></div>' +
        '<div class="merry-hull m-hull"></div>' +
        '<div class="merry-mast"></div>' +
        '<div class="merry-yard"></div>' +
        '<div class="merry-sail"></div>' +
        '<div class="merry-pennant"></div>' +
        '<div class="merry-sheep"></div>' +
        '<div class="merry-cabin"></div>' +
        '<div class="merry-glow"></div>' +
        '<div class="merry-crew-dot" style="left:96px;top:258px"></div>' +
        '<div class="merry-crew-dot" style="left:128px;top:264px"></div>' +
        '<div class="merry-crew-dot" style="left:160px;top:256px"></div>' +
        '<div class="merry-crew-dot" style="left:240px;top:262px"></div>' +
        '<div class="merry-crew-dot" style="left:276px;top:256px"></div>' +
      '</div>'
  };

  /* ================================================================
     3 - SOFT COLLISION CIRCLES (world coords) — 44 total.
     Every significant standing prop; NPC beat spots verified clear:
     zoro (170,-4660) nearest post 114px, nami (-180,-7420) nearest tree
     236px, usopp (-180,-10500) 870px from the mansion, sanji
     (-120,-13600) 524px from the hull, zeff spot (350,-13850) 136px
     from the nearest hull circle (spawns outside it).
     ================================================================ */
  PIL.COLLIDERS = [
    // shells - marine base
    { x: -630, y: -5480, r: 42 }, { x: 890, y: -5500, r: 38 },      // distant towers
    { x: 545, y: -5470, r: 55 }, { x: 755, y: -5470, r: 55 },       // wall halves
    { x: 300, y: -5270, r: 28 },                                    // pennant mast
    { x: 414, y: -5282, r: 40 },                                    // crate stack
    { x: 60, y: -4590, r: 24 }, { x: 280, y: -4620, r: 24 },        // training posts
    { x: 90, y: -4740, r: 24 }, { x: 240, y: -4750, r: 24 },
    // tangerine - grove
    { x: -245, y: -8070, r: 36 }, { x: -75, y: -8130, r: 36 },      // tree rows
    { x: -245, y: -7780, r: 36 }, { x: 245, y: -8130, r: 36 },
    { x: 475, y: -7850, r: 36 }, { x: -235, y: -7190, r: 36 },
    { x: 275, y: -7180, r: 36 }, { x: 395, y: -7650, r: 36 },
    { x: 525, y: -7770, r: 66 },                                    // whitewashed house
    { x: -209, y: -7208, r: 18 },                                   // Nami's ladder
    // syrup - slope + pier (world = local x-1300, y -12000+top)
    { x: -380, y: -11060, r: 60 },                                  // grand tree
    { x: 400, y: -10800, r: 70 },                                   // Kaya's mansion
    { x: 150, y: -10620, r: 20 },                                   // Usopp (don't walk through him)
    { x: -120, y: -11880, r: 20 }, { x: -118, y: -11670, r: 20 },   // pier bollards
    { x: -161, y: -11612, r: 22 }, { x: 79, y: -11587, r: 22 },     // pier pilings
    { x: -590, y: -10456, r: 30 }, { x: 960, y: -10864, r: 26 },    // meadow rocks
    // baratie - boardwalk furniture + the hull as three circles
    // (world = local x-1300, y -15000+top — verified against markup)
    { x: -131, y: -14460, r: 20 },                                  // lantern W
    { x: 77, y: -13500, r: 20 },                                    // lantern E
    { x: -169, y: -12620, r: 20 },                                  // lantern W south
    { x: 91, y: -14046, r: 16 }, { x: -140, y: -13046, r: 16 },     // mooring posts
    { x: 300, y: -13930, r: 24 },                                   // Zeff on his deck
    { x: 390, y: -13720, r: 66 }, { x: 575, y: -13660, r: 66 },     // hull S/M/N
    { x: 750, y: -13740, r: 66 },
    // finale - night dock (world = local x-1300, y -18000+top)
    { x: -141, y: -15390, r: 20 }, { x: 135, y: -15330, r: 20 },    // dock lanterns
    { x: -104, y: -15440, r: 18 }, { x: 92, y: -15440, r: 18 },     // bollards
    { x: -141, y: -15452, r: 24 }, { x: 141, y: -15432, r: 24 },    // pilings
    { x: -141, y: -15092, r: 24 }
  ];
})();
