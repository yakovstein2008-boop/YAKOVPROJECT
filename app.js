// ---------- Defaults ----------
const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const STUDY = [0, 1, 2, 3, 4];   // Sunday–Thursday: full mechina day
const ALL = [0, 1, 2, 3, 4, 5];  // Sunday–Friday; Shabbat is a rest day
const FRIDAY = [5];

const SCHEDULE_VERSION = 4;
const DEFAULT_TASKS = [
  { name: '⏰ קימה: לסדר חדר, שיניים, להתלבש', time: '07:00', points: 20, days: ALL, key: true, kind: 'wake' },
  { name: '🙏 שחרית',                         time: '07:15', points: 25, days: ALL, key: true },
  { name: '🍳 ארוחת בוקר נורמלית',            time: '08:00', points: 10, days: ALL },
  { name: '📖 סדר הלכה',                      time: '08:15', points: 10, days: STUDY },
  { name: '🎓 שיעור בוקר',                    time: '09:00', points: 10, days: STUDY },
  { name: '📚 סדר בוקר – חברותא',             time: '09:30', points: 15, days: STUDY },
  { name: '🧠 שיעור עיון',                    time: '12:00', points: 10, days: STUDY },
  { name: '🍽️ ארוחת צהריים נורמלית',         time: '13:00', points: 10, days: STUDY },
  { name: '📕 לקרוא 20 דקות',                 time: '13:30', points: 5,  days: STUDY },
  { name: '👥 נדב – נתיבות שלום',             time: '15:00', points: 10, days: STUDY },
  { name: '🙏 מנחה',                          time: '15:15', points: 10, days: STUDY },
  { name: '👥 אשל – נצח ישראל',               time: '15:30', points: 10, days: STUDY },
  { name: '👥 גל – מורה נבוכים',              time: '16:30', points: 10, days: STUDY },
  { name: '👥 אדלר – סוכה',                   time: '17:30', points: 10, days: STUDY },
  { name: '🎓 שיעור ערב',                     time: '18:15', points: 10, days: STUDY },
  { name: '🍲 ארוחת ערב',                     time: '19:30', points: 10, days: STUDY },
  { name: '🎸 נגינה',                         time: '20:15', points: 5,  days: STUDY },
  { name: '🙏 ערבית',                         time: '20:45', points: 10, days: STUDY },
  { name: '👥 גרוסי – עבודה זרה',             time: '21:00', points: 10, days: STUDY },
  { name: '💪 שיעור ערב שני / אימון / ריצה',  time: '22:00', points: 15, days: STUDY },
  { id: 'gratitude', name: '✍️ 5 דברים טובים שקרו היום', time: '23:00', points: 15, days: STUDY },
  { name: '🚿 מקלחת',                         time: '23:15', points: 5,  days: STUDY },
  { name: '😴 לישון',                         time: '23:45', points: 15, days: STUDY, key: true, kind: 'sleep' },
  { name: '🧹 לסדר את החדר לשבת',             time: '12:00', points: 15, days: FRIDAY },
].map((t, i) => ({ id: 't' + i, ...t }));

const DEFAULT_REWARDS = [
  { name: '🍫 משהו מתוק מהמכולת', cost: 100 },
  { name: '🎮 שעה חופשית בלי רגשות אשמה', cost: 200 },
  { name: '🍕 פיצה בסופ"ש', cost: 500 },
];

const DEFAULT_PENALTIES = [
  '30 שכיבות סמיכה',
  '50 כפיפות בטן',
  'ריצה נוספת של 2 ק"מ',
  'שבוע בלי סוכר מהמכולת',
  'לנקות את השירותים בחדר',
  '3 דקות פלאנק (אפשר לחלק)',
];

// Ideas for the "I have 10 minutes" button
const DEFAULT_QUICK = [
  'לחזור על הסיכום האחרון שצילמת',
  'ללמוד הלכה אחת',
  '20 שכיבות סמיכה ו-20 כפיפות בטן',
  'לסדר את הארון',
  'לכתוב דבר טוב ביומן',
  'לשלוח הודעה טובה למישהו מהבית',
  'לקרוא 10 דקות',
  'כוס מים ומתיחות',
];

const LATE_GRACE_MIN = 45;   // done within 45 min of the time = on time, full points
const DAY_BONUS = 20;        // finishing every task of the day
const DAY_START_H = 3;       // the day rolls over at 03:00, so going to sleep at 23:45 still counts for today
const SOMEDAY_POINTS = 5;
const LEARNING = /^(👥|🎓|📖|📚|🧠)/;
const PRAYER_OR_SLEEP = /שחרית|מנחה|ערבית|קימה|לישון/;

// ---------- State ----------
const KEY = 'luz-state-v1';
let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) return migrate(s);
  } catch (e) {}
  return {
    tasks: DEFAULT_TASKS, rewards: DEFAULT_REWARDS, penaltyList: DEFAULT_PENALTIES, quick: DEFAULT_QUICK,
    points: 0, streak: 0, bestStreak: 0,
    days: {},          // 'YYYY-MM-DD' -> { done: {id: points}, at: {id: minute}, off: [ids], dayType, result }
    penalties: [],     // { text, date, done }
    lastEval: dateKey(addDays(today(), -1)),
    notified: {}, scheduleVersion: SCHEDULE_VERSION,
    journal: {},       // 'YYYY-MM-DD' -> ['', '', '', '', '']
    someday: [],       // { id, text, done }
    weekGoals: {},     // week-start key -> text
    since: todayKey(), // first day of use; earlier days don't count as missed
  };
}

