/* script.js - handles users, login/register, complaints, alerts, feedback, police dashboard */
document.addEventListener('DOMContentLoaded', () => {
  initDefaults();
  updateNavUser();
  setupLoginRegister();
  setupComplaintForm();
  setupStatusCheck();
  loadAlerts();
  setupFeedback();
  setupPoliceDashboard();
});

/* ---------- initialization ---------- */
function initDefaults() {
  // default users if none exist
  if (!localStorage.getItem('users')) {
    const defaults = [
      { username: 'police1', password: 'police123', role: 'police', name: 'Officer', email: 'police@cyber.gov' },
      { username: 'user1', password: 'user123', role: 'user', name: 'Demo User', email: 'user1@example.com' }
    ];
    localStorage.setItem('users', JSON.stringify(defaults));
  }
  if (!localStorage.getItem('complaints')) localStorage.setItem('complaints', JSON.stringify([]));
  if (!localStorage.getItem('feedbacks')) localStorage.setItem('feedbacks', JSON.stringify([]));
}

/* ---------- helper storage functions ---------- */
function getUsers() { return JSON.parse(localStorage.getItem('users') || '[]'); }
function saveUsers(arr) { localStorage.setItem('users', JSON.stringify(arr)); }
function getComplaints() { return JSON.parse(localStorage.getItem('complaints') || '[]'); }
function saveComplaints(arr) { localStorage.setItem('complaints', JSON.stringify(arr)); }
function getFeedbacks() { return JSON.parse(localStorage.getItem('feedbacks') || '[]'); }
function saveFeedbacks(arr) { localStorage.setItem('feedbacks', JSON.stringify(arr)); }

function setLoggedIn(user) {
  if (user) {
    localStorage.setItem('loggedInUser', user.username);
    localStorage.setItem('loggedInRole', user.role);
  } else {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loggedInRole');
  }
}
function getLoggedIn() {
  const username = localStorage.getItem('loggedInUser');
  if (!username) return null;
  return getUsers().find(u => u.username === username) || null;
}
function logoutAndRedirect() {
  setLoggedIn(null);
  updateNavUser();
  window.location.href = 'index.html';
}

/* ---------- nav update ---------- */
function updateNavUser() {
  const navUser = document.getElementById('nav-user');
  const navLoginLink = document.getElementById('nav-login-link');
  const user = getLoggedIn();
  if (user) {
    if (navLoginLink) navLoginLink.style.display = 'none';
    if (navUser) {
      navUser.style.display = 'inline-block';
      navUser.innerHTML = `Hi, <strong>${escapeHtml(user.username)}</strong> &nbsp; <a href="#" id="logout-link" style="color:#fff;text-decoration:underline;">(Logout)</a>`;
      const logoutLink = document.getElementById('logout-link');
      logoutLink.addEventListener('click', (e) => { e.preventDefault(); logoutAndRedirect(); });
    }
  } else {
    if (navLoginLink) { navLoginLink.style.display = 'inline'; navLoginLink.href = 'login.html'; }
    if (navUser) { navUser.style.display = 'none'; navUser.innerHTML = ''; }
  }
}

/* ---------- Login & Register ---------- */
function setupLoginRegister() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;

      const users = getUsers();
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showMessage('register-response', '⚠️ Username already exists!', true);
        return;
      }
      users.push({ username, password, role, name, email });
      saveUsers(users);
      showMessage('register-response', `✅ Registered successfully as ${role}! You can now login.`, false);
      registerForm.reset();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const role = document.getElementById('login-role').value;

      const user = getUsers().find(u => u.username === username && u.password === password && u.role === role);
      if (!user) {
        showMessage('login-response', '❌ Invalid credentials!', true);
        return;
      }
      setLoggedIn(user);
      showMessage('login-response', `✅ Welcome ${user.name || user.username}! Redirecting...`, false);
      updateNavUser();

      // redirect: police -> police.html, user -> index.html
      setTimeout(() => {
        if (user.role === 'police') window.location.href = 'police.html';
        else window.location.href = 'index.html';
      }, 800);
    });
  }
}

