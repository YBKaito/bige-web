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
