#!/usr/bin/env bash
# EXAMPLE for a CTest suite registered by the project's CMakeLists.txt.
set -euo pipefail
ctest --test-dir /tmp/routefinder-ai-build --output-on-failure --no-tests=error
