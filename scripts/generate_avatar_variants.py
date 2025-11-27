"""Generate avatar image variants for responsive use.

Usage:
  1. Install Pillow: pip install Pillow
  2. Run: python scripts/generate_avatar_variants.py

This will read all JPEG/PNG files in `public/images` and create resized
variants (32, 64, 128, 256). It outputs files named like:
  121298_0_32.jpg
  121298_0_64.jpg

And creates `public/images/avatars.json` mapping base filenames to variants.
"""
from PIL import Image
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "public" / "images"
OUTPUT_MANIFEST = IMAGES_DIR / "avatars.json"
SIZES = [32, 64, 128, 256]

def generate_variants():
    if not IMAGES_DIR.exists():
        print(f"Images directory not found: {IMAGES_DIR}")
        return

    manifest = {}

    for img_path in sorted(IMAGES_DIR.iterdir()):
        if img_path.is_file() and img_path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}:
            stem = img_path.stem
            manifest[img_path.name] = {}
            try:
                with Image.open(img_path) as im:
                    im = im.convert('RGBA') if im.mode in ('LA', 'RGBA') else im.convert('RGB')
                    for s in SIZES:
                        # maintain aspect ratio, fit within s x s
                        im_variant = im.copy()
                        im_variant.thumbnail((s, s), Image.LANCZOS)
                        out_name = f"{stem}_{s}{img_path.suffix}"
                        out_path = IMAGES_DIR / out_name
                        # For PNG keep transparency, for JPG convert to RGB
                        if out_path.suffix.lower() in {'.jpg', '.jpeg'}:
                            if im_variant.mode == 'RGBA':
                                background = Image.new('RGB', im_variant.size, (255,255,255))
                                background.paste(im_variant, mask=im_variant.split()[3])
                                background.save(out_path, quality=85)
                            else:
                                im_variant.save(out_path, quality=85)
                        else:
                            im_variant.save(out_path)

                        manifest[img_path.name][str(s)] = out_name
                print(f"Generated variants for {img_path.name}")
            except Exception as e:
                print(f"Failed to process {img_path.name}: {e}")

    # write manifest
    try:
        with OUTPUT_MANIFEST.open('w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print(f"Wrote manifest to {OUTPUT_MANIFEST}")
    except Exception as e:
        print(f"Failed to write manifest: {e}")

if __name__ == '__main__':
    generate_variants()
