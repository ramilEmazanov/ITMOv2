#!/usr/bin/env bash
# EXAMPLE for CMake. Adapt to RouteFinder's actual dependencies and CI commands.
set -euo pipefail
cmake -S . -B /tmp/routefinder-ai-build -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTING=ON
cmake --build /tmp/routefinder-ai-build --parallel 2
