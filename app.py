from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import os

app = Flask(__name__)
app.secret_key ='xK9#mP2$qL8nR5@wT3vY7&jB'
app = Flask(__name__)
app.secret_key = "xK9#mP2$qL8nR5@wT3vY7&jB"

# Track failed login attempts
from datetime import datetime
login_attempts = {}

def is_blocked(ip):
    if ip in login_attempts:
        attempts, last_time = login_attempts[ip]
        if attempts >= 5:
            diff = (datetime.now() - last_time).seconds
            if diff < 300:
                return True
            else:
                login_attempts[ip] = (0, datetime.now())
    return False

def record_failed(ip):
    attempts = login_attempts.get(ip, (0, None))[0]
    login_attempts[ip] = (attempts + 1, datetime.now())

DB_PATH = "database.db"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cpa.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ══════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    results = db.relationship('TestResult', backref='user', lazy=True)

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(10), default='📚')
    category = db.Column(db.String(100), default='General')
    questions = db.relationship('Question', backref='subject', lazy=True, cascade='all, delete-orphan')
    results = db.relationship('TestResult', backref='subject', lazy=True)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    options = db.Column(db.Text, nullable=False)   # JSON array
    correct = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(20), default='Medium')

    def options_list(self):
        return json.loads(self.options)

    def to_dict(self):
        return {
            'id': self.id,
            'subjectId': self.subject_id,
            'text': self.text,
            'options': self.options_list(),
            'correct': self.correct,
            'difficulty': self.difficulty
        }

class TestResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Integer, default=0)  # seconds
    answers = db.Column(db.Text, default='[]')      # JSON array
    date = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'subjectId': self.subject_id,
            'score': self.score,
            'total': self.total,
            'timeTaken': self.time_taken,
            'answers': json.loads(self.answers),
            'date': self.date
        }

# ══════════════════════════════════════════
#  SEED DATA
# ══════════════════════════════════════════

