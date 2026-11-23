// Отдельный разовый тестовый путь: Prepare Period -> эта Code node -> Data Table Insert.
// Создаёт данные предыдущей недели. Не подключать к рабочему расписанию.
const p = $('Prepare Period').first().json;
const weekStart = p.previous_week_start;
const end = new Date(`${p.week_start}T00:00:00+03:00`);
const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const counts = { bug: 2, task: 2, feature: 1, 'needs-triage': 1 };
const snapshot = {
  schema_version: 1, repo: p.repo, timezone: p.timezone,
  week_key: p.previous_week_key, week_start: weekStart, week_end: p.week_start,
  last_day: lastDay, definition: p.definition, is_test: true, is_partial: false,
  total: 6, by_type: counts,
  by_author: [{ author: 'demo-author', total: 6, ...counts }],
  generated_at: new Date().toISOString(),
};
return [{ json: {
  week_key: snapshot.week_key, repo: p.repo, week_start: weekStart,
  week_end: p.week_start, timezone: p.timezone, total: 6,
  is_test: true, snapshot_json: JSON.stringify(snapshot),
} }];
