(() => {
  const work = [
    { name: "Finance agent simulation", copy: "Exploring market behavior with language-model and classical agents.", url: "https://github.com/AlejoProjects/finance_agentic_simulation" },
    { name: "Superconducting diode effect", copy: "Thin-film superconductivity studied through numerical simulation and TDGL methods.", url: "https://github.com/AlejoProjects/diode_effect" },
    { name: "Astrocomputational CNN", copy: "Classifying stellar and exoplanet light curves with machine learning.", url: "https://github.com/AlejoProjects/cnn_astrocomputational_physics" },
    { name: "Transmittance spectrum", copy: "Estimating thin-film properties from spectral data.", url: "https://github.com/AlejoProjects/transmitance_spectrum" }
  ];
  const name = document.querySelector("#spotlight-name");
  if (!name) return;
  const copy = document.querySelector("#spotlight-copy");
  const link = document.querySelector("#spotlight-link");
  const count = document.querySelector("#spotlight-count");
  let current = 0;
  function show(step) {
    current = (current + step + work.length) % work.length;
    name.textContent = work[current].name;
    copy.textContent = work[current].copy;
    link.href = work[current].url;
    count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(work.length).padStart(2, "0")}`;
  }
  document.querySelector("#spotlight-next")?.addEventListener("click", () => show(1));
  document.querySelector("#spotlight-prev")?.addEventListener("click", () => show(-1));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(".hero-copy > *", { opacity: 0, y: 26, duration: .9, stagger: .09, ease: "power3.out" });
  gsap.from(".hero-art-wrap", { opacity: 0, y: 36, rotate: -3, duration: 1.2, ease: "power3.out" });
  gsap.utils.toArray(".work-item").forEach((item) => {
    gsap.from(item, { opacity: .25, y: 24, duration: .7, scrollTrigger: { trigger: item, start: "top 92%", toggleActions: "play none none none" } });
  });
  gsap.from(".spotlight-intro h2", { opacity: .2, y: 40, scrollTrigger: { trigger: ".spotlight", start: "top 80%", end: "top 30%", scrub: true } });
  gsap.matchMedia().add("(min-width: 951px)", () => {
    ScrollTrigger.create({ trigger: ".spotlight", start: "top 12%", end: "bottom 70%", pin: ".spotlight-intro", pinSpacing: false });
  });
})();