def seed_db():
    if User.query.count() > 0:
        return  # already seeded

    # Users
    users = [
        User(name="Tamas Ingle",    username="user1", password_hash=generate_password_hash("pass123")),
        User(name="Om Bobade",      username="user2", password_hash=generate_password_hash("pass123")),
        User(name="Aditya Javarkar",username="user3", password_hash=generate_password_hash("pass123")),
    ]
    db.session.add_all(users)
    db.session.flush()

    # Subjects
    subjects_data = [
        ("Mathematics",      "📐", "Mathematics"),
        ("Physics",          "⚛️",  "Science"),
        ("Chemistry",        "🧪", "Science"),
        ("General Knowledge","🌍", "General Knowledge"),
        ("Logical Reasoning","🧩", "Reasoning"),
        ("English",          "📖", "Language"),
    ]
    subjects = []
    for name, icon, cat in subjects_data:
        s = Subject(name=name, icon=icon, category=cat)
        db.session.add(s)
        subjects.append(s)
    db.session.flush()

    s1, s2, s3, s4, s5, s6 = subjects

    # Questions
    questions_raw = [
        # Mathematics (s1)
        (s1.id,"What is the value of √144?",["10","11","12","13"],2,"Easy"),
        (s1.id,"If 2x + 5 = 17, what is x?",["5","6","7","8"],1,"Easy"),
        (s1.id,"What is 15% of 200?",["25","30","35","40"],1,"Easy"),
        (s1.id,"The sum of angles in a triangle is?",["90°","180°","270°","360°"],1,"Easy"),
        (s1.id,"If a rectangle has length 8 and width 5, its area is?",["13","26","40","45"],2,"Easy"),
        (s1.id,"Which is a prime number?",["15","21","29","35"],2,"Medium"),
        (s1.id,"What is 3³ (3 cubed)?",["9","18","27","36"],2,"Easy"),
        (s1.id,"Solve: 5x - 3 = 22",["4","5","6","7"],1,"Medium"),
        (s1.id,"LCM of 4 and 6 is?",["10","12","16","24"],1,"Easy"),
        (s1.id,"Probability of heads in fair coin toss?",["0.25","0.5","0.75","1"],1,"Easy"),
        # Physics (s2)
        (s2.id,"Unit of force is?",["Joule","Watt","Newton","Pascal"],2,"Easy"),
        (s2.id,"Speed of light is approximately?",["3×10⁶ m/s","3×10⁸ m/s","3×10¹⁰ m/s","3×10⁴ m/s"],1,"Medium"),
        (s2.id,"Newton's first law is also called?",["Law of Motion","Law of Inertia","Law of Gravity","Law of Energy"],1,"Easy"),
        (s2.id,"Unit of electric current is?",["Volt","Watt","Ohm","Ampere"],3,"Easy"),
        (s2.id,"Formula for kinetic energy is?",["mgh","½mv²","mv","Fd"],1,"Medium"),
        (s2.id,"Which color has highest frequency in visible light?",["Red","Green","Blue","Violet"],3,"Hard"),
        (s2.id,"Ohm's law states V =?",["I/R","IR","I+R","I-R"],1,"Easy"),
        (s2.id,"Unit of power is?",["Joule","Newton","Watt","Pascal"],2,"Easy"),
        (s2.id,"Acceleration due to gravity on Earth?",["8.9 m/s²","9.8 m/s²","10.8 m/s²","11.8 m/s²"],1,"Easy"),
        (s2.id,"Which is NOT a vector quantity?",["Velocity","Force","Speed","Displacement"],2,"Medium"),
        # Chemistry (s3)
        (s3.id,"Chemical symbol of Gold is?",["Go","Gd","Au","Ag"],2,"Easy"),
        (s3.id,"Atomic number of Carbon?",["4","6","8","12"],1,"Easy"),
        (s3.id,"pH of pure water is?",["5","7","9","11"],1,"Easy"),
        (s3.id,"Gas produced during photosynthesis?",["CO₂","H₂","O₂","N₂"],2,"Easy"),
        (s3.id,"Most abundant gas in Earth's atmosphere?",["Oxygen","Hydrogen","Nitrogen","Carbon dioxide"],2,"Easy"),
        (s3.id,"NaCl is the chemical formula for?",["Sugar","Salt","Sand","Soap"],1,"Easy"),
        (s3.id,"Which element has the symbol Fe?",["Fluorine","Francium","Iron","Fermium"],2,"Easy"),
        (s3.id,"Acid + Base reaction produces?",["Oil","Salt + Water","Gas","Oxide"],1,"Medium"),
        (s3.id,"Which state has definite volume but no definite shape?",["Solid","Liquid","Gas","Plasma"],1,"Easy"),
        (s3.id,"Valency of Oxygen is?",["1","2","3","4"],1,"Easy"),
        # GK (s4)
        (s4.id,"Capital of India is?",["Mumbai","Chennai","New Delhi","Kolkata"],2,"Easy"),
        (s4.id,"Who invented the telephone?",["Edison","Bell","Tesla","Marconi"],1,"Easy"),
        (s4.id,"Largest planet in our solar system?",["Saturn","Uranus","Jupiter","Neptune"],2,"Easy"),
        (s4.id,"Who wrote 'The Republic'?",["Aristotle","Plato","Socrates","Homer"],1,"Medium"),
        (s4.id,"The Great Wall is in which country?",["India","Japan","China","Korea"],2,"Easy"),
        # Reasoning (s5)
        (s5.id,"Next number: 2, 4, 8, 16, __?",["24","28","32","36"],2,"Easy"),
        (s5.id,"All cats are animals, all animals are living. Are all cats living?",["Yes","No","Maybe","Cannot determine"],0,"Easy"),
        (s5.id,"Odd one out: Apple, Mango, Banana, Carrot",["Apple","Mango","Banana","Carrot"],3,"Easy"),
        (s5.id,"Next in series: A, C, E, G, __?",["H","I","J","K"],1,"Easy"),
        (s5.id,"5 workers take 8 days, how many days for 10 workers?",["2","4","8","16"],1,"Medium"),
        # English (s6)
        (s6.id,"Synonym of 'Diligent' is?",["Lazy","Hardworking","Clever","Careless"],1,"Easy"),
        (s6.id,"Antonym of 'Ancient' is?",["Old","Historic","Modern","Antique"],2,"Easy"),
        (s6.id,"Choose correct spelling:",["Accomodate","Accommodate","Accommadate","Acomodate"],1,"Medium"),
        (s6.id,"'She __ to school every day.' Fill in:",["go","goes","gone","going"],1,"Easy"),
        (s6.id,"Which is a noun?",["Run","Beautiful","Happiness","Quickly"],2,"Easy"),
    ]
    for sid, text, opts, correct, diff in questions_raw:
        db.session.add(Question(subject_id=sid, text=text, options=json.dumps(opts), correct=correct, difficulty=diff))
    db.session.flush()

    # Sample test results
    u1, u2 = users[0], users[1]
    results_raw = [
        (u1.id, s1.id, 8, 10, 420, "2025-01-10", [2,1,1,1,2,2,2,1,1,1]),
        (u1.id, s2.id, 6, 10, 580, "2025-01-12", [2,1,1,3,1,3,1,2,1,2]),
        (u1.id, s4.id, 4, 5,  200, "2025-01-15", [2,1,2,1,2]),
        (u2.id, s1.id, 7, 10, 510, "2025-01-11", [2,1,1,1,2,0,2,1,1,1]),
        (u2.id, s3.id, 9, 10, 460, "2025-01-14", [2,1,1,2,2,1,2,1,1,1]),
    ]
    for uid, sid, score, total, tt, date, answers in results_raw:
        db.session.add(TestResult(user_id=uid, subject_id=sid, score=score, total=total,
                                  time_taken=tt, date=date, answers=json.dumps(answers)))
    db.session.commit()

