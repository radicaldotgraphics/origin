#!/usr/bin/env python3
"""Build work/projects.json and optimize images for the curated set.

Static images  -> cwebp (fast C encoder)
Animated GIFs  -> first-frame poster now; `animated` flag records the source so the
                  motion asset can be encoded separately (see ANIM below).
"""
import json, os, subprocess, sys

REPO = "/Users/jaredstanley/Documents/CLIENTS/Radical/site/origin"
STAGE = os.path.expanduser("~/Documents/CLIENTS/Radical/site/portfolio-archive")
WORK = f"{REPO}/work"
IMGDIR = f"{WORK}/img"

CURATED = ["radical-graphics", "knowledgegraph-quantifind", "network-graph-quantifind",
           "graphytequeue-redesign-quantifind", "pure-design-system", "pure-customer-stories",
           "martian-portfolio-site", "metagramme"]

TAGS = {
    "radical-graphics":                 ["Brand", "Web", "Creative Dev"],
    "knowledgegraph-quantifind":        ["Product", "Data Viz", "UI"],
    "network-graph-quantifind":         ["Product", "Data Viz", "Creative Dev"],
    "graphytequeue-redesign-quantifind":["Product", "UI/UX", "Design System"],
    "pure-design-system":               ["Design System", "UX", "Figma"],
    "pure-customer-stories":            ["UX", "Web", "Prototyping"],
    "martian-portfolio-site":           ["Brand", "Web", "Art Direction"],
    "metagramme":                       ["Creative Dev", "Data Viz", "Experiment"],
}

WIDTHS = [800, 1600]


def sh(*a, **kw):
    return subprocess.run(a, capture_output=True, **kw)


def probe(path):
    r = sh("magick", "identify", "-format", "%w %h %n\n", f"{path}[0]", text=True)
    try:
        w, h, n = r.stdout.strip().splitlines()[0].split()[:3]
        return int(w), int(h), int(n)
    except Exception:
        return None, None, 1


def frames(path):
    """Frame count without decoding the whole animation."""
    r = sh("magick", "identify", "-format", "%n\n", path, text=True)
    try:
        return max(int(x) for x in r.stdout.split())
    except Exception:
        return 1


def encode(src, dst, width, is_gif):
    if is_gif:
        png = sh("magick", f"{src}[0]", "png:-")
        if png.returncode != 0:
            return False
        r = subprocess.run(["cwebp", "-quiet", "-q", "82", "-resize", str(width), "0",
                            "-o", dst, "--", "-"], input=png.stdout, capture_output=True)
        return r.returncode == 0 and os.path.exists(dst)
    r = sh("cwebp", "-quiet", "-q", "82", "-resize", str(width), "0", src, "-o", dst)
    return r.returncode == 0 and os.path.exists(dst)


def encode_video(src, slug, idx, maxw=1600):
    """Animated GIF -> H.264 MP4. Even dimensions are required by yuv420p."""
    out = f"{IMGDIR}/{slug}"
    dst = f"{out}/{idx:02d}.mp4"
    r = sh("ffmpeg", "-y", "-loglevel", "error", "-i", src,
           # trunc(.../2)*2 forces an even width; -2 keeps height even and in ratio
           "-vf", f"scale='trunc(min({maxw},iw)/2)*2':-2:flags=lanczos",
           "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
           "-crf", "26", "-preset", "slow", "-movflags", "+faststart", "-an", dst)
    if r.returncode != 0 or not os.path.exists(dst):
        print(f"    !! ffmpeg failed for {os.path.basename(src)}: "
              f"{r.stderr.decode()[:160]}", file=sys.stderr)
        return None
    return {"mp4": f"img/{slug}/{idx:02d}.mp4", "bytes": os.path.getsize(dst)}


