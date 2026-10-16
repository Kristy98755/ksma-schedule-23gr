// quiz state API — KV: seat:0 .. seat:12
const SEATS = 13;
const STALE_MS = 45000;
const MAX_Q = 20;   // вопросов в тесте
const MAX_GID = 99; // верхняя граница глобального id в банке (сейчас 0..76)
// точечная амнистия: Луиза #08, Нуркыз #05, Владимир #12 — их результаты не сбрасывать FLUSH'ем
const PROTECTED = new Set([5, 8, 12]);

function key(i) { return 'seat:' + i; }
function valid(i) { return Number.isInteger(i) && i >= 0 && i < SEATS; }
function emptySeat() { return { occupied: 0, progress: 0, heartbeat: 0, answers: [], completed: null, lastKvPut: 0 }; }

// состояние живёт в памяти изолята (занятие — минуты; при cold start подтягивается из KV).
// KV — редкий best-effort дубль: дневной лимит записи (1000 put) не позволяет писать на каждый хартбит.
const mem = new Map();
const KV_PUT_EVERY_MS = 15000;

function sanitizeAnswers(a) {
  if (!Array.isArray(a)) return [];
  return a.slice(0, MAX_Q).filter(x => x && Number.isInteger(x.q) && x.q >= 0 && x.q < MAX_GID && Number.isInteger(x.c) && x.c >= -1 && x.c <= 3)
    .map(x => ({ q: x.q, c: x.c }));
}

async function getSeat(env, i) {
  let s = mem.get(key(i));
  if (!s) {
    const raw = await env.QUIZ.get(key(i));
    s = raw ? JSON.parse(raw) : emptySeat();
    if (s.lastKvPut === undefined) s.lastKvPut = 0;
    mem.set(key(i), s);
  }
  // ленивая чистка: занято и хартбит старше 45с -> полный сброс сессии (completed не трогаем)
  if (s.occupied && s.heartbeat && Date.now() - s.heartbeat > STALE_MS) {
    s.occupied = 0;
    s.progress = 0;
    s.heartbeat = 0;
    s.answers = [];
    await putSeat(env, i, s);
  }
  return s;
}
async function putSeat(env, i, s) {
  mem.set(key(i), s);
  if (Date.now() - (s.lastKvPut || 0) >= KV_PUT_EVERY_MS) {
    try {
      s.lastKvPut = Date.now();
      await env.QUIZ.put(key(i), JSON.stringify(s));
    } catch (e) {
      // дневной лимит KV-записей исчерпан — состояние держим в памяти, квиз не падает
    }
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (e) {
      return json({ error: String(e), stack: String(e && e.stack) }, 500);
    }
  }
};

async function route(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (!p.startsWith('/api/quiz/')) {
      if (p === '/quiz/status') {
        return env.ASSETS.fetch(new URL('/quiz/status.html', url.origin).toString());
      }
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    let body = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch (e) { body = {}; }
    }
    const idxRaw = body.i !== undefined && body.i !== null ? body.i : url.searchParams.get('i');
    const idx = parseInt(idxRaw, 10);

    switch (p) {
      case '/api/quiz/students': {
        const list = [];
        for (let i = 0; i < SEATS; i++) {
          const s = await getSeat(env, i);
          list.push({
            i,
            occupied: s.occupied,
            progress: s.progress,
            age: s.heartbeat ? Math.round((Date.now() - s.heartbeat) / 1000) : null,
            completed: !!s.completed
          });
        }
        return json({ students: list, now: Date.now() });
      }

      case '/api/quiz/start': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        if (s.occupied) return json({ error: 'occupied' }, 409);
        s.occupied = 1;
        s.progress = 0;
        s.heartbeat = Date.now();
        s.answers = [];
        await putSeat(env, idx, s);
        return json({ ok: true, progress: 0 });
      }

      case '/api/quiz/state': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        return json({
          occupied: s.occupied,
          progress: s.progress,
          age: s.heartbeat ? Math.round((Date.now() - s.heartbeat) / 1000) : null,
          answers: s.answers,
          completed: s.completed
        });
      }

      case '/api/quiz/heartbeat': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        if (!s.occupied) s.occupied = 1; // ре-клейм: сессия жива, клиент шлёт хартбит
        s.heartbeat = Date.now();
        if (Number.isInteger(body.done)) s.progress = Math.min(Math.max(body.done, 0), MAX_Q);
        if (Array.isArray(body.answers)) s.answers = sanitizeAnswers(body.answers);
        await putSeat(env, idx, s);
        return json({ ok: true, age: 0 });
      }

      case '/api/quiz/complete': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        const answers = sanitizeAnswers(body.answers);
        s.completed = { questions: answers.map(a => a.q), answers: answers.map(a => a.c), at: Date.now() };
        s.occupied = 0;
        s.progress = 0;
        s.heartbeat = 0;
        s.answers = [];
        await putSeat(env, idx, s);
        return json({ ok: true });
      }

      case '/api/quiz/release': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        s.occupied = 0;
        s.progress = 0;
        s.heartbeat = 0;
        s.answers = [];
        await putSeat(env, idx, s);
        return json({ ok: true });
      }

      case '/api/quiz/flush': {
        if (!valid(idx)) return json({ error: 'bad index' }, 400);
        const s = await getSeat(env, idx);
        if (PROTECTED.has(idx) && s.completed) {
          return json({ ok: true, protected: true });
        }
        s.completed = null;
        await putSeat(env, idx, s);
        return json({ ok: true });
      }

      case '/api/quiz/status': {
        const list = [];
        for (let i = 0; i < SEATS; i++) {
          const s = await getSeat(env, i);
          list.push({
            i,
            occupied: s.occupied,
            progress: s.progress,
            age: s.heartbeat ? Math.round((Date.now() - s.heartbeat) / 1000) : null,
            completed: s.completed
          });
        }
        return json({ students: list, now: Date.now() });
      }

      default:
        return json({ error: 'not found' }, 404);
    }
}
