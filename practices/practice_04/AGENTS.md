# Правила работы с проектом

Рабочая папка — `practices/practice_04`. Проект состоит из двух этапов: **A — поиск авиабилетов (ветка `practice_4A`)** и **B — сохранение и сравнение цен (ветка `practice_4B`)**. Оба сценария реализованы в текущем приложении. Поведение, запуск и ограничения описаны в [PROJECT_README.md](PROJECT_README.md); требования сдачи — в [README.md](README.md).

## Фронтенд и API

- React, TypeScript и Vite отвечают за форму поиска, фильтры, результаты и сравнение цен; оформление — обычный CSS. Фронтенд вызывает только FastAPI. Не передавай `IGNAV_API_KEY` в браузер и не вызывай Ignav напрямую из React.
- Серверные маршруты поиска: `POST /api/fares/one-way` и `POST /api/fares/round-trip`; `GET /health` служит проверкой доступности. Поиск выполняется только после нажатия кнопки, поскольку успешный запрос Ignav может тарифицироваться. Повторные одинаковые ответы кешируются на три минуты.
- Используй `https://ignav.com`, заголовок `X-Api-Key` и ключ из серверной переменной `IGNAV_API_KEY` или локального `backend/.env`. Не записывай ключ в код, логи или коммиты. Формат запросов — в [справочнике Ignav](https://ignav.com/docs/api-reference).
- Принимай трёхбуквенные IATA-коды, полные даты `YYYY-MM-DD` и дату возвращения не раньше вылета. Ignav проверяет, поддерживается ли код. Для прямых рейсов передавай `max_stops: 0`; для бюджета — `max_price` в валюте выбранного `market`. Не отправляй параметры старого Travelpayouts API `departure_at=YYYY-MM`, `direct`, `currency` или `sorting`.
- Нормализуй `itineraries`, сохраняя `ignav_id`, цену с валютой, плечи и сегменты. Считай пересадки по сегментам каждого плеча. Показывай валюту из `price.currency`, а найденную цену — как ориентир. Бронирование и месячный поиск сейчас не реализованы.
- Пустой `itineraries` — нормальный результат. Ошибки ввода показывай пользователю. Сетевые ошибки и `424/unable_to_complete_request` повторяй ограниченно; `424/unsupported_search`, `402/billing_required` и `429/monthly_spend_limit_reached` не зацикливай. См. [ошибки Ignav](https://ignav.com/docs/errors).

## История и сравнение

- `backend/app/history.py` хранит время, нормализованные параметры поиска, валюту и минимальную цену в `backend/price_history.sqlite3`. Файл базы локальный и исключён из Git. Пустой результат сохраняй без цены и не используй для числового сравнения.
- Сравнивай только одинаковые маршрут, даты, тип поездки, рынок и фильтры. При отсутствии прежней цены возвращай отдельное состояние; при другой валюте не вычисляй разницу. Денежную и процентную разницу считай через `backend/app/price_math.py`, чтобы FastAPI и MCP применяли одну формулу.
- Не вводи аккаунты или внешнюю базу для этой версии. После изменения поиска или истории проверяй первый и повторный поиск, пустой ответ, ошибочный ввод и несовпадающие параметры.

## Skill, MCP и hook

- Локальные skills находятся в `.agents/skills/`. Перед работой с FastAPI загружай `fastapi-python`, со сложными схемами — `pydantic`, с React-компонентами — `vercel-react-best-practices`. Эти файлы содержат инструкции для агента и не являются зависимостями приложения.
- Для проверки A и B используй [`verify-flight-features`](.agents/skills/verify-flight-features/SKILL.md). Из рабочей папки запускай `backend/.venv/bin/python .agents/skills/verify-flight-features/scripts/run.py --report verification/flight-features.md`. Runner использует подменённый Ignav и временную SQLite, запускает `pytest`, тест hook и `npm run build`.
- `opencode.json` подключает `context7` для документации библиотек и локальный MCP `flight-history`. Его tool `compare_prices` читает сохранённую историю без запросов к Ignav; код — `backend/app/mcp_server.py`, инструкция и демо — [MCP_README.md](MCP_README.md). Реальные успешные и ошибочные MCP-вызовы записаны в `verification/mcp-calls.json`; подтверждения Context7 — в `verification/context7-*.json`.
- Плагин OpenCode `.opencode/plugins/verify-after-edit.js` после `edit`, `write`, `apply_patch` или `multiedit` исходников запускает runner и добавляет `PASS`/`FAIL` к результату инструмента. При `FAIL` прочитай вывод и исправь причину. Отчёты, зависимости, сборка, `.env` и SQLite не запускают проверку. Hook не видит правки через shell или внешний редактор. Перезапусти OpenCode из `practices/practice_04`, чтобы он загрузил плагин.
- Для проверки hook используй `node --test scripts/tests/verify-after-edit.test.mjs`; для воспроизводимой демонстрации с временной правкой — `node scripts/demo-after-edit.mjs`. Демо проверяет контракт hook, а для защиты отдельно покажи срабатывание внутри OpenCode.

## Запуск и сдача

- В `backend/` установи `requirements-dev.txt`, запускай `uvicorn app.main:app --reload`, тестируй через `pytest`. В `frontend/` запускай `npm install`, `npm run dev` и `npm run build`.
- Git-хук `.githooks/pre-commit` проверяет сборку добавленных в коммит файлов фронтенда. В новом клоне включи его из корня репозитория командой `git config core.hooksPath .githooks`.
- Для сдачи нужны реальные вызовы skill и MCP, результат автоматической проверки после правки и личный `reflection.md`. Наличие конфигурации само по себе не подтверждает применение инструментов; используй файлы `verification/` как подтверждение и покажи работу в OpenCode.
