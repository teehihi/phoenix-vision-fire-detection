# PhoenixVision Frontend Desktop

FE chính của dự án là `frontend/` React + Vite. App desktop Windows/macOS được bọc bằng Electron từ cùng source UI này.

## Chạy web development

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

## Chạy desktop development

Terminal 1:

```bash
cd frontend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run electron:dev
```

## Build web

```bash
cd frontend
npm run build
```

## Build desktop installer

```bash
cd frontend
npm run desktop:build
```

Output nằm trong `frontend/release/`.

## Legacy

`desktop-app/` PySide đã bị loại khỏi hướng phát triển chính. Backend và AI service vẫn giữ nguyên để React app gọi API/WebSocket.
