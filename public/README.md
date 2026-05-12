# public/

Static assets served at the root URL. Drop files here and they're available
without any code change.

## Expected files

- **`hero-motion.mp4`** — the hero motion graphic shown in the "Engine in motion"
  section of `landing.html`. 16:9, 30fps, 30–60 seconds. Will autoplay muted
  and loop. If the file is missing, the landing page falls back to a styled
  placeholder.

- **`hero-poster.jpg`** — optional. Single-frame poster shown before the video
  loads (and on mobile devices that pause autoplay until interaction).

## Notes

Vite serves anything in this folder at `/<filename>`. So `public/hero-motion.mp4`
becomes `http://localhost:3000/hero-motion.mp4`. Don't reference files with
`/public/` in the path — that's not how Vite works.
