(function () {
  const sectionKey = document.body.dataset.section || "projects";
  const section = window.siteContent?.sections?.[sectionKey];
  const list = document.querySelector("#atlas-index");
  if (!section || !list) return;

  const items = section.items;
  const title = document.querySelector("#detail-title");
  const kicker = document.querySelector("#detail-kicker");
  const copy = document.querySelector("#detail-copy");
  const link = document.querySelector("#detail-link");
  const art = document.querySelector("#project-art");
  const status = document.querySelector("#atlas-status");

  function show(index) {
    const item = items[index];
    if (!item) return;
    title.textContent = item.title;
    kicker.textContent = item.tag || "FIELD NOTE";
    copy.textContent = item.copy || "A piece of work from my ongoing experiments.";
    link.href = item.url && /^https:\/\//.test(item.url) ? item.url : "https://github.com/AlejoProjects";
    link.hidden = !item.url;
    list.querySelectorAll("button[data-index]").forEach((button) => {
      const active = Number(button.dataset.index) === index;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index);
    button.textContent = item.title;
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => show(index));
    list.append(button);
  });
  art.innerHTML = "<svg viewBox='0 0 520 300' aria-hidden='true'><defs><radialGradient id='space'><stop stop-color='#251343'/><stop offset='.58' stop-color='#100b24'/><stop offset='1' stop-color='#060814'/></radialGradient><radialGradient id='void'><stop stop-color='#01020a'/><stop offset='.58' stop-color='#060713'/><stop offset='.86' stop-color='#3e256c'/><stop offset='1' stop-color='#090918'/></radialGradient></defs><rect width='520' height='300' fill='url(#space)'/><circle cx='335' cy='142' r='114' fill='url(#void)'/><ellipse cx='335' cy='142' rx='145' ry='43' fill='none' stroke='#a787e4' stroke-opacity='.58' stroke-width='3' transform='rotate(-19 335 142)'/></svg>";
  status.textContent = `${items.length} ${sectionKey === "projects" ? "project signals" : "learning signals"} · interactive index ready`;
  show(0);
})();

