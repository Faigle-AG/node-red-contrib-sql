#!/bin/sh
# Usage: wait.sh FILE SEEN_SUM [MAX_SECONDS]   (MAX: 0-9999, no leading zeros; default 120)
# SEEN_SUM is the `cksum <FILE` taken BEFORE you last read FILE. Prints the current sum.
# Exit 0 FILE differs from SEEN_SUM (also if it already did), 1 timeout, 2 unreadable, 64 bad usage.
[ $# -ge 2 ] && [ $# -le 3 ] || { echo "usage: wait.sh FILE SEEN_SUM [MAX_SECONDS]" >&2; exit 64; }
f=$1; seen=$2; max=${3:-120}; t=0
case $max in ''|*[!0-9]*|0?*|?????*) echo "bad MAX_SECONDS: $max" >&2; exit 64;; esac
while :; do
  now=$(cksum <"$f") || exit 2
  [ "$now" != "$seen" ] && { echo "$now"; exit 0; }
  [ "$t" -ge "$max" ] && { echo "$now"; exit 1; }
  step=$((max - t)); [ "$step" -gt 5 ] && step=5
  sleep "$step"; t=$((t + step))
done