# ══════════════════════════════════════════
#  ROUTES — PAGES
# ══════════════════════════════════════════

@app.route('/')
def index():
    return render_template('index.html')

# ══════════════════════════════════════════
#  API — AUTH
# ══════════════════════════════════════════

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username', '').strip()).first()
    if user and check_password_hash(user.password_hash, data.get('password', '')):
        session['user_id'] = user.id
        return jsonify({'success': True, 'user': {'id': user.id, 'name': user.name, 'username': user.username}})
    return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    name     = data.get('name', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not name or not username or not password:
        return jsonify({'success': False, 'message': 'Please fill all fields'})
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'})
    user = User(name=name, username=username, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({'success': True, 'user': {'id': user.id, 'name': user.name, 'username': user.username}})

@app.route("/api/admin-login", methods=["POST"])
def admin_login():
    ip = request.remote_addr
    if is_blocked(ip):
        return jsonify({"success": False, "message": "Too many attempts. Try after 5 minutes."})
    data = request.json
    if data["username"] == "tamas20" and data["password"] == "tamasingle":
        login_attempts.pop(ip, None)  # clear on success
        session["is_admin"] = True
        return jsonify({"success": True})
    record_failed(ip)
    return jsonify({"success": False, "message": "Invalid admin credentials"})

# ══════════════════════════════════════════
#  API — SUBJECTS
# ══════════════════════════════════════════

@app.route('/api/subjects', methods=['GET'])
def api_get_subjects():
    subjects = Subject.query.all()
    result = []
    for s in subjects:
        q_count = Question.query.filter_by(subject_id=s.id).count()
        result.append({'id': s.id, 'name': s.name, 'icon': s.icon, 'category': s.category, 'questionCount': q_count})
    return jsonify(result)

@app.route('/api/subjects', methods=['POST'])
def api_add_subject():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Subject name is required'})
    s = Subject(name=name, icon=data.get('icon', '📚'), category=data.get('category', 'General'))
    db.session.add(s)
    db.session.commit()
    return jsonify({'success': True, 'subject': {'id': s.id, 'name': s.name, 'icon': s.icon, 'category': s.category, 'questionCount': 0}})

@app.route('/api/subjects/<int:sid>', methods=['DELETE'])
def api_delete_subject(sid):
    s = Subject.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({'success': True})

# ══════════════════════════════════════════
#  API — QUESTIONS
# ══════════════════════════════════════════

@app.route('/api/questions', methods=['GET'])
def api_get_questions():
    questions = Question.query.all()
    return jsonify([q.to_dict() for q in questions])

@app.route('/api/questions/subject/<int:sid>', methods=['GET'])
def api_get_questions_by_subject(sid):
    questions = Question.query.filter_by(subject_id=sid).all()
    return jsonify([q.to_dict() for q in questions])

@app.route('/api/questions', methods=['POST'])
def api_add_question():
    data = request.get_json()
    text = data.get('text', '').strip()
    opts = data.get('options', [])
    if not text or len(opts) < 4 or any(not o.strip() for o in opts):
        return jsonify({'success': False, 'message': 'Please fill all question fields'})
    q = Question(
        subject_id=int(data['subjectId']),
        text=text,
        options=json.dumps(opts),
        correct=int(data.get('correct', 0)),
        difficulty=data.get('difficulty', 'Medium')
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({'success': True, 'question': q.to_dict()})

@app.route('/api/questions/<int:qid>', methods=['DELETE'])
def api_delete_question(qid):
    q = Question.query.get_or_404(qid)
    db.session.delete(q)
    db.session.commit()
    return jsonify({'success': True})

# ══════════════════════════════════════════
#  API — TEST RESULTS
# ══════════════════════════════════════════

@app.route('/api/results', methods=['GET'])
def api_get_all_results():
    results = TestResult.query.order_by(TestResult.id.desc()).all()
    out = []
    for r in results:
        d = r.to_dict()
        user = User.query.get(r.user_id)
        subj = Subject.query.get(r.subject_id)
        d['userName']    = user.name if user else '?'
        d['subjectName'] = subj.name if subj else '?'
        d['subjectIcon'] = subj.icon if subj else ''
        out.append(d)
    return jsonify(out)

@app.route('/api/results/user/<int:uid>', methods=['GET'])
def api_get_user_results(uid):
    results = TestResult.query.filter_by(user_id=uid).order_by(TestResult.id.desc()).all()
    out = []
    for r in results:
        d = r.to_dict()
        subj = Subject.query.get(r.subject_id)
        d['subjectName'] = subj.name if subj else '?'
        d['subjectIcon'] = subj.icon if subj else ''
        out.append(d)
    return jsonify(out)

@app.route('/api/results', methods=['POST'])
def api_submit_result():
    data = request.get_json()
    r = TestResult(
        user_id=int(data['userId']),
        subject_id=int(data['subjectId']),
        score=int(data['score']),
        total=int(data['total']),
        time_taken=int(data.get('timeTaken', 0)),
        answers=json.dumps(data.get('answers', [])),
        date=datetime.utcnow().strftime('%Y-%m-%d')
    )
    db.session.add(r)
    db.session.commit()
    return jsonify({'success': True, 'result': r.to_dict()})

# ══════════════════════════════════════════
#  API — USERS (admin)
# ══════════════════════════════════════════

@app.route('/api/users', methods=['GET'])
def api_get_users():
    users = User.query.all()
    out = []
    for u in users:
        results = TestResult.query.filter_by(user_id=u.id).all()
        avg = round(sum(r.score / r.total * 100 for r in results) / len(results)) if results else 0
        out.append({'id': u.id, 'name': u.name, 'username': u.username, 'testCount': len(results), 'avgScore': avg})
    return jsonify(out)

# ══════════════════════════════════════════
#  INIT
# ══════════════════════════════════════════

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_db()
    import threading
    import webbrowser
    url = 'http://127.0.0.1:5000'
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    print(f'\n🧠 Cognitive Performance Analyzer starting...')
    print(f'🌐 Opening browser at {url}\n')
    app.run(debug=False)
