"""Turn an uploaded photo into a stored, background-free PNG."""

import io
import logging
import uuid
from dataclasses import dataclass
from functools import lru_cache

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from .color import color_name, dominant_color, to_hex
from .config import settings

log = logging.getLogger(__name__)

register_heif_opener()  # iPhones and some Samsungs save photos as HEIC


class InvalidImage(ValueError):
    pass


@dataclass
class ProcessedImage:
    filename: str
    color: str
    color_hex: str
    background_removed: bool


@lru_cache(maxsize=1)
def _rembg_session():
    from rembg import new_session

    return new_session("u2net")


def warm_up() -> None:
    """Load the model ahead of the first upload, which would otherwise wait on it."""
    if not settings.remove_backgrounds:
        return
    try:
        _rembg_session()
    except Exception:
        log.exception("Could not load the background removal model")


def remove_background(image: Image.Image) -> Image.Image | None:
    """Return the garment on a transparent background, or None if that failed."""
    if not settings.remove_backgrounds:
        return None
    try:
        from rembg import remove

        cutout = remove(image, session=_rembg_session())
    except Exception:
        log.exception("Background removal failed; keeping the original photo")
        return None
    bbox = cutout.getbbox()
    if bbox is None:  # the model erased everything
        return None
    return cutout.crop(bbox)


def process_upload(data: bytes) -> ProcessedImage:
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImage("That file is not a readable image") from exc

    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((settings.max_image_side, settings.max_image_side))

    cutout = remove_background(image)
    final = cutout if cutout is not None else image
    rgb = dominant_color(final, center_only=cutout is None)

    settings.media_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.png"
    final.save(settings.media_dir / filename, format="PNG", optimize=True)

    return ProcessedImage(
        filename=filename,
        color=color_name(rgb),
        color_hex=to_hex(rgb),
        background_removed=cutout is not None,
    )


def delete_image(filename: str) -> None:
    (settings.media_dir / filename).unlink(missing_ok=True)
