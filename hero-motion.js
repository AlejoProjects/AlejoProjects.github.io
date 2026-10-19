(function () {
  const frame = document.querySelector(".hero-art-frame");
  if (!frame) return;

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const splineUrl = frame.dataset.splineUrl.trim();

  if (splineUrl) {
    try {
      const parsed = new URL(splineUrl, window.location.href);
      const trustedHost = parsed.hostname === "my.spline.design" || parsed.hostname.endsWith(".spline.design");
      if (parsed.protocol === "https:" && trustedHost) {
        const embed = document.createElement("iframe");
        embed.className = "spline-embed";
        embed.src = parsed.href;
        embed.title = "Interactive surreal landscape";
        embed.loading = "lazy";
        embed.allow = "autoplay; fullscreen";
        embed.allowFullscreen = true;
        embed.referrerPolicy = "no-referrer";
        frame.append(embed);
        frame.classList.add("has-spline");
      }
    } catch (error) {
      frame.classList.add("scene-fallback");
    }
  }

  if (motionPreference.matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let frameRequest = 0;
  frame.addEventListener("pointermove", (event) => {
    const bounds = frame.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cancelAnimationFrame(frameRequest);
    frameRequest = requestAnimationFrame(() => {
      frame.style.setProperty("--tilt-x", (y * -3).toFixed(2) + "deg");
      frame.style.setProperty("--tilt-y", (x * 4).toFixed(2) + "deg");
    });
  });

  frame.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frameRequest);
    frame.style.setProperty("--tilt-x", "0deg");
    frame.style.setProperty("--tilt-y", "0deg");
  });
})();
