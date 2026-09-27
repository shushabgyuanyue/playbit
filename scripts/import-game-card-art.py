"""Crop the supplied card artwork and export lightweight transparent WebP faces."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
for name in ('gold', 'coral', 'blue', 'back'):
    parser.add_argument(name, type=Path)
args = parser.parse_args()
assets = Path(__file__).resolve().parents[1] / 'apps/web/src/assets'
bounds = {
    'gold': (102, 88, 984, 1358),
    'coral': (95, 65, 991, 1329),
    'blue': (98, 90, 989, 1358),
    'back': (90, 123, 996, 1327),
}
for name, box in bounds.items():
    source = Image.open(getattr(args, name)).convert('RGBA')
    if source.size != (1086, 1448):
        raise ValueError(f'{name}: expected the supplied 1086x1448 artwork')
    card = source.crop(box)
    mask = Image.new('L', card.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=60 if name != 'back' else 44, fill=255)
    card.putalpha(mask)
    card.thumbnail((720, 1040), Image.Resampling.LANCZOS)
    target = assets / f'game-card-{name}.webp'
    card.save(target, quality=86, method=6)
    print(f'{target.name}: {target.stat().st_size // 1024} KB')
