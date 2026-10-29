#!/bin/sh
# Usage: append-r5.sh FILE MESSAGE_FILE. Appends one whole message under a mkdir lock.
# Gives up after ~30s (exit 1): a stale FILE.lock must be removed by a human or the Moderator.
n=0
until mkdir "$1.lock" 2>/dev/null; do
  n=$((n + 1)); [ "$n" -ge 30 ] && { echo "lock busy: $1.lock" >&2; exit 1; }
  sleep 1
done
trap 'rmdir "$1.lock"' EXIT
cat "$2" >> "$1"
