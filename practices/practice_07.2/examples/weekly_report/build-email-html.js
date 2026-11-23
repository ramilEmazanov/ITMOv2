// n8n Code: Run Once for All Items. Вариант для сдачи: простое HTML-письмо с таблицами.
const r = $input.first().json;
const labels = ['bug', 'task', 'feature', 'needs-triage'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const delta = value => value > 0 ? `+${value}` : String(value);
const compare = r.has_previous === true;
const table = (headers, rows) => `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0"><thead><tr>${headers.map(h => `<th align="left">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const headers = ['Тип', 'За неделю', ...(compare ? ['Прошлая неделя', 'Δ'] : [])];
const rows = labels.map(label => [label, r.by_type[label], ...(compare
  ? [r.previous.by_type[label], delta(r.delta.by_type[label])] : [])]);
rows.push(['Итого', r.total, ...(compare ? [r.previous.total, delta(r.delta.total)] : [])]);
const authors = r.by_author.map(a => [a.author, a.total, ...labels.map(k => a[k])]);
const html = `<!doctype html><html lang="ru"><body style="font-family:Arial,sans-serif;color:#202124;padding:20px">
<h1>Недельный отчёт RouteFinder</h1>
<p>${esc(r.week_start)} — ${esc(r.last_day)}, ${esc(r.timezone)}</p>
<p>Классифицированные Issues, созданные за период. Учтены открытые и закрытые обращения.</p>
<h2>По типам</h2>${table(headers, rows)}
${r.has_previous === false ? '<p>Нет данных предыдущей недели для сравнения.</p>' : ''}
<h2>По авторам</h2>${authors.length ? table(['Автор', 'Всего', ...labels], authors) : '<p>За неделю обращений нет.</p>'}
${r.ai_comment ? `<h2>AI-комментарий недели</h2><p>${esc(r.ai_comment).replace(/\n/g, '<br>')}</p>` : ''}
<p><a href="https://github.com/ramilEmazanov/RouteFinder/issues">Issues репозитория</a></p>
</body></html>`;
return [{ json: {
  ...r,
  subject: `${r.is_test ? '[ТЕСТ] ' : ''}RouteFinder: Issues за ${r.week_start} — ${r.last_day}`,
  html,
} }];
