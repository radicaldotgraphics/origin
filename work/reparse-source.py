#!/usr/bin/env python3
"""Re-parse cached pages with heading structure and per-image captions preserved.
Reuses already-downloaded images (filenames are unchanged)."""
import re, os, json, html

OUT = os.path.expanduser("~/Documents/CLIENTS/Radical/site/portfolio-archive")
CDN = r'https://cdn\.myportfolio\.com/[a-f0-9]+/[a-f0-9-]{36}[^"\'\s]*'


def clean(frag):
    frag = re.sub(r'<(script|style).*?</\1>', '', frag, flags=re.S | re.I)
    frag = re.sub(r'<br\s*/?>', '\n', frag, flags=re.I)
    frag = re.sub(r'</(p|div|li)>', '\n', frag, flags=re.I)
    frag = re.sub(r'<li[^>]*>', '• ', frag, flags=re.I)
    t = html.unescape(re.sub(r'<[^>]+>', '', frag))
    t = re.sub(r'[ \t\xa0]+', ' ', t)
    return re.sub(r'\n{3,}', '\n\n', t).strip()


def parse_text_module(frag):
    """Return [{heading, body}] — a div.title starts a new section."""
    m = re.search(r'<div class="rich-text[^"]*"[^>]*>(.*)', frag, re.S)
    inner = m.group(1) if m else frag
    parts = re.split(r'(<div[^>]*class="title"[^>]*>.*?</div>)', inner, flags=re.S)

    out, pending = [], None
    for chunk in parts:
        if not chunk or not chunk.strip():
            continue
        if re.match(r'<div[^>]*class="title"', chunk):
            if pending: out.append(pending)
            pending = {"heading": clean(chunk), "body": ""}
        else:
            body = clean(chunk)
            if not body:
                continue
            if pending is None:
                pending = {"heading": "", "body": body}
            else:
                pending["body"] = (pending["body"] + "\n\n" + body).strip()
    if pending: out.append(pending)
    return [s for s in out if s["heading"] or s["body"]]


def captions(frag):
    """Ordered, de-duplicated per-image captions."""
    raw = [clean(c) for c in re.findall(r'grid__caption-text[^>]*>(.*?)</h6>', frag, re.S)]
    seq = []
    for c in raw:
        if c and (not seq or seq[-1] != c):
            seq.append(c)
    return seq


