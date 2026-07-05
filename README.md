# Personal Page

Static personal site ready for GitHub Pages. No build step is required.

## Main Files

- `index.html`: CRT-style main menu.
- `projects.html`: animated project node graph.
- `interests.html`: Profile page.
- `education.html`: animated education node graph.
- `content.js`: editable projects, education items, and GitHub username.
- `styles.css`: colors, layout, responsive behavior, and profile visuals.
- `network.js`: node graph, tubes, charges, stars, and background assets.
- `Gravity_s_Edge.mp3`: home-page music track.

## Edit Content

Open `content.js`.

- `profile.githubUsername`: GitHub username used to load public non-fork repos on `projects.html`.
- `sections.projects.items`: manual project fallback items.
- `sections.education.items`: courses, certificates, learning paths, and notes.

Open `interests.html` to edit the Profile text, interests, highlights, or avatar.

## Publish On GitHub Pages

1. Create a GitHub repository.
2. Upload/push all files in this folder, including `ASSETS/`, `.nojekyll`, and `Gravity_s_Edge.mp3`.
3. In GitHub, go to `Settings > Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Select your main branch and `/root`.
6. Save and wait for the Pages URL to appear.

The site uses relative paths, so it works both at the root domain and inside a project path.
