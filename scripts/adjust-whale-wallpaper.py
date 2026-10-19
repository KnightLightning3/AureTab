"""Reproduce the wallpaper layout without image generation; original artwork stays intact."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True, help='Path to the original generated artwork')
args = parser.parse_args()
image = Image.open(args.source).convert('RGB')
w, h = image.size
scale = .78
right_margin = .065
background = image.crop((int(w * .08), 0, int(w * .55), h)).resize((w, h), Image.Resampling.BICUBIC)
scaled = image.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
x, y = w - scaled.width - round(w * right_margin), (h - scaled.height) // 2
mask = Image.new('L', scaled.size, 255)
draw = ImageDraw.Draw(mask)
for inset in range(6):
    draw.rectangle((inset, inset, scaled.width - 1 - inset, scaled.height - 1 - inset), outline=round(255 * inset / 5))
mask = mask.filter(ImageFilter.GaussianBlur(.5))
background.paste(scaled, (x, y), mask)
output = ROOT / 'output/wallpapers/deepseek-whale-girl-small-left.png'
background.save(output)
params = {
    'source': str(args.source), 'output': output.name,
    'canvas': [w, h], 'scale': scale,
    'right_margin_fraction': right_margin,
    'previous_right_margin_fraction': .025,
    'additional_left_shift_fraction': .04,
    'scaled_size': list(scaled.size), 'paste_position': [x, y],
    'vertical_alignment': 'center', 'background_sample_x_fraction': [.08, .55],
    'edge_feather_pixels': 6, 'edge_blur_radius': .5,
    'note': 'Scale the full original, keep character at right; reserve additional space for cover cropping. No generation.'
}
(output.parent / 'deepseek-whale-girl-layout.json').write_text(json.dumps(params, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(params, ensure_ascii=False))
