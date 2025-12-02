# Generate Multi-Resolution Avatar Variants

## Purpose
- Generate different resolutions (32, 64, 128, 256) for avatars in `public/images` to facilitate using `srcset` or loading specific sizes based on screen dimensions or UI component requirements.

## Prerequisites
- Python 3.8+
- Pillow package

## Install Pillow

```bash
pip install Pillow
```

## Execution

```bash
python scripts/generate_avatar_variants.py
```

## Output
- New files will be generated in `public/images`, such as `121298_0_32.jpg`, `121298_0_64.jpg`, etc.
- An `avatars.json` file will be generated in the same directory with the following format:

```json
{
  "121298_0.jpg": {
    "32": "121298_0_32.jpg",
    "64": "121298_0_64.jpg",
    "128": "121298_0_128.jpg",
    "256": "121298_0_256.jpg"
  },
  ...
}
```

## Frontend Integration
- The frontend can read `public/images/avatars.json` and then load the corresponding file based on the required resolution, or use the `srcset` attribute. Example:

```tsx
// Assuming avatarVariants = avatarsJson["121298_0.jpg"]
<img
  src={`/images/${avatarVariants['128']}`}
  srcSet={`/images/${avatarVariants['32']} 32w, /images/${avatarVariants['64']} 64w, /images/${avatarVariants['128']} 128w, /images/${avatarVariants['256']} 256w`}
  sizes="(max-width: 640px) 32px, (max-width: 1024px) 64px, 128px"
  alt="player avatar"
/>
```

If you need me to directly integrate `avatars.json` into the frontend `Avatar` component, please let me know your desired behavior (e.g., automatically select the best file based on component size, or expose a `size` prop).
