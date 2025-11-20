# Zeabur 部署指南

## 架構說明

本專案採用 **單一服務部署** 方式，在同一個 Zeabur 服務中同時運行前端和後端：

- 前端：React + Vite 構建的靜態文件
- 後端：FastAPI 提供 API 服務，同時託管前端靜態文件

## 部署流程

### 1. 連接 GitHub Repository

1. 登入 [Zeabur](https://zeabur.com)
2. 創建新專案 (New Project)
3. 選擇 "Deploy from GitHub"
4. 授權並選擇你的 repository: `ultimate-code-hunt`

### 2. 服務配置

Zeabur 會自動讀取 `zeabur.toml` 配置文件：

```toml
[[services]]
name = "app"
dir = "."
build_command = "npm install && npm run build && pip install -r backend/requirements.txt"
start_command = "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"
```

### 3. 構建過程

部署時會執行以下步驟：

1. **安裝前端依賴**：`npm install`
2. **構建前端**：`npm run build` → 生成 `dist/` 目錄
3. **安裝後端依賴**：`pip install -r backend/requirements.txt`
4. **啟動後端**：`uvicorn backend.main:app` → 同時提供 API 和靜態文件

### 4. 服務運行邏輯

後端 FastAPI 應用程式會：

- 提供 `/api/*` 路徑的 API 服務
- 提供 `/assets/*` 靜態資源（JS、CSS、圖片等）
- 對於其他所有路徑，返回 `index.html`（支援 React Router）

### 5. 環境變數

前端使用相對路徑訪問 API：

- 開發環境 (`.env`)：`VITE_API_URL=http://localhost:8000/api`
- 生產環境 (`.env.production`)：`VITE_API_URL=/api`

## 本地測試生產構建

在部署前，建議先在本地測試：

```bash
# 1. 構建前端
npm run build

# 2. 安裝後端依賴
pip install -r backend/requirements.txt

# 3. 啟動後端（會自動服務前端）
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# 4. 訪問 http://localhost:8000
```

## 注意事項

1. **資料庫持久化**：目前使用 SQLite，資料庫文件會在容器重啟後遺失
   - 建議：切換到 PostgreSQL 或使用 Zeabur 的持久化存儲

2. **CORS 設定**：生產環境已設定允許所有來源，可根據需求調整

3. **API 路徑**：所有 API 請求都應該使用 `/api` 前綴

## 常見問題

### 問題 1：部署後 404 錯誤

確保 `backend/main.py` 中的靜態文件服務配置正確，特別是 `dist_path` 路徑。

### 問題 2：API 請求失敗

檢查前端的 API base URL 是否正確設定為 `/api`（相對路徑）。

### 問題 3：路由重新整理 404

FastAPI 的 `serve_spa` 函數會處理所有非 API 路徑，返回 `index.html`。

## 監控與日誌

在 Zeabur Dashboard 中可以查看：
- 部署日誌
- 服務運行狀態
- 錯誤訊息

## 更新部署

只需推送代碼到 GitHub，Zeabur 會自動觸發重新部署。
