(() => {
  const $ = (sel) => document.querySelector(sel);
  const screens = {
    menu: $("#menuScreen"),
    game: $("#gameScreen"),
    complete: $("#completeScreen"),
  };

  const TOTAL_LEVELS = 50;
  const PROGRESS_KEY = "spotdiff_progress_v1";
  const state = {
    levelIndex: 0,
    found: new Set(),
    hintsLeft: 3,
    soundOn: true,
    audioCtx: null,
    levelCompleted: false,
    navLock: false,
  };

  function loadProgress() {
    try {
      const n = parseInt(localStorage.getItem(PROGRESS_KEY) || "0", 10);
      return Number.isFinite(n) ? clamp(n, 0, TOTAL_LEVELS - 1) : 0;
    } catch (_) { return 0; }
  }
  function saveProgress(idx) {
    try { localStorage.setItem(PROGRESS_KEY, String(clamp(idx, 0, TOTAL_LEVELS - 1))); } catch (_) {}
  }

  // ---------- Helpers ----------
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function pctX(px) { return (px / 800) * 100; }
  function pctY(py) { return (py / 600) * 100; }
  function seeded(n) {
    // deterministic pseudo-random in [0,1)
    const x = Math.sin(n * 9999.123 + 77.7) * 10000;
    return x - Math.floor(x);
  }
  function pickN(arr, n, seedBase) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(seeded(seedBase + i * 13.37) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  function difficultyFor(levelNum) {
    const stage = Math.ceil(levelNum / 5); // 1..10
    const count = levelNum <= 30 ? 5 : 6; // increases after 30 (every 10-level block progression)
    let hints = 3;
    if (levelNum >= 41) hints = 1;
    else if (levelNum >= 21) hints = 2;
    const rScale = clamp(1 - (stage - 1) * 0.045, 0.62, 1); // tighter every 5 levels
    let label = "Kolay";
    if (stage >= 9) label = "Uzman";
    else if (stage >= 7) label = "Zor";
    else if (stage >= 4) label = "Orta";
    return { count, hints, rScale, label, stage };
  }

  // ---------- SVG primitives ----------
  function svgEl(tag, attrs = {}, children = []) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      el.setAttribute(k, String(v));
    }
    children.forEach((c) => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return el;
  }
  function baseSvg(defsContent = "") {
    const svg = svgEl("svg", { viewBox: "0 0 800 600", xmlns: "http://www.w3.org/2000/svg", role: "img", "shape-rendering": "geometricPrecision" });
    if (defsContent) {
      const defs = svgEl("defs");
      defs.innerHTML = defsContent;
      svg.appendChild(defs);
    }
    return svg;
  }
  function add(svg, el) { if (el) svg.appendChild(el); return el; }
  function g(children = [], attrs = {}) { const el = svgEl("g", attrs); children.forEach(c => c && el.appendChild(c)); return el; }

  // ---------- Scene definitions ----------
  // Each scene provides: key,name, pool[], render(side, activeIds)
  // pool item: {id,label,x,y,baseR,subtle?} coordinates in percent

  function sceneHome() {
    const pool = [
      { id: "clock", label: "Saatin akrep-yelkovanı farklı", x: pctX(400), y: pctY(110), baseR: 6.2 },
      { id: "plant", label: "Bitkinin yapra�xı farklı", x: pctX(105), y: pctY(225), baseR: 5.8 },
      { id: "cushion", label: "Yastık deseni farklı", x: pctX(330), y: pctY(350), baseR: 6.4 },
      { id: "lamp", label: "Lambanın ı�xık rengi farklı", x: pctX(663), y: pctY(300), baseR: 7.0 },
      { id: "book", label: "Sehpadaki kitap rengi farklı", x: pctX(505), y: pctY(447), baseR: 5.8 },
      { id: "frame", label: "Duvardaki tablo detayı farklı", x: pctX(195), y: pctY(130), baseR: 6.0 },
      { id: "vase", label: "Penceredeki saksı rengi farklı", x: pctX(610), y: pctY(255), baseR: 5.2 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f7efe3"/><stop offset="100%" stop-color="#efe2cf"/></linearGradient>
        <linearGradient id="floor2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#c89f7a"/><stop offset="100%" stop-color="#b7835a"/></linearGradient>
        <filter id="soft2" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#4a3422" flood-opacity="0.16"/></filter>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:430,fill:"url(#wall)"}));
      add(svg, svgEl("rect",{x:0,y:430,width:800,height:170,fill:"url(#floor2)"}));
      for(let i=0;i<12;i++) add(svg, svgEl("rect",{x:i*70,y:430,width:2,height:170,fill:"rgba(80,50,20,0.08)"}));
      // window
      add(svg, svgEl("rect",{x:560,y:70,width:180,height:220,rx:16,fill:"#b9dff3",stroke:"#e8f6ff","stroke-width":10}));
      add(svg, svgEl("line",{x1:650,y1:70,x2:650,y2:290,stroke:"#e8f6ff","stroke-width":8}));
      add(svg, svgEl("line",{x1:560,y1:180,x2:740,y2:180,stroke:"#e8f6ff","stroke-width":8}));
      add(svg, svgEl("circle",{cx:700,cy:110,r:24,fill:"#ffd166",opacity:0.9}));
      // vase on windowsill (diff)
      add(svg, svgEl("rect",{x:575,y:235,width:150,height:45,rx:8,fill:"#8ab17d",opacity:0.45}));
      add(svg, svgEl("rect",{x:598,y:220,width:24,height:22,rx:4,fill: alt("vase")?"#6d597a":"#2a9d8f"}));
      add(svg, svgEl("circle",{cx:610,cy:214,r:8,fill:"#ffcad4"}));
      add(svg, svgEl("circle",{cx:618,cy:210,r:6,fill:"#f4acb7"}));
      // curtains
      add(svg, svgEl("path",{d:"M540 60 Q560 120 540 300 L575 300 Q590 180 575 60 Z",fill:"#d96c75",opacity:0.85}));
      add(svg, svgEl("path",{d:"M760 60 Q740 120 760 300 L725 300 Q710 180 725 60 Z",fill:"#d96c75",opacity:0.85}));
      // rug
      add(svg, svgEl("ellipse",{cx:420,cy:520,rx:250,ry:55,fill:"#e9d8a6",filter:"url(#soft2)"}));
      add(svg, svgEl("ellipse",{cx:420,cy:520,rx:210,ry:38,fill:"none",stroke:"#d4a373","stroke-width":4}));
      // sofa
      add(svg, svgEl("rect",{x:210,y:300,width:360,height:130,rx:28,fill:"#6d8b74"}));
      add(svg, svgEl("rect",{x:180,y:330,width:60,height:110,rx:22,fill:"#5f7a66"}));
      add(svg, svgEl("rect",{x:540,y:330,width:60,height:110,rx:22,fill:"#5f7a66"}));
      add(svg, svgEl("rect",{x:240,y:250,width:300,height:80,rx:24,fill:"#7a9a82"}));
      // cushion (diff)
      add(svg, svgEl("rect",{x:285,y:315,width:90,height:70,rx:16,fill:"#f4e285"}));
      if (!alt("cushion")) {
        add(svg, svgEl("circle",{cx:330,cy:350,r:10,fill:"#e76f51"}));
        add(svg, svgEl("circle",{cx:305,cy:335,r:6,fill:"#e76f51",opacity:0.7}));
        add(svg, svgEl("circle",{cx:355,cy:365,r:6,fill:"#e76f51",opacity:0.7}));
      } else {
        add(svg, svgEl("path",{d:"M300 330 L360 370 M360 330 L300 370",stroke:"#2a9d8f","stroke-width":6,"stroke-linecap":"round"}));
      }
      add(svg, svgEl("rect",{x:410,y:315,width:90,height:70,rx:16,fill:"#f7c59f"}));
      // coffee table
      add(svg, svgEl("ellipse",{cx:420,cy:470,rx:150,ry:36,fill:"#d8b48a",filter:"url(#soft2)"}));
      add(svg, svgEl("ellipse",{cx:420,cy:463,rx:150,ry:36,fill:"#e6c79c"}));
      add(svg, svgEl("rect",{x:330,y:492,width:16,height:55,rx:8,fill:"#9c7448"}));
      add(svg, svgEl("rect",{x:494,y:492,width:16,height:55,rx:8,fill:"#9c7448"}));
      // book (diff)
      const bookColor = alt("book") ? "#bc4749" : "#457b9d";
      add(svg, svgEl("rect",{x:470,y:438,width:70,height:18,rx:4,fill:bookColor}));
      add(svg, svgEl("rect",{x:476,y:442,width:56,height:3,rx:2,fill:"rgba(255,255,255,0.6)"}));
      add(svg, svgEl("rect",{x:430,y:420,width:58,height:16,rx:4,fill:"#84a59d",transform:"rotate(-8 459 428)"}));
      // plant (diff)
      add(svg, svgEl("rect",{x:90,y:360,width:60,height:70,rx:10,fill:"#c97c5d"}));
      add(svg, svgEl("rect",{x:82,y:348,width:76,height:18,rx:8,fill:"#b5654b"}));
      add(svg, svgEl("path",{d:"M120 348 C120 300, 95 280, 85 250",stroke:"#588157","stroke-width":6,fill:"none"}));
      add(svg, svgEl("ellipse",{cx:85,cy:245,rx:18,ry:10,fill:"#6a994e",transform:"rotate(-20 85 245)"}));
      add(svg, svgEl("ellipse",{cx:120,cy:270,rx:20,ry:11,fill:"#7ab35b",transform:"rotate(15 120 270)"}));
      add(svg, svgEl("ellipse",{cx:145,cy:250,rx:18,ry:10,fill:"#6a994e",transform:"rotate(35 145 250)"}));
      if (alt("plant")) add(svg, svgEl("ellipse",{cx:105,cy:225,rx:16,ry:9,fill:"#90be6d",transform:"rotate(-5 105 225)"}));
      // lamp (diff)
      add(svg, svgEl("rect",{x:655,y:360,width:16,height:110,rx:8,fill:"#8d99ae"}));
      add(svg, svgEl("ellipse",{cx:663,cy:470,rx:34,ry:10,fill:"#6c757d"}));
      const glow = alt("lamp") ? "#a0e7ff" : "#ffe08a";
      add(svg, svgEl("path",{d:"M610 250 L716 250 L690 360 L636 360 Z",fill:"#edf2f4",stroke:"#d9e2ec"}));
      add(svg, svgEl("ellipse",{cx:663,cy:250,rx:53,ry:14,fill:"#f8f9fa",stroke:"#d9e2ec"}));
      add(svg, svgEl("ellipse",{cx:663,cy:300,rx:70,ry:50,fill:glow,opacity:0.2}));
      // clock (diff)
      add(svg, svgEl("circle",{cx:400,cy:110,r:46,fill:"#fffdf8",stroke:"#d8cfc4","stroke-width":6}));
      [0,90,180,270].forEach(a=>{const rad=a*Math.PI/180; add(svg, svgEl("circle",{cx:400+Math.cos(rad)*32,cy:110+Math.sin(rad)*32,r:3,fill:"#8d7b68"}));});
      if (!alt("clock")) {
        add(svg, svgEl("line",{x1:400,y1:110,x2:400,y2:82,stroke:"#334155","stroke-width":5,"stroke-linecap":"round"}));
        add(svg, svgEl("line",{x1:400,y1:110,x2:425,y2:110,stroke:"#334155","stroke-width":4,"stroke-linecap":"round"}));
      } else {
        add(svg, svgEl("line",{x1:400,y1:110,x2:382,y2:92,stroke:"#334155","stroke-width":5,"stroke-linecap":"round"}));
        add(svg, svgEl("line",{x1:400,y1:110,x2:418,y2:132,stroke:"#334155","stroke-width":4,"stroke-linecap":"round"}));
      }
      add(svg, svgEl("circle",{cx:400,cy:110,r:4,fill:"#334155"}));
      // wall frame (diff)
      add(svg, svgEl("rect",{x:140,y:90,width:110,height:80,rx:8,fill:"#fff",stroke:"#d8cfc4","stroke-width":6}));
      add(svg, svgEl("circle",{cx:175,cy:130,r:16,fill: alt("frame")?"#f28482":"#a8dadc"}));
      if (!alt("frame")) add(svg, svgEl("rect",{x:198,y:112,width:34,height:36,rx:6,fill:"#f4a261"}));
      else add(svg, svgEl("polygon",{points:"215,110 235,148 195,148",fill:"#84a59d"}));
      return svg;
    }
    return { key:"home", name:"Ev İçi", pool, render };
  }

  function sceneStreet() {
    const pool = [
      { id: "sign", label: "Dükkan tabelasının rengi farklı", x: pctX(175), y: pctY(175), baseR: 6.0 },
      { id: "traffic", label: "Trafik ı�xı�xı farklı yanıyor", x: pctX(645), y: pctY(235), baseR: 5.8 },
      { id: "window", label: "Binadaki pencere detayı farklı", x: pctX(420), y: pctY(185), baseR: 5.6 },
      { id: "tree", label: "A�xacın meyve/taç detayı farklı", x: pctX(90), y: pctY(270), baseR: 6.8 },
      { id: "balloon", label: "Balon rengi farklı", x: pctX(560), y: pctY(120), baseR: 5.4 },
      { id: "bench", label: "Bankın üzerindeki detay farklı", x: pctX(330), y: pctY(455), baseR: 6.2 },
      { id: "dog", label: "Köpe�xin tasma rengi farklı", x: pctX(520), y: pctY(490), baseR: 5.8 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="skyS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8ecae6"/><stop offset="100%" stop-color="#e0fbfc"/></linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6c757d"/><stop offset="100%" stop-color="#495057"/></linearGradient>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:380,fill:"url(#skyS)"}));
      add(svg, svgEl("circle",{cx:700,cy:70,r:42,fill:"#ffd166"}));
      // clouds
      [[120,80],[260,60],[520,90]].forEach(([cx,cy],i)=>{add(svg, svgEl("ellipse",{cx,cy,rx:50+i*6,ry:22,fill:"#fff",opacity:0.9})); add(svg, svgEl("ellipse",{cx:cx-30,cy:cy+6,rx:30,ry:16,fill:"#fff",opacity:0.9})); add(svg, svgEl("ellipse",{cx:cx+32,cy:cy+5,rx:28,ry:15,fill:"#fff",opacity:0.9}));});
      // buildings
      add(svg, svgEl("rect",{x:60,y:140,width:230,height:240,fill:"#f4a261"}));
      add(svg, svgEl("rect",{x:300,y:100,width:200,height:280,fill:"#e9c46a"}));
      add(svg, svgEl("rect",{x:510,y:160,width:230,height:220,fill:"#bde0fe"}));
      // shop sign (diff)
      add(svg, svgEl("rect",{x:90,y:150,width:170,height:50,rx:8,fill: alt("sign")?"#2a9d8f":"#e76f51"}));
      add(svg, svgEl("rect",{x:115,y:165,width:120,height:10,rx:5,fill:"rgba(255,255,255,0.7)"}));
      add(svg, svgEl("rect",{x:135,y:182,width:80,height:8,rx:4,fill:"rgba(255,255,255,0.5)"}));
      // windows building 1
      for(let r=0;r<2;r++) for(let c=0;c<3;c++){
        const wx=85+c*65, wy=220+r*60;
        add(svg, svgEl("rect",{x:wx,y:wy,width:40,height:35,rx:4,fill:"#caf0f8",stroke:"#90e0ef"}));
      }
      // building 2 window detail (diff)
      add(svg, svgEl("rect",{x:340,y:150,width:120,height:70,rx:6,fill:"#fff",stroke:"#ddd"}));
      add(svg, svgEl("line",{x1:400,y1:150,x2:400,y2:220,stroke:"#ddd","stroke-width":4}));
      add(svg, svgEl("line",{x1:340,y1:185,x2:460,y2:185,stroke:"#ddd","stroke-width":4}));
      if (alt("window")) add(svg, svgEl("rect",{x:404,y:154,width:52,height:27,rx:3,fill:"#ffd166",opacity:0.7}));
      // traffic light (diff)
      add(svg, svgEl("rect",{x:632,y:210,width:26,height:70,rx:8,fill:"#343a40"}));
      add(svg, svgEl("rect",{x:642,y:280,width:6,height:100,fill:"#495057"}));
      const tcolors = alt("traffic") ? ["#555","#555","#2ecc71"] : ["#e63946","#555","#555"];
      [225,245,265].forEach((cy,i)=>add(svg, svgEl("circle",{cx:645,cy,r:7,fill:tcolors[i]})));
      // balloon (diff)
      add(svg, svgEl("line",{x1:560,y1:150,x2:555,y2:210,stroke:"#888","stroke-width":2}));
      add(svg, svgEl("ellipse",{cx:560,cy:120,rx:18,ry:24,fill: alt("balloon")?"#9b5de5":"#ff6b6b"}));
      add(svg, svgEl("ellipse",{cx:554,cy:112,rx:5,ry:8,fill:"rgba(255,255,255,0.4)"}));
      // tree (diff)
      add(svg, svgEl("rect",{x:78,y:300,width:24,height:90,rx:6,fill:"#8d6e63"}));
      add(svg, svgEl("circle",{cx:90,cy:270,r:55,fill:"#6a994e"}));
      add(svg, svgEl("circle",{cx:55,cy:290,r:35,fill:"#7ab35b"}));
      add(svg, svgEl("circle",{cx:125,cy:290,r:32,fill:"#588157"}));
      if (!alt("tree")) { add(svg, svgEl("circle",{cx:75,cy:255,r:6,fill:"#e63946"})); add(svg, svgEl("circle",{cx:105,cy:275,r:6,fill:"#e63946"})); }
      else { add(svg, svgEl("circle",{cx:75,cy:255,r:6,fill:"#ffd166"})); add(svg, svgEl("circle",{cx:105,cy:275,r:6,fill:"#ffd166"})); add(svg, svgEl("circle",{cx:60,cy:280,r:5,fill:"#ffd166"})); }
      // road & sidewalk
      add(svg, svgEl("rect",{x:0,y:380,width:800,height:60,fill:"#adb5bd"}));
      add(svg, svgEl("rect",{x:0,y:440,width:800,height:160,fill:"url(#road)"}));
      for(let x=20;x<800;x+=120) add(svg, svgEl("rect",{x,y:512,width:60,height:8,rx:4,fill:"#ffd166"}));
      // bench (diff)
      add(svg, svgEl("rect",{x:250,y:430,width:160,height:18,rx:6,fill:"#b08968"}));
      add(svg, svgEl("rect",{x:250,y:400,width:160,height:40,rx:8,fill:"#ddb892"}));
      add(svg, svgEl("rect",{x:265,y:448,width:12,height:40,rx:4,fill:"#7f5539"}));
      add(svg, svgEl("rect",{x:383,y:448,width:12,height:40,rx:4,fill:"#7f5539"}));
      if (alt("bench")) add(svg, svgEl("rect",{x:300,y:412,width:60,height:14,rx:6,fill:"#84a59d"})); // bag/cushion
      // dog (diff)
      add(svg, svgEl("ellipse",{cx:520,cy:500,rx:34,ry:18,fill:"#d4a373"}));
      add(svg, svgEl("circle",{cx:548,cy:488,r:14,fill:"#d4a373"}));
      add(svg, svgEl("ellipse",{cx:555,cy:478,rx:6,ry:10,fill:"#c98b5f"}));
      add(svg, svgEl("circle",{cx:553,cy:486,r:2.5,fill:"#333"}));
      add(svg, svgEl("rect",{x:500,y:505,width:8,height:18,rx:3,fill:"#c98b5f"}));
      add(svg, svgEl("rect",{x:518,y:505,width:8,height:18,rx:3,fill:"#c98b5f"}));
      add(svg, svgEl("rect",{x:536,y:505,width:8,height:18,rx:3,fill:"#c98b5f"}));
      add(svg, svgEl("path",{d:"M486 492 Q470 480 478 468",stroke:"#d4a373","stroke-width":6,fill:"none","stroke-linecap":"round"}));
      add(svg, svgEl("rect",{x:538,y:494,width:18,height:5,rx:2,fill: alt("dog")?"#2a9d8f":"#e63946"})); // collar diff
      return svg;
    }
    return { key:"street", name:"Sokak", pool, render };
  }

  function sceneSchool() {
    const pool = [
      { id: "board", label: "Tahtadaki yazı/�xekil farklı", x: pctX(400), y: pctY(170), baseR: 7.0 },
      { id: "clock", label: "Duvardaki saat farklı zamanı gösteriyor", x: pctX(120), y: pctY(90), baseR: 5.8 },
      { id: "globe", label: "Kürenin renk detayı farklı", x: pctX(690), y: pctY(300), baseR: 5.8 },
      { id: "apple", label: "Sıradaki elma rengi farklı", x: pctX(300), y: pctY(410), baseR: 4.8 },
      { id: "bag", label: "Sırt çantasının rengi farklı", x: pctX(160), y: pctY(470), baseR: 6.0 },
      { id: "poster", label: "Duvardaki poster detayı farklı", x: pctX(640), y: pctY(120), baseR: 5.6 },
      { id: "pencils", label: "Kalemlikteki kalem sayısı farklı", x: pctX(470), y: pctY(395), baseR: 5.2 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="classWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8f4e8"/><stop offset="100%" stop-color="#efe6d2"/></linearGradient>
        <linearGradient id="classFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#deb887"/><stop offset="100%" stop-color="#cfa16d"/></linearGradient>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:430,fill:"url(#classWall)"}));
      add(svg, svgEl("rect",{x:0,y:430,width:800,height:170,fill:"url(#classFloor)"}));
      for(let i=0;i<16;i++) add(svg, svgEl("line",{x1:i*55,y1:430,x2:i*55-20,y2:600,stroke:"rgba(120,80,30,0.08)","stroke-width":2}));
      // board
      add(svg, svgEl("rect",{x:230,y:70,width:340,height:200,rx:10,fill:"#2d6a4f",stroke:"#8b5e3c","stroke-width":12}));
      if (!alt("board")) {
        add(svg, svgEl("text",{x:320,y:150,fill:"#f8f9fa","font-size":"38","font-family":"Arial, sans-serif","font-weight":"700"},"2 + 3 = 5"));
        add(svg, svgEl("circle",{cx:470,cy:190,r:22,fill:"none",stroke:"#ffd166","stroke-width":4}));
      } else {
        add(svg, svgEl("text",{x:320,y:150,fill:"#f8f9fa","font-size":"38","font-family":"Arial, sans-serif","font-weight":"700"},"2 + 3 = 6"));
        add(svg, svgEl("rect",{x:448,y:168,width:44,height:44,fill:"none",stroke:"#ffd166","stroke-width":4}));
      }
      // clock
      add(svg, svgEl("circle",{cx:120,cy:90,r:38,fill:"#fff",stroke:"#cdb4db","stroke-width":5}));
      add(svg, svgEl("circle",{cx:120,cy:90,r:3,fill:"#333"}));
      if (!alt("clock")) { add(svg, svgEl("line",{x1:120,y1:90,x2:120,y2:65,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:120,y1:90,x2:140,y2:90,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      else { add(svg, svgEl("line",{x1:120,y1:90,x2:102,y2:75,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:120,y1:90,x2:120,y2:112,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      // poster
      add(svg, svgEl("rect",{x:590,y:70,width:100,height:100,rx:6,fill:"#fff",stroke:"#bde0fe","stroke-width":5}));
      add(svg, svgEl("circle",{cx:640,cy:110,r:18,fill: alt("poster")?"#ffafcc":"#a2d2ff"}));
      add(svg, svgEl("rect",{x:610,y:138,width:60,height:8,rx:4,fill:"#ddd"}));
      add(svg, svgEl("rect",{x:620,y:150,width:40,height:8,rx:4,fill:"#eee"}));
      // teacher desk
      add(svg, svgEl("rect",{x:300,y:300,width:200,height:26,rx:6,fill:"#b08968"}));
      add(svg, svgEl("rect",{x:320,y:326,width:16,height:70,rx:4,fill:"#7f5539"}));
      add(svg, svgEl("rect",{x:464,y:326,width:16,height:70,rx:4,fill:"#7f5539"}));
      // globe
      add(svg, svgEl("rect",{x:680,y:320,width:10,height:40,rx:4,fill:"#8d99ae"}));
      add(svg, svgEl("ellipse",{cx:685,cy:360,rx:22,ry:6,fill:"#adb5bd"}));
      add(svg, svgEl("circle",{cx:690,cy:300,r:26,fill: alt("globe")?"#48cae4":"#90dbf4",stroke:"#adb5bd","stroke-width":3}));
      add(svg, svgEl("path",{d:"M668 300 Q690 285 712 300 Q690 315 668 300",fill: alt("globe")?"#52b788":"#74c69d",opacity:0.9}));
      add(svg, svgEl("path",{d:"M690 274 Q705 300 690 326",stroke:"rgba(255,255,255,0.5)","stroke-width":2,fill:"none"}));
      // student desks
      [[120,430],[360,430],[560,430]].forEach(([x,y],i)=>{
        add(svg, svgEl("rect",{x,y,width:180,height:22,rx:6,fill:"#ddb892"}));
        add(svg, svgEl("rect",{x:x+20,y:y+22,width:12,height:55,rx:4,fill:"#9c6644"}));
        add(svg, svgEl("rect",{x:x+148,y:y+22,width:12,height:55,rx:4,fill:"#9c6644"}));
      });
      // apple (diff)
      add(svg, svgEl("circle",{cx:300,cy:410,r:12,fill: alt("apple")?"#ffb703":"#e63946"}));
      add(svg, svgEl("path",{d:"M300 398 Q305 392 312 394",stroke:"#588157","stroke-width":3,fill:"none"}));
      // pencils (diff)
      add(svg, svgEl("rect",{x:452,y:378,width:36,height:30,rx:6,fill:"#ffcad4",stroke:"#f4acb7"}));
      const pencilCount = alt("pencils") ? 4 : 2;
      for(let i=0;i<pencilCount;i++) add(svg, svgEl("rect",{x:458+i*8,y:360,width:5,height:28,rx:2,fill:["#ffd166","#06d6a0","#118ab2","#ef476f"][i%4]}));
      // backpack (diff)
      add(svg, svgEl("rect",{x:130,y:445,width:60,height:70,rx:14,fill: alt("bag")?"#6d597a":"#457b9d"}));
      add(svg, svgEl("rect",{x:142,y:432,width:12,height:20,rx:6,fill:"#555"}));
      add(svg, svgEl("rect",{x:166,y:432,width:12,height:20,rx:6,fill:"#555"}));
      add(svg, svgEl("rect",{x:142,y:470,width:36,height:18,rx:6,fill:"rgba(255,255,255,0.25)"}));
      return svg;
    }
    return { key:"school", name:"Okul", pool, render };
  }

  function sceneLibrary() {
    const pool = [
      { id: "lamp", label: "Masa lambasının rengi farklı", x: pctX(560), y: pctY(360), baseR: 6.2 },
      { id: "booksTop", label: "�Sst raftaki kitap dizilimi/renk farklı", x: pctX(220), y: pctY(150), baseR: 7.0 },
      { id: "glasses", label: "Gözlük detayı farklı", x: pctX(430), y: pctY(430), baseR: 5.4 },
      { id: "poster", label: "Duvardaki afi�x rengi farklı", x: pctX(680), y: pctY(120), baseR: 6.0 },
      { id: "plant", label: "Bitkinin saksı rengi farklı", x: pctX(90), y: pctY(380), baseR: 5.8 },
      { id: "mug", label: "Kupa rengi farklı", x: pctX(350), y: pctY(420), baseR: 5.0 },
      { id: "clock", label: "Saatin ibresi farklı", x: pctX(400), y: pctY(70), baseR: 5.6 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="libWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f3e9d2"/><stop offset="100%" stop-color="#e8dcc2"/></linearGradient>
        <linearGradient id="libFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b08968"/><stop offset="100%" stop-color="#7f5539"/></linearGradient>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:440,fill:"url(#libWall)"}));
      add(svg, svgEl("rect",{x:0,y:440,width:800,height:160,fill:"url(#libFloor)"}));
      // clock
      add(svg, svgEl("circle",{cx:400,cy:70,r:34,fill:"#fff",stroke:"#a98467","stroke-width":5}));
      if (!alt("clock")) { add(svg, svgEl("line",{x1:400,y1:70,x2:400,y2:48,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:400,y1:70,x2:418,y2:78,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      else { add(svg, svgEl("line",{x1:400,y1:70,x2:385,y2:55,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:400,y1:70,x2:412,y2:58,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      add(svg, svgEl("circle",{cx:400,cy:70,r:3,fill:"#333"}));
      // poster
      add(svg, svgEl("rect",{x:620,y:70,width:120,height:100,rx:8,fill: alt("poster")?"#cdb4db":"#bde0fe",stroke:"#fff","stroke-width":6}));
      add(svg, svgEl("text",{x:648,y:128,fill:"#fff","font-size":"26","font-family":"Arial, sans-serif","font-weight":"700"},"OKU"));
      // bookshelf
      add(svg, svgEl("rect",{x:60,y:110,width:320,height:330,rx:8,fill:"#8b5e3c"}));
      for(let s=0;s<4;s++) add(svg, svgEl("rect",{x:70,y:120+s*80,width:300,height:10,rx:3,fill:"#a98467"}));
      const shelfBooks = [
        [{c:"#e63946",h:55},{c:"#457b9d",h:62},{c:"#2a9d8f",h:50},{c:"#f4a261",h:58},{c:"#6d597a",h:64},{c:"#84a59d",h:52}],
        [{c:"#ffb703",h:60},{c:"#219ebc",h:54},{c:"#e76f51",h:62},{c:"#8ab17d",h:50},{c:"#bc6c25",h:58}],
        [{c:"#606c38",h:56},{c:"#dda15e",h:62},{c:"#9b5de5",h:52},{c:"#00bbf9",h:60},{c:"#f15bb5",h:54}],
      ];
      shelfBooks.forEach((row,ri)=>{
        let bx=80, by=120+ri*80+70;
        row.forEach((b,bi)=>{
          let color=b.c;
          if (alt("booksTop") && ri===0 && (bi===1 || bi===4)) color = bi===1?"#f28482":"#ffd166";
          add(svg, svgEl("rect",{x:bx,y:by-b.h,width:22,height:b.h,rx:2,fill:color}));
          bx+=26;
        });
      });
      // plant
      add(svg, svgEl("rect",{x:70,y:400,width:40,height:40,rx:6,fill: alt("plant")?"#6d597a":"#c97c5d"}));
      add(svg, svgEl("ellipse",{cx:90,cy:380,rx:26,ry:14,fill:"#7ab35b"}));
      add(svg, svgEl("ellipse",{cx:78,cy:365,rx:16,ry:10,fill:"#6a994e"}));
      add(svg, svgEl("ellipse",{cx:102,cy:368,rx:15,ry:10,fill:"#588157"}));
      // table
      add(svg, svgEl("rect",{x:300,y:390,width:360,height:26,rx:8,fill:"#c8a97e"}));
      add(svg, svgEl("rect",{x:330,y:416,width:18,height:90,rx:6,fill:"#8b5e3c"}));
      add(svg, svgEl("rect",{x:612,y:416,width:18,height:90,rx:6,fill:"#8b5e3c"}));
      // open book
      add(svg, svgEl("path",{d:"M360 390 Q430 360 430 390 L430 360 Q500 360 500 390 Z",fill:"#fffdf0",stroke:"#e6dcc8"}));
      add(svg, svgEl("line",{x1:430,y1:360,x2:430,y2:390,stroke:"#e0d6c2","stroke-width":2}));
      [372,380,388].forEach(y=>add(svg, svgEl("line",{x1:375,y1:y-12,x2:418,y2:y-12,stroke:"#d8ccb4","stroke-width":3})));
      [372,380,388].forEach(y=>add(svg, svgEl("line",{x1:442,y1:y-12,x2:485,y2:y-12,stroke:"#d8ccb4","stroke-width":3})));
      // glasses (diff)
      add(svg, svgEl("circle",{cx:415,cy:430,r:14,fill:"none",stroke: alt("glasses")?"#2a9d8f":"#555","stroke-width":3}));
      add(svg, svgEl("circle",{cx:445,cy:430,r:14,fill:"none",stroke: alt("glasses")?"#2a9d8f":"#555","stroke-width":3}));
      add(svg, svgEl("line",{x1:429,y1:430,x2:431,y2:430,stroke: alt("glasses")?"#2a9d8f":"#555","stroke-width":3}));
      // mug (diff)
      add(svg, svgEl("rect",{x:335,y:400,width:30,height:30,rx:6,fill: alt("mug")?"#ffafcc":"#84dcc6"}));
      add(svg, svgEl("path",{d:"M365 408 Q378 415 365 422",stroke: alt("mug")?"#ffafcc":"#84dcc6","stroke-width":4,fill:"none"}));
      // lamp (diff)
      add(svg, svgEl("rect",{x:555,y:360,width:10,height:30,rx:4,fill:"#6c757d"}));
      add(svg, svgEl("path",{d:"M530 360 L590 360 L575 320 L545 320 Z",fill: alt("lamp")?"#90dbf4":"#ffd166",stroke:"#adb5bd"}));
      add(svg, svgEl("ellipse",{cx:560,cy:390,rx:22,ry:6,fill:"#adb5bd"}));
      return svg;
    }
    return { key:"library", name:"Kütüphane", pool, render };
  }

  function sceneOffice() {
    const pool = [
      { id: "monitor", label: "Monitördeki grafik/renk farklı", x: pctX(400), y: pctY(230), baseR: 7.0 },
      { id: "calendar", label: "Takvim detayı farklı", x: pctX(150), y: pctY(140), baseR: 5.8 },
      { id: "mug", label: "Kupadaki kalem sayısı/renk farklı", x: pctX(560), y: pctY(350), baseR: 5.2 },
      { id: "chair", label: "Sandalyenin rengi farklı", x: pctX(400), y: pctY(430), baseR: 6.8 },
      { id: "plant", label: "Masa bitkisinin çiçe�xi farklı", x: pctX(250), y: pctY(330), baseR: 5.4 },
      { id: "clock", label: "Saat farklı zamanı gösteriyor", x: pctX(650), y: pctY(100), baseR: 5.6 },
      { id: "note", label: "Yapı�xkan not rengi farklı", x: pctX(520), y: pctY(150), baseR: 4.8 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="offWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#eef2f7"/><stop offset="100%" stop-color="#dde5ee"/></linearGradient>
        <linearGradient id="offFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cfd8e3"/><stop offset="100%" stop-color="#b8c4d4"/></linearGradient>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:440,fill:"url(#offWall)"}));
      add(svg, svgEl("rect",{x:0,y:440,width:800,height:160,fill:"url(#offFloor)"}));
      // window blind
      add(svg, svgEl("rect",{x:560,y:40,width:180,height:200,rx:6,fill:"#cfe8ff",stroke:"#eaf6ff","stroke-width":8}));
      for(let y=55;y<230;y+=18) add(svg, svgEl("line",{x1:568,y1:y,x2:732,y2:y,stroke:"rgba(120,160,190,0.35)","stroke-width":6}));
      // clock
      add(svg, svgEl("circle",{cx:650,cy:100,r:32,fill:"#fff",stroke:"#90a4ae","stroke-width":5}));
      if (!alt("clock")) { add(svg, svgEl("line",{x1:650,y1:100,x2:650,y2:78,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:650,y1:100,x2:668,y2:108,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      else { add(svg, svgEl("line",{x1:650,y1:100,x2:632,y2:86,stroke:"#333","stroke-width":4,"stroke-linecap":"round"})); add(svg, svgEl("line",{x1:650,y1:100,x2:650,y2:120,stroke:"#333","stroke-width":3,"stroke-linecap":"round"})); }
      // calendar
      add(svg, svgEl("rect",{x:100,y:80,width:100,height:120,rx:8,fill:"#fff",stroke:"#d7dee8","stroke-width":4}));
      add(svg, svgEl("rect",{x:100,y:80,width:100,height:28,rx:8,fill: alt("calendar")?"#e76f51":"#457b9d"}));
      add(svg, svgEl("text",{x:132,y:160,fill:"#334","font-size":"34","font-family":"Arial, sans-serif","font-weight":"700"}, alt("calendar")?"7":"12"));
      // sticky note
      add(svg, svgEl("rect",{x:490,y:120,width:60,height:60,rx:4,fill: alt("note")?"#a0e7e5":"#ffd166",transform:"rotate(6 520 150)"}));
      add(svg, svgEl("line",{x1:500,y1:145,x2:540,y2:145,stroke:"rgba(0,0,0,0.2)","stroke-width":3}));
      add(svg, svgEl("line",{x1:500,y1:158,x2:535,y2:158,stroke:"rgba(0,0,0,0.15)","stroke-width":3}));
      // desk
      add(svg, svgEl("rect",{x:160,y:360,width:480,height:30,rx:8,fill:"#d7b899"}));
      add(svg, svgEl("rect",{x:190,y:390,width:20,height:120,rx:6,fill:"#b08968"}));
      add(svg, svgEl("rect",{x:590,y:390,width:20,height:120,rx:6,fill:"#b08968"}));
      // monitor
      add(svg, svgEl("rect",{x:300,y:170,width:200,height:130,rx:10,fill:"#2b2d42",stroke:"#8d99ae","stroke-width":8}));
      add(svg, svgEl("rect",{x:312,y:182,width:176,height:106,rx:4,fill: alt("monitor")?"#1b263b":"#22304a"}));
      // screen content
      add(svg, svgEl("rect",{x:325,y:205,width:60,height:12,rx:3,fill: alt("monitor")?"#ffafcc":"#80ed99"}));
      add(svg, svgEl("rect",{x:325,y:225,width:90,height:8,rx:3,fill:"rgba(255,255,255,0.4)"}));
      add(svg, svgEl("rect",{x:325,y:240,width:70,height:8,rx:3,fill:"rgba(255,255,255,0.3)"}));
      add(svg, svgEl("circle",{cx:455,cy:245,r:22,fill:"none",stroke: alt("monitor")?"#ffd166":"#4cc9f0","stroke-width":6}));
      add(svg, svgEl("rect",{x:380,y:300,width:40,height:60,rx:4,fill:"#8d99ae"}));
      add(svg, svgEl("ellipse",{cx:400,cy:360,rx:50,ry:10,fill:"#adb5bd"}));
      // keyboard
      add(svg, svgEl("rect",{x:320,y:340,width:160,height:20,rx:6,fill:"#e9ecef",stroke:"#ced4da"}));
      // plant
      add(svg, svgEl("rect",{x:235,y:335,width:30,height:25,rx:5,fill:"#b5654b"}));
      add(svg, svgEl("ellipse",{cx:250,cy:325,rx:18,ry:10,fill:"#6a994e"}));
      add(svg, svgEl("circle",{cx:250,cy:315,r:7,fill: alt("plant")?"#ff6b6b":"#ffd166"}));
      // mug + pencils
      add(svg, svgEl("rect",{x:545,y:330,width:30,height:30,rx:6,fill:"#84a59d"}));
      const penCount = alt("mug") ? 3 : 1;
      for(let i=0;i<penCount;i++) add(svg, svgEl("rect",{x:550+i*8,y:312,width:5,height:24,rx:2,fill:["#334155","#e76f51","#457b9d"][i]}));
      // chair (diff)
      add(svg, svgEl("rect",{x:350,y:400,width:100,height:18,rx:8,fill: alt("chair")?"#2a9d8f":"#495057"}));
      add(svg, svgEl("rect",{x:360,y:350,width:80,height:55,rx:12,fill: alt("chair")?"#48bfe3":"#6c757d"}));
      add(svg, svgEl("rect",{x:392,y:418,width:16,height:70,rx:6,fill:"#343a40"}));
      add(svg, svgEl("line",{x1:400,y1:488,x2:360,y2:520,stroke:"#343a40","stroke-width":8,"stroke-linecap":"round"}));
      add(svg, svgEl("line",{x1:400,y1:488,x2:440,y2:520,stroke:"#343a40","stroke-width":8,"stroke-linecap":"round"}));
      return svg;
    }
    return { key:"office", name:"İşyeri / Ofis", pool, render };
  }

  function sceneCourt() {
    const pool = [
      { id: "hoopNet", label: "Pota filesi/halka detayı farklı", x: pctX(620), y: pctY(205), baseR: 6.2 },
      { id: "score", label: "Skor tabelası farklı", x: pctX(200), y: pctY(90), baseR: 6.0 },
      { id: "ball", label: "Basketbol topu çizgisi/rengi farklı", x: pctX(360), y: pctY(430), baseR: 5.6 },
      { id: "jersey", label: "Oyuncu formasının numarası farklı", x: pctX(480), y: pctY(320), baseR: 5.8 },
      { id: "bottle", label: "Banktaki su �xi�xesi farklı", x: pctX(120), y: pctY(430), baseR: 5.0 },
      { id: "cloud", label: "Bulut �xekli farklı", x: pctX(420), y: pctY(60), baseR: 6.0 },
      { id: "line", label: "Saha çizgisi detayı farklı", x: pctX(300), y: pctY(520), baseR: 6.0 },
    ];
    function render(side, active) {
      const alt = (id) => side === "right" && active.has(id);
      const defs = `
        <linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#74c0fc"/><stop offset="100%" stop-color="#d0ebff"/></linearGradient>
        <linearGradient id="courtFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0a96d"/><stop offset="100%" stop-color="#c9894a"/></linearGradient>`;
      const svg = baseSvg(defs);
      add(svg, svgEl("rect",{x:0,y:0,width:800,height:360,fill:"url(#skyC)"}));
      add(svg, svgEl("circle",{cx:90,cy:70,r:40,fill:"#ffd43b"}));
      // clouds (diff one)
      add(svg, svgEl("ellipse",{cx:420,cy:60,rx:60,ry:22,fill:"#fff",opacity:0.95}));
      add(svg, svgEl("ellipse",{cx:385,cy:68,rx:30,ry:16,fill:"#fff",opacity:0.95}));
      add(svg, svgEl("ellipse",{cx:455,cy:68,rx:28,ry:15,fill:"#fff",opacity:0.95}));
      if (alt("cloud")) add(svg, svgEl("ellipse",{cx:420,cy:78,rx:22,ry:10,fill:"#fff",opacity:0.9}));
      add(svg, svgEl("ellipse",{cx:700,cy:100,rx:45,ry:18,fill:"#fff",opacity:0.85}));
      // trees/background
      add(svg, svgEl("rect",{x:0,y:300,width:800,height:60,fill:"#7ab35b"}));
      // court floor
      add(svg, svgEl("rect",{x:0,y:360,width:800,height:240,fill:"url(#courtFloor)"}));
      for(let x=0;x<800;x+=80) add(svg, svgEl("line",{x1:x,y1:360,x2:x,y2:600,stroke:"rgba(120,70,20,0.08)","stroke-width":2}));
      // court lines
      add(svg, svgEl("rect",{x:40,y:380,width:720,height:200,rx:4,fill:"none",stroke:"#fff","stroke-width":5,opacity:0.9}));
      add(svg, svgEl("line",{x1:400,y1:380,x2:400,y2:580,stroke:"#fff","stroke-width":4,opacity:0.8}));
      add(svg, svgEl("circle",{cx:400,cy:480,r:50,fill:"none",stroke:"#fff","stroke-width":4,opacity:0.8}));
      add(svg, svgEl("path",{d:"M40 430 Q200 480 40 530",fill:"none",stroke:"#fff","stroke-width":4,opacity:0.8}));
      add(svg, svgEl("path",{d:"M760 430 Q600 480 760 530",fill:"none",stroke:"#fff","stroke-width":4,opacity:0.8}));
      if (alt("line")) add(svg, svgEl("rect",{x:260,y:500,width:80,height:40,fill:"none",stroke:"#fff","stroke-width":4,opacity:0.9}));
      // scoreboard
      add(svg, svgEl("rect",{x:140,y:50,width:120,height:80,rx:8,fill:"#212529"}));
      add(svg, svgEl("text",{x:160,y:105,fill: alt("score")?"#ffd166":"#ff6b6b","font-size":"34","font-family":"Arial, sans-serif","font-weight":"700"}, alt("score")?"18":"12"));
      add(svg, svgEl("text",{x:212,y:105,fill:"#4dabf7","font-size":"34","font-family":"Arial, sans-serif","font-weight":"700"},"10"));
      add(svg, svgEl("rect",{x:192,y:60,width:16,height:60,rx:4,fill:"#495057"}));
      // hoop
      add(svg, svgEl("rect",{x:660,y:180,width:14,height:180,rx:6,fill:"#868e96"}));
      add(svg, svgEl("rect",{x:590,y:120,width:90,height:70,rx:4,fill:"#f8f9fa",stroke:"#dee2e6","stroke-width":4}));
      add(svg, svgEl("rect",{x:610,y:150,width:40,height:30,rx:2,fill:"none",stroke:"#e03131","stroke-width":3}));
      add(svg, svgEl("ellipse",{cx:620,cy:190,rx:28,ry:8,fill:"none",stroke: alt("hoopNet")?"#4dabf7":"#e03131","stroke-width":4}));
      // net
      if (!alt("hoopNet")) {
        for(let i=-3;i<=3;i++) add(svg, svgEl("line",{x1:620+i*8,y1:190,x2:620+i*4,y2:225,stroke:"#fff","stroke-width":2}));
      } else {
        for(let i=-3;i<=3;i++) add(svg, svgEl("line",{x1:620+i*8,y1:190,x2:620+i*6,y2:235,stroke:"#fff","stroke-width":2}));
        add(svg, svgEl("path",{d:"M592 205 Q620 225 648 205",stroke:"#fff","stroke-width":2,fill:"none"}));
      }
      // bench & bottle
      add(svg, svgEl("rect",{x:60,y:420,width:120,height:16,rx:6,fill:"#74c69d"}));
      add(svg, svgEl("rect",{x:70,y:436,width:10,height:40,rx:4,fill:"#40916c"}));
      add(svg, svgEl("rect",{x:160,y:436,width:10,height:40,rx:4,fill:"#40916c"}));
      add(svg, svgEl("rect",{x:112,y:400,width:16,height:20,rx:4,fill: alt("bottle")?"#ff6b6b":"#4dabf7"})); // bottle
      add(svg, svgEl("rect",{x:116,y:394,width:8,height:8,rx:2,fill:"#dee2e6"}));
      // player
      add(svg, svgEl("circle",{cx:480,cy:280,r:18,fill:"#f1c27d"})); // head
      add(svg, svgEl("rect",{x:462,y:298,width:36,height:45,rx:8,fill:"#1971c2"})); // jersey
      add(svg, svgEl("text",{x:472,y:328,fill:"#fff","font-size":"18","font-family":"Arial, sans-serif","font-weight":"700"}, alt("jersey")?"23":"7"));
      add(svg, svgEl("rect",{x:465,y:343,width:12,height:40,rx:5,fill:"#343a40"}));
      add(svg, svgEl("rect",{x:483,y:343,width:12,height:40,rx:5,fill:"#343a40"}));
      add(svg, svgEl("line",{x1:462,y1:310,x2:440,y2:330,stroke:"#f1c27d","stroke-width":7,"stroke-linecap":"round"}));
      add(svg, svgEl("line",{x1:498,y1:310,x2:520,y2:295,stroke:"#f1c27d","stroke-width":7,"stroke-linecap":"round"}));
      // ball (diff)
      add(svg, svgEl("circle",{cx:360,cy:430,r:22,fill: alt("ball")?"#ff922b":"#f97316",stroke:"#7c2d12","stroke-width":2}));
      add(svg, svgEl("path",{d:"M338 430 H382",stroke:"#7c2d12","stroke-width":2}));
      add(svg, svgEl("path",{d:"M360 408 V452",stroke:"#7c2d12","stroke-width":2}));
      if (!alt("ball")) add(svg, svgEl("path",{d:"M345 415 Q360 430 345 445",stroke:"#7c2d12","stroke-width":2,fill:"none"}));
      else add(svg, svgEl("path",{d:"M375 415 Q360 430 375 445",stroke:"#7c2d12","stroke-width":2,fill:"none"}));
      return svg;
    }
    return { key:"court", name:"Basketbol Sahası", pool, render };
  }

  const SCENES = [sceneHome(), sceneStreet(), sceneSchool(), sceneLibrary(), sceneOffice(), sceneCourt()];

  function buildLevels() {
    const out = [];
    for (let n = 1; n <= TOTAL_LEVELS; n++) {
      const scene = SCENES[(n - 1) % SCENES.length];
      const diff = difficultyFor(n);
      const chosen = pickN(scene.pool, diff.count, n * 101 + scene.key.length);
      const differences = chosen.map(d => ({
        id: d.id,
        label: d.label,
        x: d.x,
        y: d.y,
        r: +(d.baseR * diff.rScale).toFixed(2),
      }));
      const activeIds = new Set(differences.map(d => d.id));
      out.push({
        index: n - 1,
        number: n,
        themeKey: scene.key,
        themeName: scene.name,
        title: `Seviye ${n} - ${scene.name}`,
        subtitle: `${diff.label} · ${diff.count} fark`,
        difficulty: diff.label,
        hints: diff.hints,
        differences,
        activeIds,
        render: (side) => scene.render(side, activeIds),
      });
    }
    return out;
  }

  const levels = buildLevels();

  function init() {
    state.levelIndex = loadProgress();
    $("#startBtn").addEventListener("click", () => { audioUnlock(); startGame(state.levelIndex || 0); });
    $("#howBtn").addEventListener("click", () => showModal(true));
    $("#closeModal").addEventListener("click", () => showModal(false));
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") showModal(false); });
    $("#soundToggle").addEventListener("click", toggleSound);
    $("#backMenuBtn").addEventListener("click", () => showScreen("menu"));
    $("#menuBtn2").addEventListener("click", () => showScreen("menu"));
    $("#hintBtn").addEventListener("click", useHint);
    $("#restartBtn").addEventListener("click", () => startGame(state.levelIndex));
    $("#nextLevelBtn").addEventListener("click", nextLevel);
    $("#replayBtn").addEventListener("click", () => {
      if (screens.complete.classList.contains("active") && state.levelIndex >= levels.length - 1) startGame(0);
      else startGame(state.levelIndex);
    });
    $("#leftScene").addEventListener("click", onSceneClick);
    $("#rightScene").addEventListener("click", onSceneClick);
    updateSoundButton();
  }

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function showModal(show) {
    $("#modal").classList.toggle("hidden", !show);
  }

  function startGame(index) {
    state.navLock = false;
    state.levelCompleted = false;
    state.levelIndex = clamp(index, 0, levels.length - 1);
    saveProgress(state.levelIndex);
    const level = levels[state.levelIndex];
    state.found = new Set();
    state.hintsLeft = level.hints;
    $("#levelTitle").textContent = level.title;
    $("#levelMeta").textContent = `${level.themeName} · ${level.difficulty} · ${level.differences.length} fark · ${level.number}/${TOTAL_LEVELS}`;
    $("#statusText").textContent = "Farkları bulmak için sahnelere dokun.";
    $("#hintCount").textContent = String(state.hintsLeft);
    $("#hintBtn").disabled = state.hintsLeft <= 0;
    renderLevel();
    updateProgress();
    showScreen("game");
    playTone("transition");
  }

  function renderLevel() {
    const level = levels[state.levelIndex];
    const left = $("#leftScene");
    const right = $("#rightScene");
    left.innerHTML = "";
    right.innerHTML = "";
    left.appendChild(level.render("left"));
    right.appendChild(level.render("right"));
  }

  function onSceneClick(e) {
    if (!screens.game.classList.contains("active")) return;
    audioUnlock();
    const scene = e.currentTarget;
    const rect = scene.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const level = levels[state.levelIndex];
    const hit = level.differences.find((d) => !state.found.has(d.id) && distance(x, y, d.x, d.y) <= d.r);
    if (hit) handleFound(hit);
    else handleMiss(scene, x, y);
  }

  function handleFound(diff) {
    if (state.levelCompleted) return;
    state.found.add(diff.id);
    addMarkersForDiff(diff.id, true);
    updateProgress();
    playTone("success");
    $("#statusText").textContent = `Harika! ${diff.label}.`;
    toast(diff.label);
    if (state.found.size === levels[state.levelIndex].differences.length) {
      state.levelCompleted = true;
      setTimeout(levelComplete, 650);
    }
  }

  function addMarkersForDiff(id, animate) {
    const level = levels[state.levelIndex];
    const diff = level.differences.find((d) => d.id === id);
    if (!diff) return;
    ["leftScene", "rightScene"].forEach((sid) => {
      const scene = $("#" + sid);
      if (scene.querySelector(`.marker[data-id="${id}"]`)) return;
      const m = document.createElement("div");
      m.className = "marker";
      m.dataset.id = id;
      m.style.left = diff.x + "%";
      m.style.top = diff.y + "%";
      if (!animate) m.style.animation = "none";
      scene.appendChild(m);
    });
  }

  function handleMiss(scene, x, y) {
    playTone("miss");
    scene.classList.remove("shake");
    void scene.offsetWidth;
    scene.classList.add("shake");
    const dot = document.createElement("div");
    dot.className = "miss-dot";
    dot.style.left = x + "%";
    dot.style.top = y + "%";
    scene.appendChild(dot);
    setTimeout(() => dot.remove(), 550);
    $("#statusText").textContent = "Bu noktada fark yok, dikkatle tekrar bak.";
  }

  function updateProgress() {
    const level = levels[state.levelIndex];
    const total = level.differences.length;
    const found = state.found.size;
    $("#foundText").textContent = `${found} / ${total}`;
    $("#progressFill").style.width = `${(found / total) * 100}%`;
  }

  function useHint() {
    const level = levels[state.levelIndex];
    if (state.hintsLeft <= 0) return;
    const remaining = level.differences.filter((d) => !state.found.has(d.id));
    if (!remaining.length) return;
    const target = remaining[Math.floor(Math.random() * remaining.length)];
    state.hintsLeft -= 1;
    $("#hintCount").textContent = String(state.hintsLeft);
    if (state.hintsLeft <= 0) $("#hintBtn").disabled = true;
    ["leftScene", "rightScene"].forEach((sid) => {
      const scene = $("#" + sid);
      const p = document.createElement("div");
      p.className = "hint-pulse";
      p.style.left = target.x + "%";
      p.style.top = target.y + "%";
      scene.appendChild(p);
      setTimeout(() => p.remove(), 2400);
    });
    $("#statusText").textContent = "İpucu: parlayan bölgeye odaklan.";
    playTone("hint");
  }

  function levelComplete() {
    if (screens.complete.classList.contains("active")) return;
    playTone("complete");
    const isLast = state.levelIndex >= levels.length - 1;
    if (!isLast) saveProgress(state.levelIndex + 1);
    else saveProgress(0);
    $("#completeTitle").textContent = isLast ? "Tebrikler! 50 seviyeyi tamamladın!" : "Seviye tamamlandı!";
    $("#completeDesc").textContent = isLast
      ? "Tüm temalarda farkları başarıyla buldun. Baştan oynayabilir veya seviyeleri tekrar deneyebilirsin."
      : `Harika iş! Sıradaki: ${levels[state.levelIndex + 1].themeName} (${levels[state.levelIndex + 1].difficulty}).`;
    $("#nextLevelBtn").style.display = isLast ? "none" : "inline-flex";
    $("#replayBtn").textContent = isLast ? "Baştan Oyna" : "Tekrar Oyna";
    showScreen("complete");
  }

  function nextLevel() {
    if (state.navLock) return;
    state.navLock = true;
    const next = state.levelIndex + 1;
    if (next < levels.length) startGame(next);
    else startGame(0);
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 1700);
  }

  // --- Audio ---
  function audioUnlock() {
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      state.audioCtx = new Ctx();
    }
    if (state.audioCtx.state === "suspended") state.audioCtx.resume().catch(() => {});
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    updateSoundButton();
    toast(state.soundOn ? "Ses açık" : "Ses kapalı");
    if (state.soundOn) { audioUnlock(); playTone("hint"); }
  }

  function updateSoundButton() {
    $("#soundToggle").textContent = state.soundOn ? "x`" : "x!";
    $("#soundToggle").setAttribute("aria-pressed", String(!state.soundOn));
  }

  function playTone(type) {
    if (!state.soundOn || !state.audioCtx) return;
    const ctx = state.audioCtx;
    const now = ctx.currentTime;
    const seq = {
      success: [523.25, 659.25, 783.99],
      miss: [220, 185],
      hint: [880, 988],
      complete: [523.25, 659.25, 783.99, 1046.5],
      transition: [392, 523.25],
    }[type] || [440];

    seq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === "miss" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      const t0 = now + i * 0.08;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(type === "miss" ? 0.08 : 0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (type === "complete" ? 0.28 : 0.18));
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + (type === "complete" ? 0.3 : 0.2));
    });
  }

  init();
})();