# Дополнения для защиты: дедупликация, first-time-contributor и HTML-письмо

Этот гайд расширяет уже работающие `01_issue_intake` и `03_weekly_report`. Классификатор `02_classify_issue` менять не требуется.

Основание — [презентация занятия](presentation.pdf): задания на слайдах 18–19 и 22, итоговое домашнее задание на слайде 23. В отличие от таблицы баллов README, слайд 23 прямо включает дедупликацию. Там же разрешён «Gmail node (или подобную)», поэтому Send Email через SMTP сохраняем. Формат письма по заданию — HTML с таблицей.

Также на слайде 16 показаны шаблонные ответы для известных типов. Ниже добавим один общий ответ для bug/task/feature и приветствие для нового участника в этом же комментарии. **Unknown останется без комментария**, даже если автор новый.

Все имена в кавычках ниже — имена нод, которые ты задаёшь сам. Тип ноды отдельно указан в каждом шаге. На время изменения деактивируй основной workflow, сохрани его экспорт, затем после проверки снова активируй. Не запускай параллельно старую и новую копии webhook-сценария.

## 1. Подготовить GitHub

1. В RouteFinder создай label **`first-time-contributor`**, если его нет. Это дополнительная метка автора, а не классификационный тип.
2. Проверь, что в основной ветке есть **`CONTRIBUTING.md`** с понятными инструкциями для участников. Если файла нет, создай его в репозитории: как описывать баг, предлагать функцию, запускать проверки. Не публикуй приветствие с неработающей ссылкой.
3. Для тестового Issue открой Output `Github Trigger` и найди `body.issue.author_association`. По условию учебного задания нового участника определяем значением **`NONE`**. Для подтверждения нужен реальный payload с таким значением, а не ручная подстановка.

`author_association` описывает отношение автора к репозиторию. Проверка `NONE` реализует правило занятия, но сама по себе не гарантирует, что человек никогда раньше не создавал Issues. [Событие GitHub issues](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issues).

## 2. Расширить Prepare Issue

В `01_issue_intake` открой существующую **Edit Fields (Set)** с именем **`Prepare Issue`**. Сохрани текущие поля owner, repo, issue_number, title, body, issue_url. Добавь:

| Поле | Тип | Значение в режиме Expression |
|---|---|---|
| `issue_key` | String | `{{ $json.body.repository.full_name + '#' + $json.body.issue.number }}` |
| `issue_id` | String | `{{ String($json.body.issue.id) }}` |
| `author` | String | `{{ $json.body.issue.user.login }}` |
| `author_association` | String | `{{ $json.body.issue.author_association }}` |
| `created_at` | String | `{{ $json.body.issue.created_at }}` |

Здесь используется `$json.body...`, поскольку на вход Prepare Issue приходит исходный webhook после If.

Пример ключа: `ramilEmazanov/RouteFinder#42`. Номер 42 приведён для примера; используй реальный номер тестового Issue. Ключ включает репозиторий: Issue #42 в другом проекте не считается тем же обращением.

`Build Route` уже восстанавливает весь объект из Prepare Issue через spread `...issue`, поэтому новые поля он сохранит автоматически.

## 3. Создать отдельную таблицу processed_issues

В том же проекте n8n открой **Data Tables → Create Data Table**. Имя — **`processed_issues`**.

Добавь пользовательские колонки:

| Колонка | Тип | Назначение |
|---|---|---|
| `issue_key` | String | Репозиторий и номер Issue, ключ проверки |
| `issue_id` | String | ID Issue из GitHub |
| `issue_number` | Number | Номер Issue |
| `repo` | String | Полное имя репозитория |
| `author` | String | Логин автора |
| `created_at` | String | Дата создания Issue из GitHub |
| `processed_at` | String | Когда сценарий закончил обработку |
| `route` | String | bug/task/feature/unknown |

Не путай `created_at` с автоматически добавленной колонкой n8n `createdAt`. Первое поле хранит дату Issue, второе — дату строки таблицы.

`processed_issues` и `weekly_stats` решают разные задачи. Первую читаем при каждом событии Issue; вторую используем для недельного отчёта.

## 4. Проверить Issue до вызова классификатора

### 4.1. Read Processed Issue

