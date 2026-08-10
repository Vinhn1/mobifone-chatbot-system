<div align="center">

# 🤖 MobiFone Chatbot System

**Hệ thống chatbot AI thông minh tích hợp đa kênh cho MobiFone Việt Nam**

[![Deploy](https://github.com/Vinhn1/mobifone-chatbot-system/actions/workflows/deploy.yml/badge.svg)](https://github.com/Vinhn1/mobifone-chatbot-system/actions/workflows/deploy.yml)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Internal-red)

</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt & Chạy Local](#-cài-đặt--chạy-local)
- [Cấu hình môi trường](#-cấu-hình-môi-trường)
- [Triển khai Production](#-triển-khai-production)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Tài liệu kỹ thuật](#-tài-liệu-kỹ-thuật)

---

## 🎯 Tổng quan

MobiFone Chatbot System là hệ thống chatbot AI sử dụng kỹ thuật **RAG (Retrieval-Augmented Generation)** kết hợp với **Google Gemini** và **ChromaDB**, cho phép:

- 💬 **Tích hợp đa kênh**: Facebook Messenger, Zalo Official Account, Web Widget
- 🧠 **AI RAG thông minh**: Trả lời dựa trên knowledge base nội bộ của MobiFone
- 📚 **Quản lý kiến thức**: Upload PDF, DOCX, XLSX, URL crawling để làm nguồn dữ liệu AI
- 👥 **Quản lý khách hàng**: CRM tích hợp, phân loại leads, lịch sử tương tác
- 📊 **Dashboard Admin**: Theo dõi hiệu suất, cấu hình bot, quản lý người dùng
- 📧 **Thông báo Email**: OTP, alerts qua Gmail SMTP

---

## 🏗️ Kiến trúc hệ thống

```
Internet
    │
    ▼
┌──────────────────────────────────────────────────────┐
│              Nginx Reverse Proxy (Port 80/443)        │
└──────────────┬───────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐   ┌───────────────────┐
│  Frontend   │   │   Backend API     │
│  React+Vite │   │   NestJS :3000    │
│  Nginx :80  │   │   JWT Auth / CORS │
└─────────────┘   └──────┬────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐
   │   AI Core        │  │   PostgreSQL 15  │
   │   FastAPI :8001  │  │   Port: 5432     │
   │   RAG Pipeline   │  │                  │
   │   ChromaDB       │  └──────────────────┘
   │   Gemini / OpenAI│
   └──────────────────┘
```

**Request flow:**
```
User → HTTPS → Nginx → /api/* → Backend → AI Core + PostgreSQL
                               → /*     → Frontend (React SPA)
```

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| **Frontend** | React + Vite + TypeScript | React 18 |
| **UI Library** | shadcn/ui + Tailwind CSS | v4 |
| **Backend** | NestJS + TypeORM | Node.js 20 |
| **AI Core** | FastAPI + Python | 3.10 |
| **AI Model** | Google Gemini | gemini-2.0-flash-lite |
| **Vector DB** | ChromaDB | 0.5+ |
| **Database** | PostgreSQL | 15 Alpine |
| **Web Server** | Nginx | Alpine |
| **Container** | Docker + Docker Compose | v2 |
| **CI/CD** | GitHub Actions | - |
| **Auth** | JWT (jsonwebtoken) | - |
| **Email** | Nodemailer + Gmail SMTP | - |

---

## 💻 Yêu cầu hệ thống

### Development (Local)
- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **Docker Desktop** (bao gồm Docker Compose v2)
- **Git**

### Production (VPS)
- **OS**: Ubuntu 22.04 LTS
- **RAM**: ≥ 4 GB (khuyến nghị 8 GB)
- **CPU**: ≥ 2 vCPU
- **SSD**: ≥ 30 GB
- **IP**: 1 IPv4 tĩnh

---

## 🚀 Cài đặt & Chạy Local

### 1. Clone repository

```bash
git clone https://github.com/Vinhn1/mobifone-chatbot-system.git
cd mobifone-chatbot-system
```

### 2. Cấu hình biến môi trường

```bash
# Sao chép file mẫu
cp .env.example .env

# Chỉnh sửa các giá trị trong .env
nano .env
```

### 3. Khởi chạy với Docker Compose

```bash
# Build và chạy tất cả service
docker compose up -d --build

# Xem log
docker compose logs -f

# Kiểm tra trạng thái
docker compose ps
```

### 4. Truy cập ứng dụng

| Service | URL |
|---------|-----|
| Frontend (Web) | http://localhost:8080 |
| Backend API | http://localhost:3000 |
| AI Core API | http://localhost:8001 |
| PostgreSQL | localhost:5432 |

### 5. Tắt DB_SYNCHRONIZE sau khi tạo bảng

> ⚠️ **Quan trọng:** Sau khi backend khởi động lần đầu và tạo xong các bảng, sửa `.env`:

```env
DB_SYNCHRONIZE=false  # Đổi từ true → false
```

```bash
docker compose restart backend
```

---

## ⚙️ Cấu hình môi trường

Tạo file `.env` ở thư mục gốc với nội dung sau:

```env
# ─── Database ──────────────────────────────────────────
DB_HOST=db
DB_PORT=5432
DB_USERNAME=mobifone_user
DB_PASSWORD=your_strong_password
DB_DATABASE=mobifone_db
DB_SYNCHRONIZE=true   # ← đổi thành false sau lần chạy đầu

# ─── Authentication ────────────────────────────────────
JWT_SECRET=your_64_char_random_secret
JWT_EXPIRES_IN=1d

# ─── AI Core (Google Gemini) ───────────────────────────
GEMINI_API_KEY=your_gemini_api_key
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash-lite

# ─── OpenAI (tùy chọn) ────────────────────────────────
OPENAI_API_KEY=your_openai_key
EVAL_JUDGE_PROVIDER=openai
EVAL_JUDGE_MODEL=gpt-4o-mini

# ─── Email SMTP ────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM="MobiFone Chatbot <your_email@gmail.com>"

# ─── CORS ──────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# ─── Seed Passwords ────────────────────────────────────
ADMIN_SEED_PASSWORD=Admin@123456
SALES_SEED_PASSWORD=Sales@123456
SUBSCRIBER_SEED_PASSWORD=Sub@123456
```

### Lấy Gemini API Key

1. Truy cập [https://aistudio.google.com](https://aistudio.google.com)
2. **Get API Key** → **Create API key**
3. Dán vào `GEMINI_API_KEY`

### Tạo JWT Secret

```bash
openssl rand -hex 64
```

---

## 🌐 Triển khai Production

Xem tài liệu triển khai chi tiết tại:

- 📄 [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — Cấu hình biến môi trường, API keys
- 📄 [`docs/huong_dan_trien_khai_vps.md`](docs/huong_dan_trien_khai_vps.md) — Hướng dẫn VPS, CI/CD

### Tóm tắt quy trình deploy

```bash
# 1. Cài Docker trên VPS Ubuntu 22.04
curl -fsSL https://get.docker.com | sh

# 2. Clone code
git clone https://github.com/Vinhn1/mobifone-chatbot-system.git /opt/mobifone-chatbot-system
cd /opt/mobifone-chatbot-system

# 3. Tạo file .env với thông tin production
nano .env

# 4. Build & chạy
docker compose up -d --build
```

### CI/CD tự động (GitHub Actions)

Mỗi khi push lên nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ tự động:
1. SSH vào VPS
2. Pull code mới nhất
3. Tạo file `.env` từ GitHub Secrets
4. Rebuild và restart tất cả container

Xem [cấu hình GitHub Secrets](docs/huong_dan_trien_khai_vps.md#5-danh-sách-github-secrets-cần-cấu-hình) để thiết lập.

---

## 📁 Cấu trúc dự án

```
mobifone-chatbot-system/
│
├── 📂 frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── app/pages/           # Pages (Admin, Chat, Auth...)
│   │   ├── components/          # Shared UI components
│   │   └── lib/                 # Utilities, API client
│   ├── nginx.conf               # Nginx config (Docker)
│   └── Dockerfile
│
├── 📂 backend/                   # NestJS API Server
│   ├── src/
│   │   ├── auth/                # JWT Authentication
│   │   ├── chat/                # Chat & Webhook handlers
│   │   ├── users/               # User management
│   │   ├── subscribers/         # Subscriber CRM
│   │   ├── leads/               # Lead management
│   │   ├── notifications/       # Push notifications
│   │   └── email/               # Email service
│   └── Dockerfile
│
├── 📂 ai-core/                   # Python FastAPI AI Service
│   ├── api_server.py            # FastAPI endpoints
│   ├── rag_pipeline.py          # RAG implementation
│   ├── crawl_engine.py          # Web crawling engine
│   ├── chat_miner.py            # Chat history mining
│   ├── rag_config.json          # RAG configuration
│   ├── requirements.txt
│   └── Dockerfile
│
├── 📂 mobifone-rag-data-pipeline/ # Data ingestion pipeline
│   ├── main.py
│   ├── scraper_mobifone.py      # MobiFone website scraper
│   ├── data_processor.py        # Data processing
│   └── requirements.txt
│
├── 📂 docs/                      # Documentation
│   ├── DEPLOYMENT_GUIDE.md      # Hướng dẫn deploy & env config
│   ├── GUIDE_AI_CORE_SETUP.md   # Hướng dẫn cài AI Core
│   └── huong_dan_trien_khai_vps.md
│
├── 📂 .github/workflows/
│   └── deploy.yml               # CI/CD GitHub Actions
│
├── docker-compose.yml           # Orchestration toàn bộ hệ thống
├── .gitignore
└── README.md
```

---

## 📚 Tài liệu kỹ thuật

| Tài liệu | Mô tả |
|----------|-------|
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Cấu hình tất cả biến môi trường, API keys, social integration |
| [GUIDE_AI_CORE_SETUP.md](docs/GUIDE_AI_CORE_SETUP.md) | Cài đặt và cấu hình AI Core, RAG pipeline |
| [huong_dan_trien_khai_vps.md](docs/huong_dan_trien_khai_vps.md) | Triển khai VPS, CI/CD, DNS, SSL |
| [huong_dan_tich_hop_social.md](docs/huong_dan_tich_hop_social.md) | Tích hợp Facebook Messenger & Zalo OA |

---

## 🔐 Bảo mật

- **KHÔNG** commit file `.env` lên Git — đã được bảo vệ bởi `.gitignore`
- Tất cả secrets được quản lý qua **GitHub Actions Secrets** trong môi trường production
- JWT token hết hạn sau `1 ngày`, rotate secret định kỳ 6 tháng
- DB user có quyền tối thiểu chỉ trên database `mobifone_db`
- CORS chặt chẽ — chỉ cho phép domain được cấu hình

---

## 📞 Hỗ trợ

| Vấn đề | Liên hệ |
|--------|---------|
| Lỗi hệ thống / Bug | Mở Issue trên GitHub |
| Gemini API / quota | [Google Cloud Support](https://cloud.google.com/support) |
| Facebook Messenger | [Facebook Business Support](https://business.facebook.com) |
| Zalo OA | [Zalo for Business](https://business.zalo.me) |

---

<div align="center">
  <sub>Phát triển bởi Team MobiFone Chatbot · 2026</sub>
</div>
