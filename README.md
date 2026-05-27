# Student Learning Platform

A full-stack learning portal built with FastAPI, PostgreSQL, and React.

## Backend

1. Create a Python environment and install dependencies:

```powershell
cd "e:\Student Learning Platform\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Set the database URL:

```powershell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/student_learning"
```

3. Run the API:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

1. Install dependencies:

```powershell
cd "e:\Student Learning Platform\frontend"
npm install
```

2. Start the development server:

```powershell
npm run dev
```

## Notes

- Admin user is seeded automatically on startup: `admin` / `admin123`
- Students can register and request access for courses.
- Admin can approve or reject course access requests.
- The frontend is designed with a professional, modern UI.

## Render Deploy

This repo includes `render.yaml` for a one-service Render deployment:

- FastAPI backend runs as the web service.
- React is built during deploy and served by FastAPI.
- Render Postgres provides `DATABASE_URL`.
- Docker is used so the service has Python, Node/npm, and Java available.

Deploy steps:

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Render will create:
   - `student-learning-platform`
   - `student-learning-platform-db`
4. After deploy, open the service URL Render gives you.
