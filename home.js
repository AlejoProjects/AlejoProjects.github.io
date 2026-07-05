(function () {
  const slides = window.siteContent.homeSlides;
  const title = document.getElementById("slide-title");
  const copy = document.getElementById("slide-copy");
  const link = document.getElementById("slide-link");
  const dots = Array.from(document.querySelectorAll(".screen-dot"));
  const previous = document.querySelector(".screen-arrow-left");
  const next = document.querySelector(".screen-arrow-right");
  const musicToggle = document.getElementById("music-toggle");
  const homeTrack = document.getElementById("home-track");
  let index = 0;
  let timer = 0;

  function showSlide(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    const slide = slides[index];
    document.body.classList.add("is-switching");
    window.setTimeout(() => document.body.classList.remove("is-switching"), 260);
    title.textContent = slide.title;
    copy.textContent = slide.copy;
    link.textContent = slide.action;
    link.href = slide.href;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  }

  function startTimer() {
    window.clearInterval(timer);
    timer = window.setInterval(() => showSlide(index + 1), 7000);
  }

  previous.addEventListener("click", () => {
    showSlide(index - 1);
    startTimer();
  });

  next.addEventListener("click", () => {
    showSlide(index + 1);
    startTimer();
  });

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => {
      showSlide(dotIndex);
      startTimer();
    });
  });

  if (musicToggle && homeTrack) {
    homeTrack.volume = 0.42;
    musicToggle.addEventListener("click", async () => {
      if (homeTrack.paused) {
        try {
          await homeTrack.play();
          musicToggle.textContent = "Music on";
          musicToggle.setAttribute("aria-pressed", "true");
        } catch (error) {
          musicToggle.textContent = "Music blocked";
          musicToggle.setAttribute("aria-pressed", "false");
        }
      } else {
        homeTrack.pause();
        musicToggle.textContent = "Music off";
        musicToggle.setAttribute("aria-pressed", "false");
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      showSlide(index - 1);
      startTimer();
    }
    if (event.key === "ArrowRight") {
      showSlide(index + 1);
      startTimer();
    }
  });

  showSlide(0);
  startTimer();
})();
