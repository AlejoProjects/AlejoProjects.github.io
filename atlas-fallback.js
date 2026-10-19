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
  const accentColors = ["#dbad53", "#54cbbc", "#de8667", "#91a8d3", "#e7dfc9"];

  function show(index) {
    const item = items[index];
    if (!item) return;
    title.textContent = item.title;
    kicker.textContent = item.tag || "FIELD NOTE";
    copy.textContent = item.copy || "A piece of work from my ongoing experiments.";
    link.href = item.url && /^https:\/\//.test(item.url) ? item.url : "https://github.com/AlejoProjects";
    link.hidden = !item.url;
    art.style.setProperty("--art-accent", accentColors[index % accentColors.length]);
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
  art.innerHTML = "<svg viewBox='0 0 520 300' aria-hidden='true'><ellipse cx='340' cy='140' rx='160' ry='48' transform='rotate(-22 340 140)' fill='none' stroke='var(--art-accent)' stroke-width='2'/><circle cx='340' cy='140' r='88' fill='var(--art-accent)' fill-opacity='.16'/><circle cx='340' cy='140' r='20' fill='var(--art-accent)'/><path d='M-20 240 C90 165 152 300 244 207 S402 216 540 104' fill='none' stroke='var(--art-accent)' stroke-width='10' stroke-opacity='.65'/><path d='M0 258 C90 186 163 317 257 227 S420 228 540 122' fill='none' stroke='#e8e4d5' stroke-width='2' stroke-opacity='.42'/></svg>";
  status.textContent = `${items.length} ${sectionKey === "projects" ? "project signals" : "learning signals"} · interactive index ready`;
  show(0);
})();
