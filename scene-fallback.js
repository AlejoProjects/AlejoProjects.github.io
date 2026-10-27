(() => {
  const stage = document.querySelector(".atlas-stage");
  const object = stage?.querySelector(".scene-object");
  const surface = stage?.querySelector(".scene-fallback");
  if (!object || !surface) return;
  const sectionKey = document.body.dataset.section || "projects";
  const items = window.siteContent?.sections?.[sectionKey]?.items || [];
  const educationCard = document.querySelector("#education-card");
  surface.querySelectorAll(".scene-node[data-index]").forEach((button) => {
    const index = Number(button.dataset.index);
    const item = items[index];
    button.setAttribute("aria-label", sectionKey === "projects" ? `Open ${item?.title || "project"} on GitHub` : `Read about ${item?.title || "learning topic"}`);
    button.addEventListener("click", () => {
      if (stage.classList.contains("is-webgl-ready") || !item) return;
      if (sectionKey === "projects") {
        if (/^https:\/\/github\.com\//.test(item.url || "")) window.open(item.url, "_blank", "noopener,noreferrer");
        return;
      }
      document.querySelectorAll("#atlas-index button[data-index]")[index]?.click();
      if (!educationCard) return;
      educationCard.querySelector("#education-card-tag").textContent = item.tag || "Education";
      educationCard.querySelector("#education-card-title").textContent = item.title;
      educationCard.querySelector("#education-card-copy").textContent = item.copy || "A topic in my continuing studies.";
      const resource = educationCard.querySelector("#education-card-resource");
      resource.hidden = !/^https:\/\//.test(item.url || "");
      if (!resource.hidden) resource.href = item.url;
      if (!educationCard.open) educationCard.showModal();
      educationCard.querySelector("#education-card-close").focus();
    });
  });
  const close = educationCard?.querySelector("#education-card-close");
  close?.addEventListener("click", () => { if (educationCard.open) educationCard.close(); });
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let startX = 0, startY = 0, x = -16, y = 25, dragging = false;
  surface.addEventListener("pointerdown", (event) => {
    if (stage.classList.contains("is-webgl-ready")) return;
    if (event.target.closest(".scene-node")) return;
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


