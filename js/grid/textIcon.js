const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
/** Preserve stored text; only compact tiles abbreviate visible graphemes. */
export function displayIconText(text, size = '1x1') {
  if (size === '2x1') return text;
  return [...segmenter.segment(text)].slice(0, 3).map(part => part.segment).join('');
}
