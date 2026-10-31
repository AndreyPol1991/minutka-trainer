/* День 5 · Пятница. Ни потерять, ни задвоить: подтверждения записи, реплики, коммит офсета, идемпотентность получателя.
   Ключ преподавателя — _dev/key/50-guarantees.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'guarantees';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .gu-brokers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .gu-b{border:1px solid var(--border-strong);border-radius:10px;padding:10px;background:var(--surface-2);text-align:center;min-width:0}
  .gu-b b{display:block}.gu-b small{color:var(--text-muted);font-size:11.5px}
  .gu-b.off{opacity:.4;border-style:dashed}.gu-b.dead{border-color:var(--bad);background:var(--bad-soft)}
  .gu-b .msg{margin-top:6px;font:600 11px var(--f-mono)}
  .gu-res{font:700 22px/1.2 var(--f-brand);margin-top:4px}
  .gu-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
  .gu-steps{display:grid;gap:6px;counter-reset:s}
  .gu-step{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start;padding:8px 10px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}
  .gu-step::before{counter-increment:s;content:counter(s);font:700 12px var(--f-mono);color:var(--text-muted)}
  .gu-step.crash{border-color:var(--bad);background:var(--bad-soft)}.gu-step.skip{opacity:.4}
  .gu-cfg{display:grid;gap:4px}
  .gu-row{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}
  .gu-row code{font:600 13px var(--f-mono)}.gu-row small{display:block;color:var(--text-muted);font-size:12px}
  .gu-row.ok{border-color:var(--ok);background:var(--ok-soft)}.gu-row.bad{border-color:var(--bad);background:var(--bad-soft)}
  .gu-row .why{grid-column:1/-1;font-size:13px;color:var(--bad)}
  .gu-grp{font:600 11px var(--f-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-top:8px}
  @media (max-width:520px){.gu-row{grid-template-columns:minmax(0,1fr)}.gu-brokers{gap:4px}}
  </style>`);

  // =====================================================================
  // Теория 1. Подтверждение записи и реплики
  const howAcks = {
    id: 'how-acks', title: 'Как это работает: когда брокер говорит «записал» и что переживёт падение', covers: ['config'], free: true, noReset: true,
    simple: { icon: '🧾', plain: 'Каждая партиция хранится на нескольких брокерах: лидер и копии. Продюсер может считать запись сделанной, когда записал лидер — или когда записали и копии. Если лидер упадёт раньше, чем данные скопированы, они пропадут.', analogy: 'Вы отдали документ секретарю. «Принял» на словах — одно. «Принял, отксерокопировал и положил копию в сейф в соседнем здании» — другое. Пожар в приёмной переживёт только второй вариант.', tech: 'acks=0 — продюсер не ждёт подтверждения; acks=1 — подтверждает лидер; acks=all — подтверждают все реплики из ISR (in-sync replicas). min.insync.replicas — минимальный размер ISR, при котором запись с acks=all разрешена; иначе брокер отвечает NotEnoughReplicas.' },
    lead: ui.brief({ situation: 'Партиция на трёх брокерах: B1 — лидер, B2 и B3 — копии. Продюсер записывает «Заказ #1042 оплачен», получает «записал», и тут лидер падает.', todo: ['Выберите acks и min.insync.replicas.', 'Включайте «B3 на обслуживании» и «B2 отстал» и смотрите, что переживёт падение лидера.'], look: 'Три исхода: сообщение сохранилось, потерялось, или брокер отказался принимать запись — тогда продюсер знает об ошибке и повторит.' }),
    render(el, ctx) {
      const a = ctx.ans; a.acks = a.acks || '1'; a.min = a.min || '1'; a.maint = !!a.maint; a.lag = !!a.lag;
      const isr = ['B1'].concat(a.lag ? [] : ['B2'], a.maint ? [] : ['B3']);
      let res, kind, copies;
      if (a.acks === 'all' && isr.length < +a.min) { res = 'Запись остановлена'; kind = 'warn'; copies = []; }
      else {
        copies = a.acks === 'all' ? isr : ['B1'];
        const survives = copies.length > 1;
        res = survives ? 'Сообщение сохранилось' : 'Сообщение потеряно'; kind = survives ? 'ok' : 'bad';
        if (a.acks === '0') { res = 'Сообщение потеряно'; kind = 'bad'; copies = []; }
      }
      const B = ['B1', 'B2', 'B3'].map(b => {
        const off = (b === 'B3' && a.maint) || (b === 'B2' && a.lag);
        return `<div class="gu-b ${b === 'B1' ? 'dead' : off ? 'off' : ''}"><b>${b}</b><small>${b === 'B1' ? 'лидер · упал' : off ? (b === 'B3' ? 'на обслуживании' : 'отстал, вне ISR') : 'копия'}</small><div class="msg" style="color:${copies.includes(b) && b !== 'B1' ? 'var(--ok)' : 'var(--text-muted)'}">${copies.includes(b) ? '#1042 ✓' : '—'}</div></div>`;
      }).join('');
      const note = {
        '0': 'acks=0: продюсер даже не ждёт ответа. Сообщение может потеряться и без всякого падения.',
        '1': 'acks=1: «записал» говорит один лидер. Он упал до того, как копии успели скопировать, — оплаченный заказ исчез.',
        all: kind === 'warn' ? `В ISR осталось ${isr.length}, а min.insync.replicas = ${a.min}. Брокер отказал в записи, продюсер получил ошибку и повторит позже. Ничего не потеряно, но заказы не публикуются.` : isr.length === 1 ? 'acks=all, но в ISR остался только лидер, а min.insync.replicas = 1 — значит, acks=all превратился в acks=1.' : `acks=all: «записал» прозвучало после копирования на ${isr.length - 1} ${TR.plural(isr.length - 1, 'копию', 'копии', 'копий')}. Новый лидер выберется из них — сообщение на месте.`
      }[a.acks];
      el.innerHTML = `<div class="stack"><div class="gu-ctl">
        <div><div class="small">acks</div>${ui.seg('acks', [{ v: '0', t: '0' }, { v: '1', t: '1' }, { v: 'all', t: 'all' }], a.acks)}</div>
        <div><div class="small">min.insync.replicas</div>${ui.seg('min', [{ v: '1', t: '1' }, { v: '2', t: '2' }, { v: '3', t: '3' }], a.min)}</div></div>
        <div class="row"><label class="toggle"><input type="checkbox" data-t="maint" ${a.maint ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}> <span>B3 на обслуживании</span></label><label class="toggle"><input type="checkbox" data-t="lag" ${a.lag ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}> <span>B2 отстал</span></label></div>
        <div class="gu-brokers">${B}</div>
        <div class="gu-res" style="color:var(--${kind})">${res}</div><p class="small">${note}</p>
        ${a.acks === 'all' && a.min === '3' && !a.maint && !a.lag ? '<p class="small dim">Попробуйте теперь отправить B3 на обслуживание: при min.insync.replicas = 3 любой выключенный брокер останавливает запись.</p>' : ''}</div>`;
      ui.onSeg(el, (n, v) => { a[n] = v; ctx.save(); ctx.rerender(); });
      el.addEventListener('change', e => { const t = e.target.dataset.t; if (!t) return; a[t] = e.target.checked; a.tried = 1; ctx.save(); ctx.rerender(); });
      if (ctx.readonly || a.tried) ctx.ready();
    }
  };

  // =====================================================================
  // Теория 2. Когда коммитить офсет
  const howCommit = {
    id: 'how-commit', title: 'Как это работает: коммит офсета до или после обработки', covers: ['crash', 'idem'], free: true, noReset: true,
    simple: { icon: '🔖', plain: 'Консюмер читает сообщение, делает работу и ставит закладку «дочитал до сюда» — коммитит офсет. Если упасть между этими шагами, после перезапуска он продолжит с закладки. Закладка раньше работы — работа может потеряться. Закладка после — работа может повториться.', analogy: 'Вы читаете книгу вслух ребёнку. Если загнуть уголок до того, как прочитали страницу, а потом вас отвлекли, — страницу пропустите. Если загибать после — иногда прочитаете страницу дважды. Дважды — не страшно, если ребёнку не важно.', tech: 'Коммит до обработки — at most once (не больше одного раза, возможны потери). Коммит после — at least once (хотя бы один раз, возможны повторы). Exactly once на стороне внешней системы достигается at least once + идемпотентной обработкой. enable.auto.commit=true коммитит по таймеру, не зная, закончена ли обработка.' },
    lead: ui.brief({ situation: 'Консюмер бонусов получает «Заказ #1042 оплачен» и начисляет 120 баллов в CRM.', todo: ['Выберите порядок шагов и момент падения.', 'Включите «Бонусы идемпотентны» и посмотрите, что изменилось.'], look: 'Три исхода: начислено один раз, не начислено, начислено дважды.' }),
    render(el, ctx) {
      const a = ctx.ans; a.ord = a.ord || 'before'; a.crash = a.crash || 'mid'; a.idem = !!a.idem;
      const steps = a.ord === 'before' ? ['Прочитать сообщение', 'Закоммитить офсет', 'Начислить 120 баллов в CRM'] : ['Прочитать сообщение', 'Начислить 120 баллов в CRM', 'Закоммитить офсет'];
      // падение «между 2 и 3 шагом»
      let out, kind;
      if (a.crash === 'none') { out = 'Начислено один раз'; kind = 'ok'; }
      else if (a.ord === 'before') { out = 'Не начислено: закладка уже стоит после сообщения, повтора не будет'; kind = 'bad'; }
      else if (a.idem) { out = 'Начислено один раз: повтор пришёл, бонусы узнали event_id и пропустили'; kind = 'ok'; }
      else { out = 'Начислено дважды: 240 баллов вместо 120'; kind = 'bad'; }
      el.innerHTML = `<div class="stack"><div class="gu-ctl">
        <div><div class="small">Порядок</div>${ui.seg('ord', [{ v: 'before', t: 'Коммит → обработка' }, { v: 'after', t: 'Обработка → коммит' }], a.ord)}</div>
        <div><div class="small">Падение</div>${ui.seg('crash', [{ v: 'none', t: 'Без падения' }, { v: 'mid', t: 'Между шагами 2 и 3' }], a.crash)}</div></div>
        <label class="toggle"><input type="checkbox" data-idem ${a.idem ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}> <span>Бонусы идемпотентны (помнят обработанные event_id)</span></label>
        <div class="gu-steps">${steps.map((s, i) => `<div class="gu-step ${a.crash === 'mid' && i === 2 ? 'skip' : ''}">${esc(s)}${a.crash === 'mid' && i === 1 ? ' <b style="color:var(--bad)">— 💥 падение</b>' : ''}</div>`).join('')}
        ${a.crash === 'mid' ? `<div class="gu-step crash">Перезапуск: читаем с закоммиченного офсета → ${a.ord === 'before' ? 'следующее сообщение' : 'снова #1042'}</div>` : ''}</div>
        <div class="gu-res" style="color:var(--${kind})">${out}</div>
        <p class="small">${a.ord === 'before' ? 'Это at most once: не больше одного раза, но можно потерять.' : 'Это at least once: хотя бы один раз, но возможен повтор. «Ровно один раз» для начислений получается, только если сами бонусы узнают повтор.'}</p></div>`;
      ui.onSeg(el, (n, v) => { a[n] = v; a.tried = Object.assign(a.tried || {}, { [n + v]: 1 }); ctx.save(); ctx.rerender(); });
      el.addEventListener('change', e => { if (e.target.matches('[data-idem]')) { a.idem = e.target.checked; ctx.save(); ctx.rerender(); } });
      if (ctx.readonly || Object.keys(a.tried || {}).length >= 2) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Конфиг
  const CFG = [
    { g: 'Продюсер (сервис заказов)', id: 'key', t: 'key', sub: 'ключ сообщения', opts: ['order_id', 'без ключа', 'city', 'event_id'], ok: 'order_id', from: 'topic', why: { 'без ключа': 'события заказа обгонят друг друга', city: 'горячий ключ: Москва — 80 %', event_id: 'уникален у каждого события — то же, что без ключа' }, because: 'Ключ order_id кладёт все события заказа в одну партицию: порядок внутри заказа сохранён, нагрузка ровная.' },
    { g: 'Продюсер (сервис заказов)', id: 'acks', t: 'acks', sub: 'когда считать запись сделанной', opts: ['0', '1', 'all'], ok: 'all', crit: true, why: { 0: 'продюсер не ждёт ответа — потери без всякого падения', 1: 'лидер упал до копирования — оплаченный заказ исчез' }, because: 'acks=all — запись подтверждается, когда её получили все синхронные копии. Тогда падение лидера не теряет оплаченный заказ.' },
    { g: 'Продюсер (сервис заказов)', id: 'idem', t: 'enable.idempotence', sub: 'защита от дублей при повторной отправке', opts: ['true', 'false'], ok: 'true', why: { false: 'продюсер повторит отправку после таймаута — в топике появится дубль' }, because: 'Идемпотентный продюсер нумерует отправки, и брокер отбрасывает повтор после таймаута — дубль в топике не появится.' },
    { g: 'Топик order.events', id: 'parts', t: 'partitions', sub: 'число партиций', opts: ['3', '6', '12', '48'], ok: '12', from: 'topic', why: { 3: 'это «по числу брокеров» — потолок три консюмера', 6: 'потолок шесть консюмеров, а нужно восемь с запасом', 48: 'в четыре раза больше расчёта: лишние накладные расходы без пользы' }, because: '12 — из расчёта четверга: 8 экземпляров бонусов × 1,5 запаса. Партиций не меньше, чем консюмеров, которые работают параллельно.' },
    { g: 'Топик order.events', id: 'rf', t: 'replication.factor', sub: 'сколько копий у каждой партиции', opts: ['1', '2', '3'], ok: '3', why: { 1: 'один брокер упал — данных нет', 2: 'один брокер на обслуживании, второй может упасть — и копий не останется' }, because: 'Три копии: один брокер можно выключить на обслуживание, и даже если в это время упадёт второй, данные останутся.' },
    { g: 'Топик order.events', id: 'min', t: 'min.insync.replicas', sub: 'минимум живых копий для записи с acks=all', opts: ['1', '2', '3'], ok: '2', crit: true, why: { 1: 'acks=all превращается в acks=1, когда копии отстали', 3: 'любой выключенный брокер останавливает запись заказов' }, because: 'С acks=all запись идёт, пока живы хотя бы две копии. Так потеря одного брокера не останавливает заказы и не оставляет данные в единственной копии.' },
    { g: 'Топик order.events', id: 'ret', t: 'retention', sub: 'сколько хранить события', opts: ['1 день', '7 дней', '14 дней', 'бессрочно'], ok: '14 дней', why: { '1 день': 'аналитика перечитывает две недели', '7 дней': 'аналитика перечитывает две недели', бессрочно: 'диск растёт без конца, а персональные данные хранятся без срока' }, because: 'Аналитика перечитывает две недели — значит, хранить 14 дней. Дольше — диск растёт без пользы.' },
    { g: 'Консюмер bonus-service', id: 'auto', t: 'enable.auto.commit', sub: 'коммитить офсет по таймеру', opts: ['true', 'false'], ok: 'false', crit: true, why: { true: 'таймер закоммитит офсет до конца начисления — упали, и баллы потеряны' }, because: 'Офсет коммитят вручную, после того как баллы записаны. Таймер автокоммита может отметить сообщение до конца начисления: упали — и баллы потеряны.' }
  ];
  const fromThursday = () => {
    const st = TR.S().stages.topic, t = st && st.tasks;
    const out = {};
    if (t && t.key && t.key.ans && (t.key.ans.q || []).length) out.key = ['order_id', 'без ключа', 'city', null, 'event_id'][t.key.ans.q[0]] || null;
    if (t && t.parts && t.parts.ans && t.parts.ans.n && t.parts.ans.n.parts) { const p = String(t.parts.ans.n.parts).trim(); if (['3', '6', '12', '48'].includes(p)) out.parts = p; }
    return out;
  };
  const config = {
    id: 'config', title: 'Заполните конфиг: продюсер, топик, консюмер бонусов',
    lead: ui.brief({
      situation: 'Пятница. Гоша открывает три файла конфигурации. «Ключ и партиции ты решил вчера — они уже подставлены. Остальное — твоё. Помни Лену: не терять и не задваивать».',
      todo: ['Выберите значение в каждой строке. Ключ и партиции подставлены из четверга — если там была ошибка, исправьте её здесь.', 'Нажмите «Проверить». Засчитывается, когда верны хотя бы семь строк из восьми и нет ошибки в acks, min.insync.replicas и enable.auto.commit.'],
      look: 'Лаборатории «Когда брокер говорит „записал“» и «Коммит до или после».'
    }),
    blank: () => ({ v: {} }),
    reference: () => ({ v: Object.fromEntries(CFG.map(r => [r.id, r.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.v = a.v || {};
      // решения четверга подставляются в пустые строки при каждом открытии: пятницу могли открыть раньше четверга
      if (!ctx.readonly) { const th = fromThursday(); let put = false; Object.keys(th).forEach(k => { if (th[k] && !a.v[k]) { a.v[k] = th[k]; put = true; } }); a.fromTh = th; if (put) ctx.save(); }
      const judged = !!(ctx.result || ctx.readonly);
      let g = '';
      el.innerHTML = `<div class="gu-cfg">${CFG.map(r => {
        const head = r.g !== g ? `<div class="gu-grp">${esc(g = r.g)}</div>` : '';
        const v = a.v[r.id], st = judged && v ? (v === r.ok ? 'ok' : 'bad') : '';
        const th = r.from && a.fromTh && a.fromTh[r.id] ? ` · <span style="color:var(--accent)">из четверга: ${esc(a.fromTh[r.id])}</span>` : '';
        return head + `<div class="gu-row ${st}"><div><code>${esc(r.t)}</code><small>${esc(r.sub)}${th}</small></div>
          <select data-r="${r.id}" aria-label="${esc(r.t)}" ${ctx.readonly ? 'disabled' : ''}><option value="">Выберите…</option>${r.opts.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
          ${st === 'bad' && !ctx.readonly && r.why[v] ? `<div class="why">Что сломается: ${esc(r.why[v])}.</div>` : ''}</div>`;
      }).join('')}</div>`;
      el.addEventListener('change', e => { const id = e.target.dataset.r; if (!id) return; if (e.target.value) a.v[id] = e.target.value; else delete a.v[id]; ctx.save(); const row = e.target.closest('.gu-row'); row.classList.remove('ok', 'bad'); const w = row.querySelector('.why'); if (w) w.remove(); });
    },
    check(ans) {
      const v = ans.v || {}, notes = [];
      const good = CFG.filter(r => v[r.id] === r.ok).length, critBad = CFG.filter(r => r.crit && v[r.id] !== r.ok);
      CFG.forEach(r => { if (!v[r.id]) notes.push({ ok: false, html: `<code>${esc(r.t)}</code> не выбран.` }); else if (v[r.id] !== r.ok) notes.push({ ok: false, html: `<code>${esc(r.t)} = ${esc(v[r.id])}</code>: ${esc(r.why[v[r.id]] || 'не сходится')}.` }); });
      if (!notes.length) notes.push({ ok: true, html: 'Конфиг собран без ошибок.' });
      return { ok: good >= 7 && !critBad.length, score: good / CFG.length, notes, summary: `Верно ${good} из ${CFG.length} строк.`, mentor: v.auto === 'true' ? 'Автокоммит — самая тихая ошибка: в тестах всё работает, а в первую же аварию баллы пропадают без следа.' : null };
    },
    flags: ans => { const v = ans.v || {}, f = []; if (v.auto === 'true') f.push('Включил автокоммит'); if (v.acks && v.acks !== 'all') f.push('acks=' + v.acks + ' — возможна потеря оплаченного заказа'); return f; },
    answers: ans => {
      const v = ans.v || {};
      return CFG.map(r => {
        const got = v[r.id], ok = got === r.ok, slip = !ok && got && r.why && r.why[got] ? esc(ui.cap(r.why[got])) + '.' : '';
        return { q: r.g + ' · ' + r.t + ' — ' + r.sub, mine: got || '', right: r.ok, ok, slip, why: r.because };
      });
    },
    explain: `${ui.table(['Строка', 'Значение', 'Иначе'], CFG.map(r => [`<code>${esc(r.t)}</code>`, `<b>${esc(r.ok)}</b>`, esc(Object.values(r.why)[0])]))}<p>Связка, которую стоит запомнить: <b>acks=all + min.insync.replicas=2 + replication.factor=3</b>. Пережили потерю одного брокера без остановки записи и без потерь. А на стороне консюмера — <b>enable.auto.commit=false</b> и коммит после обработки.</p>`,
    report: ans => CFG.map(r => `- ${r.t} = ${(ans.v || {})[r.id] || '—'} ${(ans.v || {})[r.id] === r.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 2. Упал до коммита
  const CRASH = [
    { t: 'Сообщение придёт снова: Kafka знает только закоммиченный офсет — это at least once', ok: true, why: 'Да. Закладка группы стоит перед этим сообщением, его прочитают ещё раз.', because: 'Kafka помнит для группы только закоммиченный офсет — закладку. Консюмер начислил баллы, но упал до коммита: закладка стоит перед этим сообщением, и после перезапуска его прочитают снова. Это и есть «хотя бы один раз»: повтор возможен, поэтому бонусы должны его узнавать.' },
    { t: 'Сообщение потеряно: его уже прочитали', why: 'Прочитать — не значит закоммитить. Kafka не знает, что вы его прочитали.' },
    { t: 'Kafka сама поймёт, что баллы уже начислены, и не пришлёт повтор', why: 'Kafka ничего не знает о CRM и баллах.' },
    { t: 'Сообщение уйдёт в DLQ', why: 'В DLQ отправляет сам консюмер по своей политике ошибок — это суббота. Падение консюмера туда ничего не отправляет.' }
  ];
  const crash = {
    id: 'crash', title: 'Начислили и упали до коммита',
    lead: ui.brief({ situation: 'Консюмер бонусов начислил 120 баллов в CRM и упал, не успев закоммитить офсет. Через 10 секунд его перезапустили.', todo: ['Выберите, что произойдёт.', 'Нажмите «Проверить».'], look: 'Лаборатория «Коммит до или после».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { ui.quiz(el, { q: 'Что произойдёт после перезапуска?', options: CRASH, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'gu-crash', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: CRASH }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !CRASH[i].ok ? [{ ok: false, html: esc(CRASH[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    answers: ans => ui.quizAnswers('Что произойдёт после перезапуска?', CRASH, ans.q),
    explain: '<p>Повтор неизбежен при любой честной настройке «не терять». Брокер выбирает между «иногда теряю» и «иногда повторяю» — и для бонусов мы выбрали второе. Значит, бонусы обязаны пережить повтор.</p>',
    report: ans => (ans.q || []).length ? CRASH[ans.q[0]].t : '—'
  };

  // =====================================================================
  // Практика 3. Как пережить повтор
  const IDEM = [
    { id: 'i1', t: 'Хранить event_id обработанных событий и пропускать уже виденные', ok: 'yes', because: 'Повтор приходит с тем же event_id. Если номер уже есть среди обработанных — начислять не нужно.' },
    { id: 'i2', t: 'Уникальный индекс UNIQUE (order_id, kind) на таблице начислений', ok: 'yes', because: 'База сама не даст записать второе начисление за тот же заказ и вид — даже если две копии события обрабатываются одновременно.' },
    { id: 'i3', t: 'Начисление и отметку «event_id обработан» писать в одной транзакции', ok: 'yes', because: 'Начисление и отметка пишутся вместе: не бывает состояния «начислили, но не отметили», и после падения повтор будет узнан.' },
    { id: 'i4', t: 'Операция по смыслу: «за заказ 1042 — 120 баллов», а не «+120 баллов»', ok: 'yes', because: '«За заказ 1042 — 120 баллов» можно выполнить дважды с тем же итогом, а «+120» — нет. Такая операция идемпотентна сама.' },
    { id: 'i5', t: 'Коммитить офсет только после того, как начисление записано', ok: 'yes', because: 'Так сообщение не потеряется: упали до коммита — его пришлют снова, а повтор погасит идемпотентность.' },
    { id: 'b1', t: 'Коммитить офсет до начисления — тогда точно не повторится', ok: 'no', why: 'не повторится — но и потеряется: это at most once' },
    { id: 'b2', t: 'Включить exactly-once в Kafka и больше ничего не делать', ok: 'no', why: 'exactly-once в Kafka работает внутри Kafka; CRM бонусов — внешняя система' },
    { id: 'b3', t: 'Считать дублем событие, пришедшее в ту же секунду', ok: 'no', why: 'повтор может прийти через минуту после ребаланса, а два разных события — в одну секунду' },
    { id: 'b4', t: 'Перезапускать консюмер реже', ok: 'no', why: 'падения не спрашивают разрешения' }
  ];
  const idem = {
    id: 'idem', title: 'Как бонусам пережить повтор',
    lead: ui.brief({ situation: 'Разработчик бонусов Петя: «Окей, повторы будут. Что мне сделать в коде?» Команда накидала идей.', todo: ['Разложите идеи: защищает от двойного начисления или нет.', 'Нажмите «Проверить». Засчитывается, если ошибок не больше одной.'], look: 'Защита — это когда второй приход того же события ничего не меняет.' }),
    blank: () => ({ v: {} }),
    reference: () => ({ v: Object.fromEntries(IDEM.map(i => [i.id, i.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.v = a.v || {};
      let rv = null; if (ctx.result || ctx.readonly) { rv = {}; IDEM.forEach(i => { if (a.v[i.id]) rv[i.id] = a.v[i.id] === i.ok ? 'ok' : 'bad'; }); }
      ui.sort(el, { items: IDEM.map(i => ({ id: i.id, t: esc(i.t) })), buckets: [{ id: 'yes', t: 'Защищает от двойного начисления' }, { id: 'no', t: 'Не защищает или вредит' }], value: a.v, reveal: rv, readonly: ctx.readonly, seed: 'gu-idem', onChange: v => { a.v = v; ctx.save(); } });
    },
    check(ans) {
      const v = ans.v || {}, errs = IDEM.filter(i => v[i.id] && v[i.id] !== i.ok), empty = IDEM.filter(i => !v[i.id]).length;
      const notes = errs.map(i => ({ ok: false, html: `«${esc(i.t)}» — ${i.ok === 'no' ? esc(i.why) : 'а что будет со вторым приходом того же события, если так сделать?'}.` }));
      if (empty) notes.unshift({ ok: false, html: `Не разложено: ${empty}.` });
      return { ok: errs.length <= 1 && !empty, score: (IDEM.length - errs.length - empty) / IDEM.length, notes, summary: `Ошибок: ${errs.length}.` };
    },
    flags: ans => (ans.v || {}).b1 === 'yes' ? ['Предлагает коммитить до обработки'] : [],
    answers: ans => ui.sortAnswers(IDEM, [{ id: 'yes', t: 'Защищает от двойного начисления' }, { id: 'no', t: 'Не защищает или вредит' }], ans.v),
    explain: '<p>Пять приёмов работают вместе: <b>event_id</b> обработанных + <b>UNIQUE</b> на начислениях как страховка + одна <b>транзакция</b> на начисление и отметку + операция «<b>установить</b>», а не «прибавить» + <b>коммит после</b> обработки. Сильный ответ сам добавляет: обратный порядок «коммит, потом обработка» даёт at most once.</p>',
    report: ans => IDEM.map(i => `- ${i.t} → ${(ans.v || {})[i.id] === 'yes' ? 'защищает' : (ans.v || {})[i.id] === 'no' ? 'нет' : '—'} ${(ans.v || {})[i.id] === i.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 4. Объяснить Пете
  const PETYA_RUBRIC = [
    'Автокоммит ставит закладку по таймеру, не дожидаясь начисления: упали — баллы потеряны',
    'Коммит после начисления даёт повторы (at least once), и это нормально',
    'Повтор узнаётся по event_id (или UNIQUE по заказу и виду начисления), отметка и начисление — в одной транзакции',
    'Начисление сформулировано как «установить 120 за заказ», а не «прибавить 120»'
  ];
  const PETYA_REF = 'Петя, автокоммит выключаем: он ставит закладку по таймеру и не знает, начислили мы уже или нет. Упадём между коммитом и начислением — баллы пропадут. Коммитим сами, только после того как начисление записано. Тогда после падения сообщение придёт ещё раз — это at least once, так и задумано. Чтобы повтор не начислил дважды, храни event_id обработанных событий и пиши отметку в той же транзакции, что и начисление; на таблице начислений поставь UNIQUE (order_id, kind). И формулируй начисление как «за заказ 1042 — 120 баллов», а не «+120».';
  const petya = {
    id: 'petya', rubric: PETYA_RUBRIC, refText: PETYA_REF, title: 'Объясните Пете, почему выключаем автокоммит',
    lead: ui.brief({ situation: 'Петя: «Зачем выключать автокоммит? С ним проще, и у меня всё работает».', todo: ['Ответьте в 4–6 предложениях, от 250 символов.', 'Проверьте с Гошей или сверьте с эталоном. Засчитывается от 60 %.'], lookTitle: 'На что опереться', look: 'Лаборатория «Коммит до или после» и задание «Как бонусам пережить повтор».' }),
    blank: () => ({ j: {} }),
    reference: () => ({ j: { text: PETYA_REF, self: PETYA_RUBRIC.map(() => true) } }),
    render(el, ctx) {
      el.insertAdjacentHTML('beforeend', ui.say('me', 'Петя, по конфигу бонусов: <code>enable.auto.commit=false</code>.') + ui.say('gosha', '<i>(пересылает ответ Пети)</i> «Зачем? С автокоммитом проще, и у меня всё работает».'));
      const j = document.createElement('div'); j.style.marginTop = '12px'; el.appendChild(j);
      ui.justify(j, { id: 'gu-petya', q: 'Ваш ответ Пете', qPlain: 'Разработчик консюмера бонусов не понимает, зачем выключать автоматический коммит офсета в Kafka. Объясните, что сломается с автокоммитом, что даёт ручной коммит после обработки и как пережить повторы.', rubric: PETYA_RUBRIC, reference: PETYA_REF, value: ctx.ans.j, readonly: ctx.readonly, minLen: 250, placeholder: 'Петя, автокоммит…', onChange: v => { ctx.ans.j = v; ctx.save(); ctx.decide('Ответ Пете про автокоммит', v.text || ''); } });
    },
    check(ans) { const s = ui.justifyScore(ans && ans.j); return { ok: s >= 0.6, score: s, summary: s ? `Оценка ответа: ${Math.round(s * 100)} %.` : 'Напишите ответ и проверьте его.', notes: s && s < 0.6 ? [{ ok: false, html: 'Пете нужен сценарий, где «у меня всё работает» ломается, — и что делать с повторами, которые появятся.' }] : [] }; },
    explain: '<p>Разработчик соглашается не с правилом, а со сценарием поломки. «Упадём между коммитом и начислением — баллы пропадут» убеждает лучше, чем «так написано в документации».</p>',
    report: ans => (ans.j && ans.j.text) ? ans.j.text : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 2, order: 50, slot: 'Пт 10:00', title: 'Ни потерять, ни задвоить',
    when: 'пятница, 10:00 · ровно неделя после аварии',
    intro: [
      { who: 'lena', html: 'Напоминаю: терять заказы нельзя. И 400 тысяч лишних баллов я тоже больше видеть не хочу.' },
      { who: 'gosha', html: 'Сегодня — гарантии. Спойлер: «ровно один раз» брокер не даст. Он даст «хотя бы один раз», а «ровно» мы сделаем сами — в бонусах.' }
    ],
    facts: ['F-loss', 'F-history', 'F-order'],
    glossary: [
      { term: 'acks', simple: 'Когда брокер говорит продюсеру «записал»: сразу, после лидера или после всех копий.', tech: 'Настройка продюсера Kafka: 0, 1 или all. all — подтверждение после записи во все реплики из ISR.' },
      { term: 'Реплика', simple: 'Копия партиции на другом брокере.', tech: 'Копия партиции; одна реплика — лидер (принимает запись), остальные — фолловеры (копируют).' },
      { term: 'ISR (in-sync replicas)', simple: 'Копии, которые успевают за лидером.', tech: 'Множество реплик, не отстающих от лидера больше допустимого. Только они участвуют в acks=all и могут стать лидером без потерь.' },
      { term: 'min.insync.replicas', simple: 'Сколько копий должно быть живо, чтобы брокер принял запись.', tech: 'Минимальный размер ISR для записи с acks=all. Меньше — брокер отказывает (NotEnoughReplicas).' },
      { term: 'At most once', simple: 'Не больше одного раза: можно потерять, повторов нет.', tech: 'Семантика доставки, при которой офсет фиксируется до обработки. Сбой между шагами теряет сообщение.' },
      { term: 'At least once', simple: 'Хотя бы один раз: не теряется, но может прийти дважды.', tech: 'Семантика доставки с фиксацией офсета после обработки. Сбой между шагами приводит к повторной доставке.' },
      { term: 'Exactly once', simple: '«Ровно один раз» — обещание, которое честно выполняется только внутри Kafka.', tech: 'Семантика транзакционной обработки внутри Kafka (идемпотентный продюсер + транзакции). Для внешних систем достигается at least once + идемпотентный получатель.' },
      { term: 'Идемпотентность', simple: 'Сделать второй раз — ничего не изменится.', tech: 'Свойство операции, повторное применение которой не меняет результат. На стороне потребителя — дедупликация по ключу (event_id, бизнес-ключ).' },
      { term: 'Retention', simple: 'Сколько дней Kafka хранит события, прежде чем удалить.', tech: 'Срок (или объём) хранения сообщений в топике, независимо от того, прочитаны ли они.' }
    ],
    outro: 'Конфиг собран: ничего не теряем, повторы ловим в бонусах. Выходные обещают быть спокойными… Дежурит Саша. Телефон держи рядом.',
    tasks: [howAcks, config, howCommit, crash, idem, petya]
  });
})();