function migrate(s) {
  if (!s.scheduleVersion || s.scheduleVersion < 2) s.tasks = DEFAULT_TASKS;
  if (!s.tasks.some(t => t.id === 'gratitude')) s.tasks.push(DEFAULT_TASKS.find(t => t.id === 'gratitude'));
  if (s.scheduleVersion < 4) {
    // Tag wake / prayer / sleep by name so the user's own edits are kept
    for (const t of s.tasks) {
      if (/קימה/.test(t.name)) { t.kind = 'wake'; t.key = true; }
      if (/לישון/.test(t.name)) { t.kind = 'sleep'; t.key = true; }
      if (/שחרית/.test(t.name)) t.key = true;
    }
  }
  s.since ||= Object.keys(s.days).sort()[0] || s.lastEval;
  s.journal ||= {}; s.someday ||= []; s.weekGoals ||= {}; s.quick ||= DEFAULT_QUICK;
  s.scheduleVersion = SCHEDULE_VERSION;
  return s;
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

// ---------- Date helpers ----------
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function minutesOf(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
// The "app day" starts at DAY_START_H, so 00:30 still belongs to yesterday's schedule
function today() { return new Date(Date.now() - DAY_START_H * 3600e3); }
function todayKey() { return dateKey(today()); }
function nowMinutes() {
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
  return m < DAY_START_H * 60 ? m + 1440 : m;
}
function fmtTime(m) {
  m = Math.round(m);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmtIn(min) {
  if (min < 60) return `${min} דק'`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} שע' ו-${r} דק'` : `${h} שע'`;
}
function weekStart(d) { return addDays(d, -d.getDay()); }

// Scheduled tasks for a date, minus the ones switched off for that day
function scheduledFor(date) {
  return state.tasks.filter(t => t.days.includes(date.getDay()))
    .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}
function tasksFor(date) {
  const off = state.days[dateKey(date)]?.off || [];
  return scheduledFor(date).filter(t => !off.includes(t.id));
}
function dayRec(key) {
  const r = state.days[key] || (state.days[key] = { done: {} });
  r.at ||= {};
  return r;
}
function onTime(t, rec) {
  const at = rec.at?.[t.id];
  if (at != null) return at <= minutesOf(t.time) + LATE_GRACE_MIN;
  return rec.done[t.id] >= t.points;
}
// How one task went on one day: none | future | ontime | late | missed
function status(t, key) {
  const d = parseKey(key), rec = state.days[key];
  if (key < state.since || !t.days.includes(d.getDay()) || rec?.off?.includes(t.id)) return 'none';
  const tk = todayKey();
  if (key > tk) return 'future';
  if (rec && t.id in rec.done) return onTime(t, rec) ? 'ontime' : 'late';
  if (key === tk) return nowMinutes() > minutesOf(t.time) + LATE_GRACE_MIN ? 'missed' : 'future';
  return 'missed';
}
function splitIcon(name) {
  const m = name.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  return m ? [m[1], name.slice(m[0].length)] : ['•', name];
}

// ---------- End-of-day judgement: reward or punish every day that has passed ----------
let report = [];
function evaluatePastDays() {
  const yesterday = dateKey(addDays(today(), -1));
  let d = addDays(parseKey(state.lastEval), 1);
  while (dateKey(d) <= yesterday) {
    const key = dateKey(d);
    const tasks = tasksFor(d);
    if (tasks.length) {
      const rec = dayRec(key);
      const missed = tasks.filter(t => !(t.id in rec.done));
      if (missed.length === 0) {
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        const bonus = DAY_BONUS + Math.min(state.streak * 2, 30);
        state.points += bonus;
        rec.result = 'ok';
        report.push({ ok: true, text: `יום מושלם! +${bonus} נקודות · רצף של ${state.streak} ימים 🔥` });
      } else {
        const lost = missed.reduce((sum, t) => sum + t.points, 0);
        state.points = Math.max(0, state.points - lost);
        state.streak = 0;
        rec.result = 'fail';
        const p = state.penaltyList[Math.floor(Math.random() * state.penaltyList.length)];
        if (p && state.penalties.filter(x => !x.done).length < 3) {
          state.penalties.push({ text: p, date: key, done: false });
        }
        report.push({ ok: false, text: `אתמול פוספסו ${missed.length}: ${missed.map(t => splitIcon(t.name)[1]).join(', ')}. −${lost} נקודות, הרצף התאפס.` });
      }
    }
    d = addDays(d, 1);
  }
  state.lastEval = yesterday;
  save();
}

// ---------- Actions ----------
function award(rec, task) {
  const m = nowMinutes();
  const late = m > minutesOf(task.time) + LATE_GRACE_MIN;
  const pts = late ? Math.ceil(task.points / 2) : task.points;
  rec.done[task.id] = pts;
  rec.at[task.id] = m;     // the real time, used for bedtime / wake-up tracking
  state.points += pts;
  return { pts, late };
}

function toggle(id) {
  const key = todayKey(), rec = dayRec(key);
  const task = state.tasks.find(t => t.id === id);
  if (id === 'gratitude' && !(id in rec.done)) {
    journalDay = key; showTab('journal');
    return toast('כותבים 5 דברים טובים — וזה מסומן לבד ✍️');
  }
  if (id in rec.done) {
    state.points = Math.max(0, state.points - rec.done[id]);
    delete rec.done[id]; delete rec.at[id];
  } else {
    const { pts, late } = award(rec, task);
    const all = tasksFor(today()).every(t => t.id in rec.done);
    toast(all ? '🎉 סיימת את כל היום! הבונוס מגיע בלילה'
      : task.kind === 'sleep' ? `לילה טוב 🌙 נרשם ${fmtTime(rec.at[id])}`
      : late ? `+${pts} · חצי נקודות, באיחור` : `+${pts} נקודות`);
  }
  save(); render();
}

function finishPenalty(i) {
  state.penalties[i].done = true;
  save(); toast('העונש שולם. החנות פתוחה שוב'); render();
}

function buy(i) {
  const r = state.rewards[i];
  if (state.penalties.some(p => !p.done)) return toast('🔒 קודם לסיים את העונש');
  if (state.points < r.cost) return toast(`חסרות ${r.cost - state.points} נקודות`);
  if (!confirm(`לממש "${r.name}" ב-${r.cost} נקודות?`)) return;
  state.points -= r.cost;
  save(); toast(`תהנה! ${r.name}`); render();
}

// ---------- Reminders (while the app is open or in the background) ----------
async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: 'icon-192.png', tag: title });
  else new Notification(title, { body });
}
function checkReminders() {
  const now = today(), key = dateKey(now), rec = dayRec(key), m = nowMinutes();
  for (const t of tasksFor(now)) {
    if (t.id in rec.done) continue;
    const start = minutesOf(t.time);
    const tag1 = key + t.id, tag2 = key + t.id + 'late';
    if (m >= start && m < start + LATE_GRACE_MIN && !state.notified[tag1]) {
      state.notified[tag1] = 1; notify(t.name, 'הגיע הזמן. לסמן כשסיימת');
    }
    if (m >= start + 20 && m < start + LATE_GRACE_MIN && !state.notified[tag2]) {
      state.notified[tag2] = 1; notify(t.name, `עוד ${start + LATE_GRACE_MIN - m} דק' עד שזה נחשב איחור`);
    }
  }
  for (const k in state.notified) if (!k.startsWith(key)) delete state.notified[k];
  save();
}

