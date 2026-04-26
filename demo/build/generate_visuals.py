"""Generate the six PNG assets for the Doppel demo opening.

Produces 1920x1080 PNGs in demo/build/assets/ matching the Doppel landing-page
brand (Space Grotesk Medium, violet/cyan gradient, soft glow).
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

W, H = 1920, 1080
BG = (9, 9, 11)
FG = (244, 244, 245)
FG_DIM = (161, 161, 170)
FG_MUTE = (113, 113, 122)
ACCENT = (139, 92, 246)
ACCENT_DEEP = (124, 58, 237)
ACCENT_CYAN = (34, 211, 238)

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(HERE, "fonts")
ASSETS_DIR = os.path.join(HERE, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

for fname in ("SpaceGrotesk-Medium.ttf", "SpaceGrotesk-Regular.ttf", "JetBrainsMono-Regular.ttf"):
    fm.fontManager.addfont(os.path.join(FONTS_DIR, fname))


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS_DIR, name), size)


def hex_color(rgb):
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def base_canvas():
    return Image.new("RGBA", (W, H), BG + (255,))


def linear_gradient(stops, w, h, angle_deg=135):
    """CSS-style linear gradient. stops: [(0..1, (r,g,b)), ...]."""
    a = np.deg2rad(angle_deg)
    dx, dy = np.sin(a), -np.cos(a)
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    proj = xs * dx + ys * dy
    t = (proj - proj.min()) / (proj.max() - proj.min() + 1e-9)
    arr = np.zeros((h, w, 3), dtype=np.float32)
    stops = sorted(stops)
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        mask = (t >= p0) & (t <= p1)
        local = (t[mask] - p0) / max(p1 - p0, 1e-9)
        for ch in range(3):
            arr[..., ch][mask] = c0[ch] * (1 - local) + c1[ch] * local
    arr[t < stops[0][0]] = stops[0][1]
    arr[t > stops[-1][0]] = stops[-1][1]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def text_mask(text, font_obj, w, h, offset_y=0):
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    bbox = d.textbbox((0, 0), text, font=font_obj)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (w - tw) // 2 - bbox[0]
    ty = (h - th) // 2 - bbox[1] + offset_y
    d.text((tx, ty), text, fill=255, font=font_obj)
    return mask


def colored_glow(mask, color, blur_radius, alpha_mult):
    """Take an L-mode mask, blur it, color it, and reduce alpha."""
    blurred = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    layer = Image.new("RGBA", blurred.size, color + (0,))
    arr = np.array(layer)
    blurred_arr = np.array(blurred, dtype=np.float32) * alpha_mult
    arr[..., 3] = np.clip(blurred_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def gradient_text_with_glow(text, font_obj, gradient_stops, w, h, offset_y=0,
                             glow_cyan_radius=36, glow_cyan_alpha=0.45,
                             glow_violet_radius=18, glow_violet_alpha=0.55,
                             glow_violet_offset_y=4):
    """Return an RGBA layer with gradient-filled text and brand glow underneath."""
    mask = text_mask(text, font_obj, w, h, offset_y=offset_y)
    grad = linear_gradient(gradient_stops, w, h, angle_deg=135).convert("RGBA")
    grad.putalpha(mask)

    # Cyan ambient glow (wider, softer)
    glow1 = colored_glow(mask, ACCENT_CYAN, glow_cyan_radius, glow_cyan_alpha)
    # Deep violet inner glow with slight downward offset
    violet_mask = text_mask(text, font_obj, w, h, offset_y=offset_y + glow_violet_offset_y)
    glow2 = colored_glow(violet_mask, ACCENT_DEEP, glow_violet_radius, glow_violet_alpha)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow1)
    out = Image.alpha_composite(out, glow2)
    out = Image.alpha_composite(out, grad)
    return out


def draw_centered(canvas, text, font_obj, fill, y_offset=0):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    b = d.textbbox((0, 0), text, font=font_obj)
    tw = b[2] - b[0]
    th = b[3] - b[1]
    cx = canvas.size[0] // 2 - tw // 2 - b[0]
    cy = canvas.size[1] // 2 - th // 2 - b[1] + y_offset
    d.text((cx, cy), text, fill=fill, font=font_obj)
    return Image.alpha_composite(canvas, overlay)


def draw_at(canvas, text, font_obj, fill, cx, cy):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    b = d.textbbox((0, 0), text, font=font_obj)
    tw = b[2] - b[0]
    th = b[3] - b[1]
    x = cx - tw // 2 - b[0]
    y = cy - th // 2 - b[1]
    d.text((x, y), text, fill=fill, font=font_obj)
    return Image.alpha_composite(canvas, overlay)


def add_subtle_dots(canvas, n=80, seed=7):
    rng = np.random.default_rng(seed)
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    xs = rng.uniform(60, W - 60, n)
    ys = rng.uniform(60, H - 60, n)
    rs = rng.uniform(2, 6, n)
    alphas = rng.uniform(20, 70, n).astype(int)
    for x, y, r, a in zip(xs, ys, rs, alphas):
        d.ellipse([x - r, y - r, x + r, y + r], fill=ACCENT + (int(a),))
    return Image.alpha_composite(canvas, overlay)


# === Beat 1: HERITAGE Family Study title card ===
def beat1():
    canvas = base_canvas()
    canvas = add_subtle_dots(canvas)

    title_font = font("SpaceGrotesk-Medium.ttf", 96)
    title_layer = gradient_text_with_glow(
        "HERITAGE FAMILY STUDY",
        title_font,
        [(0.0, ACCENT_CYAN), (0.5, FG), (1.0, ACCENT)],
        W, H, offset_y=-40,
    )
    canvas = Image.alpha_composite(canvas, title_layer)

    sub_font = font("JetBrainsMono-Regular.ttf", 30)
    canvas = draw_centered(canvas, "n = 481   ·   20-WEEK PROGRAM   ·   1999",
                            sub_font, FG_DIM + (255,), y_offset=80)

    canvas.convert("RGB").save(os.path.join(ASSETS_DIR, "beat1_title.png"), "PNG")
    print("beat1_title.png")


# === Beat 2: HERITAGE response distribution histogram ===
def beat2():
    """Histogram of VO2max response. Distribution shape is illustrative
    (normal centered on the published mean), but the count, range, and
    descriptive stats match the published HERITAGE study."""
    rng = np.random.default_rng(42)
    n = 481
    published_mean = 384  # ml/min, per HERITAGE 1999
    sd = 210  # estimated to fit the documented -100 to +1000 range
    data = rng.normal(published_mean, sd, n)
    data = np.clip(data, -100, 1000)

    bin_edges = np.arange(-100, 1101, 100)
    counts, _ = np.histogram(data, bins=bin_edges)

    fig = plt.figure(figsize=(W / 100, H / 100), dpi=100, facecolor=hex_color(BG))
    ax = fig.add_axes((0.09, 0.20, 0.84, 0.58))
    ax.set_facecolor(hex_color(BG))

    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
    bar_colors = []
    for c in bin_centers:
        if c < 100:
            bar_colors.append(hex_color(ACCENT_CYAN))
        elif c >= 800:
            bar_colors.append(hex_color(ACCENT_CYAN))
        else:
            bar_colors.append(hex_color(ACCENT))

    bars = ax.bar(bin_centers, counts, width=88,
                  color=bar_colors,
                  edgecolor=hex_color(BG), linewidth=2,
                  alpha=0.88)

    for bar, c in zip(bars, counts):
        if c > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, c + 2.5,
                    str(int(c)),
                    ha="center", va="bottom",
                    fontsize=15, color=hex_color(FG_DIM),
                    family="JetBrains Mono")

    ax.axvline(published_mean, color=hex_color(FG), linestyle="--", lw=1.2, alpha=0.7)
    ax.text(published_mean + 12, ax.get_ylim()[1] * 0.86,
            f"mean ≈ {published_mean} ml/min",
            color=hex_color(FG), fontsize=16,
            family="Space Grotesk")

    # Bracket annotations for the left and right groups
    left_count = sum(counts[:2])  # bins -100 to +100
    right_count = sum(counts[-2:])  # bins 800 to 1000

    ax.annotate(f"{left_count} of 481\nshowed essentially\nno improvement",
                xy=(0, max(counts[:2]) + 3),
                xytext=(-80, max(counts) * 0.62),
                fontsize=17, color=hex_color(FG),
                ha="left", va="center",
                family="Space Grotesk",
                arrowprops=dict(arrowstyle="-",
                                color=hex_color(ACCENT_CYAN), lw=1.2,
                                connectionstyle="arc3,rad=0.2"))

    ax.annotate(f"{right_count} of 481\nimproved by\nover 800 ml/min",
                xy=(900, max(counts[-2:]) + 3),
                xytext=(700, max(counts) * 0.62),
                fontsize=17, color=hex_color(FG),
                ha="left", va="center",
                family="Space Grotesk",
                arrowprops=dict(arrowstyle="-",
                                color=hex_color(ACCENT_CYAN), lw=1.2,
                                connectionstyle="arc3,rad=-0.2"))

    ax.set_xlabel("VO2 max change after 20 weeks (ml/min)",
                  color=hex_color(FG_DIM), fontsize=22, labelpad=18,
                  family="Space Grotesk")
    ax.set_ylabel("number of participants",
                  color=hex_color(FG_DIM), fontsize=20, labelpad=16,
                  family="Space Grotesk")
    ax.set_xlim(-200, 1100)
    ax.set_xticks(np.arange(-100, 1101, 200))
    ax.tick_params(colors=hex_color(FG_DIM), labelsize=16, pad=8)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("bottom", "left"):
        ax.spines[spine].set_color(hex_color(FG_MUTE))

    fig.text(0.5, 0.91, "Same program. 481 people. Different bodies.",
             ha="center", va="center", fontsize=34,
             color=hex_color(FG),
             family="Space Grotesk", fontweight="medium")

    fig.text(0.09, 0.07,
             "source: Bouchard et al., HERITAGE Family Study, J Appl Physiol, 1999  ·  bin shape illustrative; n, range, mean per published paper",
             ha="left", va="center", fontsize=13,
             color=hex_color(FG_MUTE), family="JetBrains Mono")

    fig.savefig(os.path.join(ASSETS_DIR, "beat2_scatter.png"),
                facecolor=hex_color(BG), dpi=100)
    plt.close(fig)
    print("beat2_scatter.png (histogram)")


# === Helper for split-stat slides (Beat 3 and Beat 4) ===
def split_stats(filename, left_num, left_label, left_cite, right_num, right_label, right_cite):
    canvas = base_canvas()
    big_font = font("SpaceGrotesk-Medium.ttf", 320)
    label_font = font("SpaceGrotesk-Medium.ttf", 30)
    cite_font = font("JetBrainsMono-Regular.ttf", 19)

    half = W // 2

    left_layer = gradient_text_with_glow(
        left_num, big_font,
        [(0.0, ACCENT_CYAN), (0.5, FG), (1.0, ACCENT)],
        half, H, offset_y=-40,
    )
    left_padded = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    left_padded.paste(left_layer, (0, 0))
    canvas = Image.alpha_composite(canvas, left_padded)

    right_layer = gradient_text_with_glow(
        right_num, big_font,
        [(0.0, ACCENT_CYAN), (0.5, FG), (1.0, ACCENT)],
        half, H, offset_y=-40,
    )
    right_padded = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    right_padded.paste(right_layer, (half, 0))
    canvas = Image.alpha_composite(canvas, right_padded)

    # Vertical divider line
    sep = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sep)
    sd.line([(half, H // 2 - 200), (half, H // 2 + 250)],
            fill=FG_MUTE + (60,), width=1)
    canvas = Image.alpha_composite(canvas, sep)

    canvas = draw_at(canvas, left_label, label_font, FG_DIM + (255,),
                     cx=half // 2, cy=H // 2 + 200)
    canvas = draw_at(canvas, left_cite, cite_font, FG_MUTE + (255,),
                     cx=half // 2, cy=H // 2 + 250)

    canvas = draw_at(canvas, right_label, label_font, FG_DIM + (255,),
                     cx=half + half // 2, cy=H // 2 + 200)
    canvas = draw_at(canvas, right_cite, cite_font, FG_MUTE + (255,),
                     cx=half + half // 2, cy=H // 2 + 250)

    canvas.convert("RGB").save(os.path.join(ASSETS_DIR, filename), "PNG")
    print(filename)


def beat3():
    split_stats(
        "beat3_nonresponse.png",
        "20%", "ENDURANCE NON-RESPONSE",
        "meta-analysis, Frontiers in Physiology, 2021",
        "26%", "RESISTANCE NON-RESPONSE",
        "Univ. of Alabama, 16-week resistance trial",
    )


def beat4():
    split_stats(
        "beat4_dropout.png",
        "50%", "QUIT WITHIN SIX MONTHS",
        "industry retention data, multiple sources",
        "67%", "MEMBERSHIPS UNUSED",
        "US gym membership analyses, 2026",
    )


# === Beat 5: doppel wordmark + tagline ===
def beat5_doppel():
    canvas = base_canvas()
    word_font = font("SpaceGrotesk-Medium.ttf", 360)
    layer = gradient_text_with_glow(
        "doppel",
        word_font,
        [(0.0, ACCENT_CYAN), (0.5, FG), (0.75, ACCENT), (1.0, ACCENT_DEEP)],
        W, H, offset_y=0,
        glow_cyan_radius=42, glow_cyan_alpha=0.5,
        glow_violet_radius=22, glow_violet_alpha=0.6,
    )
    canvas = Image.alpha_composite(canvas, layer)
    canvas.convert("RGB").save(os.path.join(ASSETS_DIR, "beat5_doppel.png"), "PNG")
    print("beat5_doppel.png")


def beat5_tagline():
    canvas = base_canvas()
    word_font = font("SpaceGrotesk-Medium.ttf", 320)
    layer = gradient_text_with_glow(
        "doppel",
        word_font,
        [(0.0, ACCENT_CYAN), (0.5, FG), (0.75, ACCENT), (1.0, ACCENT_DEEP)],
        W, H, offset_y=-80,
        glow_cyan_radius=38, glow_cyan_alpha=0.5,
        glow_violet_radius=20, glow_violet_alpha=0.6,
    )
    canvas = Image.alpha_composite(canvas, layer)

    tag_font = font("SpaceGrotesk-Regular.ttf", 46)
    canvas = draw_centered(canvas, "train smarter by testing your future first.",
                            tag_font, FG_DIM + (255,), y_offset=140)

    canvas.convert("RGB").save(os.path.join(ASSETS_DIR, "beat5_tagline.png"), "PNG")
    print("beat5_tagline.png")


if __name__ == "__main__":
    beat1()
    beat2()
    beat3()
    beat4()
    beat5_doppel()
    beat5_tagline()
    print("done.")
