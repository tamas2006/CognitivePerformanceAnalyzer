// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
let currentUser = null;
let isAdmin = false;
let activeTest = null;

// Cache loaded from API
let DB = {
  subjects: [],
  questions: [],
  testResults: [],
  users: []
};

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function logout() {
  await api('POST', '/api/logout');
  currentUser = null;
  isAdmin = false;
  if (activeTest) { clearInterval(activeTest.timerInterval); activeTest = null; }
  DB = { subjects: [], questions: [], testResults: [], users: [] };
  showPage('landing');
}

// ══════════════════════════════════════════
//  TOAST + MODAL
// ══════════════════════════════════════════
function toast(icon, msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ══════════════════════════════════════════
//  AUTH TAB TOGGLE
// ══════════════════════════════════════════
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

// ══════════════════════════════════════════
//  USER AUTH
// ══════════════════════════════════════════
async function userLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const data = await api('POST', '/api/login', { username, password });
  if (!data.success) return toast('❌', data.message || 'Login failed');
  currentUser = data.user;
  setNavUser(currentUser.name);
  await loadUserData();
  showPage('user-dashboard');
  switchUserSection('dashboard', document.querySelector('#user-dashboard .nav-item'));
  toast('👋', `Welcome back, ${currentUser.name}!`);
}

async function userRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const data = await api('POST', '/api/register', { name, username, password });
  if (!data.success) return toast('❌', data.message || 'Registration failed');
  currentUser = data.user;
  setNavUser(currentUser.name);
  await loadUserData();
  showPage('user-dashboard');
  switchUserSection('dashboard', document.querySelector('#user-dashboard .nav-item'));
  toast('✅', `Account created! Welcome, ${name}!`);
}

async function adminLogin() {
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value;
  const data = await api('POST', '/api/admin-login', { username, password });
  if (!data.success) return toast('❌', data.message || 'Invalid admin credentials');
  isAdmin = true;
  await loadAdminData();
  showPage('admin-dashboard');
  switchAdminSection('overview', document.querySelector('#admin-dashboard .nav-item'));
  toast('🔐', 'Admin login successful');
}

function setNavUser(name) {
  document.getElementById('nav-username').textContent = name;
  document.getElementById('nav-avatar').textContent = name[0].toUpperCase();
}

// ══════════════════════════════════════════
//  DATA LOADERS
// ══════════════════════════════════════════
async function loadUserData() {
  const [subjects, questions, results] = await Promise.all([
    api('GET', '/api/subjects'),
    api('GET', '/api/questions'),
    api('GET', `/api/results/user/${currentUser.id}`)
  ]);
  DB.subjects   = subjects;
  DB.questions  = questions;
  DB.testResults = results;
}

async function loadAdminData() {
  const [subjects, questions, results, users] = await Promise.all([
    api('GET', '/api/subjects'),
    api('GET', '/api/questions'),
    api('GET', '/api/results'),
    api('GET', '/api/users')
  ]);
  DB.subjects   = subjects;
  DB.questions  = questions;
  DB.testResults = results;
  DB.users      = users;
}

