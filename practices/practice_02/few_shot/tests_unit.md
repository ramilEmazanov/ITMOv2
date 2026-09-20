# Unit-проверки

Все секреты синтетические; `\n` обозначает перевод строки. Параметризованные варианты запускаются отдельно. LLM заменён fake-объектом, время — управляемыми часами. Захватываются все логи компонента, включая сообщения исключений и traceback.

Фикстуры для проверок ответа:

- `V = {"summary":"ok","risks":[],"checks":["pytest -q"]}`.
- `D = "--- a/app.py\n+++ b/app.py\n@@ -0,0 +1,4 @@\n+logger.info(diff)\n+logger.warning(diff)\n+logger.error(diff)\n+logger.debug(diff)\n"`.
- `R1`–`R4`: объекты с `file="app.py"`, `line=1`–`4`, `evidence` равным соответствующей строке `D` без `+` и `risk="OBS-1: содержимое diff попадает в лог"`. Например, `R1 = {"file":"app.py","line":1,"evidence":"logger.info(diff)","risk":"OBS-1: содержимое diff попадает в лог"}`.

В этой таблице невалидный ответ отклоняется валидатором целиком. Схема доменной ошибки REL-1 ещё не определена в требованиях: ниже проверяются наблюдаемые свойства без выдуманного кода ошибки или HTTP-статуса.

