(function () {
  const canvas = document.getElementById("network-canvas");
  const ctx = canvas.getContext("2d");
  const nodeLayer = document.getElementById("node-layer");
  const detail = {
    kicker: document.getElementById("detail-kicker"),
    title: document.getElementById("detail-title"),
    copy: document.getElementById("detail-copy"),
    link: document.getElementById("detail-link")
  };

  const sectionKey = document.body.dataset.section;
  const section = window.siteContent.sections[sectionKey];
  let items = section.items.slice();
  let nodes = [];
  let edges = [];
  let charges = [];
  let selectedIndex = 0;
  let lastTime = performance.now();
  let chargeClock = 0;
  let nextChargeDelay = 820;
  let distantOvoids = [];
  let distantOvoidViewportKey = "";
  let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const backgroundImage = new Image();
  backgroundImage.src = "ASSETS/background.png";
  const galaxyAssetSources = {
    projects: [
      { src: "ASSETS/chair_asset.png", x: 0.04, y: 0.42, w: 0.26, alpha: 0.42, drift: 0.008 },
      { src: "ASSETS/tree_asset.png", x: 0.72, y: 0.08, w: 0.2, alpha: 0.36, drift: -0.012 }
    ],
    education: [
      { src: "ASSETS/tree_asset.png", x: 0.04, y: 0.08, w: 0.22, alpha: 0.4, drift: -0.01 },
      { src: "ASSETS/chair_asset.png", x: 0.68, y: 0.44, w: 0.27, alpha: 0.38, drift: 0.01 }
    ]
  };
  const galaxyAssets = (galaxyAssetSources[sectionKey] || []).map((asset) => {
    const image = new Image();
    image.src = asset.src;
    return { ...asset, image };
  });

  const sectionTitle = document.getElementById("section-title");
  const sectionDescription = document.getElementById("section-description");
  if (sectionTitle) sectionTitle.textContent = section.title;
  if (sectionDescription) sectionDescription.textContent = section.description;

  function seededNoise(seed) {
    const value = Math.sin(seed * 127.1) * 43758.5453123;
    return value - Math.floor(value);
  }

  function densityScale(count = items.length) {
    if (count <= 10) return 1;
    if (count <= 18) return 0.84;
    if (count <= 30) return 0.66;
    return 0.56;
  }

  function isMobileLayout() {
    return window.innerWidth <= 760;
  }

  function importanceForItem(item, index) {
    const title = `${item.title} ${item.copy || ""}`.toLowerCase();
    if (
      /physics|software|machine learning|astro|diode|finance_agentic|cnn|algol|bootcamp|generative|rag|agents/.test(title)
    ) {
      return 3;
    }
    if (index < 6 || item.tag === "Platzi") return 2;
    return 1;
  }

  function ellipseText(text, maxWidth) {
    const value = String(text || "");
    if (ctx.measureText(value).width <= maxWidth) return value;
    let low = 0;
    let high = value.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (ctx.measureText(`${value.slice(0, mid)}...`).width <= maxWidth) low = mid;
      else high = mid - 1;
    }
    return `${value.slice(0, Math.max(1, low)).trim()}...`;
  }

  function roundedRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function createNodes() {
    const count = Math.max(items.length, 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (isMobileLayout()) {
      nodes = items.map((item, index) => ({
        item,
        index,
        x: 58,
        y: 126 + index * 86,
        rx: 18,
        ry: 18,
        pillWidth: Math.max(230, width - 92),
        pillHeight: 54,
        scale: 1,
        importance: importanceForItem(item, index),
        phase: seededNoise(index + 75) * Math.PI * 2,
        glow: 0
      }));
      return;
    }
    const scale = densityScale(count) * (width < 760 ? 0.82 : 1);
    const aspect = width / Math.max(height, 1);
    const cols = Math.max(2, Math.ceil(Math.sqrt(count * aspect)));
    const rows = Math.max(2, Math.ceil(count / cols));
    const left = width < 760 ? 44 : 96;
    const right = width < 760 ? 44 : 96;
    const top = width < 760 ? 118 : 130;
    const bottom = width < 760 ? 245 : 135;
    const usableWidth = Math.max(260, width - left - right);
    const usableHeight = Math.max(260, height - top - bottom);

    nodes = items.map((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellX = cols === 1 ? 0.5 : col / (cols - 1);
      const cellY = rows === 1 ? 0.5 : row / (rows - 1);
      const jitterX = (seededNoise(index + 3) - 0.5) * Math.min(120, usableWidth / cols * 0.62) * scale;
      const jitterY = (seededNoise(index + 13) - 0.5) * Math.min(100, usableHeight / rows * 0.62) * scale;
      const importance = importanceForItem(item, index);
      const label = firstWord(item.title);
      const fontSize = (importance === 3 ? 15 : importance === 2 ? 13 : 12) * scale;
      ctx.font = `${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      const textWidth = Math.min(ctx.measureText(label).width, 165 * scale);
      const pillWidth = Math.max((importance === 3 ? 142 : importance === 2 ? 122 : 104) * scale, textWidth + 42 * scale);
      const pillHeight = (importance === 3 ? 58 : importance === 2 ? 50 : 44) * scale;
      return {
        item,
        index,
        x: left + usableWidth * cellX + jitterX,
        y: top + usableHeight * cellY + jitterY,
        rx: pillWidth / 2,
        ry: pillHeight / 2,
        pillWidth,
        pillHeight,
        scale,
        importance,
        phase: seededNoise(index + 75) * Math.PI * 2,
        glow: 0
      };
    });
  }

  function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  function addEdge(edgeMap, degree, a, b) {
    if (a === b || edgeMap.has(edgeKey(a, b))) return false;
    if (degree[a] >= 4 || degree[b] >= 4) return false;
    const from = nodes[a];
    const to = nodes[b];
    const distance = Math.max(Math.hypot(to.x - from.x, to.y - from.y), 1);
    const direction = seededNoise(a * 17 + b * 23) > 0.5 ? 1 : -1;
    const bend = direction * Math.min(distance * (0.18 + seededNoise(a * 11 + b * 13) * 0.12), 145);
    const ovoidLimit = Math.min(from.rx, from.ry, to.rx, to.ry);
    const edgeScale = Math.min(from.scale || 1, to.scale || 1);
    const width = Math.min((12 + seededNoise(a * 19 + b * 29) * 10) * edgeScale, ovoidLimit * 0.48);
    const swelling = seededNoise(a * 37 + b * 41) > 0.5 ? "from" : "to";
    edgeMap.set(edgeKey(a, b), { a, b, from, to, bend, width, swelling, key: edgeKey(a, b) });
    degree[a] += 1;
    degree[b] += 1;
    return true;
  }

  function createEdges() {
    if (isMobileLayout()) {
      edges = nodes.slice(0, -1).map((node, index) => ({
        a: index,
        b: index + 1,
        from: node,
        to: nodes[index + 1],
        bend: 0,
        width: 2,
        key: edgeKey(index, index + 1)
      }));
      return;
    }
    const edgeMap = new Map();
    const degree = new Array(nodes.length).fill(0);

    nodes.forEach((node) => {
      const nearest = nodes
        .filter((candidate) => candidate.index !== node.index)
        .map((candidate) => ({
          index: candidate.index,
          distance: Math.hypot(candidate.x - node.x, candidate.y - node.y)
        }))
        .sort((a, b) => a.distance - b.distance);

      for (const candidate of nearest) {
        if (addEdge(edgeMap, degree, node.index, candidate.index)) break;
      }
    });

    nodes.forEach((node) => {
      const nearest = nodes
        .filter((candidate) => candidate.index !== node.index)
        .map((candidate) => ({
          index: candidate.index,
          distance: Math.hypot(candidate.x - node.x, candidate.y - node.y)
        }))
        .sort((a, b) => a.distance - b.distance);

      for (const candidate of nearest.slice(0, 3)) {
        if (degree[node.index] >= (node.importance >= 3 ? 3 : 2)) break;
        addEdge(edgeMap, degree, node.index, candidate.index);
      }
    });

    edges = Array.from(edgeMap.values());
  }

  function createHitTargets() {
    nodeLayer.innerHTML = "";
    nodeLayer.classList.toggle("is-timeline", isMobileLayout());
    nodes.forEach((node) => {
      const button = document.createElement("button");
      button.className = isMobileLayout() ? "timeline-node" : "node-hit";
      button.type = "button";
      button.textContent = node.item.title;
      button.title = node.item.title;
      if (isMobileLayout()) {
        button.style.setProperty("--index", node.index);
        button.innerHTML = `<span class="timeline-dot"></span><span class="timeline-title">${node.item.title}</span><span class="timeline-tag">${node.item.tag || section.title}</span>`;
      } else {
        button.style.left = `${node.x}px`;
        button.style.top = `${node.y}px`;
        button.style.width = `${Math.max(70, node.pillWidth + 12)}px`;
        button.style.height = `${Math.max(42, node.pillHeight + 12)}px`;
      }
      button.addEventListener("click", () => selectNode(node.index));
      button.addEventListener("mouseenter", () => {
        node.glow = 1;
      });
      nodeLayer.appendChild(button);
    });
  }

  function selectNode(index) {
    selectedIndex = index;
    const item = items[index];
    nodes.forEach((node) => {
      node.glow = node.index === index ? 1 : node.glow;
    });
    Array.from(nodeLayer.children).forEach((button, buttonIndex) => {
      button.classList.toggle("is-selected", buttonIndex === index);
    });
    detail.kicker.textContent = item.tag || section.title;
    detail.title.textContent = item.title;
    detail.copy.textContent = item.copy || item.description || "";
    if (item.url) {
      detail.link.hidden = false;
      detail.link.href = item.url;
      detail.link.textContent = item.url.includes("github.com") ? "Open repository" : "Open link";
    } else {
      detail.link.hidden = true;
    }
  }

  function pointOnEdge(edge, t) {
    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const normalX = -dy / length;
    const normalY = dx / length;
    const controlX = (edge.from.x + edge.to.x) / 2 + normalX * edge.bend;
    const controlY = (edge.from.y + edge.to.y) / 2 + normalY * edge.bend;
    const inv = 1 - t;
    return {
      x: inv * inv * edge.from.x + 2 * inv * t * controlX + t * t * edge.to.x,
      y: inv * inv * edge.from.y + 2 * inv * t * controlY + t * t * edge.to.y
    };
  }

  function edgeEndpointLimit(edge, t) {
    const node = t < 0.5 ? edge.from : edge.to;
    return Math.min(node.rx, node.ry);
  }

  function tangentOnEdge(edge, t) {
    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const normalX = -dy / length;
    const normalY = dx / length;
    const controlX = (edge.from.x + edge.to.x) / 2 + normalX * edge.bend;
    const controlY = (edge.from.y + edge.to.y) / 2 + normalY * edge.bend;
    return {
      x: 2 * (1 - t) * (controlX - edge.from.x) + 2 * t * (edge.to.x - controlX),
      y: 2 * (1 - t) * (controlY - edge.from.y) + 2 * t * (edge.to.y - controlY)
    };
  }

  function tubeHalfWidth(edge, t, side) {
    const endpointBlend = Math.max(0, Math.abs(t - 0.5) * 2);
    const middleBulge = Math.sin(t * Math.PI);
    const organicRipple = 1 + Math.sin(t * Math.PI * 2 + edge.a + side * 0.6) * 0.045;
    const endLimit = edgeEndpointLimit(edge, t) * 0.5;
    const naturalWidth = edge.width * (0.58 + middleBulge * 0.48 + endpointBlend * 0.12) * organicRipple;
    return Math.min(naturalWidth, endLimit);
  }

  function sampleTubeSide(edge, side) {
    const samples = [];
    for (let i = 0; i <= 28; i += 1) {
      const t = i / 28;
      const point = pointOnEdge(edge, t);
      const tangent = tangentOnEdge(edge, t);
      const tangentLength = Math.max(Math.hypot(tangent.x, tangent.y), 1);
      const normalX = -tangent.y / tangentLength;
      const normalY = tangent.x / tangentLength;
      const halfWidth = tubeHalfWidth(edge, t, side);
      samples.push({
        x: point.x + normalX * halfWidth * side,
        y: point.y + normalY * halfWidth * side
      });
    }
    return samples;
  }

  function traceSmoothPoints(points, options = {}) {
    if (!points.length) return;
    if (options.move !== false) {
      ctx.moveTo(points[0].x, points[0].y);
    } else {
      ctx.lineTo(points[0].x, points[0].y);
    }
    for (let i = 1; i < points.length - 1; i += 1) {
      const midpointX = (points[i].x + points[i + 1].x) / 2;
      const midpointY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midpointX, midpointY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function createDistantOvoids(width, height) {
    const targetCount = Math.min(42, Math.max(18, Math.floor((width * height) / 28000)));
    const placed = [];
    let attempts = 0;

    while (placed.length < targetCount && attempts < targetCount * 28) {
      const seed = attempts + placed.length * 17;
      const rx = 12 + seededNoise(seed * 31 + 197) * 24;
      const ry = 7 + seededNoise(seed * 37 + 223) * 15;
      const x = rx + seededNoise(seed * 23 + 101) * Math.max(1, width - rx * 2);
      const y = ry + seededNoise(seed * 29 + 151) * Math.max(1, height - ry * 2);
      const radius = Math.max(rx, ry) + 14;
      const overlaps = placed.some((ovoid) => {
        const otherRadius = Math.max(ovoid.rx, ovoid.ry) + 14;
        return Math.hypot(x - ovoid.x, y - ovoid.y) < radius + otherRadius;
      });

      if (!overlaps) {
        placed.push({
          x,
          y,
          rx,
          ry,
          phase: seededNoise(seed * 41 + 251) * Math.PI * 2,
          alpha: 0.16 + seededNoise(seed * 43 + 281) * 0.18,
          shade: seededNoise(seed * 47 + 311) > 0.55 ? 22 : 6
        });
      }
      attempts += 1;
    }

    return placed;
  }

  function drawDistantOvoids(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewportKey = `${width}x${height}`;
    if (viewportKey !== distantOvoidViewportKey) {
      distantOvoidViewportKey = viewportKey;
      distantOvoids = createDistantOvoids(width, height);
    }

    ctx.save();
    distantOvoids.forEach((ovoid) => {
      ctx.save();
      ctx.translate(ovoid.x, ovoid.y);
      ctx.rotate(Math.sin(time * 0.00008 + ovoid.phase) * 0.04);
      ctx.globalAlpha = ovoid.alpha;
      ctx.fillStyle = ovoid.shade === 22 ? "rgb(11, 31, 25)" : "rgb(2, 12, 5)";
      drawOvoidPath(ovoid, time);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawTube(edge) {
    const fromEdge = pointOnEdge(edge, 0.08);
    const toEdge = pointOnEdge(edge, 0.92);
    ctx.save();
    ctx.strokeStyle = "rgba(57, 5, 23, 0.72)";
    ctx.lineWidth = Math.max(1, Math.min(2, edge.width * 0.08));
    ctx.globalAlpha = 0.68;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(57, 5, 23, 0.28)";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(fromEdge.x, fromEdge.y);
    const mid = pointOnEdge(edge, 0.5);
    ctx.quadraticCurveTo(mid.x, mid.y, toEdge.x, toEdge.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawOvoidPath(node, time) {
    const points = [];
    const steps = 16;
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      const softWobble = 1 + Math.sin(angle * 2 + node.phase) * 0.06 + Math.cos(angle * 3 + node.phase + time * 0.00018) * 0.035;
      const pearPull = 1 + Math.max(0, Math.cos(angle - 0.45)) * 0.14;
      points.push({
        x: Math.cos(angle) * node.rx * softWobble * pearPull,
        y: Math.sin(angle) * node.ry * softWobble * (1 - Math.max(0, Math.sin(angle)) * 0.05)
      });
    }

    ctx.beginPath();
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const midpointX = (current.x + next.x) / 2;
      const midpointY = (current.y + next.y) / 2;
      if (i === 0) ctx.moveTo(midpointX, midpointY);
      ctx.quadraticCurveTo(next.x, next.y, (next.x + points[(i + 2) % points.length].x) / 2, (next.y + points[(i + 2) % points.length].y) / 2);
    }
    ctx.closePath();
  }

  function drawBlob(node, time) {
    const item = node.item;
    const active = node.index === selectedIndex;
    const glow = Math.max(node.glow, active ? 0.62 : 0);
    const fill = "rgba(22, 48, 43, 0.68)";
    const width = node.pillWidth || node.rx * 2;
    const height = node.pillHeight || node.ry * 2;
    const importanceAlpha = node.importance === 1 ? 0.72 : node.importance === 2 ? 0.88 : 1;
    const borderAlpha = node.importance === 3 ? 0.96 : node.importance === 2 ? 0.78 : 0.52;
    const fontSize = Math.max(11, Math.min(16, (node.importance === 3 ? 15 : node.importance === 2 ? 13 : 12) * (node.scale || 1)));

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(Math.sin(time * 0.00025 + node.phase) * 0.018);
    if (glow > 0.02) {
      const glowGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, Math.max(width, height) * 0.78);
      glowGradient.addColorStop(0, `rgba(163, 133, 96, ${0.42 * glow})`);
      glowGradient.addColorStop(0.5, `rgba(224, 224, 224, ${0.1 * glow})`);
      glowGradient.addColorStop(1, "rgba(163, 133, 96, 0)");
      ctx.fillStyle = glowGradient;
      roundedRectPath(-width * 0.62, -height * 0.72, width * 1.24, height * 1.44, height * 0.72);
      ctx.fill();
    }

    ctx.globalAlpha = importanceAlpha;
    roundedRectPath(-width / 2, -height / 2, width, height, height / 2);
    ctx.fillStyle = fill;
    ctx.strokeStyle = `rgba(163, 133, 96, ${Math.min(1, borderAlpha + glow * 0.16)})`;
    ctx.lineWidth = Math.max(1.2, (node.importance === 3 ? 3.1 : node.importance === 2 ? 2.3 : 1.6) * (node.scale || 1));
    ctx.shadowColor = `rgba(163, 133, 96, ${0.36 + 0.42 * glow})`;
    ctx.shadowBlur = (8 + 24 * glow) * (node.scale || 1);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e0e0e0";
    ctx.shadowColor = "rgba(3, 17, 0, 0.9)";
    ctx.shadowBlur = 4;
    ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ellipseText(item.title, width - 24 * (node.scale || 1)), 0, 0);
    ctx.restore();
  }

  function firstWord(value) {
    return String(value).trim().split(/\s+/)[0] || "";
  }

  function spawnCharge() {
    if (!edges.length || reduceMotion) return;
    const maxCharges = Math.max(1, Math.round(4 * densityScale()));
    if (charges.length >= maxCharges) return;
    const availableEdges = edges.filter((edge) => !charges.some((charge) => charge.edge.key === edge.key));
    if (!availableEdges.length) return;
    const edge = availableEdges[Math.floor(Math.random() * availableEdges.length)];
    const reverse = Math.random() > 0.5;
    const source = reverse ? edge.to : edge.from;
    const target = reverse ? edge.from : edge.to;
    source.glow = 1;
    charges.push({
      edge,
      reverse,
      source,
      target,
      t: 0,
      speed: 0.45 + Math.random() * 0.5,
      width: Math.min(edge.width * 0.72, (10 + Math.random() * 8) * densityScale())
    });
  }

  function updateCharges(delta) {
    chargeClock += delta;
    if (chargeClock > nextChargeDelay) {
      chargeClock = 0;
      nextChargeDelay = 900 + Math.random() * 1300;
      spawnCharge();
    }
    charges.forEach((charge) => {
      charge.t += charge.speed * delta / 1000;
      if (charge.t > 0.86) {
        charge.target.glow = 1;
        if (!charge.absorbSoundPlayed) {
          charge.absorbSoundPlayed = true;
          window.siteAudio?.swoosh();
        }
      }
    });
    charges = charges.filter((charge) => charge.t < 1.12);
  }

  function drawCharges() {
    charges.forEach((charge) => {
      const head = Math.min(charge.t, 1);
      const tail = Math.max(0, head - 0.16);
      const enteringScale = head > 0.74 ? Math.max(0.12, (1 - head) / 0.26) : 1;
      const points = [];
      for (let i = 0; i <= 8; i += 1) {
        const progress = tail + (head - tail) * (i / 8);
        const pathT = charge.reverse ? 1 - progress : progress;
        points.push(pointOnEdge(charge.edge, pathT));
      }
      const p1 = points[0];
      const p2 = points[points.length - 1];
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, "rgba(163, 133, 96, 0)");
      gradient.addColorStop(0.44, "rgba(224, 224, 224, 0.82)");
      gradient.addColorStop(1, "rgba(163, 133, 96, 1)");
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = gradient;
      ctx.shadowColor = "rgba(163, 133, 96, 0.95)";
      ctx.shadowBlur = 18 * enteringScale;
      ctx.lineWidth = charge.width * enteringScale;
      ctx.beginPath();
      traceSmoothPoints(points);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBackground(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
      const imageRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
      const viewportRatio = width / height;
      const drawWidth = viewportRatio > imageRatio ? width : height * imageRatio;
      const drawHeight = viewportRatio > imageRatio ? width / imageRatio : height;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;
      ctx.drawImage(backgroundImage, x, y, drawWidth, drawHeight);
    } else {
      const gradient = ctx.createRadialGradient(width * 0.62, height * 0.22, 40, width * 0.5, height * 0.54, Math.max(width, height));
      gradient.addColorStop(0, "#16302b");
      gradient.addColorStop(0.34, "#0c241d");
      gradient.addColorStop(0.72, "#031100");
      gradient.addColorStop(1, "#020900");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    const shade = ctx.createRadialGradient(width * 0.48, height * 0.28, 30, width * 0.5, height * 0.54, Math.max(width, height));
    shade.addColorStop(0, "rgba(22, 48, 43, 0.16)");
    shade.addColorStop(0.56, "rgba(3, 17, 0, 0.32)");
    shade.addColorStop(1, "rgba(2, 9, 0, 0.82)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createLinearGradient(0, height * 0.46, 0, height);
    horizon.addColorStop(0, "rgba(57, 5, 23, 0)");
    horizon.addColorStop(0.72, "rgba(57, 5, 23, 0.14)");
    horizon.addColorStop(1, "rgba(163, 133, 96, 0.22)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    const starCount = Math.min(260, Math.floor((width * height) / 4200));
    for (let i = 0; i < starCount; i += 1) {
      const x = seededNoise(i * 5 + 11) * width;
      const y = seededNoise(i * 7 + 23) * height;
      const size = 0.45 + seededNoise(i * 13 + 37) * 1.25;
      const twinkle = 0.55 + Math.sin(time * 0.0007 + seededNoise(i + 71) * Math.PI * 2) * 0.18;
      const gold = seededNoise(i * 17 + 5) > 0.68;
      ctx.globalAlpha = Math.max(0.18, twinkle);
      ctx.fillStyle = gold ? "rgba(163, 133, 96, 0.95)" : "rgba(224, 224, 224, 0.84)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGalaxyAssets(time);

    ctx.globalAlpha = 0.18;
    const haze = ctx.createRadialGradient(width * 0.18, height * 0.76, 0, width * 0.18, height * 0.76, Math.max(width, height) * 0.55);
    haze.addColorStop(0, "rgba(57, 5, 23, 0.24)");
    haze.addColorStop(1, "rgba(57, 5, 23, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawGalaxyAssets(time) {
    if (!galaxyAssets.length) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.save();
    ctx.filter = "saturate(0.82) brightness(0.78)";
    galaxyAssets.forEach((asset, index) => {
      if (!asset.image.complete || !asset.image.naturalWidth) return;
      const drawWidth = Math.min(width * asset.w, asset.image.naturalWidth);
      const drawHeight = drawWidth * (asset.image.naturalHeight / asset.image.naturalWidth);
      const drift = Math.sin(time * 0.00012 + index * 1.7) * height * asset.drift;
      ctx.globalAlpha = asset.alpha;
      ctx.drawImage(asset.image, width * asset.x, height * asset.y + drift, drawWidth, drawHeight);
    });
    ctx.restore();
  }

  function draw(time) {
    const delta = Math.min(time - lastTime, 64);
    lastTime = time;
    nodes.forEach((node) => {
      node.glow = Math.max(0, node.glow - delta / 900);
    });
    drawBackground(time);
    if (isMobileLayout()) {
      window.requestAnimationFrame(draw);
      return;
    }
    updateCharges(delta);
    drawDistantOvoids(time);
    edges.forEach(drawTube);
    drawCharges();
    nodes.forEach((node) => drawBlob(node, time));
    window.requestAnimationFrame(draw);
  }

  function rebuild() {
    resizeCanvas();
    createNodes();
    createEdges();
    createHitTargets();
    selectNode(Math.min(selectedIndex, items.length - 1));
  }

  async function maybeLoadGithubRepos() {
    const username = window.siteContent.profile.githubUsername.trim();
    if (!section.githubAutoLoad || !username) return;
    try {
      const limit = window.siteContent.profile.githubRepoLimit || 100;
      const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=${limit}&sort=updated`);
      if (!response.ok) throw new Error("GitHub repos unavailable");
      const repos = await response.json();
      items = repos
        .filter((repo) => !repo.fork)
        .map((repo) => ({
          title: repo.name,
          tag: repo.language || "Repository",
          copy: repo.description || "Public GitHub repository.",
          url: repo.html_url
        }));
      if (items.length) rebuild();
    } catch (error) {
      console.warn(error);
    }
  }

  window.addEventListener("resize", rebuild);
  rebuild();
  maybeLoadGithubRepos();
  window.requestAnimationFrame(draw);
})();
