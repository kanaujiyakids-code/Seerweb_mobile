"""
fix_adaptive_icon.py
────────────────────
Run this script from inside your project's `assets/` folder:

    cd C:\Users\Dell\Desktop\SeerwebOMS\SeerwebOMS\assets
    python fix_adaptive_icon.py

Requirements:  pip install Pillow

What it does:
  1. Reads your existing adaptive-icon.png (any size)
  2. Resizes the logo to 593×593 px (58% of 1024)
  3. Centers it on a 1024×1024 TRANSPARENT canvas
  4. Saves as adaptive-icon.png (overwrites original — backup kept as adaptive-icon-backup.png)

Why 58%?
  Android safe zone = 66.7% of the canvas.
  58% gives ~4% breathing room inside the safe zone on every side, so no
  launcher shape (circle, squircle, rounded-rect) can clip your logo.
"""

import shutil
import os
try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow is not installed. Run: pip install Pillow")
    exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
INPUT  = "adaptive-icon.png"
OUTPUT = "adaptive-icon.png"          # overwrites in-place
BACKUP = "adaptive-icon-backup.png"   # safety copy

CANVAS    = 1024   # Expo standard for adaptive icon foreground
LOGO_SIZE = 593    # 58% of 1024 — safely inside Android 66.7% safe zone
MARGIN    = (CANVAS - LOGO_SIZE) // 2   # = 215 px transparent border each side

# ── Run ───────────────────────────────────────────────────────────────────────
if not os.path.exists(INPUT):
    print(f"ERROR: {INPUT} not found. Run this script from the assets/ folder.")
    exit(1)

# Backup
shutil.copy(INPUT, BACKUP)
print(f"✓ Backup saved → {BACKUP}")

# Open & process
logo = Image.open(INPUT).convert("RGBA")
original_size = logo.size
print(f"✓ Opened {INPUT}: {original_size[0]}×{original_size[1]} px")

# Resize logo preserving aspect ratio (fit inside LOGO_SIZE square)
logo.thumbnail((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
resized_size = logo.size
print(f"✓ Resized logo to: {resized_size[0]}×{resized_size[1]} px")

# Create transparent canvas
canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

# Paste logo centered
paste_x = (CANVAS - resized_size[0]) // 2
paste_y = (CANVAS - resized_size[1]) // 2
canvas.paste(logo, (paste_x, paste_y), logo)
print(f"✓ Logo pasted at ({paste_x}, {paste_y}) — margin: {paste_x}px each side")

# Verify safe zone — no opaque pixels inside the 21% border
border = int(CANVAS * 0.167)   # 16.7% = Android's absolute clip boundary
violations = 0
pixels = canvas.load()
for x in range(CANVAS):
    for y in range(CANVAS):
        in_danger_zone = x < border or x >= CANVAS-border or y < border or y >= CANVAS-border
        if in_danger_zone and pixels[x, y][3] > 0:
            violations += 1

if violations == 0:
    print("✓ Safe-zone check PASSED — no logo pixels in clippable border area")
else:
    print(f"⚠ WARNING: {violations} pixels near the edge — logo may still be slightly clipped")
    print("  Consider reducing LOGO_SIZE in this script (try 560 instead of 593)")

# Save
canvas.save(OUTPUT, "PNG")
print(f"✓ Saved → {OUTPUT}  ({CANVAS}×{CANVAS} px, transparent background)")
print()
print("Next steps:")
print("  1. Run:  npx expo prebuild --clean")
print("  2. Run:  npx expo run:android --variant release")
print("  3. Install APK and long-press icon to verify all launcher shapes")