def optimize(src, slug, idx):
    w, h, _ = probe(src)
    if not w:
        print(f"    !! unreadable: {os.path.basename(src)}", file=sys.stderr)
        return None
    is_gif = src.lower().endswith(".gif")
    n = frames(src) if is_gif else 1
    out = f"{IMGDIR}/{slug}"
    os.makedirs(out, exist_ok=True)

    made = []
    for tw in WIDTHS:
        target = min(tw, w)
        if made and target == made[-1]["w"]:
            continue
        dst = f"{out}/{idx:02d}-{tw}.webp"
        if encode(src, dst, target, is_gif):
            made.append({"w": target, "src": f"img/{slug}/{idx:02d}-{tw}.webp",
                         "bytes": os.path.getsize(dst)})
    if not made:
        return None
    d = {"variants": made, "width": w, "height": h, "ratio": round(h / w, 4)}
    if is_gif and n > 1:
        vid = encode_video(src, slug, idx)
        d["animated"] = {"frames": n, "source": os.path.basename(src),
                         "bytes": os.path.getsize(src)}
        if vid:
            d["video"] = {"mp4": vid["mp4"]}
            d["animated"]["mp4_bytes"] = vid["bytes"]
    return d


def main():
    man = json.load(open(f"{STAGE}/manifest.json"))
    by = {p["slug"]: p for p in man["projects"]}
    os.makedirs(IMGDIR, exist_ok=True)

    projects, tin, tout, anim = [], 0, 0, []
    for slug in CURATED:
        p = by[slug]
        mods, idx = [], 0
        for mod in p["modules"]:
            if mod["type"] == "text":
                mods.append({"type": "text", "heading": mod.get("heading", ""),
                             "body": mod.get("body", "")})
            elif mod["type"] in ("image", "gallery"):
                imgs = []
                for im in mod["images"]:
                    src = f"{STAGE}/images/{im['file']}"
                    if not os.path.exists(src):
                        continue
                    idx += 1
                    d = optimize(src, slug, idx)
                    if not d:
                        continue
                    tin += os.path.getsize(src)
                    tout += d["variants"][-1]["bytes"]
                    if d.get("animated"):
                        anim.append((slug, d["animated"]["frames"],
                                     d["animated"]["bytes"],
                                     d["animated"].get("mp4_bytes")))
                    if im.get("caption"):
                        d["caption"] = im["caption"]
                    imgs.append(d)
                if imgs:
                    b = {"type": "gallery" if len(imgs) > 1 else "image", "images": imgs}
                    if mod.get("caption"):
                        b["caption"] = mod["caption"]
                    mods.append(b)
            elif mod["type"] == "video":
                mods.append({"type": "video", "provider": mod["provider"], "id": mod["id"]})

        first = next((i for m in mods for i in m.get("images", [])), None)
        intro = next((m["body"] for m in mods
                      if m["type"] == "text" and m["body"] and not m["heading"]), "")
        projects.append({"slug": slug, "title": p["title"], "year": p.get("year"),
                         "tags": TAGS.get(slug, []), "intro": intro,
                         "cover": first, "modules": mods})
        print(f"  {p['title']}  ({idx} images)")

    archive = [{"slug": p["slug"], "title": p["title"], "year": p.get("year"),
                "source": p["source"], "images": p["image_count"]}
               for p in man["projects"] if p["slug"] not in CURATED]

    json.dump({"curated": projects, "archive": archive},
              open(f"{WORK}/projects.json", "w"), indent=2)

    total = sum(os.path.getsize(os.path.join(r, f))
                for r, _, fs in os.walk(IMGDIR) for f in fs)
    n = sum(len(m.get("images", [])) for p in projects for m in p["modules"])
    print(f"\n{len(projects)} curated · {len(archive)} archive")
    print(f"{n} images: {tin/1e6:.1f}MB source -> {total/1e6:.1f}MB webp on disk")
    if anim:
        gin = sum(b for _, _, b, _ in anim)
        gout = sum(m or 0 for _, _, _, m in anim)
        print(f"\n{len(anim)} animated GIFs -> MP4:")
        for s, fr, b, m in anim:
            got = f"{m/1e6:5.2f}MB" if m else "  FAILED"
            print(f"   {s:36} {fr:4} frames  {b/1e6:5.1f}MB -> {got}")
        print(f"   {'':36} {'':4}         {gin/1e6:5.1f}MB -> {gout/1e6:5.2f}MB "
              f"({100*gout/gin:.1f}%)")


if __name__ == "__main__":
    main()
