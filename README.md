# Personal webpage

Alejo's static portfolio, published with GitHub Pages. No build step is required.

## Pages and content

- `index.html`: introduction, MLOps work, project spotlight, and navigation.
- `projects.html`: interactive 3D project globe and complete project index.
- `education.html`: interactive 3D learning globe and complete education index.
- `interests.html`: personal profile.
- `content.js`: curated project and education entries, plus the GitHub username used to append public repositories.

## Design and motion

- `refresh.css`, `atlas.css`, and `renovation.css`: page styles and responsive layouts.
- `hero-motion.js`, `renovation.js`, and `orbit-scene.js`: interaction, GSAP scroll motion, and the Three.js globe.
- `scene-fallback.js`: draggable CSS 3D sculpture when WebGL is unavailable.
- `ASSETS/hero-landscape.svg`: original surreal landscape used throughout the site.
- `ASSETS/profile-banner.svg`: shorter crop for the GitHub profile README.
- `vendor/`: local Three.js and GSAP browser bundles. Keep their license headers when updating.

Motion respects reduced-motion settings. The project and education indexes remain usable without WebGL or JavaScript module support.

## Editing

Update `content.js` to change the curated project and education entries. Update the copy in the page HTML files for the introduction, internship, and profile. GitHub Pages serves the files from the repository root.
