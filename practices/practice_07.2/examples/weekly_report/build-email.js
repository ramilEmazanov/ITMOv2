// n8n Code: Run Once for All Items. Письмо обычным текстом.
const r = $input.first().json;
const labels = ['bug', 'task', 'feature', 'needs-triage'];
const hasComparison = r.has_previous === true;
const formatDelta = value => value > 0 ? `+${value}` : String(value);
const metric = (name, current, previous, difference) => hasComparison
  ? `${name}: ${current} (прошлая неделя: ${previous}, Δ ${formatDelta(difference)})`
  : `${name}: ${current}`;

const lines = [
  'Недельный отчёт RouteFinder',
  `${r.week_start} — ${r.last_day}, ${r.timezone}`,
  '',
  'Классифицированные Issues, созданные за период. Учтены открытые и закрытые обращения.',
  '',
  metric('Всего', r.total, r.previous?.total, r.delta?.total),
  '',
  'По типам:',
  ...labels.map(label => metric(
    label, r.by_type[label], r.previous?.by_type?.[label], r.delta?.by_type?.[label],
  )),
];

if (r.has_previous === false) {
  lines.push('', 'Нет данных предыдущей недели для сравнения.');
}

lines.push('', 'По авторам:');
if (r.by_author.length) {
  for (const author of r.by_author) {
    lines.push(`${author.author}: всего ${author.total}; ${labels.map(label => `${label}: ${author[label]}`).join(', ')}`);
  }
} else {
  lines.push('За неделю обращений нет.');
}

if (r.ai_comment) {
  lines.push('', 'AI-комментарий недели:', String(r.ai_comment).trim());
}
lines.push('', 'Issues репозитория: https://github.com/ramilEmazanov/RouteFinder/issues');

return [{ json: {
  ...r,
  subject: `${r.is_test ? '[ТЕСТ] ' : ''}RouteFinder: Issues за ${r.week_start} — ${r.last_day}`,
  text: lines.join('\n'),
} }];
