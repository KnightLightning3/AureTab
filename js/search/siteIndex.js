export function searchSites(sites, query, limit = 24) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return [];
  const matches = [];
  for (const site of sites) {
    const fields = [site.name, site.domain, ...(site.aliases ?? [])];
    let score = Infinity;
    for (const field of fields) {
      const value = String(field ?? '').toLowerCase();
      if (value === needle) score = Math.min(score, 0);
      else if (value.startsWith(needle)) score = Math.min(score, 1);
      else if (value.includes(needle)) score = Math.min(score, 2);
    }
    if (score !== Infinity) matches.push({ score, site });
  }
  matches.sort((a, b) => a.score - b.score);
  return matches.slice(0, limit).map(match => match.site);
}