def rank(u):
    if re.search(r'_rw_1920\.', u): return 4
    mm = re.search(r'_rwc?_(\d+)', u)
    if mm: return min(int(mm.group(1)) // 1000, 3)
    return 5


def images(frag, seen):
    by = {}
    order = []
    for u in re.findall(CDN, frag):
        u = html.unescape(u).split('&amp;')[0]
        uid = re.search(r'/([a-f0-9-]{36})', u).group(1)
        if uid not in by:
            order.append(uid)
        if uid not in by or rank(u) > rank(by[uid]):
            by[uid] = u
    out = []
    for uid in order:
        if uid in seen:
            continue
        seen.add(uid)
        ext = (re.search(r'\.(jpg|jpeg|png|gif|webp)', by[uid], re.I) or [None, 'jpg'])[1].lower()
        out.append({"uuid": uid, "url": by[uid], "file": f"{uid}.{ext}"})
    return out


def parse(slug, doc):
    body = doc
    mm = re.search(r'class="js-project-modules[^"]*"(.*?)(?:<footer|class="footer-text")', doc, re.S)
    if mm: body = mm.group(1)

    modules, seen = [], set()
    for m in re.finditer(
            r'<div class="project-module module ([a-z_]+)[^"]*"(.*?)(?=<div class="project-module module |\Z)',
            body, re.S):
        kind, frag = m.group(1), m.group(2)

        if kind == 'text':
            for sec in parse_text_module(frag):
                modules.append({"type": "text", **sec})

        elif kind in ('image', 'media_collection'):
            imgs = images(frag, seen)
            if not imgs:
                continue
            caps = captions(frag)
            for i, im in enumerate(imgs):
                if i < len(caps):
                    im["caption"] = caps[i]
            mc = re.search(r'module-caption[^"]*"[^>]*>(.*?)</div>', frag, re.S)
            block = {"type": "gallery" if len(imgs) > 1 else "image", "images": imgs}
            if mc and clean(mc.group(1)):
                block["caption"] = clean(mc.group(1))
            modules.append(block)

        elif kind in ('video', 'embed'):
            for vid in dict.fromkeys(re.findall(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{6,})', frag)):
                modules.append({"type": "video", "provider": "youtube", "id": vid})
            for vid in dict.fromkeys(re.findall(r'player\.vimeo\.com/video/(\d+)', frag)):
                modules.append({"type": "video", "provider": "vimeo", "id": vid})
    return modules


DEAD_YT = {'1tDXdexBBiY','qZgmCzJfi2g','8rshkgdf__Y','CbXaUQTaFr0','Eo_hMLJmUXo','976lz4Hi6t8',
'aOMqz11FjA4','mGgUydjzaUk','HYIm-q3OUto','gOn_O9vuV0A','-b-imBHCEbM','WjJeuoa1_T0','zXPhkbX6M9Y',
'8iOfPYBotzk','bm8RUpgKCVI','cAPgeHP7dkU','klBOoVZay_4','K2rKCxfVjr4','N8yN4eKxoTE','Mv2MEGkrpJQ',
'1d4cIHM5aq0','8gSmh3E7ehI','E7r_8Ve-SkI','WTQXPGuYgB0','TeoQHW2lpxU','dknaZQ_hyRw','-aZ_OSzDAkA'}
DEAD_VIMEO = {'32545697'}

old = json.load(open(f"{OUT}/manifest.json"))
meta = {p['slug']: p for p in old['projects']}
SRC = "/private/tmp/claude-501/-Users-jaredstanley-Documents-CLIENTS-Radical-site-origin/e265acb8-b8de-4db4-bb24-51c6fc0a90b0/scratchpad"

projects = []
for slug, p in meta.items():
    doc = open(f"{SRC}/p_{slug}.html", encoding='utf-8', errors='replace').read()
    mods = parse(slug, doc)
    # drop dead embeds entirely — they would render a broken player
    kept = []
    for mod in mods:
        if mod['type'] == 'video':
            dead = mod['id'] in (DEAD_YT if mod['provider'] == 'youtube' else DEAD_VIMEO)
            if dead:
                continue
        kept.append(mod)
    imgs = [i for m in kept for i in m.get('images', [])]
    projects.append({
        "slug": slug, "title": p['title'], "year": p.get('year'),
        "source": p['source'], "modules": kept,
        "image_count": len(imgs),
        "video_count": sum(1 for m in kept if m['type'] == 'video'),
        "word_count": sum(len((s.get('heading','')+' '+s.get('body','')).split())
                          for s in kept if s['type'] == 'text'),
        "cover": imgs[0]['file'] if imgs else None,
        "dead_embeds": sum(1 for m in mods if m['type'] == 'video') - sum(1 for m in kept if m['type'] == 'video'),
    })

projects.sort(key=lambda p: (-(p.get('year') or 0), p['title']))
json.dump({"scraped": "2026-08-07", "source": old['source'], "count": len(projects),
           "projects": projects}, open(f"{OUT}/manifest.json", "w"), indent=2)

miss = [p['file'] for p in projects for m in p['modules'] for p2 in [0] for f in [] ]
allf = {i['file'] for p in projects for m in p['modules'] for i in m.get('images', [])}
have = set(os.listdir(f"{OUT}/images"))
print(f"{len(projects)} projects reparsed")
print(f"images referenced {len(allf)}, missing on disk {len(allf - have)}")
print(f"captions attached: {sum(1 for p in projects for m in p['modules'] for i in m.get('images',[]) if i.get('caption'))}")
print(f"headed sections: {sum(1 for p in projects for m in p['modules'] if m['type']=='text' and m.get('heading'))}")
print(f"dead embeds dropped: {sum(p['dead_embeds'] for p in projects)}")
