#!/usr/bin/env node
// Generates /work from projects.json. Run: node work/build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(DIR, 'projects.json'), 'utf8'));
const SITE = 'https://radical.graphics';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// projects.json paths are relative to /work; detail pages sit one level deeper
const up = (p, depth) => depth ? '../'.repeat(depth) + p : p;

function picture(img, depth, { sizes, eager = false, cls = '', motion = false } = {}) {
  if (!img) return '';
  const v = img.variants;
  const poster = up(v[v.length - 1].src, depth);

  // Animated source: play it inline. Grid tiles pass motion:false and get the poster.
  if (motion && img.video) {
    return `<video class="motion${cls ? ' ' + cls : ''}" ` +
      `width="${img.width}" height="${img.height}" poster="${poster}" ` +
      `autoplay muted loop playsinline preload="metadata" ` +
      `aria-label="${esc(img.caption || 'Animated demo')}">` +
      `<source src="${up(img.video.mp4, depth)}" type="video/mp4">` +
      `<img src="${poster}" width="${img.width}" height="${img.height}" ` +
      `loading="lazy" decoding="async" alt="${esc(img.caption || '')}">` +
      `</video>`;
  }

  const srcset = v.map(x => `${up(x.src, depth)} ${x.w}w`).join(', ');
  return `<img${cls ? ` class="${cls}"` : ''} src="${poster}" srcset="${srcset}"` +
    ` sizes="${sizes || '100vw'}" width="${img.width}" height="${img.height}"` +
    ` loading="${eager ? 'eager' : 'lazy'}" decoding="async" alt="${esc(img.caption || '')}">`;
}

const shell = ({ title, desc, body, depth, cls = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="${up('../favicon.ico', depth)}">
<link rel="stylesheet" href="${up('work.css', depth)}">
</head>
<body${cls ? ` class="${cls}"` : ''}>
<header class="nav">
  <a class="nav-home" href="${SITE}/">Radical<span>.Graphics</span></a>
  <nav>
    <a href="${up('index.html', depth)}"${depth === 0 ? ' aria-current="page"' : ''}>Work</a>
    <a href="${SITE}/">Studio</a>
    <a href="mailto:jared@radical.graphics">Contact</a>
  </nav>
</header>
${body}
<footer class="foot">
  <span>© ${new Date().getFullYear()} Radical Graphics</span>
  <a href="mailto:jared@radical.graphics">jared@radical.graphics</a>
</footer>
<script src="${up('work.js', depth)}" defer></script>
</body>
</html>`;

/* ---------- landing ---------- */
function landing() {
  const tiles = data.curated.map(p => `
  <a class="tile" href="${esc(p.slug)}/" style="--ratio:${p.cover?.ratio ?? 0.66}">
    <div class="tile-img">${picture(p.cover, 0, { sizes: '(max-width:800px) 92vw, 44vw' })}</div>
    <div class="tile-meta">
      <h2>${esc(p.title)}</h2>
      <p>${p.tags.map(esc).join(' &middot; ')}${p.year ? ` <span class="yr">${p.year}</span>` : ''}</p>
    </div>
  </a>`).join('');

  const archive = data.archive.map(p => `
    <li><a href="${esc(p.source)}" target="_blank" rel="noopener">
      <span class="a-title">${esc(p.title)}</span>
      <span class="a-meta">${p.images} image${p.images === 1 ? '' : 's'}${p.year_confident && p.year ? ` &middot; ${p.year}` : ''}</span>
    </a></li>`).join('');

  return shell({
    title: 'Work — Radical Graphics',
    desc: 'Selected design and creative-technology work by Jared Stanley.',
    depth: 0,
    body: `
<section class="intro">
  <h1>Jared Stanley designs and builds
  digital products &mdash; data visualization,
  design systems, and the front-end
  that brings them to life.</h1>
</section>

<main class="grid" id="grid">${tiles}</main>

<section class="archive">
  <h2>Archive</h2>
  <p class="archive-note">${data.archive.length} earlier projects, hosted on the previous portfolio.</p>
  <ul>${archive}</ul>
</section>`
  });
}

/* ---------- detail ---------- */
function detail(p, prev, next) {
  const blocks = [];
  let seenHero = false;

  for (const m of p.modules) {
    if (m.type === 'text') {
      blocks.push(`<section class="prose">${m.heading ? `<h2>${esc(m.heading)}</h2>` : ''}${
        m.body.split(/\n{2,}/).filter(Boolean)
              .map(par => `<p>${par.split('\n').map(esc).join('<br>')}</p>`).join('')
      }</section>`);
    } else if (m.type === 'image' || m.type === 'gallery') {
      const hero = !seenHero;
      seenHero = true;
      const figs = m.images.map(im => `<figure>${
        picture(im, 1, { sizes: hero ? '100vw' : '(max-width:800px) 92vw, 70vw',
                         eager: hero, motion: true })
      }${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>`).join('');
      blocks.push(`<section class="media${m.images.length > 1 ? ' media-grid' : ''}${hero ? ' hero' : ''}">${figs}${
        m.caption ? `<p class="modcap">${esc(m.caption)}</p>` : ''}</section>`);
    } else if (m.type === 'video') {
      const src = m.provider === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${esc(m.id)}`
        : `https://player.vimeo.com/video/${esc(m.id)}`;
      blocks.push(`<section class="media"><div class="embed"><iframe src="${src}" loading="lazy"
        title="${esc(p.title)} video" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div></section>`);
    }
  }

  const nav = [
    prev ? `<a class="pn prev" href="../${esc(prev.slug)}/"><span>Previous</span><b>${esc(prev.title)}</b></a>` : '<span></span>',
    next ? `<a class="pn next" href="../${esc(next.slug)}/"><span>Next</span><b>${esc(next.title)}</b></a>` : '<span></span>',
  ].join('');

  return shell({
    title: `${p.title} — Radical Graphics`,
    desc: (p.intro || p.title).slice(0, 155),
    depth: 1,
    cls: 'detail',
    body: `
<article>
  <header class="case-head">
    <h1>${esc(p.title)}</h1>
    <dl class="case-meta">
      ${p.year ? `<div><dt>Year</dt><dd>${p.year}</dd></div>` : ''}
      <div><dt>Discipline</dt><dd>${p.tags.map(esc).join(', ')}</dd></div>
    </dl>
  </header>
  ${blocks.join('\n  ')}
</article>
<nav class="prevnext">${nav}</nav>`
  });
}

/* ---------- write ---------- */
writeFileSync(join(DIR, 'index.html'), landing());
const list = data.curated;
list.forEach((p, i) => {
  const out = join(DIR, p.slug);
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'),
    detail(p, list[i - 1], list[i + 1]));
});
console.log(`built work/index.html + ${list.length} project pages`);
