#!/usr/bin/env bash
set -u

echo "MDX Studio - WSL runtime doctor"
echo

check() {
  local name="$1"
  shift
  if ! command -v "$name" >/dev/null 2>&1; then
    printf '[MISSING] %s\n' "$name"
    return 0
  fi
  local first
  first="$($name "$@" 2>&1 | head -n 1 || true)"
  printf '[OK]      %s: %s\n' "$name" "$first"
}

check python3 --version
check git --version
check gmx --version

echo
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "[OK]      WSL environment detected"
else
  echo "[WARN]    This does not appear to be WSL"
fi

echo
echo "This script installs or modifies nothing."
