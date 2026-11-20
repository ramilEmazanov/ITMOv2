# Импорт готовой схемы сверхрезультата

Схема собрана по [гайду](../../SUPER_RESULT_GUIDE.md). JSON содержат соединённые ноды и код. **Это импортируемые шаблоны, а не уже работающая интеграция с твоим n8n и GitHub.** Нужно привязать таблицу, дочерний workflow и credentials, а также установить runner в RouteFinder.

## Файлы

| Файл | Что импортировать |
|---|---|
| [05_wait_actions.json](05_wait_actions.json) | Sub-workflow ожидания GitHub Actions: polling, Wait и проверка ID/имени/репозитория |
| [04_auto_fix_bug.json](04_auto_fix_bug.json) | Основная цепочка: дедупликация, Issue, Actions, PR, validation, AI-ревью, проверки и merge |
| [06_auto_fix_errors.json](06_auto_fix_errors.json) | Обработчик непредвиденной ошибки основного workflow |
| [bug_fixes.columns.json](bug_fixes.columns.json) | Список колонок для ручного создания Data Table. Это **не** workflow |

Все workflow экспортированы с `active: false`. `enable_merge` по умолчанию **false**: создаётся PR, выполняются тесты и ревью, но вместо merge возвращается status `ready_for_merge`. Это не режим без внешних действий: Actions, commit/push, PR и комментарий создаются реально.

## 1. Что подготовить в RouteFinder

До запуска n8n перенеси файлы из [examples/super_result](../../examples/super_result) в **репозиторий RouteFinder**:

| Исходный файл | Путь в RouteFinder |
|---|---|
| ai-fix.yml | .github/workflows/ai-fix.yml |
| ai-validate.yml | .github/workflows/ai-validate.yml |
| run-fix.sh | scripts/ai/run-fix.sh |
| check-changes.py | scripts/ai/check-changes.py |
| build.sh | scripts/ai/build.sh |
| test.sh | scripts/ai/test.sh |

Что обязательно адаптировать:

1. **build.sh и test.sh:** команды реальной сборки и тестов RouteFinder. В шаблонах пример CMake/CTest, а не подтверждённая конфигурация твоего репозитория. Проверка должна падать при отсутствии тестов.
2. **Зависимости Ubuntu runner:** при необходимости добавить установку библиотек в оба Actions workflow.
3. **Пути:** в check-changes.py и run-fix.sh стоят src/, include/, tests/. Если структура отличается, согласованно заменить allowlist, find tests и git add. Тот же allowlist указать в n8n, поле allowed_paths_json.
4. **Основная ветка:** сейчас master. При другом имени заменить также checkout в ai-validate.yml и Auto Fix Config в n8n.
5. **OpenCode:** добавить рабочий конфиг провайдера в RouteFinder со ссылкой `{env:AI_API_KEY}`. Проверить headless запуск без интерактивных запросов разрешений на своей версии CLI.
6. В RouteFinder → Settings → Secrets and variables → Actions создать:
   - secret **AI_API_KEY**;
   - variable **AI_MODEL** с полным ID рабочей модели;
   - variable **OPENCODE_VERSION** с проверенной точной версией npm-пакета.
7. Закоммитить YAML и скрипты в основную ветку RouteFinder.
8. Ручным запуском Actions проверить AI fix и AI validate. В первом должны быть тест до фикса, исправление и push; во втором — тесты точного переданного SHA.

Для первого случая используй небольшой баг, который можно исправить в разрешённых исходниках и проверить существующим тестовым файлом. Шаблон не разрешает агенту менять CMake, CI и правила автоматизации.

## 2. Создать таблицу bug_fixes

В проекте n8n создай Data Table **bug_fixes**. Колонки и типы перечислены в [bug_fixes.columns.json](bug_fixes.columns.json):

| Колонки | Тип |
|---|---|
| issue_number, pr_number | Number |
| issue_key, repo, run_id, n8n_execution, status, branch, base_sha, head_sha, fix_run_id, validate_run_id, pr_url, reviewed_sha, review_json, error, updated_at | String |