// ══════════════════════════════════════════
//  USER SECTIONS
// ══════════════════════════════════════════
function switchUserSection(section, el) {
  document.querySelectorAll('#user-dashboard .nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const main = document.getElementById('user-main');
  if      (section === 'dashboard')  main.innerHTML = renderUserDashboard();
  else if (section === 'take-test')  main.innerHTML = renderSubjectSelect();
  else if (section === 'my-results') main.innerHTML = renderMyResults();
  else if (section === 'analytics')  { main.innerHTML = renderAnalytics(); setTimeout(drawCharts, 50); }
  else if (section === 'readiness')  main.innerHTML = renderReadiness();
}

function renderUserDashboard() {
  const results    = DB.testResults;
  const totalTests = results.length;
  const avgScore   = totalTests ? Math.round(results.reduce((a, r) => a + (r.score / r.total * 100), 0) / totalTests) : 0;
  const subjects   = [...new Set(results.map(r => r.subjectId))].length;
  const streak     = Math.min(totalTests, 7);
  const recentResults = [...results].slice(0, 3);

  return `
  <div class="page-header">
    <h2>Welcome back, ${currentUser.name} 👋</h2>
    <p>Here's your performance overview</p>
  </div>
  <div class="card-grid">
    <div class="stat-card blue"><div class="stat-label">Tests Taken</div><div class="stat-value blue">${totalTests}</div><div class="stat-sub">Total attempts</div></div>
    <div class="stat-card green"><div class="stat-label">Avg Score</div><div class="stat-value green">${avgScore}%</div><div class="stat-sub">Overall accuracy</div></div>
    <div class="stat-card purple"><div class="stat-label">Subjects</div><div class="stat-value purple">${subjects}</div><div class="stat-sub">Attempted</div></div>
    <div class="stat-card red"><div class="stat-label">Study Streak</div><div class="stat-value red">${streak}</div><div class="stat-sub">Days active</div></div>
  </div>
  <div class="card">
    <div class="section-title">Recent Tests</div>
    ${recentResults.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Subject</th><th>Score</th><th>Percentage</th><th>Date</th></tr></thead>
      <tbody>${recentResults.map(r => {
        const pct = Math.round(r.score / r.total * 100);
        return `<tr>
          <td>${r.subjectIcon} ${r.subjectName}</td>
          <td>${r.score}/${r.total}</td>
          <td><span class="badge ${pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-yellow' : 'badge-red'}">${pct}%</span></td>
          <td>${r.date}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : `<div class="empty">No tests taken yet. Take your first test!</div>`}
  </div>`;
}

function renderSubjectSelect() {
  return `
  <div class="page-header">
    <h2>Select a Subject</h2>
    <p>Choose a subject to start a timed test</p>
  </div>
  <div class="subject-grid">
    ${DB.subjects.map(s => `
      <div class="subject-card" onclick="startTest(${s.id})">
        <div class="s-icon">${s.icon}</div>
        <div class="s-name">${s.name}</div>
        <div class="s-count">${s.questionCount} questions</div>
        <div class="tag" style="margin-top:.5rem">${s.category}</div>
      </div>`).join('')}
  </div>`;
}

function startTest(subjectId) {
  const questions = DB.questions.filter(q => q.subjectId === subjectId);
  if (questions.length === 0) { toast('⚠️', 'No questions available for this subject yet'); return; }
  const shuffled = [...questions].sort(() => Math.random() - .5).slice(0, Math.min(10, questions.length));

  const sub = DB.subjects.find(s => s.id === subjectId);
  activeTest = {
    subjectId,
    subjectName: sub.name,
    subjectIcon: sub.icon,
    questions: shuffled,
    answers: new Array(shuffled.length).fill(null),
    current: 0,
    startTime: Date.now(),
    timeLeft: 30 * 60,
    timerInterval: null
  };

  document.getElementById('test-subject-label').textContent = sub.name;
  document.getElementById('test-title-label').textContent   = sub.icon + ' ' + sub.name + ' Test';

  showPage('test-interface');
  renderQuestion();
  startTimer();
}

function renderQuestion() {
  const t = activeTest;
  const q = t.questions[t.current];
  const n = t.questions.length;
  document.getElementById('q-num').textContent       = `Question ${t.current + 1}`;
  document.getElementById('q-text').textContent      = q.text;
  document.getElementById('test-q-counter').textContent = `${t.current + 1} / ${n}`;
  document.getElementById('test-progress').style.width  = ((t.current + 1) / n * 100) + '%';
  document.getElementById('btn-prev').style.visibility  = t.current === 0 ? 'hidden' : 'visible';
  document.getElementById('btn-next').textContent       = t.current === n - 1 ? 'Submit Test ✓' : 'Next →';

  const labels = ['A', 'B', 'C', 'D'];
  document.getElementById('q-options').innerHTML = q.options.map((opt, i) => `
    <div class="option ${t.answers[t.current] === i ? 'selected' : ''}" onclick="selectAnswer(${i})">
      <div class="opt-label">${labels[i]}</div>
      <div>${opt}</div>
    </div>`).join('');
}

function selectAnswer(idx) {
  activeTest.answers[activeTest.current] = idx;
  renderQuestion();
}

function prevQuestion() {
  if (activeTest.current > 0) { activeTest.current--; renderQuestion(); }
}

function nextQuestion() {
  const t = activeTest;
  if (t.current < t.questions.length - 1) { t.current++; renderQuestion(); }
  else submitTest();
}

function startTimer() {
  const el = document.getElementById('test-timer');
  activeTest.timerInterval = setInterval(() => {
    activeTest.timeLeft--;
    const m = Math.floor(activeTest.timeLeft / 60);
    const s = activeTest.timeLeft % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    el.className   = 'timer' + (activeTest.timeLeft < 60 ? ' urgent' : '');
    if (activeTest.timeLeft <= 0) submitTest();
  }, 1000);
}

async function submitTest() {
  clearInterval(activeTest.timerInterval);
  const t = activeTest;
  const timeTaken = Math.round((Date.now() - t.startTime) / 1000);
  let score = 0;
  t.questions.forEach((q, i) => { if (t.answers[i] === q.correct) score++; });

  const payload = {
    userId: currentUser.id,
    subjectId: t.subjectId,
    score,
    total: t.questions.length,
    timeTaken,
    answers: t.answers
  };

  const data = await api('POST', '/api/results', payload);
  const result = { ...payload, id: data.result.id, date: data.result.date,
                   subjectName: t.subjectName, subjectIcon: t.subjectIcon };

  // Refresh user results cache
  DB.testResults = await api('GET', `/api/results/user/${currentUser.id}`);

  const savedQuestions = [...t.questions];
  activeTest = null;

  showPage('user-dashboard');
  showResultPage(result, savedQuestions);
}

function showResultPage(result, questions) {
  const pct      = Math.round(result.score / result.total * 100);
  const readiness = Math.min(100, Math.round(pct * 0.8 + Math.random() * 20));
  const mins     = Math.floor(result.timeTaken / 60);
  const secs     = result.timeTaken % 60;

  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="result-hero">
    <div class="score-circle" style="--pct:${pct}%">
      <div class="score-num">${pct}%</div>
    </div>
    <h2 style="font-family:var(--font-head);font-size:1.6rem;margin-bottom:.5rem">${pct >= 70 ? 'Excellent! 🎉' : pct >= 40 ? 'Good Effort! 👍' : 'Keep Practicing! 💪'}</h2>
    <p style="color:var(--text-muted)">${result.subjectIcon} ${result.subjectName} • Score: ${result.score}/${result.total} • Time: ${mins}m ${secs}s</p>
    <div class="readiness-bar-wrap" style="margin-top:1.5rem">
      <div class="readiness-label"><span>Exam Readiness</span><span>${readiness}%</span></div>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${readiness}%"></div></div>
    </div>
  </div>
  <div class="card">
    <div class="section-title">Answer Review</div>
    ${questions.map((q, i) => {
      const isCorrect = result.answers[i] === q.correct;
      const labels    = ['A', 'B', 'C', 'D'];
      return `<div style="padding:1rem 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.5rem">
          <span class="badge ${isCorrect ? 'badge-green' : 'badge-red'}">${isCorrect ? '✓' : '✗'}</span>
          <span style="font-size:.92rem">${i + 1}. ${q.text}</span>
        </div>
        <div style="font-size:.82rem;color:var(--text-muted);padding-left:2rem">
          Your answer: <span style="color:${isCorrect ? 'var(--accent3)' : 'var(--danger)'};font-weight:500">${result.answers[i] !== null ? labels[result.answers[i]] + ': ' + q.options[result.answers[i]] : 'Not answered'}</span>
          ${!isCorrect ? ` | Correct: <span style="color:var(--accent3);font-weight:500">${labels[q.correct]}: ${q.options[q.correct]}</span>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;gap:1rem;margin-top:1.5rem">
    <button class="btn btn-primary" onclick="switchUserSection('take-test',null)">Take Another Test</button>
    <button class="btn btn-outline" onclick="switchUserSection('analytics',null)">View Analytics</button>
  </div>`;
}

function renderMyResults() {
  const results = DB.testResults;
  return `
  <div class="page-header"><h2>My Test Results</h2><p>Complete history of all your tests</p></div>
  <div class="card">
    <div class="table-wrap">
      ${results.length ? `<table>
        <thead><tr><th>#</th><th>Subject</th><th>Score</th><th>%</th><th>Time</th><th>Date</th><th>Grade</th></tr></thead>
        <tbody>${results.map((r, i) => {
          const pct   = Math.round(r.score / r.total * 100);
          const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D';
          const gCol  = pct >= 60 ? 'badge-green' : pct >= 45 ? 'badge-yellow' : 'badge-red';
          const mins  = Math.floor(r.timeTaken / 60), secs = r.timeTaken % 60;
          return `<tr>
            <td>${i + 1}</td>
            <td>${r.subjectIcon} ${r.subjectName}</td>
            <td>${r.score}/${r.total}</td>
            <td><span class="badge ${pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-yellow' : 'badge-red'}">${pct}%</span></td>
            <td>${mins}m ${secs}s</td>
            <td>${r.date}</td>
            <td><span class="badge ${gCol}">${grade}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>` : `<div class="empty">No test results yet. Take a test to see results here!</div>`}
    </div>
  </div>`;
}

function renderAnalytics() {
  const results    = DB.testResults;
  const bySubject  = {};
  DB.subjects.forEach(s => {
    const sr = results.filter(r => r.subjectId === s.id);
    if (sr.length) bySubject[s.id] = {
      name: s.name, icon: s.icon,
      avg: Math.round(sr.reduce((a, r) => a + (r.score / r.total * 100), 0) / sr.length),
      count: sr.length
    };
  });
  const entries = Object.values(bySubject);

  return `
  <div class="page-header"><h2>Performance Analytics</h2><p>Detailed insights into your cognitive performance</p></div>
  <div class="card" style="margin-bottom:1.5rem">
    <div class="section-title">Subject-wise Performance</div>
    ${entries.length ? entries.map(s => `
    <div class="performance-row">
      <div class="perf-subject">${s.icon} ${s.name} <span style="font-size:.75rem;color:var(--text-muted)">(${s.count} test${s.count > 1 ? 's' : ''})</span></div>
      <div class="perf-bar-bg"><div class="perf-bar" style="width:${s.avg}%;background:${s.avg >= 70 ? 'var(--accent3)' : s.avg >= 40 ? 'var(--accent)' : 'var(--danger)'}"></div></div>
      <div class="perf-pct" style="color:${s.avg >= 70 ? 'var(--accent3)' : s.avg >= 40 ? 'var(--accent)' : 'var(--danger)'}">${s.avg}%</div>
    </div>`).join('') : `<div class="empty">Take tests to see analytics!</div>`}
  </div>
  <div class="chart-grid">
    <div class="chart-box"><div class="chart-title">Score Distribution</div><canvas id="chart-bar" height="180"></canvas></div>
    <div class="chart-box"><div class="chart-title">Subject Spread</div><canvas id="chart-pie" height="180"></canvas></div>
  </div>`;
}

function drawCharts() {
  const results   = DB.testResults;
  const bySubject = {};
  DB.subjects.forEach(s => {
    const sr = results.filter(r => r.subjectId === s.id);
    if (sr.length) bySubject[s.name] = Math.round(sr.reduce((a, r) => a + (r.score / r.total * 100), 0) / sr.length);
  });

  const names  = Object.keys(bySubject);
  const vals   = Object.values(bySubject);
  const colors = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#fbbf24'];

  const barEl = document.getElementById('chart-bar');
  if (barEl && names.length) {
    new Chart(barEl, {
      type: 'bar',
      data: { labels: names, datasets: [{ label: 'Avg Score %', data: vals, backgroundColor: colors.slice(0, names.length), borderRadius: 6 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: {
        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { color: '#64748b' } }
      }}
    });
  }
  const pieEl = document.getElementById('chart-pie');
  if (pieEl && names.length) {
    new Chart(pieEl, {
      type: 'doughnut',
      data: { labels: names, datasets: [{ data: vals, backgroundColor: colors.slice(0, names.length), borderWidth: 0 }] },
      options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, cutout: '65%' }
    });
  }
}

function renderReadiness() {
  const results        = DB.testResults;
  const totalTests     = results.length;
  const avgScore       = totalTests ? results.reduce((a, r) => a + (r.score / r.total * 100), 0) / totalTests : 0;
  const subjectsCovered = [...new Set(results.map(r => r.subjectId))].length;
  const totalSubjects  = DB.subjects.length;
  const readiness      = Math.min(100, Math.round((avgScore * 0.5) + (subjectsCovered / totalSubjects * 30) + (Math.min(totalTests, 10) / 10 * 20)));
  const level = readiness >= 80 ? { label: 'Exam Ready 🎉',          color: 'var(--accent3)' }
              : readiness >= 60 ? { label: 'Almost Ready 👍',         color: 'var(--accent)'  }
              : readiness >= 40 ? { label: 'Needs Improvement 📚',    color: 'var(--warning)' }
              : { label: 'Early Stage 💪', color: 'var(--danger)' };

  const weak = DB.subjects.map(s => {
    const sr = results.filter(r => r.subjectId === s.id);
    return sr.length ? { name: s.name, icon: s.icon, avg: Math.round(sr.reduce((a, r) => a + (r.score / r.total * 100), 0) / sr.length) } : null;
  }).filter(Boolean).filter(x => x.avg < 60).sort((a, b) => a.avg - b.avg);

  return `
  <div class="page-header"><h2>Exam Readiness Score</h2><p>Your overall preparation level for competitive exams</p></div>
  <div class="card" style="text-align:center;padding:3rem;margin-bottom:1.5rem">
    <div style="font-size:4rem;font-family:var(--font-head);font-weight:800;color:${level.color}">${readiness}%</div>
    <div style="font-size:1.2rem;margin:.5rem 0;font-weight:600">${level.label}</div>
    <div style="color:var(--text-muted);font-size:.9rem;margin-bottom:1.5rem">Based on ${totalTests} tests across ${subjectsCovered} subjects</div>
    <div style="max-width:500px;margin:0 auto">
      <div class="readiness-label"><span>Overall Readiness</span><span>${readiness}%</span></div>
      <div class="progress-bar-wrap" style="height:12px"><div class="progress-bar" style="width:${readiness}%"></div></div>
    </div>
  </div>
  <div class="card-grid">
    <div class="stat-card blue"><div class="stat-label">Avg Accuracy</div><div class="stat-value blue">${Math.round(avgScore)}%</div><div class="stat-sub">Across all tests</div></div>
    <div class="stat-card purple"><div class="stat-label">Subjects Done</div><div class="stat-value purple">${subjectsCovered}/${totalSubjects}</div><div class="stat-sub">Coverage</div></div>
    <div class="stat-card green"><div class="stat-label">Tests Completed</div><div class="stat-value green">${totalTests}</div><div class="stat-sub">Total attempts</div></div>
  </div>
  ${weak.length ? `
  <div class="card">
    <div class="section-title">⚠️ Weak Areas — Focus Here</div>
    ${weak.map(w => `
    <div class="performance-row">
      <div class="perf-subject">${w.icon} ${w.name}</div>
      <div class="perf-bar-bg"><div class="perf-bar" style="width:${w.avg}%;background:var(--danger)"></div></div>
      <div class="perf-pct" style="color:var(--danger)">${w.avg}%</div>
    </div>`).join('')}
    <button class="btn btn-primary" style="margin-top:1rem" onclick="switchUserSection('take-test',null)">Practice Weak Subjects</button>
  </div>` : totalTests ? `<div class="card"><div class="empty">🎉 No weak areas detected! Keep it up!</div></div>` : ''}`;
}

// ══════════════════════════════════════════
//  ADMIN SECTIONS
// ══════════════════════════════════════════
function switchAdminSection(section, el) {
  document.querySelectorAll('#admin-dashboard .nav-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');
  const main = document.getElementById('admin-main');
  if      (section === 'overview')     main.innerHTML = renderAdminOverview();
  else if (section === 'subjects')     main.innerHTML = renderAdminSubjects();
  else if (section === 'questions')    main.innerHTML = renderAdminQuestions();
  else if (section === 'users')        main.innerHTML = renderAdminUsers();
  else if (section === 'results')      main.innerHTML = renderAdminResults();
  else if (section === 'performance')  { main.innerHTML = renderAdminPerformance(); setTimeout(drawAdminCharts, 50); }
}

function renderAdminOverview() {
  const totalUsers  = DB.users.length;
  const totalQ      = DB.questions.length;
  const totalTests  = DB.testResults.length;
  const avgScore    = totalTests ? Math.round(DB.testResults.reduce((a, r) => a + (r.score / r.total * 100), 0) / totalTests) : 0;
  return `
  <div class="page-header"><h2>Admin Overview</h2><p>System-wide statistics</p></div>
  <div class="card-grid">
    <div class="stat-card blue"><div class="stat-label">Total Users</div><div class="stat-value blue">${totalUsers}</div></div>
    <div class="stat-card purple"><div class="stat-label">Questions</div><div class="stat-value purple">${totalQ}</div></div>
    <div class="stat-card green"><div class="stat-label">Tests Taken</div><div class="stat-value green">${totalTests}</div></div>
    <div class="stat-card red"><div class="stat-label">Avg Score</div><div class="stat-value red">${avgScore}%</div></div>
  </div>
  <div class="card">
    <div class="section-title">Recent Activity</div>
    <div class="table-wrap"><table>
      <thead><tr><th>User</th><th>Subject</th><th>Score</th><th>Date</th></tr></thead>
      <tbody>${DB.testResults.slice(0, 5).map(r => {
        const pct = r.score / r.total;
        return `<tr>
          <td>${r.userName || '?'}</td>
          <td>${r.subjectIcon || ''} ${r.subjectName || '?'}</td>
          <td><span class="badge ${pct >= .7 ? 'badge-green' : pct >= .4 ? 'badge-yellow' : 'badge-red'}">${r.score}/${r.total}</span></td>
          <td>${r.date}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderAdminSubjects() {
  return `
  <div class="flex-between">
    <div class="page-header" style="margin:0"><h2>Manage Subjects</h2><p>Add or remove subjects</p></div>
    <button class="btn btn-primary" onclick="openModal('modal-subject')">+ Add Subject</button>
  </div>
  <div class="card" style="margin-top:1.5rem">
    <div class="table-wrap"><table>
      <thead><tr><th>Icon</th><th>Subject</th><th>Category</th><th>Questions</th><th>Action</th></tr></thead>
      <tbody>${DB.subjects.map(s => `<tr>
        <td style="font-size:1.4rem">${s.icon}</td>
        <td>${s.name}</td>
        <td><span class="tag">${s.category}</span></td>
        <td>${s.questionCount}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteSubject(${s.id})">Delete</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderAdminQuestions() {
  populateSubjectSelect();
  return `
  <div class="flex-between">
    <div class="page-header" style="margin:0"><h2>Manage Questions</h2></div>
    <button class="btn btn-primary" onclick="openModal('modal-question');populateSubjectSelect()">+ Add Question</button>
  </div>
  <div class="card" style="margin-top:1.5rem">
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Subject</th><th>Question</th><th>Difficulty</th><th>Action</th></tr></thead>
      <tbody>${DB.questions.map(q => {
        const sub = DB.subjects.find(s => s.id === q.subjectId);
        return `<tr>
          <td>${q.id}</td>
          <td>${sub ? sub.icon + ' ' + sub.name : '?'}</td>
          <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.text}</td>
          <td><span class="badge ${q.difficulty === 'Easy' ? 'badge-green' : q.difficulty === 'Medium' ? 'badge-yellow' : 'badge-red'}">${q.difficulty}</span></td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">Delete</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderAdminUsers() {
  return `
  <div class="page-header"><h2>User List</h2><p>All registered students</p></div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Tests</th><th>Avg Score</th><th>Status</th></tr></thead>
      <tbody>${DB.users.map(u => `<tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td><code style="background:var(--surface2);padding:.2rem .5rem;border-radius:5px;font-size:.82rem">${u.username}</code></td>
        <td>${u.testCount}</td>
        <td>${u.testCount ? `<span class="badge ${u.avgScore >= 70 ? 'badge-green' : u.avgScore >= 40 ? 'badge-yellow' : 'badge-red'}">${u.avgScore}%</span>` : '—'}</td>
        <td><span class="badge badge-green">Active</span></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderAdminResults() {
  return `
  <div class="page-header"><h2>All Test Results</h2><p>Complete test history</p></div>
  <div class="card">
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>User</th><th>Subject</th><th>Score</th><th>%</th><th>Time</th><th>Date</th></tr></thead>
      <tbody>${DB.testResults.map(r => {
        const pct  = Math.round(r.score / r.total * 100);
        const mins = Math.floor(r.timeTaken / 60), secs = r.timeTaken % 60;
        return `<tr>
          <td>${r.id}</td>
          <td>${r.userName || '?'}</td>
          <td>${r.subjectIcon || ''} ${r.subjectName || '?'}</td>
          <td>${r.score}/${r.total}</td>
          <td><span class="badge ${pct >= 70 ? 'badge-green' : pct >= 40 ? 'badge-yellow' : 'badge-red'}">${pct}%</span></td>
          <td>${mins}m ${secs}s</td>
          <td>${r.date}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderAdminPerformance() {
  const bySubject = DB.subjects.map(s => {
    const sr = DB.testResults.filter(r => r.subjectId === s.id);
    return { name: s.icon + ' ' + s.name, avg: sr.length ? Math.round(sr.reduce((a, r) => a + (r.score / r.total * 100), 0) / sr.length) : 0, count: sr.length };
  }).filter(x => x.count > 0);

  return `
  <div class="page-header"><h2>Overall Performance Analysis</h2></div>
  <div class="card" style="margin-bottom:1.5rem">
    <div class="section-title">Subject-wise Average Scores</div>
    ${bySubject.map(s => `
    <div class="performance-row">
      <div class="perf-subject">${s.name} <span style="font-size:.75rem;color:var(--text-muted)">(${s.count} attempts)</span></div>
      <div class="perf-bar-bg"><div class="perf-bar" style="width:${s.avg}%;background:${s.avg >= 70 ? 'var(--accent3)' : s.avg >= 40 ? 'var(--accent)' : 'var(--danger)'}"></div></div>
      <div class="perf-pct">${s.avg}%</div>
    </div>`).join('')}
  </div>
  <div class="chart-grid">
    <div class="chart-box"><div class="chart-title">Subject Performance</div><canvas id="admin-chart-bar" height="180"></canvas></div>
    <div class="chart-box"><div class="chart-title">Test Distribution</div><canvas id="admin-chart-pie" height="180"></canvas></div>
  </div>`;
}

function drawAdminCharts() {
  const bySubject = DB.subjects.map(s => {
    const sr = DB.testResults.filter(r => r.subjectId === s.id);
    return { name: s.name, avg: sr.length ? Math.round(sr.reduce((a, r) => a + (r.score / r.total * 100), 0) / sr.length) : 0, count: sr.length };
  }).filter(x => x.count > 0);
  const colors = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#fbbf24'];

  const barEl = document.getElementById('admin-chart-bar');
  if (barEl) new Chart(barEl, {
    type: 'bar',
    data: { labels: bySubject.map(s => s.name), datasets: [{ label: 'Avg Score %', data: bySubject.map(s => s.avg), backgroundColor: colors.slice(0, bySubject.length), borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: {
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748b' } },
      x: { grid: { display: false }, ticks: { color: '#64748b' } }
    }}
  });

  const pieEl = document.getElementById('admin-chart-pie');
  if (pieEl) new Chart(pieEl, {
    type: 'doughnut',
    data: { labels: bySubject.map(s => s.name), datasets: [{ data: bySubject.map(s => s.count), backgroundColor: colors.slice(0, bySubject.length), borderWidth: 0 }] },
    options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, cutout: '60%' }
  });
}

// ══════════════════════════════════════════
//  ADMIN ACTIONS
// ══════════════════════════════════════════
function populateSubjectSelect() {
  const sel = document.getElementById('q-subject-select');
  if (sel) sel.innerHTML = DB.subjects.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
}

async function addSubject() {
  const name     = document.getElementById('new-subject-name').value.trim();
  const icon     = document.getElementById('new-subject-icon').value.trim() || '📚';
  const category = document.getElementById('new-subject-cat').value;
  if (!name) return toast('⚠️', 'Please enter a subject name');
  const data = await api('POST', '/api/subjects', { name, icon, category });
  if (!data.success) return toast('❌', data.message);
  DB.subjects.push(data.subject);
  closeModal('modal-subject');
  toast('✅', `Subject "${name}" added!`);
  switchAdminSection('subjects', null);
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject and all its questions?')) return;
  await api('DELETE', `/api/subjects/${id}`);
  DB.subjects   = DB.subjects.filter(s => s.id !== id);
  DB.questions  = DB.questions.filter(q => q.subjectId !== id);
  toast('🗑️', 'Subject deleted');
  switchAdminSection('subjects', null);
}

async function addQuestion() {
  const subjectId = parseInt(document.getElementById('q-subject-select').value);
  const text      = document.getElementById('q-text-input').value.trim();
  const options   = [
    document.getElementById('q-opt-a').value.trim(),
    document.getElementById('q-opt-b').value.trim(),
    document.getElementById('q-opt-c').value.trim(),
    document.getElementById('q-opt-d').value.trim()
  ];
  const correct    = parseInt(document.getElementById('q-correct').value);
  const difficulty = document.getElementById('q-difficulty').value;
  if (!text || options.some(o => !o)) return toast('⚠️', 'Please fill all question fields');
  const data = await api('POST', '/api/questions', { subjectId, text, options, correct, difficulty });
  if (!data.success) return toast('❌', data.message);
  DB.questions.push(data.question);
  // Update subject question count
  const sub = DB.subjects.find(s => s.id === subjectId);
  if (sub) sub.questionCount = (sub.questionCount || 0) + 1;
  closeModal('modal-question');
  toast('✅', 'Question added!');
  switchAdminSection('questions', null);
}

async function deleteQuestion(id) {
  await api('DELETE', `/api/questions/${id}`);
  const q = DB.questions.find(x => x.id === id);
  if (q) {
    const sub = DB.subjects.find(s => s.id === q.subjectId);
    if (sub && sub.questionCount > 0) sub.questionCount--;
  }
  DB.questions = DB.questions.filter(q => q.id !== id);
  toast('🗑️', 'Question deleted');
  switchAdminSection('questions', null);
}
