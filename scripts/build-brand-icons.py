"""Render the simple brand SVG to antialiased PNGs (requires Pillow for development)."""
from pathlib import Path
import xml.etree.ElementTree as ET
import re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / 'assets/brand'


def path_points(path):
    """Flatten the brand's absolute M/L/Q/C/Z curves for Pillow export."""
    tokens = re.findall(r'[MLQCZ]|-?\d+(?:\.\d+)?', path)
    points, current, index = [], (0, 0), 0
    while index < len(tokens):
        command = tokens[index]
        index += 1
        if command == 'Z':
            continue
        count = {'M': 2, 'L': 2, 'Q': 4, 'C': 6}.get(command)
        if count is None:
            raise ValueError(f'Unsupported path command: {command}')
        values = [float(value) for value in tokens[index:index + count]]
        index += count
        control = [current] + list(zip(values[::2], values[1::2]))
        if command in ('M', 'L'):
            points.append(control[-1])
        else:
            for step in range(1, 33):
                t = step / 32
                curve = control
                while len(curve) > 1:
                    curve = [((1-t)*a[0]+t*b[0], (1-t)*a[1]+t*b[1])
                             for a, b in zip(curve, curve[1:])]
                points.append(curve[0])
        current = control[-1]
    return points


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
        elif tag == 'path':
            points = [(x * scale, y * scale) for x, y in path_points(element.get('d'))]
            draw.polygon(points, fill=element.get('fill'))
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