Если таблица уже создана по предыдущему гайду, сверь все колонки: в готовой схеме дополнительно используются **repo** и **pr_url**. Добавь их как String, если их ещё нет.

Служебные ID/createdAt/updatedAt таблица создаст сама. **Название bug_fixes не заменяет ID таблицы.** Открой таблицу и скопируй ID из URL после `/datatables/`.

Таблица weekly_stats здесь не используется. Последовательные повторные события защищены проверкой issue_key. Для учебной демонстрации запускай один баг за раз: Get + Insert не являются атомарной блокировкой одновременных запросов.

## 3. Импортировать в правильном порядке

В n8n используй меню **Import from File**:

1. Импортируй **05_wait_actions.json**, сохрани workflow. Скопируй его ID из адреса `/workflow/<ID>`.
2. Импортируй **06_auto_fix_errors.json**.
3. Импортируй **04_auto_fix_bug.json**.

В **05_wait_actions** проверь GitHub credentials у Poll Run. Trigger имеет именованные входы — не меняй его на Manual Trigger. Активировать отдельный webhook для него не нужно.

## 4. Заполнить Auto Fix Config в 04_auto_fix_bug

Это нода типа **Edit Fields (Set)** с уже созданными полями:

| Поле | Что поставить |
|---|---|
| owner | ramilEmazanov |
| repository | RouteFinder |
| base_branch | master, если это реальная основная ветка |
| wait_workflow_id | Реальный ID импортированного 05_wait_actions |
| bug_fixes_table_id | Реальный ID таблицы bug_fixes |
| enable_merge | Для первого запуска оставить Boolean false |
| fix_workflow_file | ai-fix.yml |
| validate_workflow_file | ai-validate.yml |
| merge_method | squash либо другой метод, разрешённый репозиторием |
| allowed_paths_json | JSON-массив допустимых префиксов, совпадающий с guard runner |
| required_ci_names_json | JSON-массив точных имён обязательных CI-проверок либо [] при отсутствии дополнительных |
| max_diff_chars | 80000 для небольших PR |
| actions_timeout_seconds | 1500 |
| poll_seconds | 15 |
| readiness_timeout_seconds | 900 |

Все обычные значения вводи в режиме **Fixed**. JSON-массивы здесь хранятся как **String**, например `["src/","include/","tests/"]`. Саму схему parser менять не требуется.

Две ноды вызова **Wait Fix Result** и **Validate Result** получают ID из Auto Fix Config. Если твоя версия n8n не отображает Workflow Inputs для ID-выражения, в обеих нодах выбери 05_wait_actions через **From list** и сохрани готовое отображение входов. Wait for Sub-Workflow Completion должен быть включён.

Data Table nodes тоже получают ID из Auto Fix Config. Если интерфейс требует повторного выбора таблицы, выбери bug_fixes, сохрани существующие фильтры и mapping. Не меняй выражения полей на несуществующие `repo_json`/`head_sha_json`.

## 5. Подключить credentials

В JSON сохранены **только ссылки на credentials из твоих прежних экспортов**, без токенов:

- HTTP Request используют то же GitHub API credential, что недельный отчёт.
- Review Model использует то же подключение OpenAI Chat Model, что классификатор.

В том же n8n они могут подключиться автоматически. Если ноды показывают ошибку credentials, выбери существующее подключение заново.

GitHub-аккаунт должен иметь возможность читать Issue/refs/PR, запускать Actions, создавать PR и комментарии, выполнять merge. Для fine-grained token проверь Actions read/write, Contents read/write, Pull requests read/write и Issues read/write на RouteFinder. Действия ограничены правами аккаунта и правилами ветки.

У Review Model выбери доступную модель. Это отдельный вызов ревьюера; он не использует историю OpenCode-исполнителя. API key OpenCode в GitHub Actions и credential ревьюера n8n настраиваются отдельно.