/* ---------- Complaint form ---------- */
function setupComplaintForm() {
  const form = document.getElementById('complaint-form');
  if (!form) return;

  const note = document.getElementById('complaint-note');
  const cName = document.getElementById('c-name');
  const cEmail = document.getElementById('c-email');

  const logged = getLoggedIn();
  if (!logged || logged.role !== 'user') {
    // require login as user
    showMessage('complaint-response', '⚠️ You must be logged in as a User to file a complaint. Go to Login / Register.', true);
    form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = true);
    return;
  } else {
    // prefill name/email and keep editable (or optionally readonly)
    cName.value = logged.name || '';
    cEmail.value = logged.email || '';
    showMessage('complaint-response', '', false);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cName.value.trim();
    const email = cEmail.value.trim();
    const phone = document.getElementById('c-phone').value.trim();
    const category = document.getElementById('c-category').value;
    const details = document.getElementById('c-details').value.trim();

    if (!name || !email || !phone || !category || !details) {
      showMessage('complaint-response', '⚠️ Please fill all fields.', true);
      return;
    }

    const id = generateComplaintId();
    const complaint = {
      id,
      name, email, phone, category, details,
      status: 'Pending - Under Review',
      created_at: new Date().toLocaleString(),
      filed_by: getLoggedIn().username
    };

    const complaints = getComplaints();
    complaints.push(complaint);
    saveComplaints(complaints);

    showMessage('complaint-response', `✅ Complaint submitted. Your Complaint ID: ${id}`, false);
    form.reset();
    // restore name/email
    cName.value = getLoggedIn().name || '';
    cEmail.value = getLoggedIn().email || '';
  });
}

function generateComplaintId() {
  // Use timestamp + random to reduce collision
  const stamp = Date.now().toString();
  const rand = Math.floor(Math.random() * 900 + 100).toString();
  return 'CYP' + stamp.slice(-6) + rand;
}

/* ---------- Status check ---------- */
function setupStatusCheck() {
  const form = document.getElementById('status-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('complaint-id').value.trim();
    if (!id) return;
    const complaints = getComplaints();
    const found = complaints.find(c => c.id.toLowerCase() === id.toLowerCase());
    const out = document.getElementById('status-result');
    if (!found) {
      out.innerHTML = '<span style="color:#c0392b;">❌ Complaint ID not found.</span>';
      return;
    }
    out.innerHTML = `
      <strong>Complaint ID:</strong> ${escapeHtml(found.id)}<br>
      <strong>Status:</strong> ${escapeHtml(found.status)}<br>
      <strong>Filed On:</strong> ${escapeHtml(found.created_at)}<br>
      <details style="margin-top:8px;">
        <summary>View Details</summary>
        <p><strong>Category:</strong> ${escapeHtml(found.category)}</p>
        <p><strong>Details:</strong> ${escapeHtml(found.details)}</p>
        <p><strong>Reporter:</strong> ${escapeHtml(found.name)} (${escapeHtml(found.email)}, ${escapeHtml(found.phone)})</p>
      </details>
    `;
  });
}

/* ---------- Alerts ---------- */
function loadAlerts() {
  const container = document.getElementById('alerts-container');
  if (!container) return;
  // try fetch, fallback to localStorage or embedded defaults
  fetch('data/alerts.json').then(res => {
    if (!res.ok) throw new Error('fetch failed');
    return res.json();
  }).then(data => {
    renderAlerts(container, data);
  }).catch(() => {
    // fallback: try from localStorage
    const fallback = JSON.parse(localStorage.getItem('alerts') || '[]');
    if (fallback.length) renderAlerts(container, fallback);
    else {
      // embedded fallback
      const defaultAlerts = [
        { title: 'Beware of Fake Job Offers', date: '2025-08-20', message: 'Scammers sending fake job offers — verify before replying.' },
        { title: 'Bank OTP Scam', date: '2025-08-25', message: 'Never share your OTP or banking details.' }
      ];
      renderAlerts(container, defaultAlerts);
    }
  });
}
function renderAlerts(container, list) {
  container.innerHTML = '';
  list.forEach(a => {
    const div = document.createElement('div');
    div.className = 'alert-card';
    div.innerHTML = `<h4>${escapeHtml(a.title)}</h4><small>${escapeHtml(a.date)}</small><p>${escapeHtml(a.message)}</p>`;
    container.appendChild(div);
  });
}

