#!/usr/bin/env bash
# Generates public/og-cover-v5.jpg — the Open Graph / WhatsApp share preview.
#
# Composition (1200x630), editorial/premium:
#   - Left ~48%: tight crop of the engraved thermos. The photo background is
#     desaturated, darkened and wine-tinted (a saturation mask protects the
#     near-achromatic thermos, which keeps its contrast), with a subtle
#     vignette, dissolving into the panel through a wide fusion gradient.
#   - Right: 3-level type hierarchy on a deep charcoal-plum diagonal —
#     MarketPlace logo (dominant), a thin champagne rule, the Creativa Studio
#     icon over "CREATIVA STUDIO" as a small letterspaced maker's-mark
#     signature, and the tagline in Cronos Pro Display Italic, pure white.
#   - Finish: 1px gold inner frame inset from the edges (liquor-label style)
#     and a very diffuse champagne glow behind the brand stack.
#
# Requires ImageMagick 7 (`magick`) and node (only to decompress the Inter
# woff2 via api-server's wawoff2 dependency). All inputs live in the repo:
#   - public/galeria/termomate.webp            (photo, 900x900)
#   - public/marketplace-logo.webp             (logo, 200x40, alpha)
#   - public/la-creativa-logo-new.webp         (Creativa icon, alpha)
#   - public/fonts/inter-latin.woff2           (signature font)
#   - attached_assets/Cronos-Pro-Display-Italic_*.ttf (tagline font)
#
# Note: filenames are versioned (v2, v3, ...) on purpose — WhatsApp caches
# og:image by URL, so a NEW filename is how you bust its cache. If you change
# the design, bump the version here AND in index.html's og/twitter image tags.
set -euo pipefail
cd "$(dirname "$0")/.."

# ---------------------------------------------------------------- inputs ----
OUT=public/og-cover-v5.jpg
PHOTO=public/galeria/termomate.webp
LOGO=public/marketplace-logo.webp
CREATIVA_ICON=public/la-creativa-logo-new.webp
FONT_TAGLINE=../../attached_assets/Cronos-Pro-Display-Italic_12438_1779541309200.ttf

# ------------------------------------------------------------ parameters ----
CANVAS=1200x630
BG_TOP="#241419"; BG_BOTTOM="#0b0709"; BG_ANGLE=120  # deep charcoal-plum diagonal

PHOTO_W=576                    # photo strip width (~48% of 1200)
PHOTO_CROP=622x680+149+120     # editorial crop of the 900x900 source
PHOTO_MODULATE=62,26,100       # background: brightness 62%, saturation 26%
PHOTO_TINT='#241419'           # wine tint over the muted background...
PHOTO_TINT_PCT=28              # ...at this strength (%)
VIGNETTE_EDGE='#606060'        # vignette darkness at photo corners
FUSION_W=140                   # width of the photo->panel dissolve

PANEL_CX=888                   # horizontal axis of the right panel
LOGO_W=500                     # MarketPlace logo width (dominant block)
LOGO_Y=150
AIR_LOGO_RULE=40               # air between logo and champagne rule
RULE_W=80                      # thin horizontal rule width...
RULE_OPACITY=0.40              # ...and opacity
AIR_RULE_ICON=25              # air between rule and signature icon
AIR_ICON_SIG=10               # air between icon and signature text
SIG_ICON_H=34                 # Creativa Studio icon height (maker's mark)
SIG_POINTSIZE=20               # "CREATIVA STUDIO" (~40-45% of MP wordmark)
SIG_TRACKING=4                 # ~0.2em at this size
SIG_COLOR='#cbb890'            # muted champagne
AIR_SIG_TAG=50                 # air between signature and tagline
TAG_POINTSIZE=48
TAG_TEXT='Personalizá tu producto.'
TAG_COLOR=white

GLOW_OPACITY=0.07              # diffuse champagne glow behind the stack
FRAME_INSET=24                 # 1px gold inner frame...
FRAME_OPACITY=0.25             # ...at this opacity
FRAME_COLOR='#d4b872'
CHAMPAGNE='#e8d5a8'
IVORY='#f4eee6'
JPG_QUALITY=85

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

# 1. Background + glow
magick -size "$CANVAS" -define gradient:angle="$BG_ANGLE" \
  gradient:"$BG_TOP"-"$BG_BOTTOM" "$TMP/bg.png"
magick -size 800x560 radial-gradient:"$CHAMPAGNE"-none \
  -channel A -evaluate multiply "$GLOW_OPACITY" +channel "$TMP/glow.png"

# 2. Photo strip: crop, mute the background behind a saturation mask (the
#    thermos is near-achromatic so the mask leaves it untouched), vignette,
#    and dissolve the right edge over FUSION_W px.
magick "$PHOTO" -crop "$PHOTO_CROP" +repage -filter Lanczos \
  -resize "${PHOTO_W}x630!" "$TMP/base.png"
magick "$TMP/base.png" -modulate "$PHOTO_MODULATE" \
  -fill "$PHOTO_TINT" -colorize "$PHOTO_TINT_PCT" "$TMP/muted.png"
magick "$TMP/base.png" -colorspace HSL -channel G -separate +channel \
  -level 5%,60% -blur 0x8 "$TMP/satmask.png"
