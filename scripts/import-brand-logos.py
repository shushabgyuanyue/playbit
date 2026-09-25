"""Crop transparent user-supplied logos and export small reusable WebP assets."""
import argparse
from pathlib import Path

from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('panda', type=Path)
parser.add_argument('rabbit', type=Path)
args = parser.parse_args()
assets = Path(__file__).resolve().parents[1] / 'apps/web/src/assets'
for name in ('panda', 'rabbit'):
    source = Image.open(getattr(args, name)).convert('RGBA')
    bounds = source.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError(f'{name} is entirely transparent')
    logo = source.crop(bounds)
    logo.thumbnail((320, 320), Image.Resampling.LANCZOS)
    logo.save(assets / f'brand-{name}-logo.webp', quality=95)
