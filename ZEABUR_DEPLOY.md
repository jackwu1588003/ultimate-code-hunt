# Zeabur 分離部署指南

## 架構說明

本專案採用**前後端分離部署**：

- **前端**：`https://ultimate-code-hunt.zeabur.app` - React SPA
- **後端 API**：`https://api-ultimate-code-hunt.zeabur.app` - FastAPI

## 部署步驟

### 1. 連接 GitHub Repository

1. 登入 [Zeabur](https://zeabur.com)
2. 創建新專案或選擇現有專案
3. 點擊 "Add Service" → "Deploy from GitHub"
4. 選擇 `ultimate-code-hunt` repository

### 2. 部署後端 API

#### 2.1 創建後端服務

1. 在 Zeabur 專案中點擊 "Add Service"
2. 選擇 "Git" → 選擇你的 repository
3. Service Name: `backend` 或 `api`
4. Root Directory: `backend`

#### 2.2 後端配置

Zeabur 會自動偵測 Python 專案並安裝依賴，但確保配置正確：

**Environment Variables (環境變數):**
```
PORT=8000
```

**啟動命令（應該會自動偵測）:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### 2.3 綁定網域

1. 在後端服務頁面點擊 "Generate Domain"
2. 使用生成的域名（例如：`api-ultimate-code-hunt.zeabur.app`）
3. 或綁定自訂域名

### 3. 部署前端

#### 3.1 創建前端服務

1. 在同一個 Zeabur 專案中點擊 "Add Service"
2. 選擇 "Git" → 選擇相同的 repository
3. Service Name: `frontend` 或 `web`
4. Root Directory: `.` (根目錄)

#### 3.2 前端配置

**Environment Variables (重要!):**
```
VITE_API_URL=https://api-ultimate-code-hunt.zeabur.app/api
```

**構建命令（應該會自動偵測）:**
```bash
npm install && npm run build
```

**輸出目錄:**
```
dist
```

#### 3.3 綁定網域

1. 在前端服務頁面點擊 "Generate Domain"
2. 使用生成的域名（例如：`ultimate-code-hunt.zeabur.app`）

### 4. 驗證部署

#### 4.1 測試後端 API

訪問以下端點確認 API 正常運行：

```bash
# 健康檢查
curl https://api-ultimate-code-hunt.zeabur.app/health

# API 文檔
https://api-ultimate-code-hunt.zeabur.app/docs

# 根路徑
https://api-ultimate-code-hunt.zeabur.app/
```

#### 4.2 測試前端

1. 訪問 `https://ultimate-code-hunt.zeabur.app`
2. 應該能看到遊戲首頁
3. 嘗試開始遊戲，確認能正常連接到後端 API

## 配置文件說明

### zeabur.toml

```toml
# 前端服務
[[services]]
name = "frontend"
dir = "."
build_command = "npm install && npm run build"
output_dir = "dist"

# 後端服務  
[[services]]
name = "backend"
dir = "backend"
install_command = "pip install -r requirements.txt"
start_command = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### .env.production

前端生產環境配置：

```env
VITE_API_URL=https://api-ultimate-code-hunt.zeabur.app/api
```

**重要：** 確保在 Zeabur 前端服務的環境變數中也設定了 `VITE_API_URL`！

## 常見問題

### Q1: CORS 錯誤

如果前端無法連接後端，檢查後端的 CORS 設定（`backend/main.py`）：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ultimate-code-hunt.zeabur.app"],  # 或 ["*"] 允許所有
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Q2: API 返回 404

確保：
1. 後端服務正常運行（檢查 Zeabur logs）
2. API 路徑正確（應該是 `/api/game/start` 等）
3. 前端的 `VITE_API_URL` 環境變數正確設定

### Q3: 前端顯示空白頁

1. 檢查瀏覽器 Console 是否有錯誤
2. 確認前端構建成功（檢查 Zeabur build logs）
3. 檢查 `dist/` 目錄是否正確生成

### Q4: 環境變數沒有生效

Vite 的環境變數必須：
1. 以 `VITE_` 開頭
2. 在**構建時**注入（不是運行時）
3. 在 Zeabur 前端服務中設定，並**重新部署**

## 更新部署

只需推送代碼到 GitHub：

```bash
git add .
git commit -m "your commit message"
git push
```

Zeabur 會自動觸發重新部署。

## 監控與日誌

在 Zeabur Dashboard 中：
- **Logs**: 查看實時日誌
- **Metrics**: 監控資源使用
- **Environment**: 管理環境變數
- **Domains**: 管理域名

## 成本優化

- 前端是靜態文件，成本極低
- 後端按使用量計費
- 可以考慮設定自動休眠（閒置時暫停）

## 資料庫持久化（建議）

目前使用 SQLite，容器重啟後資料會遺失。建議：

1. 在 Zeabur 添加 PostgreSQL 服務
2. 更新 `backend/main.py` 連接 PostgreSQL
3. 使用環境變數配置資料庫連接

```bash
# Zeabur PostgreSQL 環境變數會自動注入
DATABASE_URL=postgresql://user:password@host:port/dbname
```
