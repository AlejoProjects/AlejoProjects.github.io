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
  const colors = [0xffae63, 0x63e6db, 0xff78b7, 0xb99aff, 0xf6d978, 0x80dfad];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    stage.classList.add("atlas-no-webgl");
    if (label) label.textContent = "Drag the 3D sculpture, or choose an item from the index below.";
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
    new THREE.SphereGeometry(1.8, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vViewNormal;
        void main() {
          vLocal = position;
          vViewNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vLocal;
        varying vec3 vViewNormal;
        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise3(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
            mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
                mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
        }
        void main() {
          vec3 p = normalize(vLocal);
          float cloud = 0.62 * noise3(p * 3.0) + 0.26 * noise3(p * 6.0) + 0.12 * noise3(p * 11.0);
          float violet = ${sectionKey === "education" ? "smoothstep(-0.9, 0.95, p.y) * 0.8 + 0.1" : "smoothstep(0.28, 0.7, cloud)"};
          vec3 color = mix(vec3(0.002, 0.002, 0.009), vec3(0.075, 0.028, 0.145), violet * 0.8);
          float rim = pow(1.0 - max(normalize(vViewNormal).z, 0.0), 2.2);
          color += vec3(0.05, 0.021, 0.1) * rim;
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    })
  );
  globe.add(core);

  function makeGlowTexture() {
    const surface = document.createElement("canvas");
    surface.width = surface.height = 64;
    const paint = surface.getContext("2d");
    const glow = paint.createRadialGradient(32, 32, 2, 32, 32, 32);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(.18, "rgba(255,255,255,.7)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    paint.fillStyle = glow;
    paint.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(surface);
  }
  const glowTexture = makeGlowTexture();
  const nodeGeometry = new THREE.SphereGeometry(0.075, 16, 12);
  const nodes = [];
  const nodeGroup = new THREE.Group();
  globe.add(nodeGroup);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
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
    const titleText = escapeHtml(item.title).slice(0, 24);
    if (sectionKey === "education") {
      return `<svg viewBox="0 0 520 300" role="img" aria-label="Purple gradient for ${titleText}"><defs><radialGradient id="study-gradient"><stop stop-color="#36205d"/><stop offset=".55" stop-color="#120d2b"/><stop offset="1" stop-color="#060814"/></radialGradient></defs><rect width="520" height="300" fill="url(#study-gradient)"/></svg>`;
    }
    return `<svg viewBox="0 0 520 300" role="img" aria-label="Black and purple study for ${titleText}"><defs><radialGradient id="space"><stop stop-color="#251343"/><stop offset=".58" stop-color="#100b24"/><stop offset="1" stop-color="#060814"/></radialGradient><radialGradient id="void"><stop stop-color="#01020a"/><stop offset=".58" stop-color="#060713"/><stop offset=".86" stop-color="#3e256c"/><stop offset="1" stop-color="#090918"/></radialGradient></defs><rect width="520" height="300" fill="url(#space)"/><circle cx="335" cy="142" r="114" fill="url(#void)"/><ellipse cx="335" cy="142" rx="145" ry="43" fill="none" stroke="#a787e4" stroke-opacity=".58" stroke-width="3" transform="rotate(-19 335 142)"/></svg>`;
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
      node.material.emissiveIntensity = active ? 3.1 : 1.65;
      node.children[0].material.opacity = active ? .92 : .72;
    });
  }

  function buildNodes() {
    nodeGroup.children.forEach((child) => {
      if (child.geometry && child.geometry !== nodeGeometry) child.geometry.dispose();
      child.children.forEach((part) => part.material?.dispose());
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
    nodeGroup.clear();
    nodes.length = 0;
    items.forEach((item, index) => {
      const point = pointOnSphere(index, items.length);
      const color = colors[index % colors.length];
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.65, roughness: 0.25, metalness: 0.08, toneMapped: false });
      const node = new THREE.Mesh(nodeGeometry, material);
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }));
      aura.scale.set(.58, .58, 1);
      node.add(aura);
      node.position.copy(point);
      node.userData.index = index;
      nodeGroup.add(node);
      nodes.push(node);
    });
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
  let running = false;
  function render(time) {
    if (!running) return;
    if (!reducedMotion && !dragging) {
      const delta = Math.min(time - (previousTime || time), 48);
      universe.rotation.y += delta * 0.00005;
      globe.rotation.y += delta * 0.000025;
    }
    previousTime = time;
    renderer.render(scene, camera);
    stage.classList.add("is-webgl-ready");
    frameId = requestAnimationFrame(render);
  }
  function startRendering() {
    if (running) return;
    running = true;
    previousTime = 0;
    frameId = requestAnimationFrame(render);
  }
  window.addEventListener("pagehide", () => {
    running = false;
    cancelAnimationFrame(frameId);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      resize();
      startRendering();
    }
  });
  startRendering();
  complementFromGitHub();
})();

