# Flight feature verification

Mocked Ignav; isolated temporary SQLite; no live fare request.

## Backend tests: PASS

```text
..........................                                               [100%]
=============================== warnings summary ===============================
.venv/lib/python3.14/site-packages/fastapi/testclient.py:1
  /Users/emilramazanov/itmo/vibecoding3s/ITMOv2/practices/practice_04/backend/.venv/lib/python3.14/site-packages/fastapi/testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
26 passed, 1 warning in 0.94s
```

## Frontend build: PASS

```text
> cheap-flights-frontend@0.1.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
transforming...
✓ 29 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.50 kB │ gzip:  0.35 kB
dist/assets/index-BFmJpsHr.css    4.13 kB │ gzip:  1.44 kB
dist/assets/index-D6Fohf3v.js   231.86 kB │ gzip: 72.28 kB
✓ built in 299ms
```

## Offline A/B scenario: PASS

```text
first=no_previous_price, second=compared, difference=-500.0 RUB (-12.5%), empty=no_current_price, invalid_http=422, mocked_upstream_calls=3, saved_rows=3
```
