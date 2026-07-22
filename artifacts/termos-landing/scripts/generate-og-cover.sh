#!/usr/bin/env bash
# Generates the Open Graph / WhatsApp share previews (v3):
#   public/og-cover-v3-producto.jpg  — tagline "Personalizá tu producto."
#   public/og-cover-v3-termo.jpg     — tagline "Personalizá tu termo."
#
# Composition (1200x630): engraved thermos photo on the left (~41% width)
# fading ~60px into a dark wine-tinted panel; on the right a 3-level brand
# stack, vertically centered — MarketPlace logo (protagonist), a thin
# champagne divider, the Creativa Studio sub-brand (icon + Inter wordmark at
# ~62% of the MarketPlace block), and the tagline in Cronos Pro Display
# Italic. A very soft champagne glow (10% opacity) sits behind the stack.
#
# Requires ImageMagick 7 (`magick`) and node (only to decompress the Inter
# woff2 via api-server's wawoff2 dependency). All inputs live in the repo:
#   - public/galeria/termomate.webp            (photo, 900x900)
#   - public/marketplace-logo.webp             (logo, 200x40, alpha)
#   - public/la-creativa-logo-new.webp         (Creativa icon, alpha)
#   - public/fonts/inter-latin.woff2           (Creativa wordmark font)
#   - attached_assets/Cronos-Pro-Display-Italic_*.ttf (tagline font)
#
# Note: filenames are versioned (v2, v3, ...) on purpose — WhatsApp caches
# og:image by URL, so a NEW filename is how you bust its cache. If you change
# the design, bump the version here AND in index.html's og/twitter image tags.
set -euo pipefail
cd "$(dirname "$0")/.."

PHOTO=public/galeria/termomate.webp
LOGO=public/marketplace-logo.webp
CREATIVA_ICON=public/la-creativa-logo-new.webp
FONT_TAGLINE=../../attached_assets/Cronos-Pro-Display-Italic_12438_1779541309200.ttf
IVORY='#f4eee6'
CHAMPAGNE='#e8d5a8'
TAGLINE_COLOR='#f7ecd8'
PANEL_CENTER_X=845
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Inter ships only as woff2; ImageMagick needs a ttf. Decompress with the
# wawoff2 package already installed for api-server.
node -e "
const { createRequire } = require('module');
const req = createRequire(process.argv[1] + '/');
const fs = require('fs');
req('wawoff2').decompress(fs.readFileSync('public/fonts/inter-latin.woff2'))
  .then(ttf => fs.writeFileSync(process.argv[2], Buffer.from(ttf)));
" "$(pwd)/../api-server/node_modules" "$TMP/inter.ttf"

# 1. Dark premium background (wine radial -> near black) + a soft champagne
#    glow behind the brand stack for depth.
magick -size 1200x630 radial-gradient:'#331a24'-'#150b10' "$TMP/bg.png"
magick -size 800x560 radial-gradient:"$CHAMPAGNE"-none \
  -channel A -evaluate multiply 0.10 +channel "$TMP/glow.png"
magick "$TMP/bg.png" "$TMP/glow.png" -geometry +445+10 -composite "$TMP/bg-glow.png"

# 2. Photo panel: crop off the photo's right edge (stray red object), fill
#    the canvas height, and fade the last ~60px into the background.
magick "$PHOTO" -crop 700x900+60+0 +repage -filter Lanczos -resize x630 "$TMP/photo.png"
magick -size 630x60 gradient:white-black -rotate 90 "$TMP/grad.png"
magick -size 490x630 xc:white "$TMP/grad.png" -gravity east -composite "$TMP/fade.png"
magick "$TMP/photo.png" "$TMP/fade.png" -alpha off -compose CopyOpacity -composite "$TMP/photo-faded.png"

# 3. Light version of the MarketPlace logo: upscale, then recolor the
#    (achromatic) gray wordmark to ivory while keeping the crown red. The
#    crown mask is the saturation channel multiplied by alpha — the multiply
#    keeps the RGB garbage under fully-transparent pixels out of the mask
#    (without it the crown gets a dark halo).
magick "$LOGO" -filter Lanczos -resize 540x "$TMP/logo.png"
magick "$TMP/logo.png" -alpha extract "$TMP/alpha.png"
magick "$TMP/logo.png" -background white -alpha remove -alpha off \
  -colorspace HSL -channel G -separate +channel -threshold 25% "$TMP/sat.png"
magick "$TMP/sat.png" "$TMP/alpha.png" -compose Multiply -composite "$TMP/crown-mask.png"
magick "$TMP/logo.png" -fill "$IVORY" -colorize 100 "$TMP/logo-ivory.png"
magick "$TMP/logo.png" -background '#c02347' -alpha remove -alpha off "$TMP/logo-red.png"
magick "$TMP/logo-ivory.png" "$TMP/logo-red.png" "$TMP/crown-mask.png" \
  -compose Over -composite "$TMP/logo-light.png"

# 4. Creativa Studio sub-brand block: icon + Inter wordmark, ~62% of the
#    MarketPlace block width. (-background none must precede +smush or the
#    join is flattened onto white.)
magick "$CREATIVA_ICON" -trim +repage -filter Lanczos -resize x64 \
  -fill "$IVORY" -colorize 100 "$TMP/creativa-icon.png"
magick -background none -font "$TMP/inter.ttf" -pointsize 34 -kerning 1.5 \
  -fill "$IVORY" label:'Creativa Studio' "$TMP/creativa-text.png"
magick -background none "$TMP/creativa-icon.png" "$TMP/creativa-text.png" \
  -gravity center +smush 18 "$TMP/creativa-block.png"

# 5. Thin champagne divider between the two brands (1px @ 30%, ~40% of panel).
magick -size 284x1 xc:"$CHAMPAGNE" -alpha set \
  -channel A -evaluate multiply 0.30 +channel "$TMP/divider.png"

# 6. Compose one cover per tagline variant, centering the tagline on the
#    panel axis. -gravity northwest resets the sticky west gravity.
generate_variant() { # $1 = suffix, $2 = tagline text
  local out="public/og-cover-v3-$1.jpg"
  magick -background none -font "$FONT_TAGLINE" -pointsize 44 -kerning 1 \
    -fill "$TAGLINE_COLOR" label:"$2" "$TMP/tagline.png"
  local w x
  w=$(magick identify -format %w "$TMP/tagline.png")
  x=$((PANEL_CENTER_X - w / 2))
  magick "$TMP/bg-glow.png" "$TMP/photo-faded.png" -gravity west -composite \
    -gravity northwest \
    "$TMP/logo-light.png" -geometry +575+158 -composite \
    "$TMP/divider.png" -geometry +703+298 -composite \
    "$TMP/creativa-block.png" -geometry +679+326 -composite \
    "$TMP/tagline.png" -geometry "+$x+444" -composite \
    "$TMP/cover.png"
  magick "$TMP/cover.png" -strip -quality 85 -sampling-factor 4:2:0 "$out"
  magick identify "$out"
}

generate_variant producto 'Personalizá tu producto.'
generate_variant termo    'Personalizá tu termo.'
