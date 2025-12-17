# Smart Study Planner 📚

A full-stack, AI-powered study planning application that converts raw course syllabi into structured, trackable study schedules.

## 🏗️ Architecture

- **Frontend**: React + Vite (Port 3000)
- **Backend**: Node.js + Express (Port 5000)
- **Database**: MongoDB 6.0 (Port 27017)
- **AI Engine**: Ollama with Llama 3.1 (Port 11434)

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 8GB RAM available (for Llama 3.1)

### Start the Application

```bash
# Start all services
docker-compose up -d

# Pull the AI model (first time only, ~4GB download)
docker exec -it planner-ai ollama pull llama3.1

# View logs
docker-compose logs -f
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health

## 📖 Features

### 🤖 AI Course Import
Paste any course syllabus and let Llama 3.1 parse it into:
- Structured modules
- Individual lessons with durations
- Lesson types (video, lab, quiz, reading)

### 📅 Smart Scheduling
- Bin-packing algorithm distributes lessons optimally
- Configure daily study commitment (15 min - 8 hours)
- Option to skip weekends
- Automatic progress tracking

### 📊 Progress Dashboard
- Visual progress bars
- Completion statistics
- Estimated completion dates
- Multiple course support

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |
| POST | `/api/health/pull-model` | Pull AI model |
| GET | `/api/courses` | List all courses |
| POST | `/api/courses/import` | AI import course |
| POST | `/api/plans` | Create study plan |
| GET | `/api/plans/:id/schedule` | Get daily schedule |
| PATCH | `/api/plans/:id/progress` | Update progress |

## 🛠️ Development

### Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend** (`.env`):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/study_planner
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

## 📁 Project Structure

```
study-syllabus-timetable/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── models/
│       │   ├── Course.js
│       │   └── UserPlan.js
│       ├── routes/
│       │   ├── courses.js
│       │   ├── health.js
│       │   └── plans.js
│       └── services/
│           ├── aiService.js
│           └── schedulerService.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   └── Layout.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── ImportCourse.jsx
│           ├── Courses.jsx
│           └── PlanView.jsx
└── README.md
```

## 🔧 Troubleshooting

### AI Model Not Working
```bash
# Check Ollama status
docker exec -it planner-ai ollama list

# Pull model manually
docker exec -it planner-ai ollama pull llama3.1
```

### MongoDB Connection Issues
```bash
# Check MongoDB logs
docker logs planner-mongo

# Restart MongoDB
docker-compose restart planner-mongo
```

### Clear All Data
```bash
docker-compose down -v
docker-compose up -d
```

## 📝 License

MIT License
