import * as THREE from "./vendor/three.module.min.js";

(() => {
  const canvas = document.querySelector("#project-sphere");
  if (!canvas || !window.siteContent) return;

  const sectionKey = document.body.dataset.section || "projects";
  const section = window.siteContent.sections[sectionKey];
  const curatedItems = section.items.map((item) => ({ ...item }));
  let items = [...curatedItems];
  const stage = document.querySelector(".atlas-stage");
  const label = document.querySelector("#atlas-status");
  const list = document.querySelector("#atlas-index");
  const title = document.querySelector("#detail-title");
  const kicker = document.querySelector("#detail-kicker");
  const copy = document.querySelector("#detail-copy");
  const link = document.querySelector("#detail-link");
  const art = document.querySelector("#project-art");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = [0xd5aa52, 0x5dd1c4, 0xe58e67, 0xa6b5d8, 0xeee0bb];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    stage.classList.add("atlas-no-webgl");
    if (label) label.textContent = "3D view unavailable — use the complete project index below.";
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 8.8);

  const ambient = new THREE.HemisphereLight(0xd2eee2, 0x191019, 2.15);
  scene.add(ambient);
  const keyLight = new THREE.PointLight(0x5ee0ce, 52, 22, 2);
  keyLight.position.set(-4, 3, 5);
  scene.add(keyLight);
  const warmLight = new THREE.PointLight(0xe5a744, 35, 20, 2);
  warmLight.position.set(4, -2, 3);
  scene.add(warmLight);

  const universe = new THREE.Group();
  scene.add(universe);
  const globe = new THREE.Group();
  universe.add(globe);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 5),
    new THREE.MeshPhysicalMaterial({
      color: 0x103b3a,
      metalness: 0.3,
      roughness: 0.42,
      clearcoat: 0.9,
      clearcoatRoughness: 0.24,
      transmission: 0.06
    })
  );
  globe.add(core);

  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.82, 2)),
    new THREE.LineBasicMaterial({ color: 0x72c7b8, transparent: true, opacity: 0.24 })
  );
  globe.add(wire);

  const latitudeMaterial = new THREE.MeshBasicMaterial({ color: 0xe2bf79, wireframe: true, transparent: true, opacity: 0.075 });
  const latitude = new THREE.Mesh(new THREE.SphereGeometry(1.84, 18, 12), latitudeMaterial);
  globe.add(latitude);

  function orbit(radius, tilt, color, opacity, eccentricity = 1) {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius * eccentricity, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(220).map((point) => new THREE.Vector3(point.x, point.y, 0));
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    ring.rotation.set(tilt, tilt * 0.68, tilt * -0.24);
    universe.add(ring);
    return ring;
  }

  orbit(2.42, 0.54, 0xd5aa52, 0.46, 0.42);
  orbit(2.72, -0.9, 0x5dd1c4, 0.28, 0.31);
  orbit(3.02, 0.1, 0xd6c1a0, 0.16, 0.25);

  const ribbonPoints = [
    new THREE.Vector3(-2.55, -0.3, -0.25),
    new THREE.Vector3(-1.8, 0.85, 0.4),
    new THREE.Vector3(-0.35, 1.15, 0.3),
    new THREE.Vector3(1.2, 0.75, -0.15),
    new THREE.Vector3(2.58, 0.06, 0.1)
  ];
  const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPoints);
  const ribbon = new THREE.Mesh(
    new THREE.TubeGeometry(ribbonCurve, 120, 0.035, 8, false),
    new THREE.MeshPhysicalMaterial({ color: 0xd4a348, metalness: 0.62, roughness: 0.28, transparent: true, opacity: 0.82 })
  );
  universe.add(ribbon);

  const starPositions = [];
  let seed = 771;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  for (let i = 0; i < 720; i += 1) {
    const radius = 4.4 + random() * 8.5;
    const theta = random() * Math.PI * 2;
    const z = random() * 2 - 1;
    const planar = Math.sqrt(1 - z * z);
    starPositions.push(radius * planar * Math.cos(theta), radius * z, radius * planar * Math.sin(theta));
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xe5d5b4, size: 0.025, transparent: true, opacity: 0.72 })));

  const nodeGeometry = new THREE.SphereGeometry(0.068, 16, 12);
  const nodes = [];
  const nodeGroup = new THREE.Group();
  globe.add(nodeGroup);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const sphereLinks = [];
  let selectedIndex = 0;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let hoverNode = null;
  let frameId = 0;

  function pointOnSphere(index, count, radius = 1.86) {
    const y = 1 - ((index + 0.5) / count) * 2;
    const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    return new THREE.Vector3(Math.cos(angle) * horizontal * radius, y * radius, Math.sin(angle) * horizontal * radius);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function artwork(item, index) {
    const accent = ["#dbad53", "#54cbbc", "#de8667", "#91a8d3", "#e7dfc9"][index % 5];
    const titleText = escapeHtml(item.title).slice(0, 24);
    return `<svg viewBox="0 0 520 300" role="img" aria-label="Abstract ${escapeHtml(item.tag || "project")} study for ${titleText}"><defs><linearGradient id="sea" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0a2528"/><stop offset="1" stop-color="#123d3c"/></linearGradient><radialGradient id="orb"><stop stop-color="${accent}" stop-opacity=".88"/><stop offset="1" stop-color="${accent}" stop-opacity=".04"/></radialGradient></defs><rect width="520" height="300" rx="18" fill="url(#sea)"/><circle cx="350" cy="138" r="115" fill="url(#orb)"/><ellipse cx="350" cy="138" rx="146" ry="42" fill="none" stroke="${accent}" stroke-opacity=".66" stroke-width="2" transform="rotate(-22 350 138)"/><ellipse cx="350" cy="138" rx="118" ry="31" fill="none" stroke="#e7dfc9" stroke-opacity=".28" stroke-width="1" transform="rotate(27 350 138)"/><path d="M-20 245 C85 160 142 305 234 204 S386 217 544 106" fill="none" stroke="${accent}" stroke-opacity=".82" stroke-width="10"/><path d="M-10 261 C82 183 153 320 251 224 S412 223 537 126" fill="none" stroke="#dce8dd" stroke-opacity=".3" stroke-width="2"/><circle cx="350" cy="138" r="22" fill="${accent}" fill-opacity=".8"/><circle cx="350" cy="138" r="7" fill="#f5ead2"/><g fill="#f5ead2" fill-opacity=".72"><circle cx="75" cy="72" r="2"/><circle cx="180" cy="86" r="1.5"/><circle cx="450" cy="58" r="2"/><circle cx="90" cy="145" r="1.3"/></g><text x="28" y="260" fill="#f2ead8" font-family="Arial,sans-serif" font-size="13" letter-spacing="3">${escapeHtml(item.tag || "FIELD NOTE").slice(0, 22).toUpperCase()}</text></svg>`;
  }

  function showItem(index) {
    if (!items.length) return;
    selectedIndex = (index + items.length) % items.length;
    const item = items[selectedIndex];
    if (title) title.textContent = item.title;
    if (kicker) kicker.textContent = item.tag || (sectionKey === "projects" ? "PROJECT SIGNAL" : "LEARNING SIGNAL");
    if (copy) copy.textContent = item.copy || "A public repository from my ongoing experiments.";
    if (art) art.innerHTML = artwork(item, selectedIndex);
    if (link) {
      const validUrl = /^https:\/\//.test(item.url || "");
      link.href = validUrl ? item.url : "https://github.com/AlejoProjects";
      link.hidden = !validUrl;
    }
    list?.querySelectorAll("button[data-index]").forEach((button) => {
      const active = Number(button.dataset.index) === selectedIndex;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    nodes.forEach((node, nodeIndex) => {
      const active = nodeIndex === selectedIndex;
      node.scale.setScalar(active ? 1.62 : 1);
      node.material.emissiveIntensity = active ? 2.2 : 0.65;
    });
  }

  function buildNodes() {
    nodeGroup.children.forEach((child) => {
      if (child.geometry && child.geometry !== nodeGeometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
    nodeGroup.clear();
    nodes.length = 0;
    sphereLinks.length = 0;
    items.forEach((item, index) => {
      const point = pointOnSphere(index, items.length);
      const material = new THREE.MeshStandardMaterial({ color: colors[index % colors.length], emissive: colors[index % colors.length], emissiveIntensity: 0.65, roughness: 0.3, metalness: 0.24 });
      const node = new THREE.Mesh(nodeGeometry, material);
      node.position.copy(point);
      node.userData.index = index;
      nodeGroup.add(node);
      nodes.push(node);
    });
    for (let i = 0; i < nodes.length; i += 1) {
      const next = (i + Math.round(Math.sqrt(nodes.length))) % nodes.length;
      const curve = new THREE.QuadraticBezierCurve3(nodes[i].position.clone(), nodes[i].position.clone().add(nodes[next].position).multiplyScalar(0.58).normalize().multiplyScalar(2.2), nodes[next].position.clone());
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(18));
      const material = new THREE.LineBasicMaterial({ color: i % 2 ? 0x4fc0b1 : 0xd5aa52, transparent: true, opacity: 0.16 });
      const line = new THREE.Line(geometry, material);
      nodeGroup.add(line);
      sphereLinks.push(line);
    }
    buildIndex();
    showItem(Math.min(selectedIndex, items.length - 1));
  }

  function buildIndex() {
    if (!list) return;
    list.replaceChildren();
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.index = String(index);
      button.textContent = item.title;
      button.setAttribute("aria-pressed", String(index === selectedIndex));
      button.addEventListener("click", () => showItem(index));
      list.append(button);
    });
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(bounds.width, 300);
    const height = Math.max(bounds.height, 360);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 620 ? 10.5 : 8.8;
    camera.updateProjectionMatrix();
  }

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  }

  function handleMove(event) {
    if (!dragging) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes, false)[0]?.object || null;
      if (hit !== hoverNode) {
        hoverNode = hit;
        canvas.style.cursor = hit ? "pointer" : "grab";
      }
      return;
    }
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    globe.rotation.y += dx * 0.006;
    globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + dy * 0.004, -0.8, 0.8);
    universe.rotation.y += dx * 0.002;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", handleMove);
  canvas.addEventListener("pointerup", (event) => {
    if (dragging && !moved) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes, false)[0]?.object;
      if (hit) showItem(hit.userData.index);
    }
    dragging = false;
    canvas.style.cursor = "grab";
  });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  document.querySelector("#atlas-reset")?.addEventListener("click", () => {
    globe.rotation.set(-0.12, -0.3, 0);
    universe.rotation.set(0, 0, 0);
  });
  window.addEventListener("resize", resize);

  async function complementFromGitHub() {
    if (sectionKey !== "projects") return;
    try {
      const response = await fetch(`https://api.github.com/users/${window.siteContent.profile.githubUsername}/repos?per_page=100&sort=updated`);
      if (!response.ok) return;
      const repos = await response.json();
      const known = new Set(items.map((item) => item.title.toLowerCase()));
      const additional = repos.filter((repo) => !repo.fork && !known.has(repo.name.toLowerCase())).map((repo) => ({
        title: repo.name,
        tag: repo.language || "Repository",
        copy: repo.description || "An experiment from the public project archive.",
        url: repo.html_url
      }));
      if (additional.length) {
        items = [...items, ...additional];
        buildNodes();
        if (label) label.textContent = `Curated projects + ${additional.length} more public repositories`;
      }
    } catch (error) {
      if (label) label.textContent = "Curated archive · GitHub sync unavailable";
    }
  }

  resize();
  buildNodes();
  if (label) label.textContent = `${items.length} ${sectionKey === "projects" ? "project signals" : "learning signals"} · drag the globe or choose a name`;
  let previousTime = 0;
  function render(time) {
    if (!reducedMotion && !dragging) {
      const delta = Math.min(time - (previousTime || time), 48);
      universe.rotation.y += delta * 0.00005;
      globe.rotation.y += delta * 0.000025;
      ribbon.rotation.y = Math.sin(time * 0.00018) * 0.06;
    }
    previousTime = time;
    renderer.render(scene, camera);
    stage.classList.add("is-webgl-ready");
    frameId = requestAnimationFrame(render);
  }
  frameId = requestAnimationFrame(render);
  window.addEventListener("pagehide", () => cancelAnimationFrame(frameId), { once: true });
  complementFromGitHub();
})();

