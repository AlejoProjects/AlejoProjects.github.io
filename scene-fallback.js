(() => {
  const stage = document.querySelector(".atlas-stage");
  const object = stage?.querySelector(".scene-object");
  const surface = stage?.querySelector(".scene-fallback");
  if (!object || !surface) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let startX = 0, startY = 0, x = -16, y = 25, dragging = false;
  surface.addEventListener("pointerdown", (event) => {
    if (stage.classList.contains("is-webgl-ready")) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    y += (event.clientX - startX) * .45;
    x = Math.max(-65, Math.min(65, x - (event.clientY - startY) * .35));
    startX = event.clientX;
    startY = event.clientY;
    object.style.setProperty("--scene-x", `${x}deg`);
    object.style.setProperty("--scene-y", `${y}deg`);
  });
  surface.addEventListener("pointerup", () => { dragging = false; });
  surface.addEventListener("pointercancel", () => { dragging = false; });
  document.querySelector("#atlas-reset")?.addEventListener("click", () => {
    x = -16; y = 25;
    object.style.setProperty("--scene-x", `${x}deg`);
    object.style.setProperty("--scene-y", `${y}deg`);
  });
  if (reduced) object.style.animation = "none";
})();

