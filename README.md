# Ultimate Code Hunt

A full-stack web application combining a React frontend and a FastAPI backend.

## 🛠 Technical Stack

This project uses a modern architecture with separate frontend and backend:

### Frontend
- **Core**: [React](https://react.dev/) (v18), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
- **State Management & Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Routing**: [React Router](https://reactrouter.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Runtime**: Python 3.11+
- **Server**: Uvicorn
- **Database**: SQLite (`game_records.db`)

## 📂 Project Structure

```text
.
├── backend/                # Python FastAPI Backend
│   ├── main.py            # Backend entry point
│   ├── game_records.db    # SQLite database
│   └── requirements.txt   # Python dependencies
├── public/                 # Static assets (images, favicon, etc.)
├── scripts/                # Utility scripts
├── src/                    # Frontend source code
│   ├── components/        # Reusable UI components
│   │   └── ui/            # shadcn/ui base components
│   ├── hooks/             # Custom React Hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components (Route handlers)
│   ├── services/          # API and WebSocket services
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   └── main.tsx           # Frontend entry point
├── components.json         # shadcn/ui configuration
├── index.html             # HTML entry point
├── package.json           # Node.js project configuration and dependencies
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.11+ recommended)

### 1. Install and Run Backend

```bash
cd backend
# Create a virtual environment (Optional but recommended)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```
The backend will start at `http://localhost:8000` by default.

### 2. Install and Run Frontend

Open a new terminal window:

```bash
# Return to the project root
npm install

# Start the development server
npm run dev
```
The frontend will start at `http://localhost:5173` by default.

## 📦 Deployment

### Build Frontend
```bash
npm run build
```
The built files will be in the `dist` directory, ready to be deployed to any static hosting service (e.g., Vercel, Netlify).

### Deploy Backend
The backend can be deployed to any platform that supports Python (e.g., Zeabur, Render, Railway). Please refer to `ZEABUR_DEPLOY.md` for more deployment details.
