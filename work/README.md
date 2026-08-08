# /work — portfolio

Static, no CMS. Published at `radical.graphics/work` by the existing Pages workflow,
which uploads the repo root as-is. Nothing here goes through Vite.

## Updating

**Change copy, titles, years, tags, or the running order** — edit `projects.json`, then:

```bash
node work/build.mjs
```

That regenerates `index.html` and every project page. Commit the result.

**Add or replace images** — put the source files in the staging archive (below), point
`prep.py` at them, and run:

```bash
python3 work/prep.py && node work/build.mjs
```

`prep.py` writes optimized assets into `work/img/` and rewrites `projects.json`, so any
hand-edits to `projects.json` are overwritten. Edit copy *after* running prep, or edit the
`TAGS` map inside `prep.py` so changes survive.

## Layout

- `index.html` — masonry landing (curated projects) + archive list
- `<slug>/index.html` — one case study per curated project
- `projects.json` — the only data source; `curated[]` renders pages, `archive[]` renders links out
- `work.css` / `work.js` — the whole front-end. `work.js` does masonry only, no hover effects
- `img/<slug>/` — `NN-800.webp`, `NN-1600.webp`, and `NN.mp4` for animated pieces

### Masonry

CSS grid with `grid-row: span N`, computed in `work.js` from measured tile heights.
Row-gap is `0` and the gutter is carried as `padding-bottom` on `.tile` — this is load-bearing.
Putting the gap on the grid makes each row unit cost `rowunit + gap`, which collapses every
tile onto the same span and silently kills the masonry. Below 720px it drops to one column
and the JS disables itself.

## Source archive

Raw scraped assets live **outside this repo** at `../portfolio-archive/` (~159MB): 230 original
images plus `manifest.json` (the full 53-project structure) and `curate.html` (a contact sheet
for picking projects). `scrape-source.py` and `reparse-source.py` are kept for reference — they
built that archive from `jareds.myportfolio.com`. You shouldn't need to run them again.

## Known gaps

- **Dates.** Adobe Portfolio stamped 22 of the 53 imported projects with 2018, its import date,
  not the real year. Archive entries therefore render without a year. Corrections go in
  `../portfolio-archive/years.tsv`.
- **Dead video.** 28 of 31 YouTube/Vimeo embeds on the old portfolio are 404s and were dropped.
  Only Adidas: Game Face (YouTube) and two Vimeo pieces survive, none in the curated set.