Разорви связь `Prepare Issue → Call classifier`. Между ними добавь **Data Table**, назови **`Read Processed Issue`**:

| Настройка | Значение |
|---|---|
| Resource | Row |
| Operation | Get |
| Data table | processed_issues |
| Condition column | issue_key |
| Condition | Equals |
| Condition value, Expression | `{{ $json.issue_key }}` |
| Return All | Включено |
| Settings → Always Output Data | Включено |

Always Output Data нужен, чтобы новая запись, которой ещё нет в таблице, не завершила сценарий из-за пустого результата.

### 4.2. Check Processed

После Get добавь **Code**, назови **`Check Processed`**, язык JavaScript, **Run Once for All Items**:

```javascript
const issue = $('Prepare Issue').first().json;
const matches = $input.all().map(item => item.json)
  .filter(row => row.issue_key === issue.issue_key);

return [{ json: {
  ...issue,
  already_processed: matches.length > 0,
} }];
```

### 4.3. Already Processed?

Добавь **If**, назови **`Already Processed?`**:

- Первое поле: Expression `{{ $json.already_processed }}`.
- Тип: **Boolean**.
- Операция: **is true**.
- Выход **true** оставь неподключённым: Issue уже обработан, запуск заканчивается.
- Выход **false** подключи к существующему **`Call classifier`**.

Получится:

```text
Github Trigger → If → Prepare Issue
  → Read Processed Issue → Check Processed → Already Processed?
      true: завершение
      false: Call classifier → Build Route → Switch by Type
```

Тестируем обычные последовательные запуски. Этот вариант не является атомарной блокировкой: два одновременных запуска могут оба увидеть отсутствие строки. Для учебной проверки выполняй доставку и повтор последовательно; при доступной настройке concurrency ограничь обработку этого сценария одним запуском. Для промышленной защиты нужна блокировка или уникальный ключ с атомарным захватом.

## 5. Добавить ответ и приветствие только для известных типов

Сначала обрабатываем классификацию и ставим соответствующий label. Затем добавляем ответ для bug/task/feature. Ветку unknown к этому пути не подключаем.

### 5.1. Restore Classified Issue

Добавь **Code**, имя **`Restore Classified Issue`**, режим **Run Once for All Items**:

```javascript
return [{ json: $('Build Route').first().json }];
```

Подключи к её входу выходы **Label Bug**, **Label Task** и **Label Feature**. Здесь Merge не нужен: Switch выбирает ровно одну ветку, поэтому в каждом запуске выполняется одна из этих трёх HTTP-нод.

HTTP-запрос установки метки возвращает ответ GitHub, заменяя вход. Эта Code node восстанавливает текст, автора, association и контекст из Build Route.

### 5.2. Is New Contributor?

После Code добавь **If**, имя **`Is New Contributor?`**:

- Первое поле: Expression `{{ $json.author_association }}`.
- Тип: **String**.
- Операция: **is equal to**.
- Второе поле: Fixed `NONE`, без кавычек.

Не проверяй user.login на пустоту и не ставь good-first-issue: это другая метка, описывающая простую задачу, а не автора.

### 5.3. Label First Time

На выход **true** поставь **HTTP Request**, имя **`Label First Time`**:

- Method: **POST**.
- Authentication: **Predefined Credential Type → GitHub API**, существующие credentials.
- Header: `Accept: application/vnd.github+json`.
- URL, Expression:

```javascript
{{ 'https://api.github.com/repos/' + $json.owner + '/' + $json.repo + '/issues/' + $json.issue_number + '/labels' }}
```

- Send Body: включено, Body Content Type: JSON, Specify Body: Using JSON.
- Тело, Fixed:

```json
{ "labels": ["first-time-contributor"] }
```

Используй POST для добавления метки, чтобы сохранить bug/task/feature.

### 5.4. Build Issue Reply

Добавь **Code**, имя **`Build Issue Reply`**, режим **Run Once for All Items**. К ней подключи:

- выход `Label First Time`;
- выход **false** ноды `Is New Contributor?`.

Оба пути альтернативные, Merge не нужен. Код:

