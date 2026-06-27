# BIGE Web

Frontend + backend for the BIGE biomechanics motion generation demo.

## Structure
```
bige-web/
├── backend/      Flask API (mock mode by default)
└── frontend/     React app
```

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

Open two terminals — one for each.

## Wiring up the real model

1. Get checkpoints from prof → put in `../BIGE/checkpoints/`
2. In `backend/app.py` set `MOCK_MODE = False`
3. Uncomment the BIGE import lines and implement `run_bige_inference()`

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Check if backend is running |
| `/api/generate` | POST | Generate motion for given params |
| `/api/subjects` | GET | List available subjects |
| `/api/presets` | GET | List constraint presets |
