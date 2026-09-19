# Unit-проверки

| Правило | Изолируемый компонент | Точный синтетический вход | Ожидаемый результат | Планируемый тест | Статус evidence |
|---|---|---|---|---|---|
| SEC-1 | Редактор токенов | `+TOKEN=test-token\n+DEBUG=true` | Есть `TOKEN=[REDACTED]` и `DEBUG=true`; нет `test-token` | `test_redactor_replaces_token` | Не реализован |
| SEC-1 | Редактор паролей | `+password=hunter2\n+mode=review` | Есть `password=[REDACTED]` и `mode=review`; нет `hunter2` | `test_redactor_replaces_password` | Не реализован |
| SEC-1 | Редактор приватных ключей | `+-----BEGIN PRIVATE KEY-----\n+synthetic-data\n+-----END PRIVATE KEY-----\n+SAFE=true` | Блок ключа заменён на `[REDACTED]`; `SAFE=true` сохранено; `synthetic-data` отсутствует | `test_redactor_replaces_private_key_block` | Не реализован |
| SEC-1 | Редактор безопасного diff | `+def add(a, b):\n+    return a + b` | Выход полностью совпадает со входом | `test_redactor_keeps_safe_diff` | Не реализован |
| REL-1 | Настройка вызова fake LLM | Diff `+return 42`; fake LLM записывает аргумент `timeout` | Fake LLM вызван один раз с `timeout=10` | `test_review_uses_ten_second_timeout` | Не реализован |
| REL-1 | Обработчик timeout | Diff `+return 42`; fake LLM выбрасывает `TimeoutError` | Возвращён контролируемый доменный результат; исключение не вышло из компонента | `test_review_handles_llm_timeout` | Не реализован |
| REL-1 | Обработчик ошибки LLM | Diff `+return 42`; fake LLM выбрасывает `RuntimeError("synthetic failure")` | Возвращён контролируемый доменный результат; исключение не вышло из компонента | `test_review_handles_llm_error` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":"ok","risks":[],"checks":["pytest -q"]}` | Контракт принят, значения трёх обязательных полей сохранены | `test_output_accepts_valid_contract` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":"ok","risks":[]}` | Контракт отклонён из-за отсутствия `checks` | `test_output_rejects_missing_checks` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":7,"risks":[],"checks":[]}` | Контракт отклонён из-за неверного типа `summary` | `test_output_rejects_invalid_summary_type` | Не реализован |
| OUT-1, QA-1 | Валидатор рисков | Ровно три риска с полями `file`, `line`, `evidence`, `risk` | Контракт принят; сохранены все три риска | `test_output_accepts_three_proven_risks` | Не реализован |
| OUT-1 | Валидатор рисков | Четыре риска с полями `file`, `line`, `evidence`, `risk` | Контракт отклонён из-за превышения максимума в три риска | `test_output_rejects_four_risks` | Не реализован |
| QA-1 | Валидатор доказательств | Один риск без поля `evidence` | Контракт отклонён с указанием отсутствующего поля `evidence` | `test_output_rejects_risk_without_evidence` | Не реализован |
| OBS-1 | Формирователь структурного лога | `request_id="req-1"`, `duration_ms=125`, `status="ok"`, diff `+TOKEN=test-token`, ответ `{"summary":"secret response"}` | Запись содержит `request_id`, `duration_ms`, `status`; не содержит diff, `test-token`, ответ и `secret response` | `test_log_contains_metadata_only` | Не реализован |

Планируемый запуск после реализации: `pytest -q tests/unit`.

## Что улучшено

- Общие описания заменены точными синтетическими входами и проверяемыми результатами.
- Добавлены позитивные, негативные и граничные сценарии для правил SEC-1, REL-1, OUT-1, QA-1 и OBS-1.
- Планируемые имена тестов отделены от evidence и не представлены как реализованные.

## Как использовали AI

- Строка в [`prompts.md`](prompts.md): P1-06.
- Что проверили и исправили сами: сценарии ограничены поведением отдельных компонентов; входы синтетические, результаты допускают однозначные ассерты, а все имена тестов явно помечены как планируемые и нереализованные.
