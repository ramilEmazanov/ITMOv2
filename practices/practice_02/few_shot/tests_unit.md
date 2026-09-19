# Unit-проверки

| Правило | Изолируемый компонент | Точный синтетический вход | Ожидаемый результат | Планируемый тест | Статус evidence |
|---|---|---|---|---|---|
| SEC-1 | Редактор токенов | `+TOKEN=test-token\n+DEBUG=true` | Результат содержит `TOKEN=[REDACTED]` и `DEBUG=true`, но не содержит `test-token` | `test_redactor_replaces_token_and_keeps_safe_text` | Не реализован |
| SEC-1 | Редактор паролей | `+password=hunter2\n+mode=review` | Результат содержит `password=[REDACTED]` и `mode=review`, но не содержит `hunter2` | `test_redactor_replaces_password_and_keeps_safe_text` | Не реализован |
| SEC-1 | Редактор приватных ключей | `+-----BEGIN PRIVATE KEY-----\n+synthetic-key-data\n+-----END PRIVATE KEY-----\n+SAFE=true` | Результат содержит `[REDACTED]` и `SAFE=true`, но не содержит заголовок, окончание и данные ключа | `test_redactor_replaces_private_key_block` | Не реализован |
| SEC-1 | Редактор безопасного diff | `+def add(a, b):\n+    return a + b` | Результат полностью совпадает со входом | `test_redactor_keeps_safe_diff_unchanged` | Не реализован |
| REL-1 | Сервис ревью с fake LLM | Diff `+return 42`; fake LLM записывает переданный `timeout` | Fake LLM вызван один раз с `timeout=10` | `test_review_passes_ten_second_timeout` | Не реализован |
| REL-1 | Обработчик timeout | Diff `+return 42`; fake LLM выбрасывает `TimeoutError` | Возвращён контролируемый доменный результат ошибки; `TimeoutError` не выходит из компонента | `test_review_converts_timeout_to_controlled_result` | Не реализован |
| REL-1 | Обработчик ошибки LLM | Diff `+return 42`; fake LLM выбрасывает `RuntimeError("synthetic failure")` | Возвращён контролируемый доменный результат ошибки; `RuntimeError` не выходит из компонента | `test_review_converts_llm_error_to_controlled_result` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":"ok","risks":[],"checks":["pytest -q"]}` | Значение принято; поля `summary`, `risks` и `checks` сохранены без изменения | `test_output_accepts_valid_contract` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":"ok","risks":[]}` без поля `checks` | Значение отклонено с ошибкой валидации, указывающей на отсутствие `checks` | `test_output_rejects_missing_checks` | Не реализован |
| OUT-1 | Валидатор ответа | `{"summary":"ok","risks":"none","checks":[]}` | Значение отклонено с ошибкой валидации поля `risks` | `test_output_rejects_non_array_risks` | Не реализован |
| OUT-1 | Валидатор рисков | Ответ с четырьмя рисками, каждый содержит `file`, `line`, `evidence`, `risk` | Значение отклонено из-за превышения лимита в три риска | `test_output_rejects_more_than_three_risks` | Не реализован |
| OUT-1, QA-1 | Валидатор рисков | Один риск содержит `file`, `line`, `risk`, но не содержит `evidence` | Значение отклонено с ошибкой валидации поля `evidence` | `test_output_rejects_risk_without_evidence` | Не реализован |
| OBS-1 | Формирователь структурного лога | `request_id="req-1"`, `duration_ms=125`, `status="ok"`, diff `+TOKEN=test-token`, ответ `{"summary":"secret response"}` | Запись содержит только `request_id`, `duration_ms`, `status`; в ней отсутствуют diff, `test-token`, ответ и `secret response` | `test_log_contains_metadata_only` | Не реализован |

Планируемый запуск после реализации: `pytest -q tests/unit`.

## Как использовали AI

- Строка в [`prompts.md`](prompts.md): P1-06.
- Что проверили и исправили сами: тесты ограничены поведением отдельных компонентов; использованы только синтетические секреты, а точные имена тестов помечены как планируемый evidence до появления реализации.