```javascript
const issue = $('Build Route').first().json;
const replies = {
  bug: 'Спасибо за сообщение об ошибке. Обращение отмечено как bug.',
  task: 'Спасибо за обращение. Задача отмечена как task.',
  feature: 'Спасибо за предложение. Запрос отмечен как feature.',
};
if (!Object.hasOwn(replies, issue.route)) {
  throw new Error('Reply is allowed only for bug/task/feature');
}

// Если основная ветка называется иначе, замени master в URL.
const contributing = 'https://github.com/' + issue.owner + '/' + issue.repo
  + '/blob/master/CONTRIBUTING.md';
const welcome = issue.author_association === 'NONE'
  ? `Привет, @${issue.author}! Рады вашему участию. Правила и помощь: ${contributing}\n\n`
  : '';

return [{ json: {
  ...issue,
  reply_body: welcome + replies[issue.route],
} }];
```

Здесь один комментарий совмещает приветствие и ответ по типу. Если у RouteFinder основная ветка `main`, исправь ссылку в коде. Проверь её открытием в браузере до теста.

### 5.5. Post Issue Reply

После Code добавь **HTTP Request**, имя **`Post Issue Reply`**:

- Method: POST.
- Authentication: Predefined Credential Type → GitHub API.
- Header: `Accept: application/vnd.github+json`.
- URL, Expression:

```javascript
{{ 'https://api.github.com/repos/' + $json.owner + '/' + $json.repo + '/issues/' + $json.issue_number + '/comments' }}
```

- Send Body: включено.
- Body Content Type: JSON.
- Specify Body: Using JSON.
- Всё поле JSON переведи в Expression и вставь:

```javascript
{{ { body: $json.reply_body } }}
```

Это объект, который n8n сериализует в JSON. Не собирай JSON вручную с текстовыми подстановками: кавычки и переносы комментария могут сломать такой JSON.

