生成頭像多解析度變體

目的
- 為 `public/images` 中的頭像生成不同解析度（32、64、128、256），以便在不同螢幕尺寸或 UI 元件中使用 `srcset` 或依需求載入。

先決條件
- Python 3.8+
- Pillow 套件

安裝 Pillow

```bash
pip install Pillow
```

執行

```bash
python scripts/generate_avatar_variants.py
```

輸出
- 在 `public/images` 會生成新的檔案，例如 `121298_0_32.jpg`、`121298_0_64.jpg` 等。
- 同目錄會生成 `avatars.json`，格式如下：

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

整合到前端
- 前端可讀取 `public/images/avatars.json`，然後以需要解析度載入對應檔案，或使用 `srcset` 屬性。範例：

```tsx
// 假設 avatarVariants = avatarsJson["121298_0.jpg"]
<img
  src={`/images/${avatarVariants['128']}`}
  srcSet={`/images/${avatarVariants['32']} 32w, /images/${avatarVariants['64']} 64w, /images/${avatarVariants['128']} 128w, /images/${avatarVariants['256']} 256w`}
  sizes="(max-width: 640px) 32px, (max-width: 1024px) 64px, 128px"
  alt="player avatar"
/>
```

如需我直接整合前端的 `Avatar` component 使用 `avatars.json`，請告訴我你想要的行為（例如：自動依元件尺寸選最佳檔案，或暴露 `size` prop）。
