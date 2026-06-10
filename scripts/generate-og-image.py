#!/usr/bin/env python3
"""Build assets/og-image.png (1200x630) from the UI screenshot + footer CTA."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "og-screenshot-source.png"
OUT = ROOT / "assets" / "og-image.png"
CINZEL = ROOT / "assets" / "fonts" / "Cinzel.ttf"

W, H = 1200, 630
FOOTER = 88
PAD_X = 40
BG = (11, 12, 14)


def cinzel(size: int, weight: int = 700) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(CINZEL, size)
    if hasattr(font, "set_variation_by_axes"):
        font.set_variation_by_axes([weight])
    return font


def bronze_button(size: tuple[int, int]) -> Image.Image:
    btn_w, btn_h = size
    btn = Image.new("RGBA", size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(btn)
    for y in range(btn_h):
        t = y / max(btn_h - 1, 1)
        r = int(230 * (1 - t) + 138 * t)
        g = int(189 * (1 - t) + 106 * t)
        b = int(107 * (1 - t) + 47 * t)
        bd.line([(0, y), (btn_w, y)], fill=(r, g, b, 255))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, btn_w, btn_h], radius=5, fill=255)
    btn.putalpha(mask)
    return btn


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source screenshot: {SRC}")

    shot_h = H - FOOTER
    shot = Image.open(SRC).convert("RGBA").resize((W, shot_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    canvas.paste(shot, (0, 0))

    fade_h = 36
    fade = Image.new("RGBA", (W, fade_h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for y in range(fade_h):
        alpha = int(255 * (y / (fade_h - 1)) ** 1.15)
        fd.line([(0, y), (W, y)], fill=BG + (alpha,))
    canvas.paste(fade, (0, shot_h - fade_h), fade)

    draw = ImageDraw.Draw(canvas)
    font_brand = cinzel(30)
    font_cta = cinzel(18)

    brand = "Gothic Lock Breaker"
    cta = "BREAK THE LOCK"

    fy = shot_h
    draw.line([(0, fy), (W, fy)], fill=(199, 154, 75, 110), width=1)
    # Slightly above geometric center — footer content reads low otherwise.
    cy = fy + FOOTER * 0.44

    draw.text(
        (PAD_X, cy),
        brand,
        font=font_brand,
        fill=(230, 189, 107, 255),
        anchor="lm",
    )

    cta_bb = draw.textbbox((0, 0), cta, font=font_cta)
    cta_w, cta_h = cta_bb[2] - cta_bb[0], cta_bb[3] - cta_bb[1]
    btn_pad_x, btn_pad_y = 26, 14
    btn_w = cta_w + btn_pad_x * 2
    btn_h = cta_h + btn_pad_y * 2
    btn_x0 = W - PAD_X - btn_w
    btn_y0 = round(cy - btn_h / 2)
    btn_cx = btn_x0 + btn_w / 2

    btn_img = bronze_button((btn_w, btn_h))
    canvas.paste(btn_img, (btn_x0, btn_y0), btn_img)
    draw.text((btn_cx, cy), cta, font=font_cta, fill=(22, 15, 4, 255), anchor="mm")

    canvas.convert("RGB").save(OUT, optimize=True)
    print(f"Wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
