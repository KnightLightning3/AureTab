/** Persisted values are deliberately a closed palette, never arbitrary CSS. */
export const ICON_BACKGROUNDS = Object.freeze([
  { value: 'glass', label: '毛玻璃', color: null },
  ...[
    ['#000000', '黑色'], ['#ffffff', '白色'], ['#334155', '岩灰'],
    ['#2563eb', '湖蓝'], ['#0f766e', '松绿'], ['#4d7c0f', '橄榄'],
    ['#b45309', '琥珀'], ['#be123c', '玫红'], ['#7c3aed', '紫罗兰'],
  ].map(([color, label]) => ({ value: color, label, color })),
].map(Object.freeze));

function foreground(color) {
  const rgb = color.slice(1).match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
}

/** Call again after replacing the image; glass leaves theme styling in control. */
export function applyIconBackground(element, value) {
  const background = ICON_BACKGROUNDS.find(option => option.value === value) ?? ICON_BACKGROUNDS[0];
  element.dataset.background = background.value;
  const ink = background.color ? foreground(background.color) : '';
  element.style.backgroundColor = background.color ?? '';
  element.style.color = ink;
  if (ink) element.style.setProperty('--icon-mono-filter', ink === '#ffffff' ? 'brightness(0) invert(1)' : 'brightness(0)');
  else element.style.removeProperty('--icon-mono-filter');
  for (const image of element.querySelectorAll('img')) {
    image.style.filter = ink && element.dataset.mono === 'true'
      ? (ink === '#ffffff' ? 'brightness(0) invert(1)' : 'brightness(0)') : '';
  }
}
