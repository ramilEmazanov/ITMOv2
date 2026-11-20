// n8n Code: Run Once for All Items. Имена HTTP-нод должны совпадать.
const p = $('Prepare Period').first().json;
const labels = ['bug', 'task', 'feature', 'needs-triage'];
const sources = ['Fetch Bug', 'Fetch Task', 'Fetch Feature', 'Fetch Triage'];
const issues = new Map();
for (const source of sources) {
  const pages = $(source).all().map(item => item.json);
  if (!pages.length) throw new Error(`${source}: no API response`);
  const sourceIds = new Set();
  let expected = 0;
  for (const page of pages) {
    if (!Array.isArray(page.items) || !Number.isInteger(page.total_count)
        || page.total_count < 0) throw new Error(`${source}: unexpected response`);
    if (page.incomplete_results !== false) throw new Error(`${source}: incomplete search`);
    expected = Math.max(expected, page.total_count);
    if (expected > 1000) throw new Error(`${source}: narrow the interval, GitHub search limit is 1000`);
    for (const issue of page.items) {
      sourceIds.add(issue.id);
      if (issue.pull_request) continue;
      const date = Date.parse(issue.created_at);
      if (!Number.isFinite(date)) throw new Error('Invalid issue created_at');
      if (date < Date.parse(p.start_iso) || date >= Date.parse(p.end_iso)) continue;
      const assigned = (issue.labels ?? []).map(l => typeof l === 'string' ? l : l.name)
        .filter(l => labels.includes(l));
      if (assigned.length !== 1) throw new Error(`Issue #${issue.number}: expected exactly one classification label`);
      issues.set(issue.id, {
        id: issue.id, number: issue.number, type: assigned[0],
        author: issue.user?.login ?? '(deleted)', url: issue.html_url,
      });
    }
  }
  if (sourceIds.size < expected) throw new Error(`${source}: missing pages or changing search results`);
}
const emptyCounts = () => Object.fromEntries(labels.map(k => [k, 0]));
const byType = emptyCounts();
const authors = new Map();
for (const issue of issues.values()) {
  byType[issue.type]++;
  if (!authors.has(issue.author)) authors.set(issue.author, { author: issue.author, total: 0, ...emptyCounts() });
  const row = authors.get(issue.author);
  row.total++;
  row[issue.type]++;
}
return [{ json: {
  ...p, schema_version: 1,
  total: issues.size, by_type: byType,
  by_author: [...authors.values()].sort((a,b) => b.total - a.total || a.author.localeCompare(b.author)),
  generated_at: new Date().toISOString(),
} }];
