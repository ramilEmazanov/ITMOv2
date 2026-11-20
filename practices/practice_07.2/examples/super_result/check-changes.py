"""Trusted guard for the sample runner; invoke with BASE_SHA and tests/fix phase."""
import pathlib
import subprocess
import sys

base, phase = sys.argv[1:]
if phase not in {"tests", "fix"}:
    raise SystemExit("Unknown phase")
if subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() != base:
    raise SystemExit("Agent changed HEAD")
tracked = subprocess.check_output(["git", "diff", "--name-only", "-z", base])
untracked = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", "-z"])
paths = {p.decode() for p in (tracked + untracked).split(b"\0") if p}
if not paths:
    raise SystemExit("Agent produced no changes")
# Adapt these prefixes to RouteFinder before the first launch.
allowed = ("tests/",) if phase == "tests" else ("src/", "include/", "tests/")
for name in paths:
    path = pathlib.Path(name)
    if not name.startswith(allowed) or ".." in path.parts:
        raise SystemExit(f"Change outside allowlist: {name}")
    if path.is_symlink() or not path.is_file():
        raise SystemExit(f"Deletion or symlink is not allowed: {name}")
print(f"Validated {len(paths)} changed paths in phase {phase}")
