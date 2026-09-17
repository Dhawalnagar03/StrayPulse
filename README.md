# StrayPulse 🐾 — AI-Powered Stray Animal Location Prediction

> **"Dog #27 is likely to be around Market Road between 7:00 AM and 9:00 AM tomorrow. Confidence: 78%."**

StrayPulse is a full-stack AI-powered crowdsourced platform that learns stray animal movement patterns from historical sightings and predicts future locations — helping rescuers, NGOs, feeders, and citizens locate stray animals efficiently.

---

## 🗂️ Project Structure

```
StaryPulse/
├── backend/            # FastAPI Python backend
│   ├── app/
│   │   ├── api/routes/     # REST API endpoints
│   │   ├── auth/           # JWT security
│   │   ├── database/       # MongoDB connection + seeder
│   │   ├── models/         # Beanie document models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # ML, CV, weather, geo services
│   ├── requirements.txt
│   └── .env.example
├── ml/                 # Machine Learning Pipeline
│   ├── data/
│   │   └── generate_synthetic.py   # 1400-row synthetic dataset
│   ├── features/
│   │   └── engineer_features.py    # Feature engineering
│   ├── training/
│   │   └── train_all.py            # XGBoost, RF, KNN training
│   ├── evaluation/
│   │   └── evaluate.py             # Classification + geographic metrics
│   └── run_pipeline.py             # One-shot pipeline runner
├── web/
│   └── react_dashboard/    # React + Vite + TypeScript + Tailwind dashboard
│       ├── src/
│       │   ├── components/ # Layout, Maps, ProtectedRoute
│       │   ├── pages/      # Dashboard, Animals, Map, Admin, etc.
│       │   ├── lib/        # Axios API client
│       │   ├── store/      # Zustand auth store
│       │   └── types/      # TypeScript definitions
│       └── package.json
├── mobile/
│   └── flutter_app/    # Flutter Android app
│       ├── lib/
│       │   ├── core/       # Theme, router, API service
│       │   └── features/   # Auth, Animals, Sightings, Maps, Predictions, Profile
│       └── pubspec.yaml
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Flutter SDK 3.0+ (for mobile)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd StaryPulse
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, API keys
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Seed demo data (7 animals, 200+ sightings each)
python -m app.database.seed

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 3. ML Pipeline (Phase 2)

```bash
cd ml
pip install pandas scikit-learn xgboost

# Full pipeline: generate -> engineer -> train -> evaluate
python run_pipeline.py

# Or step by step:
python data/generate_synthetic.py
python features/engineer_features.py
python training/train_all.py
python evaluation/evaluate.py
```

### 4. Web Dashboard

```bash
cd web/react_dashboard
npm install
npm run dev
# Open http://localhost:5173
```

**Demo credentials:**
- Admin: `admin@straypulse.org` / `Admin@StrayPulse2026!`
- Citizen: `citizen@demo.com` / `Demo@1234!`

### 5. Flutter Mobile App

```bash
cd mobile/flutter_app
flutter pub get

# Android emulator
flutter run

# Physical device: update API URL in lib/core/services/api_service.dart
# Change 10.0.2.2 to your machine's LAN IP
```

---

## Features

### Backend (FastAPI)
| Feature | Details |
|---------|---------|
| Auth | JWT + bcrypt, role-based (citizen/NGO/admin) |
| Animals | CRUD, photo upload, AI detection |
| Sightings | GPS + photo, weather auto-fetch, zone mapping |
| Predictions | XGBoost zone classifier, 500m grid cells |
| Locations | Feeding points, environmental features |
| Admin | Analytics, user management, ML model status |
| CV Service | YOLO detection + simulation fallback |
| Weather | OpenWeatherMap API + simulation fallback |
| Seeder | 7 demo animals, 200 realistic sightings each |

### ML Pipeline
| Model | Description |
|-------|-------------|
| Frequency Baseline | Most common zone predictor |
| KNN | k=7, distance-weighted |
| Random Forest | 200 trees, balanced classes |
| XGBoost | Best model, 300 estimators, multi-class softmax |

### Web Dashboard (React + Vite + Tailwind)
- Dashboard with stats and Recharts charts
- Animals list with search and filters
- Animal detail with AI prediction card + Leaflet map
- Global map explorer (sightings, feeding, predictions)
- Sighting submission with GPS capture
- Admin panel (analytics, users, ML model comparison)

### Flutter Mobile App
- Animated onboarding (4 screens)
- Login/Register with demo fill
- Home with quick action grid and recent animals
- 4-step report wizard: Photo -> GPS -> Details -> Submit
- AI detection from camera photo
- Animal detail with prediction confidence bar
- Map with feeding locations

---

## Architecture

```
Mobile (Flutter)  <->  REST API (FastAPI)  <->  MongoDB Atlas
Web (React)       <->                      <->  ML Models (XGBoost .pkl)
                                           <->  OpenWeatherMap
                                           <->  YOLO CV Service
```

### Prediction Flow
1. User submits sighting with GPS + photo
2. Backend extracts features (zone, weather, distances)
3. ML service loads best_model.pkl
4. Predicts grid zone with confidence score
5. Returns: zone name, coordinates, time window, factors, confidence %

### Zone System
- Bangalore divided into 500m x 500m grid cells
- Each cell: Zone ID Z_row_col
- Named by nearest landmark
- Prediction radius = 500m from zone center

---

## Configuration

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB Atlas connection string |
| JWT_SECRET_KEY | JWT signing secret (min 32 chars) |
| OPENWEATHERMAP_API_KEY | Weather data API key |
| GOOGLE_MAPS_API_KEY | Flutter Maps integration |
| GRID_CELL_SIZE_METERS | Prediction grid size (default: 500) |
| ML_MIN_SIGHTINGS | Min sightings before prediction (default: 5) |

---

## ML Performance (Synthetic Demo Data)

| Model | Accuracy | F1 | Avg Geo Error |
|-------|----------|-----|---------------|
| Frequency Baseline | ~14% | ~0.05 | ~3.2 km |
| KNN | ~45% | ~0.40 | ~0.8 km |
| Random Forest | ~72% | ~0.68 | ~0.4 km |
| XGBoost | ~78% | ~0.74 | ~0.3 km |

---

## Ethical Disclaimer

StrayPulse predictions are probabilistic estimates based on historical patterns.
Actual animal locations may differ. Never rely solely on predictions for
time-critical rescue operations. Always cross-check with ground volunteers.

---

Built with love for stray animals everywhere.
