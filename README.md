# Divya's Workspace

An interactive 3D portfolio: a low-poly developer room you can look around and click through. Each object in the room opens a part of the portfolio (about, experience, projects, skills, education, travel, contact). A plain HTML page with the same content is shown automatically when WebGL is unavailable.

## Stack

React 19, TypeScript, three.js with @react-three/fiber and drei, postprocessing (bloom), Vite.

## Install, develop, build

Needs Node 20 or newer.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # content and plant checks, type-check, production build into dist/
npm run preview   # serve dist/ locally
```

Append `?debug` to the URL to show a small performance and state readout.

## Project layout

```
src/
  scene/     room shell, lighting, camera rig, props, wall decorations
  zones/     room.json (poses, props and their hotspots, plants, screens, camera) and its types
  content/   content.json (all site text and data), types.ts, index.ts (typed access)
  ui/        app shell, menus, pop-ups, screens, the plain-HTML fallback, styles
  store/     focus and theme state
public/      models, images, fonts, resume and licence texts that ship with the site
scripts/     build checks and asset tooling
ASSETS.md    source, author and licence of every shipped asset
```

## Editing content

All text lives in `src/content/content.json`: identity (name, description, links), companies, technologies, experience, projects, education, travel and contact details. The page title and description in `index.html` are filled from it at build time. Experience is listed newest first; dates are `YYYY-MM` (`end` may be `present`). `npm run check:content` (also part of `npm run build`) verifies that every image path in the file exists under `public/`.

Placement of the objects and house plants is in `src/zones/room.json`. Each entry in `plants` has a `model`, a `group` (`floor`, `left`, `right` or `back`, the wall whose fade it follows), a `position` (world units, at the base of the pot), `rotationY`, and `size` (rendered height in metres). `npm run check:plants` (also part of the build) checks that trailing plants sit on a pot rim or shelf and do not pass through boards.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run check:content` | Checks content.json image paths |
| `npm run check:plants` | Checks plant placements |
| `npm run covers` | Prepares book cover images |
| `npm run wallart` | Prepares wall art images |
| `npm run logos` | Prepares company logos |
| `node scripts/optimize-models.mjs` | Optimises the source glTF models into `public/models` |
| `node scripts/prepare-about-photo.mjs` | Prepares the About photo |
| `npm run plants` | Builds the plant models and `src/scene/plantData.json` |
| `npm run travel`, `npm run travel:fetch` | Fetches and prepares the travel photos |

`npm run plants`, `npm run travel` and `npm run travel:fetch`, like the model and image scripts, read source files from a local `assets-src/` folder. That folder is not part of the repository, so these commands only work on a machine that has it; the finished results are already committed under `public/` and `src/`.

## Credits

Every shipped model, font, icon and photo is listed with its source and licence in [ASSETS.md](ASSETS.md); licence texts are in `public/licenses/`.