// ---------- Calendar export: reliable phone alarms even when the app is closed ----------
function exportCalendar() {
  const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const start = todayKey().replaceAll('-', '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//luz//he', 'CALSCALE:GREGORIAN'];
  for (const t of state.tasks) {
    if (!t.days.length) continue;
    const hm = t.time.replace(':', '') + '00';
    lines.push('BEGIN:VEVENT', `UID:luz-${t.id}-${Date.now()}@luz`,
      `DTSTART:${start}T${hm}`, 'DURATION:PT15M',
      `RRULE:FREQ=WEEKLY;BYDAY=${t.days.map(d => byday[d]).join(',')}`,
      `SUMMARY:${t.name}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${t.name}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'luz.ics'; a.click();
}

// ---------- Rendering helpers ----------
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function taskRow(t, rec, cls, when) {
  const [icon, name] = splitIcon(t.name);
  return `<div class="task ${cls}" onclick="toggle('${t.id}')">
    <div class="ic">${icon}</div>
    <div class="body"><div class="name">${esc(name)}</div><div class="when">${when}</div></div>
    <button class="check" aria-label="סימון">${CHECK}</button>
  </div>`;
}

// ---------- Home: the "now" screen ----------
function renderHome() {
  const now = today(), key = dateKey(now), rec = dayRec(key), m = nowMinutes();
  const tasks = tasksFor(now);
  const pending = tasks.filter(t => !(t.id in rec.done));
  const inWindow = pending.filter(t => minutesOf(t.time) <= m && m <= minutesOf(t.time) + LATE_GRACE_MIN);
  const current = inWindow[inWindow.length - 1];
  const next = pending.find(t => minutesOf(t.time) > m);
  const overdue = pending.filter(t => m > minutesOf(t.time) + LATE_GRACE_MIN);
  const doneCount = tasks.length - pending.length;
  const pct = tasks.length ? Math.round(doneCount / tasks.length * 100) : 100;
  const greeting = m < 5 * 60 || m >= 24 * 60 ? 'לילה טוב' : m < 12 * 60 ? 'בוקר טוב' : m < 18 * 60 ? 'צהריים טובים' : 'ערב טוב';
  const somedayOpen = state.someday.filter(x => !x.done).length;
  const special = rec.dayType && rec.dayType !== 'normal';

  let html = `<h1>${greeting}</h1>
    <div class="sub">${now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}${special ? ' · ' + DAY_TYPES[rec.dayType]?.label : ''}</div>`;

  // Hero
  if (current) {
    const left = minutesOf(current.time) + LATE_GRACE_MIN - m;
    html += `<div class="hero"><div class="label">עכשיו</div>
      <div class="title">${esc(splitIcon(current.name)[1])}</div>
      <div class="meta">${current.time} · עוד ${fmtIn(left)} בזמן · ${current.points} נק'</div>
      <button class="go" onclick="toggle('${current.id}')">סיימתי ✓</button>
      ${next ? `<div class="next">אחר כך: ${esc(splitIcon(next.name)[1])} ב-${next.time}</div>` : ''}</div>`;
  } else if (next) {
    html += `<div class="hero"><div class="label">הבא בתור</div>
      <div class="title">${esc(splitIcon(next.name)[1])}</div>
      <div class="meta">${next.time} · בעוד ${fmtIn(minutesOf(next.time) - m)}</div>
      <button class="go" onclick="openQuick()">יש לי זמן עד אז — מה לעשות?</button></div>`;
  } else if (tasks.length && !pending.length) {
    html += `<div class="hero"><div class="label">היום</div><div class="title">סיימת הכל 🎉</div>
      <div class="meta">${doneCount} משימות. הבונוס יגיע בלילה.</div></div>`;
  } else if (!tasks.length) {
    html += `<div class="hero"><div class="label">${now.getDay() === 6 ? 'שבת' : 'היום'}</div>
      <div class="title">${now.getDay() === 6 ? 'שבת שלום 🕯️' : 'אין משימות היום'}</div>
      <div class="meta">הרצף לא נשבר.</div></div>`;
  } else {
    html += `<div class="hero"><div class="label">נשארו מאחור</div>
      <div class="title">${overdue.length} משימות</div><div class="meta">אפשר עדיין לסמן — בחצי נקודות</div></div>`;
  }

  // Quick actions
  html += `<div class="pills">
      <button class="pill" onclick="openQuick()">⏱ יש לי 10 דקות</button>
      <button class="pill" onclick="openSomeday()">📝 מתי שיהיה זמן${somedayOpen ? ` · ${somedayOpen}` : ''}</button>
      <button class="pill ${special ? 'on' : ''}" onclick="openSpecial()">🗓 יום מיוחד</button>
      ${'Notification' in window && Notification.permission !== 'granted' ? '<button class="pill" onclick="askNotify()">🔔 התראות</button>' : ''}
    </div>
    <div class="statline">
      <div><b>${state.points}</b><span>נקודות</span></div>
      <div><b>${state.streak}🔥</b><span>רצף</span></div>
      <div><b>${doneCount}/${tasks.length}</b><span>היום</span></div>
    </div>
    <div class="bar"><i style="width:${pct}%"></i></div>`;

  // Friday: weekly summary is ready
  if (now.getDay() === 5 || (now.getDay() === 4 && m >= 21 * 60)) {
    html += `<div class="card ok link" onclick="showTab('stats')"><div class="grow"><b>הסיכום השבועי מוכן</b>
      <div class="sub">איך היה השבוע, ומה היעד לשבוע הבא</div></div><b>←</b></div>`;
  }

  html += report.map(r => `<div class="card ${r.ok ? 'ok' : 'alert'}">${esc(r.text)}</div>`).join('');
  state.penalties.forEach((p, i) => {
    if (p.done) return;
    html += `<div class="card alert"><b>עונש · ${esc(p.date.slice(5).split('-').reverse().join('/'))}</b>
      <div style="font-size:18px;font-weight:700;margin:4px 0">${esc(p.text)}</div>
      <div class="sub">חנות הפרסים נעולה עד שמבצעים.</div>
      <button class="btn small" style="margin-top:10px" onclick="finishPenalty(${i})">ביצעתי</button></div>`;
  });

  if (tasks.length) {
    html += '<h2>הלוז של היום</h2>';
    for (const t of tasks) {
      const done = t.id in rec.done, start = minutesOf(t.time);
      let cls = '', when = t.time;
      if (done) { cls = 'done'; when = `${t.time} · +${rec.done[t.id]}`; }
      else if (t === current) cls = 'now';
      else if (m > start + LATE_GRACE_MIN) { cls = 'late'; when = `${t.time} · באיחור`; }
      html += taskRow(t, rec, cls, when);
    }
  }
  const off = scheduledFor(now).length - tasks.length;
  if (off) html += `<div class="sub" style="margin-top:10px">${off} משימות כבויות היום · <a onclick="openSpecial()" style="color:var(--accent-deep)">שינוי</a></div>`;
  $('tab-home').innerHTML = html;
}

// ---------- Bottom sheets ----------
function openSheet(html) {
  closeSheet();
  const bd = document.createElement('div'); bd.className = 'backdrop'; bd.onclick = closeSheet;
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.id = 'sheet';
  sh.innerHTML = `<div class="grab"></div><div id="sheet-body">${html}</div>`;
  document.body.append(bd, sh);
}
function closeSheet() { document.querySelector('.backdrop')?.remove(); $('sheet')?.remove(); render(); }
function sheetBody(html) { if ($('sheet-body')) $('sheet-body').innerHTML = html; }

// "I have 10 minutes": one suggestion at a time from the someday list or quick ideas
let lastIdea = null;
function pickIdea() {
  const open = state.someday.filter(x => !x.done);
  const pool = [
    ...open.map(x => ({ text: x.text, someday: x.id })),
    ...state.quick.map(text => ({ text })),
  ].filter(x => x.text !== lastIdea?.text);
  if (!pool.length) return lastIdea;
  // The user's own list comes up more often than generic ideas
  const mine = pool.filter(x => x.someday != null);
  const from = mine.length && Math.random() < 0.6 ? mine : pool;
  return lastIdea = from[Math.floor(Math.random() * from.length)];
}
function quickHtml() {
  const idea = lastIdea;
  if (!idea) return '<h1>יש לי 10 דקות</h1><div class="sub">אין רעיונות. מוסיפים ב"מתי שיהיה זמן" או בהגדרות.</div>';
  return `<h1>יש לי 10 דקות</h1>
    <div class="idea"><div class="tag">${idea.someday != null ? 'מהרשימה שלך' : 'רעיון מהיר'}</div>
      <div class="text">${esc(idea.text)}</div></div>
    <button class="btn" onclick="ideaDone()">עשיתי ✓</button>
    <button class="btn soft" onclick="pickIdea();sheetBody(quickHtml())">רעיון אחר</button>`;
}
function openQuick() { pickIdea(); openSheet(quickHtml()); }
function ideaDone() {
  if (lastIdea?.someday != null) {
    const item = state.someday.find(x => x.id === lastIdea.someday);
    if (item && !item.done) { item.done = true; state.points += SOMEDAY_POINTS; save(); toast(`+${SOMEDAY_POINTS} · ירד מהרשימה`); }
  } else toast('יפה! ניצלת את הזמן 💪');
  lastIdea = null; closeSheet();
}

// "When there's time" list
function somedayHtml() {
  const open = state.someday.filter(x => !x.done), done = state.someday.filter(x => x.done);
  const row = x => `<div class="item ${x.done ? 'done' : ''}">
      <div class="check" style="${x.done ? 'background:var(--accent);border-color:var(--accent)' : ''}" onclick="somedayToggle(${x.id})">${x.done ? CHECK.replace('<svg', '<svg style="opacity:1"') : ''}</div>
      <div class="grow">${esc(x.text)}</div>
      <button class="x" onclick="somedayDel(${x.id})">×</button></div>`;
  return `<h1>מתי שיהיה זמן</h1>
    <div class="sub">דברים לא דחופים. הכפתור "יש לי 10 דקות" יציע אותם. כל אחד שווה ${SOMEDAY_POINTS} נק'.</div>
    <div class="row" style="margin-top:14px">
      <input id="sd-in" style="flex:1" placeholder="להתקשר לסבתא, לכבס, לקנות סוללות..." onkeydown="if(event.key==='Enter')somedayAdd()">
      <button class="btn small" onclick="somedayAdd()">הוספה</button>
    </div>
    <div style="margin-top:8px">${open.map(row).join('') || '<div class="sub" style="padding:14px 0">הרשימה ריקה.</div>'}</div>
    ${done.length ? `<h2>בוצעו</h2>${done.slice(-10).reverse().map(row).join('')}
      <button class="btn soft" onclick="state.someday=state.someday.filter(x=>!x.done);save();sheetBody(somedayHtml())">ניקוי הרשימה</button>` : ''}`;
}
function openSomeday() { openSheet(somedayHtml()); }
function somedayAdd() {
  const text = $('sd-in').value.trim();
  if (!text) return;
  state.someday.push({ id: Date.now(), text, done: false });
  save(); sheetBody(somedayHtml()); $('sd-in').focus();
}
function somedayToggle(id) {
  const x = state.someday.find(i => i.id === id);
  x.done = !x.done;
  state.points = Math.max(0, state.points + (x.done ? SOMEDAY_POINTS : -SOMEDAY_POINTS));
  save(); sheetBody(somedayHtml());
}
function somedayDel(id) { state.someday = state.someday.filter(x => x.id !== id); save(); sheetBody(somedayHtml()); }

// Special days: turn tasks off for a day so a trip or a cancelled chavruta isn't punished
const DAY_TYPES = {
  normal: { label: 'יום רגיל', off: () => [] },
  trip:   { label: '🏕️ טיול', off: ts => ts.filter(t => !PRAYER_OR_SLEEP.test(t.name)) },
  home:   { label: '🏠 בבית', off: ts => ts.filter(t => LEARNING.test(t.name)) },
  sick:   { label: '🤒 חולה / חופש', off: ts => ts },
};
let specialKey = null;
function specialHtml() {
  const d = parseKey(specialKey), rec = dayRec(specialKey), ts = scheduledFor(d);
  const isToday = specialKey === todayKey();
  return `<h1>יום מיוחד</h1>
    <div class="sub">משימה כבויה לא נספרת: לא נקודות ולא עונש.</div>
    <div class="pills" style="margin-top:14px">
      <button class="pill ${isToday ? 'on' : ''}" onclick="specialKey=todayKey();sheetBody(specialHtml())">היום</button>
      <button class="pill ${!isToday ? 'on' : ''}" onclick="specialKey=dateKey(addDays(today(),1));sheetBody(specialHtml())">מחר</button>
    </div>
    <h2>סוג היום</h2>
    <div class="pills">${Object.entries(DAY_TYPES).filter(([k]) => k !== 'custom').map(([k, v]) =>
      `<button class="pill ${(rec.dayType || 'normal') === k ? 'on' : ''}" onclick="setDayType('${k}')">${v.label}</button>`).join('')}</div>
    <h2>משימות</h2>
    ${ts.length ? ts.map(t => {
      const done = t.id in rec.done, on = !(rec.off || []).includes(t.id);
      return `<div class="item"><div class="grow">${esc(t.name)} <span class="sub">${t.time}</span></div>
        ${done ? '<span class="sub">בוצע</span>' : `<label class="switch"><input type="checkbox" ${on ? 'checked' : ''} onchange="setOff('${t.id}', !this.checked)"><i></i></label>`}</div>`;
    }).join('') : '<div class="sub">אין משימות ביום הזה.</div>'}
    <button class="btn" onclick="closeSheet()">סיום</button>`;
}
function openSpecial() { specialKey = todayKey(); openSheet(specialHtml()); }
function setDayType(type) {
  const rec = dayRec(specialKey), ts = scheduledFor(parseKey(specialKey));
  rec.dayType = type;
  rec.off = DAY_TYPES[type].off(ts).filter(t => !(t.id in rec.done)).map(t => t.id);
  save(); sheetBody(specialHtml());
}
function setOff(id, off) {
  const rec = dayRec(specialKey), set = new Set(rec.off || []);
  off ? set.add(id) : set.delete(id);
  rec.off = [...set];
  rec.dayType = rec.off.length ? 'custom' : 'normal';
  save(); sheetBody(specialHtml());
}
DAY_TYPES.custom = { label: 'מותאם', off: () => [] };

// ---------- Stats ----------
function avg(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }
function timesOf(kind, keys) {
  const t = state.tasks.find(x => x.kind === kind);
  return t ? keys.map(k => state.days[k]?.at?.[t.id] ?? null) : keys.map(() => null);
}
function lastKeys(n) { return [...Array(n)].map((_, i) => dateKey(addDays(today(), i - n + 1))); }

function weekSummary(start) {
  const keys = [...Array(6)].map((_, i) => dateKey(addDays(start, i))).filter(k => k <= todayKey());
  let done = 0, due = 0, earned = 0, perfect = 0, goods = 0;
  const misses = {};
  for (const k of keys) {
    const rec = state.days[k];
    if (rec?.result === 'ok') perfect++;
    goods += (state.journal[k] || []).filter(x => x.trim()).length;
    for (const t of tasksFor(parseKey(k))) {
      const s = status(t, k);
      if (s === 'future' || s === 'none') continue;
      due++;
      if (s === 'ontime' || s === 'late') { done++; earned += rec.done[t.id]; }
      else misses[t.name] = (misses[t.name] || 0) + 1;
    }
  }
  const worst = Object.entries(misses).sort((a, b) => b[1] - a[1])[0];
  const sleep = avg(timesOf('sleep', keys).filter(x => x != null));
  const wake = avg(timesOf('wake', keys).filter(x => x != null));
  return { keys, done, due, earned, perfect, goods, worst, sleep, wake };
}

function timeBars(values, keys, lo, hi, target) {
  const pos = v => Math.max(4, Math.min(100, (v - lo) / (hi - lo) * 100));
  return `<div class="bars">
      ${target != null ? `<div class="target" style="bottom:${pos(target)}%"></div>` : ''}
      ${values.map(v => v == null ? '<div class="none"></div>'
        : `<div class="${v > target + 15 ? 'bad' : ''}" style="height:${pos(v)}%" title="${fmtTime(v)}"></div>`).join('')}
    </div>
    <div class="barlabels">${keys.map(k => `<span>${parseKey(k).getDate()}</span>`).join('')}</div>`;
}

async function renderStats() {
  const now = today(), start = weekStart(now), wk = dateKey(start);
  const nextWk = dateKey(addDays(start, 7));
  const s = weekSummary(start);
  const pct = s.due ? Math.round(s.done / s.due * 100) : 0;
  const isFri = now.getDay() >= 5;

  let html = `<h1>${isFri ? 'סיכום השבוע' : 'השבוע שלך'}</h1>
    <div class="sub">${parseKey(wk).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} – ${addDays(start, 5).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</div>
    ${state.weekGoals[wk] ? `<div class="card ok" style="margin-top:16px"><div class="sub">היעד של השבוע</div><b>${esc(state.weekGoals[wk])}</b></div>` : ''}
    <div class="grid2" style="margin-top:16px">
      <div class="metric"><b>${pct}%</b><span>משימות שבוצעו (${s.done}/${s.due})</span></div>
      <div class="metric"><b>${s.perfect}</b><span>ימים מושלמים</span></div>
      <div class="metric"><b>${s.sleep != null ? fmtTime(s.sleep) : '—'}</b><span>שינה ממוצעת</span></div>
      <div class="metric"><b>${s.wake != null ? fmtTime(s.wake) : '—'}</b><span>קימה ממוצעת</span></div>
      <div class="metric"><b>+${s.earned}</b><span>נקודות שהרווחת</span></div>
      <div class="metric"><b>${s.goods}</b><span>דברים טובים נכתבו</span></div>
    </div>
    <div class="card"><div class="sub">📸 סיכומים שצולמו השבוע</div><b id="wk-photos">…</b></div>
    ${s.worst ? `<div class="card alert"><div class="sub">הכי קשה השבוע</div><b>${esc(s.worst[0])}</b> · פוספס ${s.worst[1]} פעמים</div>` : ''}
    <h2>יעד לשבוע הבא</h2>
    <input style="width:100%" placeholder="למשל: שחרית בזמן כל יום" value="${esc(state.weekGoals[nextWk] || '')}"
      onchange="state.weekGoals['${nextWk}']=this.value.trim();save();toast('היעד נשמר')">`;

  // Key tasks: the things that hold the whole day together
  const keys14 = lastKeys(14);
  const keyTasks = state.tasks.filter(t => t.key);
  html += `<h2>מה שהכי חשוב</h2><div class="sub">14 הימים האחרונים · כחול = בזמן, תכלת = באיחור, אדום = פוספס</div>`;
  for (const t of keyTasks) {
    const st = keys14.map(k => status(t, k));
    const due = st.filter(x => x !== 'none' && x !== 'future').length;
    const ok = st.filter(x => x === 'ontime').length;
    html += `<div class="keyrow"><div class="top">${esc(t.name)}<span>${due ? `${ok}/${due} בזמן` : '—'}</span></div>
      <div class="dots">${st.map(x => `<i class="${x}"></i>`).join('')}</div></div>`;
  }
  if (!keyTasks.length) html += '<div class="sub">מסמנים ★ ליד משימה בהגדרות.</div>';

  // Real bedtime and wake-up time, from when the tasks were checked off
  const sleepTask = state.tasks.find(t => t.kind === 'sleep');
  const wakeTask = state.tasks.find(t => t.kind === 'wake');
  if (sleepTask) {
    const vals = timesOf('sleep', keys14), real = vals.filter(v => v != null);
    html += `<h2>שעת שינה אמיתית</h2>
      <div class="sub">נרשם כשמסמנים "${esc(splitIcon(sleepTask.name)[1])}". הקו = היעד (${sleepTask.time}). גבוה יותר = מאוחר יותר.</div>
      ${timeBars(vals, keys14, 22 * 60, 26 * 60, minutesOf(sleepTask.time))}
      <div class="sub" style="margin-top:6px">${real.length ? `ממוצע ${fmtTime(avg(real))} · הכי מאוחר ${fmtTime(Math.max(...real))}` : 'עוד אין נתונים'}</div>`;
  }
  if (wakeTask) {
    const vals = timesOf('wake', keys14), real = vals.filter(v => v != null);
    html += `<h2>שעת קימה</h2>
      ${timeBars(vals, keys14, 6 * 60, 9 * 60, minutesOf(wakeTask.time))}
      <div class="sub" style="margin-top:6px">${real.length ? `ממוצע ${fmtTime(avg(real))}` : 'עוד אין נתונים'}</div>`;
  }

  html += '<h2>30 הימים האחרונים</h2><div class="hist">';
  for (let i = 30; i >= 1; i--) {
    const d = addDays(today(), -i), r = state.days[dateKey(d)]?.result;
    html += `<div class="${r === 'ok' ? 'ok' : r === 'fail' ? 'fail' : ''}">${d.getDate()}</div>`;
  }
  html += '</div>';
  $('tab-stats').innerHTML = html;

  try {
    const n = (await allPhotos()).filter(p => s.keys.includes(p.date)).length;
    if ($('wk-photos')) $('wk-photos').textContent = n;
  } catch (e) { if ($('wk-photos')) $('wk-photos').textContent = '—'; }
}

// ---------- Rewards ----------
function renderRewards() {
  const locked = state.penalties.some(p => !p.done);
  let html = `<h1>פרסים</h1>
    <div class="big">${state.points}</div>
    <div class="sub">נקודות · שיא רצף ${state.bestStreak} ימים</div>
    ${locked ? '<div class="card alert">🔒 החנות נעולה עד שמבצעים את העונש</div>' : ''}
    <h2>לממש</h2>`;
  state.rewards.forEach((r, i) => {
    const can = state.points >= r.cost && !locked;
    html += `<div class="reward"><div class="grow">${esc(r.name)}</div>
      <button class="btn small ${can ? 'accent' : 'soft'}" onclick="buy(${i})">${r.cost}</button></div>`;
  });
  html += `<h2>איך זה עובד</h2>
    <div class="sub" style="line-height:1.9">
      משימה בזמן (עד ${LATE_GRACE_MIN} דק' אחרי השעה) — נקודות מלאות. באיחור — חצי.<br>
      יום שלם בלי פספוס — בונוס ${DAY_BONUS} ועוד 2 על כל יום ברצף.<br>
      פספוס — מפסידים את הנקודות של המשימה, הרצף מתאפס ומקבלים עונש.<br>
      עונש פתוח נועל את החנות עד שמבצעים אותו.<br>
      יום מיוחד ושבת — משימות כבויות לא נספרות, והרצף לא נשבר.
    </div>`;
  $('tab-rewards').innerHTML = html;
}

// ---------- Settings ----------
function renderSettings() {
  let html = `<h1>הגדרות</h1>
    <h2>תזכורות כשהאפליקציה סגורה</h2>
    <div class="sub">מוסיף את הלוז ליומן של הטלפון עם התראה בכל משימה. אחרי שינוי — למחוק את האירועים הישנים ולהוסיף שוב.</div>
    <button class="btn" onclick="exportCalendar()">להוסיף את הלוז ליומן</button>
    <h2>המשימות שלי</h2>
    <div class="sub" style="margin-bottom:10px">★ = משימה חשובה, מופיעה במעקב בלשונית נתונים.</div>`;
  state.tasks.forEach((t, i) => {
    html += `<div class="edit">
      <div class="row">
        <input class="name-in" value="${esc(t.name)}" onchange="setTask(${i},'name',this.value)">
        <button class="iconbtn ${t.key ? 'on' : ''}" onclick="setTask(${i},'key',${!t.key});render()">★</button>
        <button class="iconbtn" style="color:var(--muted)" onclick="delTask(${i})">✕</button>
      </div>
      <div class="row" style="margin-top:8px">
        <input type="time" value="${t.time}" onchange="setTask(${i},'time',this.value)">
        <input type="number" min="1" value="${t.points}" onchange="setTask(${i},'points',+this.value)"><span class="sub">נקודות</span>
      </div>
      <div class="days">${DAY_NAMES.map((n, d) =>
        `<label><input type="checkbox" ${t.days.includes(d) ? 'checked' : ''} onchange="setDay(${i},${d},this.checked)">${n}</label>`).join('')}</div>
    </div>`;
  });
  html += `<button class="btn soft" onclick="addTask()">+ משימה חדשה</button>
    <h2>פרסים</h2>`;
  state.rewards.forEach((r, i) => {
    html += `<div class="edit row">
      <input class="name-in" value="${esc(r.name)}" onchange="state.rewards[${i}].name=this.value;save()">
      <input type="number" min="1" value="${r.cost}" onchange="state.rewards[${i}].cost=+this.value;save()">
      <button class="iconbtn" style="color:var(--muted)" onclick="state.rewards.splice(${i},1);save();render()">✕</button>
    </div>`;
  });
  html += `<button class="btn soft" onclick="state.rewards.push({name:'פרס חדש',cost:100});save();render()">+ פרס חדש</button>
    <h2>עונשים</h2><div class="sub" style="margin-bottom:8px">אחד בכל שורה, נבחר באקראי.</div>
    <textarea onchange="state.penaltyList=lines(this.value);save()">${esc(state.penaltyList.join('\n'))}</textarea>
    <h2>רעיונות ל"יש לי 10 דקות"</h2><div class="sub" style="margin-bottom:8px">אחד בכל שורה.</div>
    <textarea onchange="state.quick=lines(this.value);save()">${esc(state.quick.join('\n'))}</textarea>
    <h2>איפוס</h2>
    <button class="btn soft" style="color:var(--bad)" onclick="if(confirm('למחוק הכל ולהתחיל מחדש?')){localStorage.removeItem(KEY);location.reload()}">להתחיל מאפס</button>`;
  $('tab-settings').innerHTML = html;
}
function lines(v) { return v.split('\n').map(s => s.trim()).filter(Boolean); }
function setTask(i, field, val) { state.tasks[i][field] = val; save(); }
function setDay(i, d, on) {
  const days = new Set(state.tasks[i].days);
  on ? days.add(d) : days.delete(d);
  state.tasks[i].days = [...days].sort();
  save();
}
function delTask(i) { if (confirm(`למחוק את "${state.tasks[i].name}"?`)) { state.tasks.splice(i, 1); save(); render(); } }
function addTask() {
  state.tasks.push({ id: 't' + Date.now(), name: 'משימה חדשה', time: '12:00', points: 10, days: [...STUDY] });
  save(); render();
}

// ---------- Journal: 5 good things + photos of summaries ----------
let journalDay = todayKey();
let photoFilter = '';   // '' = everything
let photoUrls = [];

function goodThings(key) { return state.journal[key] || ['', '', '', '', '']; }

function setGood(i, val) {
  const key = journalDay;
  const list = [...goodThings(key)];
  list[i] = val;
  state.journal[key] = list;
  // Completing all five on today's page checks off the journal task
  const rec = dayRec(key), task = state.tasks.find(t => t.id === 'gratitude');
  const full = list.every(x => x.trim());
  if (key === todayKey() && task && tasksFor(today()).includes(task)) {
    if (full && !('gratitude' in rec.done)) {
      const { pts } = award(rec, task);
      toast(`✍️ יפה! +${pts} נקודות`);
    } else if (!full && 'gratitude' in rec.done) {
      state.points = Math.max(0, state.points - rec.done.gratitude);
      delete rec.done.gratitude; delete rec.at.gratitude;
    }
  }
  save();
}

// Photos live in IndexedDB: localStorage is far too small for images
let dbPromise;
function db() {
  return dbPromise ||= new Promise((ok, fail) => {
    const req = indexedDB.open('luz-photos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}
async function photoStore(mode) { return (await db()).transaction('photos', mode).objectStore('photos'); }
function reqDone(req) { return new Promise((ok, fail) => { req.onsuccess = () => ok(req.result); req.onerror = () => fail(req.error); }); }
async function allPhotos() { return reqDone((await photoStore('readonly')).getAll()); }

// Shrink camera photos so hundreds of summaries still fit on the phone
function compress(file) {
  return new Promise((ok, fail) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : fail(new Error('toBlob')), 'image/jpeg', 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('image')); };
    img.src = url;
  });
}

async function addPhotos(files) {
  const subject = $('photo-subject').value, note = $('photo-note').value.trim();
  if (!files.length) return;
  toast('שומר...');
  try {
    for (const f of files) {
      const blob = await compress(f);
      await reqDone((await photoStore('readwrite')).add({ date: journalDay, subject, note, blob, created: Date.now() }));
    }
    toast(files.length > 1 ? `📸 נשמרו ${files.length} תמונות` : '📸 נשמר');
  } catch (e) {
    toast('לא הצלחתי לשמור את התמונה');
  }
  renderJournal();
}

async function openPhoto(id) {
  const p = await reqDone((await photoStore('readonly')).get(id));
  const url = URL.createObjectURL(p.blob);
  const el = document.createElement('div');
  el.className = 'viewer';
  el.innerHTML = `<img src="${url}">
    <div style="margin-top:14px;font-weight:700;font-size:18px">${esc(p.subject || 'סיכום')}</div>
    <div class="sub">${esc(p.date.split('-').reverse().join('/'))}${p.note ? ' · ' + esc(p.note) : ''}</div>
    <div class="row" style="margin-top:12px">
      <button class="btn" style="margin:0;flex:1" id="v-share">שיתוף</button>
      <button class="btn soft" style="margin:0;width:auto" id="v-del">מחיקה</button>
      <button class="btn soft" style="margin:0;width:auto" id="v-close">סגירה</button>
    </div>`;
  document.body.appendChild(el);
  const close = () => { URL.revokeObjectURL(url); el.remove(); };
  el.querySelector('#v-close').onclick = close;
  el.querySelector('#v-del').onclick = async () => {
    if (!confirm('למחוק את התמונה?')) return;
    await reqDone((await photoStore('readwrite')).delete(id));
    close(); renderJournal();
  };
  el.querySelector('#v-share').onclick = async () => {
    const file = new File([p.blob], `${p.subject || 'summary'}-${p.date}.jpg`, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: p.subject }).catch(() => {});
    else toast('אין אפשרות שיתוף בדפדפן הזה');
  };
}

// Subjects for summaries come from the learning tasks in the schedule
function subjects() {
  const names = state.tasks.filter(t => LEARNING.test(t.name)).map(t => splitIcon(t.name)[1]);
  return [...new Set(names), 'אחר'];
}

function moveDay(n) {
  const d = addDays(parseKey(journalDay), n);
  if (dateKey(d) > todayKey()) return;
  journalDay = dateKey(d); renderJournal();
}

async function renderJournal() {
  const isToday = journalDay === todayKey();
  const label = parseKey(journalDay).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  const list = goodThings(journalDay);
  const hints = ['משהו קטן שהצליח', 'מישהו שעשה לי טוב', 'משהו שלמדתי', 'רגע שנהניתי בו', 'משהו שאני גאה בו'];
  $('tab-journal').innerHTML = `<h1>יומן</h1>
    <div class="daynav">
      <button class="round" onclick="moveDay(-1)">→</button>
      <b>${isToday ? 'היום · ' : ''}${label}</b>
      <button class="round" onclick="moveDay(1)" ${isToday ? 'disabled style="opacity:.3"' : ''}>←</button>
    </div>
    <h2>5 דברים טובים שקרו ${isToday ? 'היום' : 'ביום הזה'}</h2>
    ${list.map((v, i) => `<div class="good"><span>${i + 1}</span>
      <input value="${esc(v)}" placeholder="${hints[i]}" oninput="setGood(${i}, this.value)"></div>`).join('')}
    <h2>סיכומים</h2>
    <select id="photo-subject" style="width:100%">${subjects().map(n => `<option>${esc(n)}</option>`).join('')}</select>
    <input id="photo-note" placeholder="הערה (לא חובה), למשל: פרק ז'" style="width:100%;margin-top:8px">
    <label class="btn accent">📷 לצלם / להעלות סיכום
      <input type="file" accept="image/*" multiple hidden onchange="addPhotos([...this.files])">
    </label>
    <div class="pills" id="photo-chips"></div>
    <div class="gallery" id="photo-grid"></div>`;

  let photos = [];
  try { photos = await allPhotos(); } catch (e) {}
  if (currentTab !== 'journal') return;
  photoUrls.forEach(u => URL.revokeObjectURL(u)); photoUrls = [];
  const used = [...new Set(photos.map(p => p.subject))];
  $('photo-chips').innerHTML = photos.length ? ['', ...used].map(s =>
    `<button class="pill ${s === photoFilter ? 'on' : ''}" data-s="${esc(s)}" onclick="photoFilter=this.dataset.s;renderJournal()">${s ? esc(s) : 'הכל'}</button>`).join('') : '';
  const shown = photos.filter(p => !photoFilter || p.subject === photoFilter).sort((a, b) => b.created - a.created);
  $('photo-grid').innerHTML = shown.length ? shown.map(p => {
    const u = URL.createObjectURL(p.blob); photoUrls.push(u);
    return `<div onclick="openPhoto(${p.id})"><img src="${u}" loading="lazy"><small>${esc(p.subject)} · ${p.date.slice(5).split('-').reverse().join('/')}</small></div>`;
  }).join('') : '<p class="sub" style="grid-column:1/-1;margin:0">עוד אין סיכומים. מצלמים דף אחרי חברותא או שיעור, והוא נשמר כאן לפי נושא.</p>';
}

// ---------- Tabs ----------
let currentTab = 'home';
function render() {
  if (currentTab === 'home') renderHome();
  if (currentTab === 'journal') renderJournal();
  if (currentTab === 'stats') renderStats();
  if (currentTab === 'rewards') renderRewards();
  if (currentTab === 'settings') renderSettings();
}
function showTab(name) {
  currentTab = name;
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x.dataset.tab === name));
  document.querySelectorAll('section').forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + name));
  report = [];
  render();
  scrollTo(0, 0);
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

let toastTimer;
function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  document.body.appendChild(el);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 2400);
}

async function askNotify() {
  const r = await Notification.requestPermission();
  toast(r === 'granted' ? 'התראות הופעלו 🔔' : 'ההתראות חסומות — אפשר לאשר בהגדרות הטלפון');
  render();
}

// ---------- Start ----------
navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
evaluatePastDays();
render();
checkReminders();
setInterval(() => {
  evaluatePastDays();
  checkReminders();
  // Keep the "now" card fresh, but never while typing or inside a sheet
  if (currentTab === 'home' && !$('sheet')) renderHome();
}, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  evaluatePastDays(); checkReminders();
  if (currentTab !== 'journal' && !$('sheet')) render();
});
