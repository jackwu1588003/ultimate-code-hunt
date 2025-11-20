---
description: 如何在 Zeabur 部署後端
---

# 在 Zeabur 部署 FastAPI 後端

## 前置準備

1. 確保你有 Zeabur 帳號（可以用 GitHub 登入）
2. 確保專案已推送到 GitHub

## 部署步驟

### 1. 登入 Zeabur

前往 [Zeabur](https://zeabur.com) 並使用 GitHub 帳號登入

### 2. 創建新專案

1. 點擊 **"Create Project"** 或 **"新增專案"**
2. 選擇一個區域（建議選擇離你最近的，例如 `ap-east-1` 香港）
3. 為專案命名（例如：`ultimate-code-hunt`）

### 3. 部署後端服務

1. 在專案頁面中，點擊 **"Add Service"** 或 **"新增服務"**
2. 選擇 **"Git"**
3. 選擇你的 GitHub repository：`ultimate-code-hunt`
4. Zeabur 會自動偵測專案

### 4. 配置服務路徑 (Critical Step)

由於我們將後端代碼移動到了 `backend` 目錄，你需要告訴 Zeabur 在哪裡找到它：

1. 點擊新創建的服務卡片
2. 進入 **"Settings"** 或 **"設定"**
3. 找到 **"Root Directory"** 或 **"Service Path"**
4. 輸入 `/backend` 並保存
5. 服務應該會自動重新部署。如果沒有，請手動觸發重新部署。

### 5. 配置啟動命令

Zeabur 應該會自動偵測到 FastAPI，但如果需要手動配置：

1. 點擊服務卡片
2. 進入 **"Settings"** 或 **"設定"**
3. 在 **"Start Command"** 中輸入：
   ```
   uvicorn main:app --host 0.0.0.0 --port ${PORT}
   ```

### 6. 生成公開域名

1. 在服務卡片中，找到 **"Networking"** 或 **"網路"** 區域
2. 點擊 **"Generate Domain"** 或 **"生成域名"**
3. Zeabur 會自動生成一個 `.zeabur.app` 的域名
4. 複製這個 URL（例如：`https://your-service.zeabur.app`）

### 7. 更新前端 API 配置

將生成的後端 URL 更新到前端的 API 配置中：

編輯 `src/services/gameApi.ts`，將 `API_BASE_URL` 更新為你的 Zeabur 後端 URL

### 8. 驗證部署

1. 訪問 `https://your-service.zeabur.app/docs` 查看 FastAPI 自動生成的 API 文檔
2. 測試 API 端點是否正常運作

## 常見問題

### 部署失敗：`uvicorn: not found`？

- 這通常是因為 Zeabur 誤判專案類型（例如誤認為是 Node.js 專案）。
- **解決方法**：確保你已經設定了 **Root Directory** 為 `/backend`。這樣 Zeabur 才會看到 `requirements.txt` 並安裝 Python 依賴。

### 資料庫問題？

- SQLite 資料庫文件會在每次重新部署時重置
- 如需持久化資料，考慮使用 Zeabur 提供的 PostgreSQL 服務

### CORS 錯誤？

- 確保 `main.py` 中的 CORS 設定允許你的前端域名
- 目前設定為 `allow_origins=["*"]`，允許所有來源

## 監控和維護

- 在 Zeabur 控制台可以查看：
  - 服務狀態
  - 部署日誌
  - 資源使用情況
  - 請求統計

## 自動部署

Zeabur 會自動監聽你的 GitHub repository：
- 每次推送到主分支時，Zeabur 會自動重新部署
- 可以在設定中關閉自動部署，改為手動觸發