[GitHub API: Create an issue comment](https://docs.github.com/en/rest/issues/comments#create-an-issue-comment).

Оставь стандартное прекращение выполнения при ошибке HTTP. Сценарий не должен помечать Issue обработанным, если обязательный ответ не опубликован.

## 6. Сохранить обработанный Issue в конце обеих веток

Добавь одну **Data Table**, имя **`Save Processed Issue`**.

К её входу подключи:

- выход **Post Issue Reply** для известных типов;
- выход **Label Needs-Triage** для unknown — напрямую, без комментариев и first-time-ветки.

В одном запуске активна только одна ветка. Отдельный Merge здесь также не нужен.

Настройки:

| Настройка | Значение |
|---|---|
| Resource | Row |
| Operation | Upsert |
| Data table | processed_issues |
| Condition | issue_key Equals |
| Condition value, Expression | `{{ $('Build Route').first().json.issue_key }}` |
| Mapping Column Mode | Map Each Column Manually |

Заполни значения:

| Колонка | Выражение |
|---|---|
| issue_key | `{{ $('Build Route').first().json.issue_key }}` |
| issue_id | `{{ $('Build Route').first().json.issue_id }}` |
| issue_number | `{{ $('Build Route').first().json.issue_number }}` |
| repo | `{{ $('Build Route').first().json.owner + '/' + $('Build Route').first().json.repo }}` |
| author | `{{ $('Build Route').first().json.author }}` |
| created_at | `{{ $('Build Route').first().json.created_at }}` |
| processed_at | `{{ $now.toISO() }}` |
| route | `{{ $('Build Route').first().json.route }}` |

Ссылки на Build Route намеренные: последний HTTP-ответ уже не содержит исходные поля Issue. Суффиксов `_json` у этих полей нет.

Результат: после успешного известного типа или unknown появляется одна запись. При повторном событии та же запись останавливает обработку до классификатора. [Операции Data Table](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datatable/rows/).

Если процесс оборвался между публикацией комментария и записью таблицы, повтор может снова опубликовать комментарий. Этот учебный вариант защищает от повторов **завершённых** запусков; гарантия ровно одной публикации при сбоях требует дополнительной идемпотентности комментария.

## 7. Итоговая схема Workflow 1

```text
Github Trigger → If → Prepare Issue
  → Read Processed Issue → Check Processed → Already Processed?
      true: конец
      false: Call classifier → Build Route → Switch by Type
        bug/task/feature → соответствующий Label
          → Restore Classified Issue → Is New Contributor?
              true → Label First Time → Build Issue Reply
              false ─────────────────→ Build Issue Reply
          → Post Issue Reply → Save Processed Issue
        unknown → Label Needs-Triage → Save Processed Issue
```

Для нового автора с unknown сознательно не публикуем приветствие: требование «unknown без комментария» имеет приоритет. Проверку нового участника показывай на понятном bug/task/feature от автора с association NONE.

## 8. Проверить дедупликацию настоящим повтором события

1. Активируй обновлённый основной workflow.
2. Создай **новый** понятный Issue. Убедись, что есть label, комментарий и запись processed_issues.
3. Дождись завершения запуска и записи таблицы.
4. В GitHub открой Settings репозитория → Webhooks → нужный webhook → Recent Deliveries.
5. Выбери исходную доставку **issues / opened** именно этого Issue, а не labeled/comment-событие.
6. Нажми **Redeliver**.
7. Открой новый Execution n8n: `already_processed: true`, If завершает true-ветку. Call classifier и все публикации после него не запускались.
8. В GitHub остался один комментарий, а в processed_issues — одна строка этого Issue.

На слайде 22 предложен тест закрыть и переоткрыть Issue. При твоём текущем фильтре `action == opened` событие `reopened` остановится раньше Data Table — это **не доказывает дедупликацию**. Поэтому основной доказательный тест выше использует повторную доставку opened.

Если хочешь выполнить и тест слайда буквально, можно расширить фильтр на `['opened', 'reopened'].includes($json.body?.action)`, сохранив проверки репозитория и наличия Issue. Тогда повторное открытие дойдёт до Data Table. Реши, нужен ли такой режим постоянно; для исходного требования opened он не обязателен.

## 9. Проверить first-time и unknown

1. Попроси другого участника открыть понятный тестовый Issue либо используй свой доступный тестовый аккаунт. Это делаешь самостоятельно; credentials чужого аккаунта не нужны.
2. Убедись в trigger Output, что `author_association` действительно `NONE`.
3. Проверь классификационный label, дополнительный `first-time-contributor`, один комментарий с упоминанием автора и работающей ссылкой на CONTRIBUTING.md.
4. Повтори доставку opened: нового комментария быть не должно.
5. От нового автора открой **другой**, расплывчатый Issue. Получи реальный confidence < 0.8, unknown и label needs-triage.
6. Проверь, что у unknown **нет комментария вообще**, first-time-ветка не выполнялась, запись processed_issues появилась.
7. От владельца/участника с association не NONE создай понятный Issue: обычный ответ есть, приветствия и метки first-time-contributor нет.

Тестовые обращения должны быть новыми: уже обработанный Issue после обновления ожидаемо остановится на дедупликации. Не удаляй реальные записи processed_issues ради повторного ответа.

## 10. Вернуть простое HTML-письмо с таблицей

Существующий текстовый `build-email.js` оставляем как отдельный вариант. Для сдачи подготовлен [build-email-html.js](examples/weekly_report/build-email-html.js): минимальное оформление, таблицы по типам и авторам, Δ и AI-комментарий. Отдельного блока warnings в нём нет.

1. В `03_weekly_report` открой существующую Code node **Build Email**.
2. Замени её код содержимым **build-email-html.js**. Режим — Run Once for All Items.
3. В Send Weekly Report сохрани SMTP credentials и Operation Send.
4. **Email Format** поставь **HTML** в режиме Fixed.
5. В поле **HTML** поставь Expression `{{ $json.html }}`. Старое поле Text с `{{ $json.text }}` для HTML-режима не используется.
6. Subject оставь `{{ $json.subject }}`, To Email — `{{ $json.to_email }}`.
7. Запусти **весь workflow через Manual Trigger**, а не только Send Weekly Report.
8. Открой полученное письмо и проверь таблицы, прошлую неделю, Δ и блок «AI-комментарий недели».

[Send Email: HTML format](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sendemail/).

Для сравнения на тесте сохрани одинаковую неделю в Prepare Period и имеющийся снимок прошлой недели. Для обычного расписания затем очисти test_week_start. Не меняй тему/числа вручную ради демонстрации.

## 11. Новые скриншоты для презентации

Сохраняй новые изображения отдельно, например в `submission/workflow_1/extensions/` и `submission/weekStatistics/html/`. По возможности используй один успешный полный запуск для каждого тестового Issue и один полный запуск отчёта для всех почтовых скриншотов.

| Файл | Что открыть | Что должно быть видно |
|---|---|---|
| `01_full_workflow.png` | Canvas Workflow 1 после первого успешного запуска | Проверка таблицы перед классификатором, first-time-ветка, комментарий и сохранение в конце |
| `02_first_time_payload.png` | Trigger Output или Prepare Issue | Номер, автор и реальное author_association NONE |
| `03_first_time_execution.png` | Execution понятного Issue нового автора | Ветка true у Is New Contributor?, успешные Label First Time, Post Issue Reply и Save Processed Issue |
| `04_first_time_issue.png` | Страница этого Issue в GitHub | Классификационный label, first-time-contributor и один приветственный комментарий с CONTRIBUTING.md |
| `05_processed_table.png` | Data Table processed_issues | issue_key, номер, автор, processed_at и route; одна запись на проверяемый Issue |
| `06_duplicate_execution.png` | Execution после Redeliver opened | already_processed true и остановка до Call classifier, публикации не выполнялись |
| `07_duplicate_issue.png` | Тот же Issue после повторной доставки | По-прежнему один комментарий. Рассматривать вместе с Execution, само отсутствие комментария не доказывает причину |
| `08_unknown_execution.png` | Execution расплывчатого Issue нового автора | Confidence < 0.8, unknown, Label Needs-Triage и Save Processed Issue, без Post Issue Reply |
| `09_unknown_issue.png` | Страница расплывчатого Issue | needs-triage и отсутствие комментариев |
| `10_regular_author.png` | Execution и/или Issue обычного участника | Association не NONE, first-time false, обычный ответ без приветствия |
| `11_html_send_settings.png` | Send Weekly Report Parameters | Send Email, Email Format HTML и поле html, без отображения SMTP-пароля |
| `12_html_email_types.png` | Реально полученное новое письмо | Период и HTML-таблица по типам: текущие числа, прошлые и Δ |
| `13_html_email_authors_ai.png` | Продолжение того же письма | HTML-таблица по авторам и AI-комментарий недели |

Если длинный скрин неудобен для слайда, сделай два последовательных кадра с небольшой общей областью. Не объединяй числа из разных запусков в один пример.

Для полной проверки недельного сценария также добавь то, чего не было в старом комплекте:

| Файл | Что показать |
|---|---|
| `14_report_period.png` | Prepare Period: локальные даты, start_iso/end_iso и test-флаги |
| `15_fetch_task.png`, `16_fetch_feature.png`, `17_fetch_triage.png` | Реальные ответы остальных трёх запросов: total_count, incomplete_results false и items; при необходимости отдельный кадр вычисленного q |
| `18_weekly_snapshots.png` | Две корректные недели в weekly_stats с ключами и total; отдельно snapshot_json с by_type/by_author |
| `19_compute_delta.png` | has_previous true, previous.total, delta.total и delta.by_type |
| `20_ai_input_output.png` | Вход LLM с current/previous/delta и текст ответа, совпадающий с письмом |
| `21_workflow_timezone.png` | Настройки Europe/Moscow и активное расписание понедельник 09:00 |

Первые 13 кадров подтверждают именно дополнения. Последняя таблица закрывает прежние пробелы доказательств, чтобы на защите не приходилось искать всё вживую. Не показывай пароли, токены и Client Secret.

## 12. Обновить сдачу после реализации

- Экспортировать обновлённый `01_issue_intake.json`, прежний `02_classify_issue.json` и актуальный `03_weekly_report.json` с HTML-режимом.
- Сохранить ссылки на новые тестовые Issues для first-time, unknown и повтора.
- Заменить в презентации старый текстовый скрин письма новым HTML-письмом и добавить слайды first-time и дедупликации.
- Исправить в презентации пояснение про SMTP: слайд 23 задания допускает аналог Gmail node. Разницу с формулировкой README можно пояснить при вопросе.
- Не отмечать функцию реализованной только по наличию нод: нужны подтверждения успешных запусков из таблиц выше.

Сверхрезультат на 10 баллов с AI-исправлением кода, ревью и merge — отдельный следующий блок. Этот гайд закрывает недостающие пункты обычной практики и задания занятия.