| Правило | Изолируемый компонент | Точный синтетический вход | Ожидаемый результат | Планируемый тест и статус |
|---|---|---|---|---|
| SEC-1 | Редактор токенов | `+TOKEN=test-token\n+DEBUG=true` | Результат равен `+TOKEN=[REDACTED]\n+DEBUG=true`; `test-token` отсутствует | План: `test_redacts_token`; не реализован |
| SEC-1 | Редактор паролей | `+password=hunter2\n+mode=review` | Результат равен `+password=[REDACTED]\n+mode=review`; `hunter2` отсутствует | План: `test_redacts_password`; не реализован |
| SEC-1 | Редактор приватных ключей | `+SAFE=before\n+-----BEGIN PRIVATE KEY-----\n+synthetic-key-line-1\n+synthetic-key-line-2\n+-----END PRIVATE KEY-----\n+SAFE=after` | Результат равен `+SAFE=before\n+[REDACTED]\n+SAFE=after`; обе строки ключа и оба PEM-маркера отсутствуют | План: `test_redacts_entire_private_key`; не реализован |
| SEC-1 | Редактор всех вхождений | `-TOKEN=old-token\n+TOKEN=new-token\n+password=hunter2` | Результат равен `-TOKEN=[REDACTED]\n+TOKEN=[REDACTED]\n+password=[REDACTED]`; все три исходных значения отсутствуют | План: `test_redacts_all_added_and_removed_secrets`; не реализован |
| SEC-1 | Редактор безопасного текста | Отдельно: `+def add(a, b):\n+    return a + b\n`, `+message="Привет"\n+DEBUG=true`, пустая строка `""` | Результат посимвольно равен входу, включая пробелы и завершающий перевод строки | План: `test_preserves_safe_and_empty_text`; не реализован |
| REL-1 | Сервис ревью с fake LLM | Diff `+return 42`; fake LLM возвращает `V` и записывает аргументы вызова | Fake LLM получает `timeout=10` секунд; возвращён `V` | План: `test_passes_ten_second_timeout`; не реализован |
| REL-1 | LLM-адаптер с управляемыми часами | Diff `+return 42`; fake LLM возвращает `V` в момент `t=9.999` с после начала вызова | Возвращён `V`, ошибка таймаута не сформирована | План: `test_accepts_response_before_deadline`; не реализован; нужен адаптер с управляемыми часами |
| REL-1 | LLM-адаптер с управляемыми часами | Fake LLM не отвечает; часы показывают `9.999`, `10.000`, `10.001` с; затем fake выдаёт `V` | В `9.999` с вызов ожидается; в `10.000` с ожидание завершено таймаутом; в `10.001` с состояние не меняется; поздний `V` не заменяет ошибку | План: `test_times_out_at_deadline_and_ignores_late_response`; не реализован; нужен адаптер с управляемыми часами |
| REL-1 | Обработчик timeout | Diff `+return 42`; fake LLM выбрасывает `TimeoutError("synthetic timeout")` | Возвращён доменный результат ошибки, отличимый от успеха; причина — таймаут; исключение не выходит наружу | План: `test_converts_timeout_to_error_result`; не реализован |
| REL-1 | Обработчик ошибок LLM | Diff `+return 42`; отдельно `ConnectionError("synthetic offline")` и `RuntimeError("synthetic failure")` от fake LLM | Возвращён доменный результат ошибки, отличимый от успеха; исключение не выходит наружу | План: `test_converts_llm_failure_to_error_result`; не реализован |
| OUT-1 | Парсер ответа | JSON-строка `{"summary":"ok","risks":[],"checks":["pytest -q"]}` | Получен объект, равный `V`; все три поля сохранены | План: `test_parses_valid_json`; не реализован |
| OUT-1 | Парсер ответа | Отдельно: пустая строка `""`, текст `Ответ готов`, незавершённый JSON `{"summary":"ok"` | Каждый вход отклонён как невалидный JSON; успешный результат ревью не сформирован | План: `test_rejects_empty_text_and_broken_json`; не реализован |
| OUT-1 | Валидатор корневого значения | Отдельно JSON-строки `null`, `[]`, `"ok"` | Каждое значение отклонено: корень ответа должен быть объектом | План: `test_rejects_non_object_response`; не реализован |
| OUT-1 | Валидатор обязательных полей | Три копии `V`: без `summary`, без `risks`, без `checks` | Каждая копия отклонена; ошибка указывает имя отсутствующего поля | План: `test_rejects_missing_required_fields`; не реализован |
| OUT-1 | Валидатор типов полей | Копии `V` с одной заменой: `summary=42`, `risks="none"`, `checks="pytest -q"` | Каждая копия отклонена; ошибка указывает изменённое поле | План: `test_rejects_wrong_field_types`; не реализован |
| OUT-1, QA-1 | Валидатор допустимого числа рисков | `D` и копии `V` с `risks=[]`, `[R1]`, `[R1,R2,R3]` | Приняты все три варианта; число рисков равно `0`, `1`, `3`; значения полей не изменены | План: `test_accepts_zero_one_and_three_proven_risks`; не реализован |
| OUT-1 | Валидатор верхней границы рисков | `D` и копия `V` с `risks=[R1,R2,R3,R4]` | Ответ отклонён с ошибкой лимита `risks`; четыре риска не выданы как успешный результат | План: `test_rejects_four_proven_risks`; не реализован |
| OUT-1, QA-1 | Валидатор обязательных полей риска | `D` и `V` с `risks=[R1]`; отдельно удалить из `R1` поле `file`, `line`, `evidence` или `risk` | Каждый вариант отклонён; ошибка указывает отсутствующее поле первого риска | План: `test_rejects_incomplete_risk`; не реализован |
| QA-1 | Валидатор непустого доказательства | `D` и `V` с `risks=[R1]`; отдельно заменить `evidence` на `""` и `"   "` | Оба ответа отклонены: пустое или пробельное доказательство не подтверждает риск | План: `test_rejects_blank_evidence`; не реализован |
| QA-1 | Проверка привязки доказательства | `D` и `V` с `risks=[R1]`; отдельно заменить `file` на `missing.py`, `line` на `99`, `evidence` на `print("safe")` | Каждый ответ отклонён: указанный файл, строка или цитата отсутствуют в `D`; риск не опубликован | План: `test_rejects_evidence_not_found_in_diff`; не реализован |
| QA-1 | Проверка смысла доказательства | `D` и `V` с `risks=[R1]`, но `risk="Вызов LLM выполняется без таймаута"`; `evidence="logger.info(diff)"` | Ответ отклонён: строка логирования не доказывает утверждение о таймауте LLM | План: `test_rejects_claim_unsupported_by_evidence`; не реализован |
| OBS-1 | Формирователь логов при успехе | `request_id="req-1"`, `duration_ms=125`, `status="ok"`; diff `+TOKEN=test-token\n+SAFE=DIFF_MARKER`; ответ `{"summary":"LLM_MARKER","risks":[],"checks":[]}` | Запись равна `{"request_id":"req-1","duration_ms":125,"status":"ok"}`; во всех логах отсутствуют diff, ответ, `test-token`, `DIFF_MARKER`, `LLM_MARKER`, а также отредактированный diff | План: `test_logs_only_metadata_on_success`; не реализован |
| OBS-1 | Формирователь логов при отказе | Diff и ответ как в строке выше; отдельно `status="timeout"`, `"llm_error"`, `"invalid_response"`; сообщение исключения `DIFF_MARKER LLM_MARKER test-token` | Каждая запись содержит только `request_id`, `duration_ms`, `status`; сообщения, traceback и дополнительные поля не содержат diff, ответ или любой из трёх маркеров | План: `test_logs_only_metadata_on_failure`; не реализован |

Планируемый запуск после реализации: `pytest -q tests/unit`. Таблица описывает 23 сценария, а не результаты выполненных тестов.

## Как использовали AI

- Исходный артефакт: [`tests_unit.md`](../../practice_01/tests_unit.md); исходный запрос P1-06: [`prompts.md`](../../practice_01/prompts.md).
- Few-shot-запрос и примеры: [`experiment.md`](experiment.md).
- Что изменили: задали точные входы и наблюдаемые результаты, добавили границы времени и числа рисков, проверку содержания доказательств и отсутствия payload в логах при успехе и отказе. Все тесты помечены как планируемые и нереализованные.
