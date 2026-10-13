"""Find the main colour of a clothing photo and name it."""

import colorsys
from collections import Counter

from PIL import Image

SAMPLE_SIDE = 96
OPAQUE_ALPHA = 128
BUCKET_SHIFT = 3  # 32 levels per channel


def dominant_color(image: Image.Image, *, center_only: bool = False) -> tuple[int, int, int]:
    """Most common colour among the visible pixels.

    With `center_only`, just the middle of the frame is sampled, which is the
    best guess at the garment when the background could not be removed.
    """
    rgba = image.convert("RGBA")
    if center_only:
        w, h = rgba.size
        rgba = rgba.crop((w // 4, h // 4, w - w // 4, h - h // 4))
    rgba.thumbnail((SAMPLE_SIDE, SAMPLE_SIDE))

    pixels = [(r, g, b) for r, g, b, a in rgba.get_flattened_data() if a >= OPAQUE_ALPHA]
    if not pixels:
        return (128, 128, 128)

    def bucket(p: tuple[int, int, int]) -> tuple[int, int, int]:
        return (p[0] >> BUCKET_SHIFT, p[1] >> BUCKET_SHIFT, p[2] >> BUCKET_SHIFT)

    top_bucket, _ = Counter(bucket(p) for p in pixels).most_common(1)[0]
    members = [p for p in pixels if bucket(p) == top_bucket]
    n = len(members)
    return (
        sum(p[0] for p in members) // n,
        sum(p[1] for p in members) // n,
        sum(p[2] for p in members) // n,
    )


def to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def color_name(rgb: tuple[int, int, int]) -> str:
    """Map an RGB value onto the colour families the style engine understands."""
    h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    hue = h * 360

    if l < 0.13:
        return "black"
    if l > 0.88 and s < 0.35:
        return "white"
    if s < 0.12:
        return "gray"
    if 195 <= hue < 260 and l < 0.28:
        return "navy"
    if 10 <= hue < 50:
        if l < 0.42:
            return "brown"
        if s < 0.5 and l > 0.6:
            return "beige"

    if hue < 15 or hue >= 345:
        return "pink" if l > 0.72 else "red"
    if hue < 45:
        return "orange"
    if hue < 70:
        return "yellow"
    if hue < 170:
        return "green"
    if hue < 255:
        return "blue"
    if hue < 290:
        return "purple"
    return "pink"
