# MCP: сравнение сохранённых цен

Сервер `flight-history` предоставляет один tool `compare_prices`. Он позволяет агенту узнать, подешевели ли билеты между сохранёнными поисками. Данные читаются из SQLite фичи B в режиме `mode=ro`; ключ Ignav и платные запросы не нужны. Веб-приложение и MCP используют общий расчёт `app/price_math.py`.

## Запуск и подключение

Из `practices/practice_04`:

```bash
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
```

Запускайте OpenCode из этой же папки: `opencode.json` подключает `flight-history` через `sh ./scripts/start_mcp.sh`. Перезапустите OpenCode после изменения конфигурации. Сервер общается по stdio; stdout занят MCP-сообщениями, диагностические сообщения идут в stderr.

По умолчанию сервер читает `backend/price_history.sqlite3`. Для отдельной базы можно задать серверную переменную `FLIGHT_HISTORY_DB`. Tool не принимает произвольные пути от агента.

Пример запроса агенту: «Используй flight-history compare_prices и сравни последний сохранённый поиск с предыдущим сопоставимым». При отсутствии базы сначала выполните поиск в веб-приложении.

## Аргументы и результат

- `current_search_id`: положительный целый ID текущего поиска; если пропущен, выбирается последняя запись.
- `previous_search_id`: положительный целый ID предыдущего поиска; если пропущен, выбирается ближайшая более ранняя запись с ценой и теми же параметрами.

Успешный ответ содержит маршрут и даты, ID и время записей, прежнюю и текущую цену, валюту, знаковую разницу и процент. Отрицательная разница означает снижение. При прежней цене 0 процент равен `null`, поскольку деление на ноль невозможно.

Первый поиск даёт `status=no_previous_price`. Пустая цена, несовпадающие маршрут/даты/рынок/фильтры, разные валюты, обратный порядок записей и неизвестные ID дают MCP-ошибку `isError=true`. Отрицательные ID отклоняются схемой входа.

## Реальное демо для защиты

Из `backend/`:

```bash
.venv/bin/python -m app.mcp_demo --report ../verification/mcp-calls.json
```

Демо создаёт временную SQLite с явно синтетическими данными, запускает настоящий сервер отдельным процессом и общается с ним через официальный MCP ClientSession: `initialize`, `tools/list`, затем девять `tools/call`. Оно проверяет неизменность файла базы после вызовов. Рабочая история не затрагивается.

В [verification/mcp-calls.json](verification/mcp-calls.json) сохранены схема tool и реальные запросы/ответы. Сценарий `success`: цены 4000 и 3500 RUB, разница −500 RUB и −12,5%. Сценарий `invalid_input`: ID −1, `isError=true`. Есть дополнительные проверки пустой цены, валют, дат/параметров и неизвестного ID. Демо включено в `pytest` и запускается при использовании skill `verify-flight-features`.

## Соответствие README практики

| Требование | Файл или подтверждение |
| --- | --- |
| Полезный собственный MCP tool | `backend/app/mcp_server.py`, сравнение реальной локальной истории |
| Реальный успешный и ошибочный вызовы | `backend/app/mcp_demo.py`, `verification/mcp-calls.json` |
| Вызов Context7 для документации | `verification/context7-call.json` и `verification/context7-docs.json`: реальные `resolve-library-id` и `query-docs` через MCP; ответы содержат примеры v1/v2, для проекта зафиксирован SDK v1 |
| Подключение и обоснование | `opencode.json`, этот документ; stdio удобно для локальной SQLite без отдельного HTTP-сервера |
| Skill и проверенный результат | `.agents/skills/verify-flight-features/`, `verification/flight-features.md` |
| Проверка после правки | `.opencode/plugins/verify-after-edit.js`: после edit/write/apply_patch/multiedit запускает runner и добавляет результат агенту. `verification/after-edit-hook.json` — проверка контракта hook отдельным harness; запуск в интерфейсе OpenCode нужно показать отдельно |
| Свободная рефлексия | Нужен собственный `reflection.md` студента с конкретными наблюдениями; этот документ его не заменяет |

Демонстрация MCP выполнена SDK-клиентом. Подключение в интерфейсе OpenCode следует показать на защите отдельно. Оценку выставляет ревьювер; наличие этих файлов само по себе не гарантирует 10 баллов.

Документация: [официальный Python SDK](https://github.com/modelcontextprotocol/python-sdk), [локальные MCP в OpenCode](https://opencode.ai/docs/mcp-servers/). Используется зафиксированная версия SDK 1.30.0; API ветки v2 отличается.

## Hook после правки

Перезапустите OpenCode из `practices/practice_04`: локальные JS-плагины загружаются автоматически. Попросите агента изменить код через edit/write/apply_patch. В ответе инструмента появится `[verify-flight-features: PASS]` или `FAIL` с выводом проверок. Полный отчёт — `verification/after-edit.md`. Hook не запускается от обновления отчётов, зависимостей и сборки. Правки через shell или сторонний редактор не перехватываются.

Повторяемое локальное демо: `node scripts/demo-after-edit.mjs`. Оно создаёт и удаляет временный Python-файл, вызывает hook и сохраняет ответ для агента в `verification/after-edit-hook.json`. Это harness, а не запись сеанса OpenCode. Негативный тест проверяет возврат FAIL и исключение отчётов: `node --test scripts/tests/verify-after-edit.test.mjs`.

Контракт hook сверен с [исходным API OpenCode](https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts).
