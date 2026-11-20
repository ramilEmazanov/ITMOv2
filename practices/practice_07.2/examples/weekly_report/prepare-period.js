// n8n Code: Run Once for All Items.
// Расчёт календарных недель для Europe/Moscow (UTC+03:00).
const cfg = $input.first().json;
const repo = 'ramilEmazanov/RouteFinder';
const timezone = 'Europe/Moscow';
const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(now).map(p => [p.type, p.value]));
const today = `${parts.year}-${parts.month}-${parts.day}`;
const localMidnight = new Date(`${today}T00:00:00+03:00`);
const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
const thisMonday = new Date(localMidnight.getTime() - ((weekday + 6) % 7) * dayMs);
const override = String(cfg.test_week_start ?? '').trim();
let start = new Date(thisMonday.getTime() - 7 * dayMs);
if (override) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) throw new Error('Use YYYY-MM-DD');
  start = new Date(`${override}T00:00:00+03:00`);
  const check = new Date(`${override}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || check.toISOString().slice(0, 10) !== override
      || check.getUTCDay() !== 1) throw new Error('test_week_start must be a valid Monday');
  if (start > now) throw new Error('Test week cannot start in the future');
}
const end = new Date(start.getTime() + 7 * dayMs);
const localDate = value => new Date(value.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
const weekStart = localDate(start);
const prevStart = localDate(new Date(start.getTime() - 7 * dayMs));
const secIso = value => value.toISOString().replace('.000Z', 'Z');
return [{ json: {
  repo, timezone,
  to_email: String(cfg.to_email ?? '').trim(),
  week_start: weekStart,
  week_end: localDate(end),
  last_day: localDate(new Date(end.getTime() - dayMs)),
  start_iso: secIso(start),
  end_iso: secIso(end),
  search_range: `${secIso(start)}..${secIso(new Date(end.getTime() - 1000))}`,
  week_key: `${repo}|${weekStart}`,
  previous_week_key: `${repo}|${prevStart}`,
  previous_week_start: prevStart,
  is_test: Boolean(override),
  is_partial: end > now,
  definition: 'Issues created in [start,end), open and closed, one classification label',
} }];