HTTP-ноды используют API version **2026-03-10** и ожидают workflow_run_id в ответе dispatch. Если сервер вернул 204 без тела, текущая схема остановится с понятной ошибкой, а не выберет случайный запуск. Проверь поддержку версии или адаптируй поиск запуска по точному run-name по полному гайду.

## 6. Настроить Error Workflow

1. В 06_auto_fix_errors открой **Error Config**, поставь тот же bug_fixes_table_id.
2. Сохрани workflow.
3. Открой 04_auto_fix_bug → **Settings → Error Workflow**, выбери **06_auto_fix_errors**.
4. Включи сохранение executions, в JSON оно уже задано.

Error handler ищет запись по ID родительского исполнения. Он не запускает исправление повторно и не меняет terminal-статусы merged/rejected/blocked/ready_for_merge.

Важно: error workflow может не вызываться для ручного тестового исполнения в редакторе. Если ручной запуск упал, открой его ошибку и проверь строку bug_fixes: она может остаться в промежуточном статусе. Не запускай повторный dispatch вслепую — сначала посмотри Actions, ветку и PR.

## 7. Первый тест без автоматического merge

1. Создай **новый** небольшой понятный Issue в RouteFinder со шагами воспроизведения. Должен появиться label **bug**.
2. В 04_auto_fix_bug открой **Manual Bug Input** — это Edit Fields, а не trigger.
3. Замени issue_number **0** на реальный номер этого Issue. Оставь type bug и confidence 1: это только ручной вход для проверки интеграции, не доказательство AI-классификации.
4. В Auto Fix Config оставь enable_merge **false**.
5. Нажми **Execute Workflow** через Run Auto Fix Manually и дождись всей цепочки.

Если агент исправил баг и ревью разрешило продолжение, результат:

- отдельная ветка ai/fix-N-run_id;
- PR с Closes #N;
- успешный validation конкретного SHA;
- AI-ревью в PR;
- статус **ready_for_merge** в bug_fixes;
- PR остаётся открытым, master пока не изменён.

Серьёзные замечания дают rejected; неуспешные Actions дают failed; изменение SHA/базы или неуспешный CI дают blocked. Ошибка parser или API останавливает execution и обрабатывается error handler при поддерживаемом типе запуска.

Запись ready_for_merge тоже участвует в дедупликации. Простое переключение enable_merge в true не продолжит прежний запуск: для следующего полного теста используй **другой новый баг** либо отдельно реализуй контролируемое возобновление. В схеме нет автоматического сброса состояния и повторного исправления rejected PR.

## 8. Подключить к реальному Workflow 1

В актуальном **01_issue_intake** после успешного label bug нужно вызвать 04_auto_fix_bug. Классификатор остаётся прежним.

Для текущей простой схемы:

```text
Label Bug → Prepare Auto Fix → Call Auto Fix
```

**Prepare Auto Fix** — Code, Run Once for All Items:

```javascript
return [{json: $('Build Route').first().json}];
```

**Call Auto Fix** — Execute Sub-workflow, выбрать импортированный 04_auto_fix_bug. Входы:

| Вход | Expression |
|---|---|
| issue_number | `{{ $json.issue_number }}` |
| type | `{{ $json.type }}` |
| confidence | `{{ $json.confidence }}` |

Включи ожидание завершения для первой демонстрации. Заголовок и body 04_auto_fix_bug читает заново через GitHub API, поэтому передавать их необязательно.

Если в Workflow 1 уже добавлены first-time, комментарии и Save Processed Issue, ставь вызов **после завершения обычной обработки**, восстанови Build Route и проверь route == bug перед Call Auto Fix. Не запускай его из двух мест. Task/feature/unknown не должны попадать в сверхрезультат.

Сохрани и активируй Workflow 1. Дочерние 04 и 05 вызываются через Execute Sub-workflow, дополнительный GitHub webhook в них не нужен.

## 9. Включить полный режим сверхрезультата

После успешной проверки:

