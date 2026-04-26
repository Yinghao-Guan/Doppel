#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$HERE/assets"
TMP="$HERE/tmp"
DEMO="$HERE/.."
OUTPUT="$DEMO/doppel-opening.mp4"

mkdir -p "$TMP"
rm -f "$TMP"/*.mp4 "$TMP/concat.txt"

FPS=30
FF_COMMON=(-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r "$FPS")

make_clip() {
  local png="$1" duration="$2" fade_in_n="$3" fade_out_start="$4" fade_out_n="$5" output="$6"
  local vf
  if [[ "$fade_out_n" -gt 0 ]]; then
    vf="fade=t=in:s=0:n=${fade_in_n},fade=t=out:s=${fade_out_start}:n=${fade_out_n}"
  else
    vf="fade=t=in:s=0:n=${fade_in_n}"
  fi
  ffmpeg -y -loglevel error -loop 1 -framerate "$FPS" -i "$png" -t "$duration" \
    -vf "${vf},format=yuv420p" \
    "${FF_COMMON[@]}" \
    "$output"
  echo "  built $(basename "$output")"
}

echo "encoding clips..."

# Beat 1: 4s (120 frames). Fade-in 12f (0.4s), fade-out 9f (0.3s) starting at 111
make_clip "$ASSETS/beat1_title.png"        4 12 111 9 "$TMP/beat1.mp4"

# Beat 2: 7s (210 frames). Fade-in 9f, fade-out 9f starting at 201
make_clip "$ASSETS/beat2_scatter.png"      7 9 201 9 "$TMP/beat2.mp4"

# Beat 3: 5s (150 frames). Fade-in 9f, fade-out 9f starting at 141
make_clip "$ASSETS/beat3_nonresponse.png"  5 9 141 9 "$TMP/beat3.mp4"

# Beat 4: 5s (150 frames). Fade-in 9f, fade-out 9f starting at 141
make_clip "$ASSETS/beat4_dropout.png"      5 9 141 9 "$TMP/beat4.mp4"

# Beat 5: 9s (270 frames). Fade-in 18f (0.6s, longer for the brand reveal), no fade-out.
make_clip "$ASSETS/beat5_tagline.png"      9 18 0 0 "$TMP/beat5.mp4"

echo "concatenating..."

cat > "$TMP/concat.txt" <<EOF
file '$TMP/beat1.mp4'
file '$TMP/beat2.mp4'
file '$TMP/beat3.mp4'
file '$TMP/beat4.mp4'
file '$TMP/beat5.mp4'
EOF

ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/concat.txt" -c copy "$OUTPUT"

echo
echo "output: $OUTPUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=noprint_wrappers=1 "$OUTPUT"
ls -lh "$OUTPUT" | awk '{print "size: "$5}'
