# 🧠 Cognitive Performance Analyzer — Flask + SQLite

A full-stack exam analytics web app with Flask backend and SQLite database.

## 📁 Project Structure

```
cpa/
├── app.py                  ← Flask app + all API routes + SQLAlchemy models
├── requirements.txt        ← Python dependencies
├── templates/
│   └── index.html          ← Main Jinja2 HTML template
└── static/
    ├── css/
    │   └── style.css       ← All styles (identical to original design)
    └── js/
        └── app.js          ← All frontend logic (API-driven, no in-memory DB)
```

## ⚙️ Setup & Run (VS Code)

### 1. Install dependencies

Open a terminal in the `cpa/` folder and run:

```bash
pip install -r requirements.txt
```

### 2. Run the app

```bash
python app.py
```

### 3. Open in browser

```
http://127.0.0.1:5000
```

The SQLite database (`cpa.db`) is **auto-created and seeded** on first run.

---

## 🔑 Demo Credentials

| Role    | Username | Password  |
|---------|----------|-----------|
| Student | user1    | pass123   |
| Student | user2    | pass123   |
| Admin   | admin    | admin123  |

---

## ✅ Features

- Student login / registration
- 6 subjects, 45 pre-loaded MCQ questions
- Timed tests (30 min) with auto-submit
- Answer review after submission
- Performance analytics with Chart.js charts
- Exam Readiness score calculator
- Admin panel: manage subjects, questions, users, results
- All data persisted in SQLite via SQLAlchemy

---

## 🗄️ Database Tables

| Table       | Description                        |
|-------------|------------------------------------|
| user        | Registered students                |
| subject     | Exam subjects with icons           |
| question    | MCQ questions per subject          |
| test_result | Test submissions with scores       |

---

## 🔌 API Endpoints

| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| POST   | /api/login                  | Student login          |
| POST   | /api/register               | Student registration   |
| POST   | /api/admin-login            | Admin login            |
| POST   | /api/logout                 | Logout                 |
| GET    | /api/subjects               | List all subjects      |
| POST   | /api/subjects               | Add subject (admin)    |
| DELETE | /api/subjects/<id>          | Delete subject (admin) |
| GET    | /api/questions              | List all questions     |
| POST   | /api/questions              | Add question (admin)   |
| DELETE | /api/questions/<id>         | Delete question        |
| GET    | /api/results                | All results (admin)    |
| GET    | /api/results/user/<id>      | User's results         |
| POST   | /api/results                | Submit test result     |
| GET    | /api/users                  | All users (admin)      |
