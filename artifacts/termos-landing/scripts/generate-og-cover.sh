#!/usr/bin/env bash
# Generates public/og-cover-v2.jpg — the Open Graph / WhatsApp share preview.
#
# Composition: engraved thermos photo (left) fading into a dark premium
# background, with the MarketPlace logo (crown red, wordmark recolored to
# ivory for dark bg) and the tagline "Termos grabados a medida" (right).
#
# Requires only ImageMagick 7 (`magick`). All inputs live in the repo:
#   - public/galeria/termomate.webp          (photo, 900x900)
#   - public/marketplace-logo.webp           (logo, 200x40, alpha)
#   - attached_assets/Cronos-Pro-Subhead_*.ttf (site headline font)
#
# Output: 1200x630 JPG, well under the 300 KB scraper limit.
# Note: the filename is versioned (v2, v3, ...) on purpose — WhatsApp caches
# og:image by URL, so a NEW filename is how you bust its cache. If you change
# the design, bump the version here AND in index.html's og/twitter image tags.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=public/og-cover-v2.jpg
PHOTO=public/galeria/termomate.webp
LOGO=public/marketplace-logo.webp
FONT=../../attached_assets/Cronos-Pro-Subhead_12458_1779541345396.ttf
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1. Dark premium background with a subtle wine-tinted radial glow
#    (matches the landing's primary hsl(345 70% 32%) family).
magick -size 1200x630 radial-gradient:'#331a24'-'#150b10' "$TMP/bg.png"

# 2. Photo panel: crop off the photo's right edge (stray red object), fill
#    the canvas height, and fade the last 90px into the background.
magick "$PHOTO" -crop 700x900+60+0 +repage -filter Lanczos -resize x630 "$TMP/photo.png"
magick -size 630x90 gradient:white-black -rotate 90 "$TMP/grad.png"
magick -size 490x630 xc:white "$TMP/grad.png" -gravity east -composite "$TMP/fade.png"
magick "$TMP/photo.png" "$TMP/fade.png" -alpha off -compose CopyOpacity -composite "$TMP/photo-faded.png"

# 3. Light version of the logo: upscale, then recolor the (achromatic) gray
#    wordmark to ivory while keeping the crown red. The crown mask is the
#    saturation channel multiplied by alpha — the multiply is what keeps the
#    RGB garbage under fully-transparent pixels out of the mask (without it
#    the crown gets a dark halo).
magick "$LOGO" -filter Lanczos -resize 540x "$TMP/logo.png"
magick "$TMP/logo.png" -alpha extract "$TMP/alpha.png"
magick "$TMP/logo.png" -background white -alpha remove -alpha off \
  -colorspace HSL -channel G -separate +channel -threshold 25% "$TMP/sat.png"
magick "$TMP/sat.png" "$TMP/alpha.png" -compose Multiply -composite "$TMP/crown-mask.png"
magick "$TMP/logo.png" -fill '#f4eee6' -colorize 100 "$TMP/logo-ivory.png"
magick "$TMP/logo.png" -background '#c02347' -alpha remove -alpha off "$TMP/logo-red.png"
magick "$TMP/logo-ivory.png" "$TMP/logo-red.png" "$TMP/crown-mask.png" \
  -compose Over -composite "$TMP/logo-light.png"

# 4. Compose: photo (west), then logo + tagline on the right column.
#    -gravity northwest resets the sticky west gravity before the offsets.
magick "$TMP/bg.png" "$TMP/photo-faded.png" -gravity west -composite \
  -gravity northwest "$TMP/logo-light.png" -geometry +575+215 -composite \
  -font "$FONT" -pointsize 42 -fill '#f2ece4' \
  -annotate +632+404 'Termos grabados a medida' \
  "$TMP/cover.png"

magick "$TMP/cover.png" -strip -quality 85 -sampling-factor 4:2:0 "$OUT"
magick identify "$OUT"
