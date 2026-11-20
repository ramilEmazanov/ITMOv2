// n8n Code: Run Once for All Items. Вход от Get Previous Week (Always Output Data).
const current = $('Aggregate Stats').first().json;
const rows = $input.all().map(i => i.json).filter(row => row.week_key === current.previous_week_key);
if (rows.length > 1) throw new Error('Duplicate previous-week rows in Data Table');
if (!rows.length) return [{ json: { ...current, has_previous: false, previous: null, delta: null } }];
const previous = JSON.parse(rows[0].snapshot_json);
if (previous.schema_version !== current.schema_version
    || previous.week_key !== current.previous_week_key
    || previous.repo !== current.repo
    || previous.timezone !== current.timezone
    || previous.definition !== current.definition
    || previous.is_partial) throw new Error('Previous snapshot is incompatible or incomplete');
const labels = ['bug', 'task', 'feature', 'needs-triage'];
if (!Number.isInteger(previous.total) || previous.total < 0
    || labels.some(k => !Number.isInteger(previous.by_type?.[k]) || previous.by_type[k] < 0)
    || labels.reduce((s,k) => s + previous.by_type[k], 0) !== previous.total
    || !Array.isArray(previous.by_author)
    || previous.by_author.some(row => !Number.isInteger(row.total) || row.total < 0)
    || previous.by_author.reduce((s,row) => s + row.total, 0) !== previous.total) {
  throw new Error('Invalid previous snapshot counts');
}
const byType = Object.fromEntries(labels.map(k => [k, current.by_type[k] - previous.by_type[k]]));
const oldAuthors = new Map(previous.by_author.map(row => [row.author, row.total]));
const newAuthors = new Map(current.by_author.map(row => [row.author, row.total]));
const byAuthor = [...new Set([...oldAuthors.keys(), ...newAuthors.keys()])].sort().map(author => ({
  author, delta: (newAuthors.get(author) ?? 0) - (oldAuthors.get(author) ?? 0),
}));
return [{ json: {
  ...current, has_previous: true, previous,
  previous_is_test: previous.is_test === true,
  delta: { total: current.total - previous.total, by_type: byType, by_author: byAuthor },
} }];
