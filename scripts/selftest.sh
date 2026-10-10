#!/bin/bash
# Runs the self-driving test build under Mono in a virtual display (Linux), and saves a screenshot of each
# screen to selftest-out/. Needs: dotnet SDK, mono with Windows Forms, Xvfb and ImageMagick's `import`.
# Usage: scripts/selftest.sh [light|dark]
set -u
cd "$(dirname "$0")/.."
THEME=${1:-light}
OUT=selftest-out
dotnet build src/Downshift -c Release -p:DefineConstants=SELFTEST -o artifacts/selftest -v q || exit 1
rm -rf "$OUT" && mkdir "$OUT"

# The test build stores its settings in a throwaway folder so a real configuration is never touched.
export XDG_CONFIG_HOME="$PWD/$OUT/config"
Xvfb :99 -screen 0 1920x1080x24 >/dev/null 2>&1 &
XPID=$!
sleep 2
export DISPLAY=:99 DOWNSHIFT_THEME=$THEME
timeout 300 mono artifacts/selftest/Downshift.exe > "$OUT/out.log" 2>&1 &
APID=$!

# The app prints "-- shot NAME" when a screen is ready to be captured.
DONE=0
for _ in $(seq 1 900); do
  sleep 0.3
  N=$(grep -c "^-- shot " "$OUT/out.log" 2>/dev/null)
  while [ "$DONE" -lt "${N:-0}" ]; do
    DONE=$((DONE+1))
    NAME=$(grep "^-- shot " "$OUT/out.log" | sed -n "${DONE}p" | sed 's/^-- shot //')
    sleep 0.7
    import -window root "$OUT/$NAME.png" 2>/dev/null
  done
  grep -q "quitting" "$OUT/out.log" && break
  kill -0 $APID 2>/dev/null || break
done
sleep 1
kill $APID 2>/dev/null; kill $XPID 2>/dev/null

if grep -q "quitting" "$OUT/out.log" && ! grep -q "NOT FOUND\|Exception" "$OUT/out.log"; then
  echo "Self-test finished: $DONE screens captured in $OUT/"
else
  echo "Self-test did not finish cleanly; see $OUT/out.log"
  exit 1
fi
