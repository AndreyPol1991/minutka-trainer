/* День 4 · Четверг. Топик и партиции: Kafka или RabbitMQ, ключ сообщения, число партиций, группа консюмеров.
   Ключ преподавателя — _dev/key/40-topic.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'topic';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .tp-parts{display:grid;gap:5px}
  .tp-p{display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:center}
  .tp-p>span{font:600 11px var(--f-mono);color:var(--text-muted)}
  .tp-lane{display:flex;gap:4px;flex-wrap:wrap;min-height:28px;padding:4px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);min-width:0}
  .tp-ev{font:600 11px/1 var(--f-mono);padding:5px 6px;border-radius:6px;color:#0b0f14}
  .tp-ev.o1{background:#6ee7ff}.tp-ev.o2{background:#f0abfc}.tp-ev.o3{background:#fbbf24}.tp-ev.o4{background:#86efac}
  .tp-load{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;align-items:end;height:90px;margin-top:8px}
  .tp-load div{background:var(--accent);border-radius:5px 5px 0 0;position:relative;min-height:2px}
  .tp-load div.hot{background:var(--bad)}
  .tp-load div span{position:absolute;top:-16px;left:0;right:0;text-align:center;font:600 10px var(--f-mono);color:var(--text-2)}
  .tp-grp{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
  .tp-c{border:1px solid var(--border);border-radius:9px;padding:6px 8px;background:var(--surface-2);font-size:12px;min-width:0}
  .tp-c b{display:block;font-size:12px}.tp-c.idle{opacity:.45;border-style:dashed}
  .tp-c .ps{font:600 10.5px var(--f-mono);color:var(--accent)}
  .tp-big{font:700 24px/1.1 var(--f-brand)}
  .tp-num{display:grid;grid-template-columns:minmax(0,1fr) 140px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--border)}
  .tp-num input{width:100%}.tp-num.ok input{border-color:var(--ok)}.tp-num.bad input{border-color:var(--bad)}
  @media (max-width:520px){.tp-num{grid-template-columns:minmax(0,1fr)}.tp-load{height:70px}}
  </style>`);

  const NP = 6;
  const part = key => TR.hash(String(key)) % NP;

  // =====================================================================
  // Теория 1. Ключ решает, куда ляжет событие
  const STREAM = [];
  [[1, 'Москва'], [2, 'Москва'], [3, 'Казань'], [4, 'Москва']].forEach(([o, city]) => ['создан', 'оплачен', 'доставлен'].forEach((st, k) => STREAM.push({ o, city, st, k, n: STREAM.length })));
  const STREAM_T = STREAM.slice().sort((a, b) => a.k - b.k || a.o - b.o);
  const KEYS = [
    { v: 'none', t: 'Без ключа' }, { v: 'order', t: 'order_id' }, { v: 'city', t: 'city' }, { v: 'status', t: 'status' }
  ];
  const keyOf = (k, e, i) => k === 'none' ? 'rr' + i : k === 'order' ? 'order-' + e.o : k === 'city' ? e.city : e.st;
  const howKey = {
    id: 'how-key', title: 'Как это работает: ключ решает, в какую партицию ляжет событие', covers: ['key'], free: true, noReset: true,
    simple: { icon: '🗂️', plain: 'Топик в Kafka разрезан на партиции — параллельные ленты. Порядок есть только внутри одной ленты. Куда положить событие, Kafka решает по ключу: одинаковый ключ — всегда одна и та же лента.', analogy: 'Шесть окошек на почте. Если все письма одного адресата всегда идут в одно окошко, они уйдут в том порядке, в каком пришли. Если раскидывать по свободным окошкам — второе письмо может уйти раньше первого.', tech: 'Партиция выбирается как hash(key) mod число_партиций. Kafka гарантирует порядок только внутри партиции. Без ключа сообщения распределяются по партициям (round-robin или «липкий» распределитель), и порядок между ними не гарантирован.' },
    lead: ui.brief({ situation: 'Четыре заказа, у каждого три события. Три заказа из Москвы, один из Казани. В топике шесть партиций, их читают параллельно.', todo: ['Выбирайте ключ и смотрите, куда легли события и не обгоняют ли друг друга события одного заказа.', 'Ниже — нагрузка на партиции, когда 80 % заказов из Москвы.'], look: 'Цвет — заказ. Хороший ключ: все события одного заказа в одной ленте, а ленты нагружены ровно.' }),
    render(el, ctx) {
      const a = ctx.ans; a.k = a.k || 'none';
      const lanes = Array.from({ length: NP }, () => []);
      STREAM_T.forEach((e, i) => lanes[part(keyOf(a.k, e, i))].push(e));
      const broken = [1, 2, 3, 4].filter(o => new Set(lanes.map((l, p) => l.some(e => e.o === o) ? p : -1).filter(p => p >= 0)).size > 1);
      // нагрузка: 1000 заказов, 80 % Москва
      const load = new Array(NP).fill(0);
      for (let i = 0; i < 1000; i++) { const city = i % 10 < 8 ? 'Москва' : 'Казань'; const e = { o: 1000 + i, city, st: ['создан', 'оплачен', 'доставлен'][i % 3] }; load[part(keyOf(a.k, e, i))]++; }
      const max = Math.max(...load), used = load.filter(x => x).length;
      el.innerHTML = `<div class="stack">${ui.seg('k', KEYS, a.k)}
        <div class="tp-parts">${lanes.map((l, p) => `<div class="tp-p"><span>P${p}</span><div class="tp-lane">${l.map(e => `<span class="tp-ev o${e.o}">#${e.o} ${esc(e.st)}</span>`).join('')}</div></div>`).join('')}</div>
        ${broken.length ? ui.note('bad', 'Порядок не гарантирован', `События ${broken.map(o => '#' + o).join(', ')} лежат в разных партициях. Их читают параллельно — «доставлен» может прийти раньше «оплачен».`) : ui.note('ok', 'Порядок внутри заказа сохранён', 'Все события каждого заказа лежат в одной партиции и читаются по очереди.')}
        <div><div class="small">Нагрузка на партиции, 1 000 заказов (80 % — Москва):</div>
        <div class="tp-load">${load.map(x => `<div class="${x > 1000 / NP * 2 ? 'hot' : ''}" style="height:${(x / max * 100).toFixed(0)}%"><span>${x}</span></div>`).join('')}</div>
        <p class="small">${used < NP ? `Работают ${used} партиции из ${NP}. ` : ''}${max > 1000 / NP * 2 ? 'Есть горячая партиция: её консюмер захлебнётся, остальные скучают.' : 'Нагрузка распределена ровно.'}</p></div></div>`;
      ui.onSeg(el, (n, v) => { a.k = v; a.seen = Object.assign(a.seen || {}, { [v]: 1 }); ctx.save(); ctx.rerender(); });
      if (ctx.readonly || Object.keys(a.seen || {}).length >= 3) ctx.ready();
    }
  };

  // =====================================================================
  // Теория 2. Группа консюмеров
  const howGroup = {
    id: 'how-group', title: 'Как это работает: группа консюмеров и потолок параллелизма', covers: ['parts', 'idle'], free: true, noReset: true,
    simple: { icon: '👥', plain: 'Консюмеры одного сервиса объединяются в группу и делят партиции топика между собой: каждую партицию читает ровно один консюмер группы. Поэтому консюмеров, которые реально работают, не больше, чем партиций.', analogy: 'Шесть касс и десять кассиров: работают шестеро, четверо стоят без дела. Чтобы работали все десять, нужны новые кассы, а не новые кассиры.', tech: 'Consumer group в Kafka: партиции топика распределяются между участниками группы, одна партиция — одному участнику. Параллелизм группы ограничен числом партиций. У каждой группы свой офсет — разные сервисы читают топик независимо.' },
    lead: ui.brief({ situation: 'Топик на 12 партиций. Один экземпляр бонусов обрабатывает 15 сообщений в секунду. В пик приходит 120 сообщений в секунду.', todo: ['Двигайте число консюмеров группы бонусов и смотрите, кто работает и успевает ли группа.'], look: 'Обратите внимание на консюмеров сверх двенадцати.' }),
    render(el, ctx) {
      const a = ctx.ans; a.c = a.c || 4;
      const P = 12, rate = 15, need = 120;
      const working = Math.min(a.c, P), cap = working * rate;
      const cons = Array.from({ length: a.c }, (_, i) => { const ps = []; for (let p = 0; p < P; p++) if (p % working === i && i < working) ps.push(p); return ps; });
      el.innerHTML = `<div class="stack"><label class="field"><span>Консюмеров в группе bonus-service: <b class="tnum">${a.c}</b></span><input type="range" min="1" max="20" value="${a.c}" data-c ${ctx.readonly ? 'disabled' : ''}></label>
        <div class="tp-grp">${cons.map((ps, i) => `<div class="tp-c ${ps.length ? '' : 'idle'}"><b>bonus-${i + 1}</b><span class="ps">${ps.length ? 'P' + ps.join(', P') : 'простаивает'}</span></div>`).join('')}</div>
        <div class="row between"><span>Группа успевает: <b class="tnum">${cap}</b> из ${need} сообщ./с</span><span class="tp-big tnum" style="color:${cap >= need ? 'var(--ok)' : 'var(--bad)'}">${cap >= need ? 'успевает' : 'лаг +' + (need - cap) + '/с'}</span></div>
        <p class="small">${a.c > P ? `${a.c - P} консюмеров простаивают: партиций всего ${P}. Добавлять консюмеров бесполезно — нужны партиции.` : cap < need ? 'Не успевает: каждую секунду очередь непрочитанного растёт.' : 'Хватает. Запас нужен на пик сильнее ожидаемого и на падение экземпляра.'}</p></div>`;
      el.addEventListener('input', e => { if (e.target.matches('[data-c]')) { a.c = +e.target.value; ctx.save(); ctx.rerender(); if (a.c > P) ctx.ready(); } });
      if (ctx.readonly || a.c > P) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Инструменты
  const FLOWS = [
    { id: 'f1', t: 'События жизни заказа: читают склад, бонусы, пуши, аналитика; аналитика перечитывает 14 дней', ok: 'kafka', because: 'Одно событие нужно многим, а аналитика перечитывает 14 дней — это журнал: Kafka хранит события по сроку, и каждая группа читает со своей закладки.' },
    { id: 'f2', t: 'Задания сборщикам: одно задание — одному, срочные заказы вперёд', ok: 'rabbit', because: 'Задание — одному свободному исполнителю, срочные вперёд: очередь RabbitMQ раздаёт сообщения поштучно и умеет приоритеты.' },
    { id: 'f3', t: 'Предложение заказа курьеру: 20 секунд на принятие, потом — другому', ok: 'rabbit', because: 'Предложение живёт 20 секунд и уходит другому, если курьер не принял: время жизни сообщения и повторная выдача — свойства очереди.' },
    { id: 'f4', t: 'Проверка промокода при оформлении', ok: 'rest', because: 'Клиент ждёт пересчёт цены на экране — нужен синхронный ответ. Брокер здесь только добавит ожидание.' }
  ];
  const TOOLS = [
    { v: 'kafka', t: 'Kafka — журнал событий' }, { v: 'rabbit', t: 'RabbitMQ — очередь заданий' }, { v: 'rest', t: 'REST — синхронный запрос' },
    { v: 'redis', t: 'Redis Pub/Sub' }, { v: 'table', t: 'Общая таблица в базе' }
  ];
  const TOOL_WHY = {
    redis: 'Redis Pub/Sub не хранит сообщения: кто не был подключён в момент публикации — пропустил навсегда',
    table: 'общую таблицу разобрали во вторник: чужая схема как контракт и нагрузка опросом',
    f1: { rabbit: 'из очереди сообщение уходит одному и удаляется — аналитике нечего будет перечитывать', rest: 'это снова цепочка звонков пятницы' },
    f2: { kafka: 'Kafka не умеет приоритеты внутри партиции и не раздаёт сообщения поштучно свободным исполнителям', rest: 'склад не должен ждать каждого сборщика' },
    f3: { kafka: 'нужен срок жизни сообщения 20 секунд и передача другому — это свойства очереди', rest: 'диспетчерская не должна висеть на линии с курьером' },
    f4: { kafka: 'клиент ждёт ответа сейчас', rabbit: 'клиент ждёт ответа сейчас' }
  };
  const tools = {
    id: 'tools', title: 'Разложите потоки по инструментам',
    lead: ui.brief({ situation: 'Четверг. Гоша: «Теперь можно говорить названиями. Что куда?»', todo: ['Для каждого потока выберите инструмент. Два варианта лишние.', 'Нажмите «Проверить». Засчитывается, когда всё верно.'], look: 'Kafka — журнал: сообщение остаётся, у каждой группы свой офсет, порядок в партиции. RabbitMQ — очередь: задача одному, подтверждение, приоритеты, срок жизни сообщения.' }),
    blank: () => ({ m: {} }),
    reference: () => ({ m: Object.fromEntries(FLOWS.map(f => [f.id, f.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || {};
      let rv = null;
      if (ctx.result || ctx.readonly) { rv = {}; FLOWS.forEach(f => { const g = a.m[f.id]; if (g) rv[f.id] = { s: g === f.ok ? 'ok' : 'bad', why: g === f.ok || ctx.readonly ? '' : 'Нет: ' + (TOOL_WHY[g] && typeof TOOL_WHY[g] === 'string' ? TOOL_WHY[g] : (TOOL_WHY[f.id][g] || 'подумайте о свойствах инструмента')) + '.' }; }); }
      ui.match(el, { rows: FLOWS.map(f => ({ id: f.id, t: esc(f.t) })), choices: TOOLS, value: a.m, reveal: rv, readonly: ctx.readonly, placeholder: 'Инструмент…', onChange: v => { a.m = v; ctx.save(); } });
    },
    check(ans) {
      const m = ans.m || {}, good = FLOWS.filter(f => m[f.id] === f.ok).length;
      const notes = FLOWS.filter(f => m[f.id] && m[f.id] !== f.ok).map(f => { const g = m[f.id]; return { ok: false, html: `${esc(f.t.split(':')[0])}: ${esc(typeof TOOL_WHY[g] === 'string' ? TOOL_WHY[g] : (TOOL_WHY[f.id][g] || 'не сходится'))}.` }; });
      return { ok: good === FLOWS.length, score: good / FLOWS.length, notes, summary: `Верно ${good} из ${FLOWS.length}.` };
    },
    answers: ans => ui.matchAnswers(FLOWS, TOOLS, ans.m, (r, g) => { const w = typeof TOOL_WHY[g] === 'string' ? TOOL_WHY[g] : (TOOL_WHY[r.id] || {})[g]; return w ? 'Не то: ' + w + '.' : ''; }),
    explain: `${ui.table(['Поток', 'Инструмент', 'Почему'], [['События заказа', 'Kafka', 'журнал: хранится по сроку, у каждой группы свой офсет, порядок в партиции, перечитывание'], ['Задания сборщикам', 'RabbitMQ', 'задача одному, подтверждение, приоритеты'], ['Предложение курьеру', 'RabbitMQ', 'срок жизни сообщения (TTL) 20 с и передача другому'], ['Промокод', 'REST', 'ответ нужен сейчас']])}<p>Два брокера в одной системе — нормально: у них разная работа. Kafka — «что случилось», RabbitMQ — «что сделать».</p>`,
    report: ans => FLOWS.map(f => `- ${f.t.split(':')[0]} → ${((TOOLS.find(x => x.v === (ans.m || {})[f.id]) || {}).t) || '—'} ${(ans.m || {})[f.id] === f.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 2. Ключ
  const KEY_OPTS = [
    { t: '<code>order_id</code> — номер заказа', ok: true, why: 'Да: все события заказа в одной партиции, порядок внутри заказа сохранён, заказов много — нагрузка ровная.', because: 'Порядок Kafka держит только внутри партиции, а партицию выбирает ключ: одинаковый ключ — одна партиция. С ключом order_id все события заказа идут по порядку, а заказов тысячи — нагрузка ложится на все партиции ровно.' },
    { t: 'Без ключа', why: 'События одного заказа разъедутся по партициям и будут обгонять друг друга — ровно то, чего боится Лена.' },
    { t: '<code>city</code> — город', why: 'Горячий ключ: Москва — 80 %, работают две партиции из двенадцати.' },
    { t: '<code>status</code> — статус', why: '«Оплачен» и «доставлен» одного заказа попадут в разные партиции — порядок внутри заказа ломается.' },
    { t: '<code>event_id</code> — номер события', why: 'Он уникален у каждого события — это то же самое, что без ключа.' }
  ];
  const key = {
    id: 'key', title: 'Выберите ключ сообщения для order.events',
    lead: ui.brief({ situation: 'Гоша открывает конфиг продюсера: «Ключ?» Вспомните, что Лена говорила про порядок, и сколько заказов из Москвы.', todo: ['Выберите ключ.', 'Нажмите «Проверить».'], look: 'Лаборатория «Ключ решает, в какую партицию ляжет событие». Нужно и сохранить порядок, и не перегрузить одну партицию.' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { ui.quiz(el, { q: 'Какой ключ у сообщений топика order.events?', options: KEY_OPTS, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'tp-key', onChange: v => { ctx.ans.q = v; ctx.save(); ctx.decide('Ключ order.events', KEY_OPTS[v[0]].t.replace(/<[^>]+>/g, '')); } }); },
    check(ans) { const r = ui.quizScore({ options: KEY_OPTS }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !KEY_OPTS[i].ok ? [{ ok: false, html: KEY_OPTS[i].why }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    flags: ans => { const i = (ans.q || [])[0]; return i == null || i === 0 ? [] : [i === 1 ? 'Не задал ключ' : 'Выбрал ключ с перекосом или ломающий порядок: ' + KEY_OPTS[i].t.replace(/<[^>]+>/g, '')]; },
    answers: ans => ui.quizAnswers('Какой ключ у сообщений топика order.events?', KEY_OPTS, ans.q),
    explain: '<p>Ключ <code>order_id</code>: одинаковый заказ — одна партиция — порядок «создан → оплачен → доставлен» сохраняется. Заказов десятки тысяч, хэш раскладывает их ровно. Важно: порядок гарантирован <b>внутри заказа</b>, а не между заказами — и Лене этого достаточно. Этот ключ завтра окажется в конфиге продюсера.</p>',
    report: ans => (ans.q || []).length ? KEY_OPTS[ans.q[0]].t.replace(/<[^>]+>/g, '') : '—'
  };

  // =====================================================================
  // Практика 3. Число партиций
  const parseNum = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'); return s === '' ? NaN : +s; };
  const PN = [
    { id: 'rate', t: 'Сообщений в секунду в пик', ok: 120 },
    { id: 'cons', t: 'Сколько экземпляров бонусов нужно, чтобы успевать', ok: 8 },
    { id: 'parts', t: 'Сколько партиций заложить с запасом × 1,5', ok: 12 }
  ];
  const parts = {
    id: 'parts', title: 'Посчитайте число партиций',
    lead: ui.brief({
      situation: 'Цифры: пик — 1 200 заказов в минуту, ~6 событий на заказ (из понедельника). Один экземпляр бонусов обрабатывает 15 сообщений в секунду. Запас — × 1,5 на рост и падение экземпляра.',
      todo: ['Посчитайте три числа по порядку.', 'Нажмите «Проверить». Засчитывается, когда все три верны.'],
      look: 'Партиций должно быть не меньше, чем консюмеров, которым надо работать параллельно. Добавить партиции потом можно, но ключи «переедут» в другие партиции, и порядок на переходе сломается — поэтому считают заранее.'
    }),
    blank: () => ({ n: {} }),
    reference: () => ({ n: { rate: '120', cons: '8', parts: '12' } }),
    render(el, ctx) {
      const a = ctx.ans; a.n = a.n || {};
      const judged = !!(ctx.result || ctx.readonly);
      const mon = TR.S().stages.ask && TR.S().stages.ask.tasks && TR.S().stages.ask.tasks.load && TR.S().stages.ask.tasks.load.ans;
      el.innerHTML = `<div class="stack">${mon && mon.n && mon.n.peak && !ctx.readonly ? ui.note('info', 'Из понедельника', `Ваш расчёт пика: <b>${esc(mon.n.peak)}</b> сообщений в секунду.`) : ''}
        <div>${PN.map(r => { const v = parseNum(a.n[r.id]); const st = judged && a.n[r.id] ? (v === r.ok ? 'ok' : 'bad') : ''; return `<div class="tp-num ${st}"><label for="tp-${r.id}">${esc(r.t)}</label><input id="tp-${r.id}" type="text" inputmode="numeric" value="${esc(a.n[r.id] || '')}" data-n="${r.id}" ${ctx.readonly ? 'readonly' : ''} placeholder="число"></div>`; }).join('')}</div></div>`;
      el.addEventListener('input', e => { const k = e.target.dataset.n; if (!k) return; a.n[k] = e.target.value; ctx.save(); });
    },
    check(ans) {
      const n = ans.n || {}, res = PN.map(r => parseNum(n[r.id]) === r.ok), notes = [];
      if (!res[0]) notes.push({ ok: false, html: 'Пик: заказов в минуту × событий на заказ ÷ 60.' });
      if (!res[1]) notes.push({ ok: false, html: parseNum(n.cons) === 7 ? 'Округляйте вверх: 7 экземпляров не успеют.' : 'Экземпляров: сообщений в секунду ÷ сколько обрабатывает один.' });
      if (!res[2]) notes.push({ ok: false, html: parseNum(n.parts) === 3 || parseNum(n.parts) === 1 ? 'Партиции не считают «по числу брокеров» или «одну ради порядка». Считают от параллелизма консюмеров.' : 'Партиций: экземпляров × запас 1,5.' });
      return { ok: res.every(Boolean), score: res.filter(Boolean).length / 3, notes, summary: res.every(Boolean) ? '120 → 8 → 12.' : `Верно ${res.filter(Boolean).length} из 3.` };
    },
    flags: ans => { const p = parseNum((ans.n || {}).parts); return p === 1 ? ['Одна партиция «ради порядка»'] : p === 3 ? ['Партиции «по числу брокеров»'] : []; },
    answers: ans => {
      const n = ans.n || {};
      const HOW = {
        rate: '1 200 заказов в минуту × 6 событий ÷ 60 секунд = 120 сообщений в секунду — тот же пик, что в понедельник.',
        cons: '120 ÷ 15 сообщений в секунду на экземпляр = 8. Округляют вверх: семь не успеют, и очередь начнёт копиться.',
        parts: '8 × 1,5 = 12. В группе одну партицию читает один консюмер, поэтому партиций нужно не меньше, чем экземпляров, и с запасом — на рост и на случай, когда экземпляр падает. Добавлять партиции потом дорого: ключи переедут, и порядок на переходе сломается.'
      };
      return PN.map(r => ({ q: r.t, mine: n[r.id] || '', right: String(r.ok), ok: parseNum(n[r.id]) === r.ok, why: HOW[r.id] }));
    },
    explain: '<p>1 200 × 6 ÷ 60 = <b>120</b> сообщений в секунду. 120 ÷ 15 = <b>8</b> экземпляров бонусов. 8 × 1,5 = <b>12</b> партиций. Двенадцать — это и потолок параллелизма: тринадцатый консюмер в группе будет простаивать.</p><p>Красные флаги: «партиций по числу брокеров» (брокеров три — это про надёжность, а не про параллелизм), «одна партиция ради порядка» (порядок нужен внутри заказа, а не глобально — его даёт ключ).</p>',
    report: ans => `пик ${(ans.n || {}).rate || '—'} → экземпляров ${(ans.n || {}).cons || '—'} → партиций ${(ans.n || {}).parts || '—'}`
  };

  // =====================================================================
  // Практика 4. 20 консюмеров на 12 партиций
  const IDLE = [
    { t: 'Работают 12, восемь простаивают', ok: true, why: 'Да: одна партиция — одному консюмеру группы. Потолок параллелизма — число партиций.', because: 'В группе консюмеров одну партицию читает ровно один экземпляр — так Kafka сохраняет порядок. Партиций 12, значит одновременно работают 12, а остальные 8 ждут в резерве и подхватят партицию, если кто-то упадёт. Потолок параллелизма — число партиций.' },
    { t: 'Работают все 20, каждый читает часть партиции', why: 'Партицию в группе читает ровно один консюмер — делить её нельзя.' },
    { t: 'Работают 20: восемь партиций читают по двое', why: 'Двое в одной группе не читают одну партицию — иначе ломался бы порядок.' },
    { t: 'Kafka автоматически создаст ещё 8 партиций', why: 'Нет: число партиций задают явно, и увеличивать его — решение с последствиями для порядка.' }
  ];
  const idle = {
    id: 'idle', title: 'Разработчик бонусов поднял 20 экземпляров',
    lead: ui.brief({ situation: 'Дежурный в чате: «Бонусы отстают, я поднял 20 экземпляров вместо 8. Теперь точно успеем». Партиций — 12.', todo: ['Выберите, что произойдёт.', 'Нажмите «Проверить».'], look: 'Лаборатория «Группа консюмеров и потолок параллелизма».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { ui.quiz(el, { q: 'Что будет с 20 экземплярами в группе на топике из 12 партиций?', options: IDLE, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'tp-idle', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: IDLE }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !IDLE[i].ok ? [{ ok: false, html: esc(IDLE[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    flags: ans => { const i = (ans.q || [])[0]; return i != null && i !== 0 ? ['Лечит лаг консюмерами сверх числа партиций'] : []; },
    answers: ans => ui.quizAnswers('Что будет с 20 экземплярами в группе на топике из 12 партиций?', IDLE, ans.q),
    explain: '<p>Двенадцать работают, восемь простаивают и только добавляют ребалансов при каждом перезапуске. Если отставание не уходит при 12 консюмерах, лечат не числом экземпляров, а скоростью обработки (пачки, быстрее внешний вызов) или — заранее и в спокойное время — числом партиций. Разберём в воскресенье на нагрузочном тесте.</p>',
    report: ans => (ans.q || []).length ? IDLE[ans.q[0]].t : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 2, order: 40, slot: 'Чт 10:00', title: 'Топик, ключ и партиции',
    when: 'четверг, 10:00 · рядом с Гошей за его монитором',
    intro: [
      { who: 'gosha', html: 'Сегодня называем инструменты и считаем. Две ошибки, которые я вижу чаще всего: событие без ключа и «партиций — по числу брокеров». После сегодняшнего дня ты так не скажешь.' }
    ],
    facts: ['F-peak', 'F-order', 'F-daily', 'F-history'],
    glossary: [
      { term: 'Партиция', simple: 'Одна из параллельных лент топика. Порядок есть только внутри ленты.', tech: 'Упорядоченный неизменяемый журнал внутри топика Kafka. Единица параллелизма и порядка; хранится на брокере-лидере и репликах.' },
      { term: 'Ключ сообщения', simple: 'Ярлык, по которому Kafka выбирает ленту: одинаковый ярлык — одна лента.', tech: 'Поле сообщения, по хэшу которого продюсер выбирает партицию. Сообщения с одним ключом попадают в одну партицию и сохраняют порядок.' },
      { term: 'Горячий ключ', simple: 'Ключ, на который приходится львиная доля сообщений: одна лента перегружена, остальные скучают.', tech: 'Перекос распределения: значение ключа с непропорционально большой долей трафика. Ограничивает пропускную способность одной партицией.' },
      { term: 'Офсет (смещение)', simple: 'Закладка: до какого места группа дочитала ленту.', tech: 'Порядковый номер сообщения в партиции. Группа консюмеров хранит закоммиченный офсет — с него продолжает чтение после перезапуска.' },
      { term: 'Группа консюмеров', simple: 'Все экземпляры одного сервиса, которые вместе читают топик и делят ленты.', tech: 'Consumer group: партиции распределяются между участниками, одна партиция — одному участнику. У каждой группы свой офсет.' },
      { term: 'Ребаланс', simple: 'Перераздача лент, когда консюмер ушёл или пришёл. Пока она идёт, группа не читает.', tech: 'Перераспределение партиций между участниками группы при изменении её состава. Во время ребаланса чтение приостанавливается.' },
      { term: 'Kafka', simple: 'Журнал событий: всё записанное лежит по сроку, каждый читатель читает со своей закладки.', tech: 'Распределённая платформа потоковой передачи: топики из партиций, хранение по сроку (retention), группы консюмеров со своими офсетами.' },
      { term: 'RabbitMQ', simple: 'Почтовое отделение с очередями заданий: каждое задание — одному исполнителю.', tech: 'Брокер сообщений на протоколе AMQP: обменники (exchanges), очереди, подтверждения, приоритеты, TTL, dead-letter-обменники.' }
    ],
    outro: 'Kafka для событий, RabbitMQ для заданий, ключ <code>order_id</code>, 12 партиций. Завтра — самое коварное: как ничего не потерять и не начислить дважды.',
    tasks: [tools, howKey, key, howGroup, parts, idle]
  });
})();
