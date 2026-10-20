"""Render the simple brand SVG to antialiased PNGs (requires Pillow for development)."""
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'assets/brand'


def render(size):
    # Keep SVG geometry as the single source of truth; fail on unsupported artwork.
    scale = size * 4 / 128
    image = Image.new('RGBA', (size * 4, size * 4))
    draw = ImageDraw.Draw(image)
    for element in ET.parse(BRAND / 'auretab.svg').getroot():
        tag = element.tag.rsplit('}', 1)[-1]
        if tag == 'title':
            continue
        if tag == 'rect':
            x, y, w, h, r = [float(element.get(k, '0')) * scale
                             for k in ('x', 'y', 'width', 'height', 'rx')]
            draw.rounded_rectangle((x, y, x + w, y + h), radius=r, fill=element.get('fill'))
        elif tag == 'polygon':
            points = [tuple(float(v) * scale for v in point.split(','))
                      for point in element.get('points').split()]
            draw.polygon(points, fill=element.get('fill'))
        else:
            raise ValueError(f'Unsupported brand SVG element: {tag}')
    image.resize((size, size), Image.Resampling.LANCZOS).save(BRAND / f'icon-{size}.png')


if __name__ == '__main__':
    for size in (16, 32, 48, 128, 300, 512):
        render(size)
    print('Generated AureTab icons: 16, 32, 48, 128, 300, 512 px')