magick "$TMP/base.png" "$TMP/muted.png" "$TMP/satmask.png" \
  -compose Over -composite "$TMP/treated.png"
magick -size "${PHOTO_W}x630" radial-gradient:white-"$VIGNETTE_EDGE" "$TMP/vign.png"
magick "$TMP/treated.png" "$TMP/vign.png" -compose Multiply -composite "$TMP/photo.png"
magick -size "630x$FUSION_W" gradient:white-black -rotate 90 "$TMP/grad.png"
magick -size "${PHOTO_W}x630" xc:white "$TMP/grad.png" -gravity east -composite "$TMP/fade.png"
magick "$TMP/photo.png" "$TMP/fade.png" -alpha off -compose CopyOpacity -composite "$TMP/photo-faded.png"

# 3. Light version of the MarketPlace logo: upscale, then recolor the
#    (achromatic) gray wordmark to ivory while keeping the crown red. The
#    crown mask is the saturation channel multiplied by alpha — the multiply
#    keeps the RGB garbage under fully-transparent pixels out of the mask
#    (without it the crown gets a dark halo).
magick "$LOGO" -filter Lanczos -resize "${LOGO_W}x" "$TMP/logo.png"
magick "$TMP/logo.png" -alpha extract "$TMP/alpha.png"
magick "$TMP/logo.png" -background white -alpha remove -alpha off \
  -colorspace HSL -channel G -separate +channel -threshold 25% "$TMP/sat.png"
magick "$TMP/sat.png" "$TMP/alpha.png" -compose Multiply -composite "$TMP/crown-mask.png"
magick "$TMP/logo.png" -fill "$IVORY" -colorize 100 "$TMP/logo-ivory.png"
magick "$TMP/logo.png" -background '#c02347' -alpha remove -alpha off "$TMP/logo-red.png"
magick "$TMP/logo-ivory.png" "$TMP/logo-red.png" "$TMP/crown-mask.png" \
  -compose Over -composite "$TMP/logo-light.png"

# 4. Rule, signature (icon + text), tagline
magick -size "${RULE_W}x1" xc:"$CHAMPAGNE" -alpha set \
  -channel A -evaluate multiply "$RULE_OPACITY" +channel "$TMP/rule.png"
magick "$CREATIVA_ICON" -trim +repage -filter Lanczos -resize "x$SIG_ICON_H" \
  -fill "$SIG_COLOR" -colorize 100 "$TMP/sig-icon.png"
magick -background none -font "$TMP/inter.ttf" -pointsize "$SIG_POINTSIZE" \
  -kerning "$SIG_TRACKING" -fill "$SIG_COLOR" label:'CREATIVA STUDIO' "$TMP/sig.png"
magick -background none -font "$FONT_TAGLINE" -pointsize "$TAG_POINTSIZE" \
  -kerning 1 -fill "$TAG_COLOR" label:"$TAG_TEXT" "$TMP/tag.png"

# 5. Vertical rhythm (positions derived from the AIR_* constants) and
#    horizontal centering of each element on the panel axis.
logo_h=$(magick identify -format %h "$TMP/logo-light.png")
icon_w=$(magick identify -format %w "$TMP/sig-icon.png")
sig_w=$(magick identify -format %w "$TMP/sig.png")
sig_h=$(magick identify -format %h "$TMP/sig.png")
tag_w=$(magick identify -format %w "$TMP/tag.png")
rule_y=$((LOGO_Y + logo_h + AIR_LOGO_RULE))
icon_y=$((rule_y + 1 + AIR_RULE_ICON))
sig_y=$((icon_y + SIG_ICON_H + AIR_ICON_SIG))
tag_y=$((sig_y + sig_h + AIR_SIG_TAG))
logo_x=$((PANEL_CX - LOGO_W / 2))
rule_x=$((PANEL_CX - RULE_W / 2))
icon_x=$((PANEL_CX - icon_w / 2))
sig_x=$((PANEL_CX - sig_w / 2))
tag_x=$((PANEL_CX - tag_w / 2))
frame_br_x=$((1200 - FRAME_INSET - 1))
frame_br_y=$((630 - FRAME_INSET - 1))

# 6. Final composite (-gravity northwest resets the sticky west gravity)
#    plus the 1px gold inner frame over everything.
magick "$TMP/bg.png" "$TMP/glow.png" -geometry +488+30 -composite \
  "$TMP/photo-faded.png" -gravity west -composite \
  -gravity northwest \
  "$TMP/logo-light.png" -geometry "+$logo_x+$LOGO_Y" -composite \
  "$TMP/rule.png" -geometry "+$rule_x+$rule_y" -composite \
  "$TMP/sig-icon.png" -geometry "+$icon_x+$icon_y" -composite \
  "$TMP/sig.png" -geometry "+$sig_x+$sig_y" -composite \
  "$TMP/tag.png" -geometry "+$tag_x+$tag_y" -composite \
  -stroke "$FRAME_COLOR" -strokewidth 1 -fill none \
  -draw "stroke-opacity $FRAME_OPACITY rectangle $FRAME_INSET,$FRAME_INSET $frame_br_x,$frame_br_y" \
  "$TMP/cover.png"

magick "$TMP/cover.png" -strip -quality "$JPG_QUALITY" -sampling-factor 4:2:0 "$OUT"
magick identify "$OUT"