1. Убедись, что права и правила RouteFinder позволяют автоматический merge. Не обходи обязательные GitHub approvals и защиты.
2. В Auto Fix Config поставь **enable_merge = true** как Boolean.
3. Сохрани workflow.
4. Создай **новый воспроизводимый bug report**. На этот раз классификацию и старт должен выполнить настоящий Workflow 1.
5. Вмешиваться в код, нажимать ручной push/approve/merge в положительном тесте не нужно.
6. Итог: status merged, PR merged, Issue закрыт и исправление с тестом в master.

Схема перепроверяет head, базовую ветку, результат validation, reviewed_sha, список CI и mergeable. В merge API передаётся ожидаемый SHA. Если master изменился во время процесса, попытка блокируется и требует новой проверки на свежей базе. Для учебной демонстрации не делай параллельных ручных push; для постоянной эксплуатации нужны правила актуальности проверок/merge queue и атомарная блокировка запусков.

Отдельный validation workflow запускается явно: не полагайся на автоматический CI от push через GITHUB_TOKEN. Если у репозитория есть обязательные проверки, укажи их точные имена в required_ci_names_json. До успешного завершения схема их ждёт. Завершённые check runs с conclusion, отличным от success, консервативно блокируют merge, включая skipped/neutral.

## 10. Что уже реализовано и чего шаблоны не делают

Реализованы связи нод, дедупликация последовательных запусков, два Actions dispatch с точными run IDs, ожидание с таймаутом, создание PR, отдельное AI-ревью, сохранение результата, публикация ревью, проверки SHA/CI/веток и merge с ожидаемым SHA.

Нет незаметных «заглушек approve»: реальный verdict получает LLM. Нет фиктивной успешности тестов: нужен реальный Actions success. Нет локально сгенерированного исправления вместо агента.

Ограничения:

- Небольшие PR: <100 файлов и ограничение размера diff; binary/rename/delete и неизвестные пути блокируются.
- Нет автоматических повторов внешних POST, чтобы не дублировать dispatch/PR. При сетевой ошибке проверяй, не выполнилась ли операция на GitHub.
- Нет автоматического исправления после request_changes.
- Get + Insert не защищает от гонки одновременных событий без дополнительной сериализации.
- После отмены n8n исполнения Actions job сам по себе не обязательно отменяется. При необходимости останови его в GitHub.
- JSON проверены по структуре и локальными сценариями с подставными ответами. Импорт и реальное исполнение в твоём n8n требуют проверки после настройки.

## 11. Быстрые проверки после импорта

| Проверка | Ожидаемо |
|---|---|
| Не заполнены ID таблицы/05 | Fix Context останавливается до Actions |
| Manual issue_number = 0 | Понятная ошибка до API |
| Issue без bug label, закрыт или без описания | Исправление не запускается |
| Повтор для уже зарегистрированного Issue | duplicate_skipped, второго PR нет |
| AI fix failure | failed, до создания PR не доходит |
| Validation failure | failed, merge отсутствует |
| AI request_changes/high/critical | rejected, ревью опубликовано, merge отсутствует |
| Подмена reviewed_sha | Ошибка, merge отсутствует |
| Новый коммит PR или изменение master | blocked |
| Pending CI/mergeable null | Ожидание с ограниченным таймаутом |
| Всё зелёное, enable_merge false | ready_for_merge |
| Всё зелёное, enable_merge true | Реальный merge через GitHub API |

После успешного запуска экспортируй настроенные workflow заново: они будут содержать реальные ID твоего n8n и выбранные credentials. Эти файлы приложи к сдаче вместе с материалами из полного гайда.

## Локальная проверка JSON

Из корня ITMOv2 можно выполнить:

```bash
node practices/practice_07.2/examples/super_result/validate-workflows.cjs
```

Проверка не вызывает API и не делает merge. Она проверяет связи, синтаксис выражений, 11 сценариев оркестрации с подставными ответами, отказы по неверным данным и polling. Она не заменяет импорт и реальные запуски в n8n/Actions.