/* ---------- Feedback ---------- */
function setupFeedback() {
  const form = document.getElementById('feedback-form');
  const listDiv = document.getElementById('feedback-list');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('fb-name').value.trim();
      const email = document.getElementById('fb-email').value.trim();
      const message = document.getElementById('fb-message').value.trim();
      const feedbacks = getFeedbacks();
      feedbacks.unshift({ name, email, message, date: new Date().toLocaleString() });
      saveFeedbacks(feedbacks);
      showMessage('feedback-response', '✅ Thank you for your valuable feedback!', false);
      form.reset();
      renderFeedbackList();
    });
  }
  renderFeedbackList();

  function renderFeedbackList() {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const feedbacks = getFeedbacks();
    if (!feedbacks.length) { listDiv.innerHTML = '<p class="muted">No feedback yet.</p>'; return; }
    feedbacks.forEach(f => {
      const d = document.createElement('div');
      d.className = 'alert-card';
      d.innerHTML = `<strong>${escapeHtml(f.name)}</strong> <small>(${escapeHtml(f.email)}) - ${escapeHtml(f.date)}</small><p>${escapeHtml(f.message)}</p>`;
      listDiv.appendChild(d);
    });
  }
}

/* ---------- Police dashboard ---------- */
function setupPoliceDashboard() {
  const container = document.getElementById('police-complaints');
  const feedbacksDiv = document.getElementById('police-feedbacks');
  if (!container && !feedbacksDiv) return;

  // enforce police login
  const logged = getLoggedIn();
  if (!logged || logged.role !== 'police') {
    alert('Access denied. You must login as Police to view dashboard.');
    window.location.href = 'login.html';
    return;
  }

  // load complaints
  function render() {
    const comps = getComplaints().slice().reverse();
    container.innerHTML = '';
    if (!comps.length) container.innerHTML = '<p class="muted">No complaints yet.</p>';
    comps.forEach(c => {
      const div = document.createElement('div');
      div.className = 'complaint-card';
      div.innerHTML = `
        <h4>Complaint ID: ${escapeHtml(c.id)} <small>(${escapeHtml(c.created_at)})</small></h4>
        <p><strong>Category:</strong> ${escapeHtml(c.category)} | <strong>Status:</strong> <span id="status-${escapeHtml(c.id)}">${escapeHtml(c.status)}</span></p>
        <p><strong>Reporter:</strong> ${escapeHtml(c.name)} (${escapeHtml(c.email)}, ${escapeHtml(c.phone)})</p>
        <p>${escapeHtml(c.details)}</p>
        <div style="display:flex;gap:8px;">
          <button onclick="changeComplaintStatus('${escapeJs(c.id)}','In Progress')">Mark In Progress</button>
          <button onclick="changeComplaintStatus('${escapeJs(c.id)}','Resolved')">Mark Resolved</button>
          <button onclick="changeComplaintStatus('${escapeJs(c.id)}','Rejected')">Reject</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // feedbacks for police
  if (feedbacksDiv) {
    const fb = getFeedbacks();
    feedbacksDiv.innerHTML = '';
    if (!fb.length) feedbacksDiv.innerHTML = '<p class="muted">No feedbacks yet.</p>';
    fb.forEach(f => {
      const d = document.createElement('div');
      d.className = 'alert-card';
      d.innerHTML = `<strong>${escapeHtml(f.name)}</strong> <small>(${escapeHtml(f.email)}) - ${escapeHtml(f.date)}</small><p>${escapeHtml(f.message)}</p>`;
      feedbacksDiv.appendChild(d);
    });
  }

  render();
  // expose change function globally so inline onclick in generated HTML works
  window.changeComplaintStatus = function(id, newStatus) {
    const comps = getComplaints();
    const idx = comps.findIndex(c => c.id === id);
    if (idx === -1) return;
    comps[idx].status = newStatus;
    saveComplaints(comps);
    // update UI
    const statusSpan = document.getElementById(`status-${id}`);
    if (statusSpan) statusSpan.innerText = newStatus;
    // re-render whole dashboard to reflect changes
    setupPoliceDashboard();
  };
}

/* ---------- small utilities ---------- */
function showMessage(id, text, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.color = isError ? '#c0392b' : 'green';
  el.innerText = text;
  if (!text) el.innerText = '';
}
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeJs(s) {
  return String(s).replace(/'/g, "\\'");
}
// Simulate login check (you can replace with real auth)
let isLoggedIn = localStorage.getItem("loggedInUser");

// Update navbar on page load
function updateAuthLinks() {
  const authLink = document.getElementById("auth-link");
  if (isLoggedIn) {
    authLink.innerHTML = `
      <a href="profile.html">Profile</a> | 
      <a href="#" onclick="logout()">Logout</a>
    `;
  } else {
    authLink.innerHTML = `<a href="login.html">Login / Register</a>`;
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  isLoggedIn = null;
  updateAuthLinks();
  window.location.href = "index.html"; // back to home
}

document.addEventListener("DOMContentLoaded", updateAuthLinks);


