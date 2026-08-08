#!/usr/bin/env python3
"""Scrape jareds.myportfolio.com into an ordered manifest + asset download list."""
import re, os, json, html, urllib.request, urllib.error, sys

BASE = "https://jareds.myportfolio.com"
OUT = os.environ.get("STAGE", os.path.expanduser(
    "~/Documents/CLIENTS/Radical/site/portfolio-archive"))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

CDN = r'https://cdn\.myportfolio\.com/[a-f0-9]+/[a-f0-9-]{36}[^"\'\s]*'


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": BASE + "/"})
            return urllib.request.urlopen(req, timeout=45).read()
        except Exception as e:
            if i == tries - 1:
                print(f"    !! {url[:90]} -> {e}", file=sys.stderr)
                return None


def text_of(frag):
    frag = re.sub(r'<(script|style).*?</\1>', '', frag, flags=re.S | re.I)
    frag = re.sub(r'<br\s*/?>', '\n', frag, flags=re.I)
    frag = re.sub(r'</p>', '\n\n', frag, flags=re.I)
    t = html.unescape(re.sub(r'<[^>]+>', '', frag))
    return re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', t)).strip()


def rank(u):
    """Prefer the largest available variant of an asset."""
    if re.search(r'_rw_1920\.', u): return 4
    if re.search(r'_rw(c)?_', u):   return int(re.search(r'_rw_?c?_(\d+)', u).group(1)) // 1000 if re.search(r'_rw_?c?_(\d+)', u) else 1
    return 5  # bare original


def best_assets(frag):
    """Collapse all variants of each asset UUID down to the highest-res one."""
    by_uuid = {}
    for u in re.findall(CDN, frag):
        u = html.unescape(u).split('&amp;')[0]
        uid = re.search(r'/([a-f0-9-]{36})', u).group(1)
        if uid not in by_uuid or rank(u) > rank(by_uuid[uid]):
            by_uuid[uid] = u
    return by_uuid


def parse_project(slug, raw):
    doc = raw.decode('utf-8', 'replace')

    title = ''
    m = re.search(r'<div class="page-title[^"]*"[^>]*>(.*?)</div>', doc, re.S)
    if m: title = text_of(m.group(1))
    if not m:
        m = re.search(r'<title>(.*?)</title>', doc, re.S)
        if m: title = text_of(m.group(1)).split(' - ')[-1].strip()

    body = doc
    mm = re.search(r'class="js-project-modules[^"]*"(.*?)(?:<footer|class="footer-text")', doc, re.S)
    if mm: body = mm.group(1)

    modules, seen = [], set()
    for m in re.finditer(
            r'<div class="project-module module ([a-z_]+)[^"]*"(.*?)(?=<div class="project-module module |\Z)',
            body, re.S):
        kind, frag = m.group(1), m.group(2)

        if kind == 'text':
            t = text_of(frag)
            if t: modules.append({"type": "text", "content": t})

        elif kind in ('image', 'media_collection'):
            imgs = []
            for uid, u in best_assets(frag).items():
                if uid in seen: continue
                seen.add(uid)
                ext = (re.search(r'\.(jpg|jpeg|png|gif|webp)', u, re.I) or [None, 'jpg'])[1].lower()
                imgs.append({"uuid": uid, "url": u, "file": f"{uid}.{ext}"})
            cap = ''
            mc = re.search(r'module-caption[^"]*"[^>]*>(.*?)</div>', frag, re.S)
            if mc: cap = text_of(mc.group(1))
            if imgs:
                modules.append({"type": "gallery" if len(imgs) > 1 else "image",
                                "images": imgs, **({"caption": cap} if cap else {})})

        elif kind in ('video', 'embed'):
            for vid in dict.fromkeys(re.findall(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{6,})', frag)):
                modules.append({"type": "video", "provider": "youtube", "id": vid,
                                "poster": f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg"})
            for vid in dict.fromkeys(re.findall(r'player\.vimeo\.com/video/(\d+)', frag)):
                modules.append({"type": "video", "provider": "vimeo", "id": vid})

    # sweep for embeds that sit outside a recognised module wrapper
    have = {m.get("id") for m in modules if m["type"] == "video"}
    for vid in dict.fromkeys(re.findall(r'youtube(?:-nocookie)?\.com/embed/([A-Za-z0-9_-]{6,})', body)):
        if vid not in have:
            modules.append({"type": "video", "provider": "youtube", "id": vid,
                            "poster": f"https://img.youtube.com/vi/{vid}/maxresdefault.jpg"})
    for vid in dict.fromkeys(re.findall(r'player\.vimeo\.com/video/(\d+)', body)):
        if vid not in have:
            modules.append({"type": "video", "provider": "vimeo", "id": vid})

    imgs = [i for m in modules if m["type"] in ("image", "gallery") for i in m["images"]]
    return {
        "slug": slug, "title": title, "source": f"{BASE}/{slug}",
        "modules": modules,
        "image_count": len(imgs),
        "video_count": sum(1 for m in modules if m["type"] == "video"),
        "word_count": sum(len(m["content"].split()) for m in modules if m["type"] == "text"),
        "cover": imgs[0]["file"] if imgs else None,
    }


def main():
    slugs = [s.strip() for s in open('slugs.txt') if s.strip()
             and s.strip() not in ('contact', 'trim', 'all')]

    # titles + years from the index page
    idx = get(f"{BASE}/all").decode('utf-8', 'replace')
    meta = {}
    for m in re.finditer(r'href="/([a-z0-9-]+)"[^>]*>(.*?)</a>', idx, re.S):
        t = text_of(m.group(2))
        if t: meta.setdefault(m.group(1), t)

    os.makedirs(f"{OUT}/images", exist_ok=True)
    projects, dl = [], {}

    for i, slug in enumerate(slugs, 1):
        raw = get(f"{BASE}/{slug}")
        if not raw:
            continue
        p = parse_project(slug, raw)
        label = meta.get(slug, '')
        if label and (not p["title"] or len(label) > len(p["title"])):
            p["title"] = label
        ym = re.search(r'\((\d{4})\)', p["title"]) or re.search(r'\b(19|20)\d{2}\b', p["title"])
        if ym:
            p["year"] = int(re.search(r'((?:19|20)\d{2})', ym.group(0)).group(1))
            p["title"] = re.sub(r'\s*\((?:19|20)\d{2}\)\s*$', '', p["title"]).strip()
        projects.append(p)
        for m in p["modules"]:
            for im in m.get("images", []):
                dl[im["file"]] = im["url"]
            if m.get("poster"):
                dl[f"yt-{m['id']}.jpg"] = m["poster"]
        print(f"[{i:2}/{len(slugs)}] {p['image_count']:2} img  {p['video_count']} vid  "
              f"{p['word_count']:4} words  {slug}")

    json.dump({"scraped": "2026-08-07", "source": BASE, "count": len(projects),
               "projects": projects}, open(f"{OUT}/manifest.json", "w"), indent=2)

    print(f"\nDownloading {len(dl)} assets -> {OUT}/images")
    ok = fail = skip = 0
    for name, url in sorted(dl.items()):
        path = f"{OUT}/images/{name}"
        if os.path.exists(path) and os.path.getsize(path) > 0:
            skip += 1; continue
        data = get(url)
        if data and len(data) > 100:
            open(path, 'wb').write(data); ok += 1
        else:
            fail += 1
        if (ok + fail + skip) % 25 == 0:
            print(f"  {ok+fail+skip}/{len(dl)}")
    print(f"\ndone: {ok} downloaded, {skip} cached, {fail} failed")


if __name__ == "__main__":
    main()
