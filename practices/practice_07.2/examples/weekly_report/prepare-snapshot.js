// n8n Code: Run Once for All Items. Перед Data Table Upsert.
const r = $input.first().json;
const { to_email, previous, delta, has_previous, previous_is_test, ...snapshot } = r;
return [{ json: {
  week_key: r.week_key, repo: r.repo, week_start: r.week_start,
  week_end: r.week_end, timezone: r.timezone, total: r.total,
  is_test: r.is_test, snapshot_json: JSON.stringify(snapshot),
} }];
