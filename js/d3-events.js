/* День 3 · Среда. Доска событий: факты вместо команд, имена, что класть в событие.
   Ключ преподавателя — _dev/key/30-events.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'events';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .ev-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
  .ev-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:6px}
  .ev-f{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--border);border-radius:9px;padding:8px 10px;background:var(--surface);cursor:pointer;min-width:0}
  .ev-f input{margin-top:3px}.ev-f code{font:600 12.5px var(--f-mono);color:var(--text)}.ev-f small{display:block;color:var(--text-muted);font-size:12px}
  .ev-f.ok{border-color:var(--ok);background:var(--ok-soft)}.ev-f.bad{border-color:var(--bad);background:var(--bad-soft)}.ev-f.miss{border-style:dashed;border-color:var(--warn)}
  .ev-lvl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
  .ev-lvl .stat{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface-2);min-width:0}
  .ev-lvl .stat b{display:block;font:700 20px/1.1 var(--f-brand)}
  @media (max-width:520px){.ev-lvl{grid-template-columns:minmax(0,1fr)}}
  </style>`);

  // =====================================================================
  // Теория 1. Команда или событие
  const CODE_CMD = `// сервис заказов, после оплаты — КОМАНДЫ
warehouse.collect(order)          // «собери»
dispatch.findCourier(order)       // «найди курьера»
push.send(order.customer, "Оплачен")
bonus.accrue(order.customer, 120) // «начисли»
analytics.track(order)`;
  const CODE_CMD_AF = CODE_CMD + `
[[bad]]antifraud.check(order)          // новая строчка, новый релиз,
                                  // новая зависимость заказов[[/]]`;
  const CODE_EV = `// сервис заказов, после оплаты — СОБЫТИЕ
publish("order.events", {
  type: "OrderPaid", order_id: 1042, ...
})
// кто подписан — решает сам, что делать`;
  const CODE_EV_AF = CODE_EV + `

[[ok]]// антифрод подписался на order.events сам.
// В сервисе заказов не изменилось ничего.[[/]]`;
  const howCmd = {
    id: 'how-cmd', title: 'Как это работает: «начисли бонусы» против «заказ оплачен»', covers: ['naming', 'antifraud'], free: true, noReset: true,
    simple: { icon: '📣', plain: 'Команда говорит получателю, что делать: «начисли». Событие сообщает, что случилось: «заказ оплачен». С командами отправитель знает всех получателей и решает за них. С событием каждый подписчик решает сам.', analogy: 'Мама говорит: «Петя, вынеси мусор» — это команда одному. Объявление в чате дома «В подъезде прорвало трубу» — это событие: кто-то вызовет сантехника, кто-то перекроет воду, кто-то просто примет к сведению.', tech: 'Команда — намерение, адресованное конкретному обработчику (повелительное наклонение, одна цель). Событие — неизменяемый факт в прошедшем времени, который издатель публикует, не зная подписчиков. Правило: повеление — в очередь, факт — в топик.' },
    lead: ui.brief({ situation: 'Два варианта кода сервиса заказов после оплаты. В следующем квартале подключается антифрод.', todo: ['Переключайте «Команды» и «Событие».', 'Нажмите «Подключить антифрод» и посмотрите, что меняется в коде заказов.'], look: 'Смотрите, где живёт знание о получателях: в отправителе или в самих получателях.' }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || 'cmd'; a.af = !!a.af;
      el.innerHTML = `<div class="stack">${ui.seg('m', [{ v: 'cmd', t: 'Команды' }, { v: 'ev', t: 'Событие' }], a.m)}
        <div>${ui.code(a.m === 'cmd' ? (a.af ? CODE_CMD_AF : CODE_CMD) : (a.af ? CODE_EV_AF : CODE_EV), 'js')}</div>
        <div class="row"><button type="button" class="btn sm ${a.af ? 'ghost' : 'primary'}" data-af ${ctx.readonly ? 'disabled' : ''}>${a.af ? 'Убрать антифрод' : 'Подключить антифрод'}</button></div>
        <p class="small">${a.m === 'cmd' ? (a.af ? 'Чтобы подключить антифрод, правят и выпускают сервис заказов. Если антифрод тормозит — тормозят заказы. Именно так пятница и случилась.' : 'Сервис заказов знает всех пятерых получателей и что каждый должен сделать.') : (a.af ? 'Антифрод подписался сам. Сервис заказов о нём даже не знает.' : 'Сервис заказов сообщает факт и ничего не знает о получателях.')}</p></div>`;
      ui.onSeg(el, (n, v) => { a.m = v; ctx.save(); ctx.rerender(); });
      TR.on(el, 'click', '[data-af]', () => { a.af = !a.af; ctx.save(); ctx.rerender(); ctx.ready(); });
      if (a.af || ctx.readonly) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Доска событий
  const CARDS = [
    { id: 'c1', t: 'Заказ создан', ok: 'ev', because: 'Факт о заказе в прошедшем времени: заказ появился. Что с этим делать, подписчики решат сами.' }, { id: 'c2', t: 'Заказ оплачен', ok: 'ev', because: 'Главный факт для склада, бонусов и пушей: деньги списаны — можно собирать и начислять.' }, { id: 'c3', t: 'Заказ собран', ok: 'ev', because: 'Смена состояния заказа, важная диспетчерской: заказ готов, можно звать курьера.' },
    { id: 'c4', t: 'Курьер назначен', ok: 'ev', because: 'Факт жизни заказа: у него появился курьер — клиенту можно показать, кто везёт.' }, { id: 'c5', t: 'Заказ передан курьеру', ok: 'ev', because: 'Факт: заказ в пути. Повод для пуша и для аналитики времени доставки.' }, { id: 'c6', t: 'Заказ доставлен', ok: 'ev', because: 'Финальный факт: аналитика закрывает заказ, клиенту уходит пуш.' },
    { id: 'c7', t: 'Заказ отменён', ok: 'ev', because: 'Тоже факт жизни заказа, и важный: склад прекращает сборку, бонусы откатывают начисление.' },
    { id: 't1', t: 'Отправить пуш', ok: 'no', why: 'Команда: отправитель решает за получателя.' },
    { id: 't2', t: 'Начислить бонусы', ok: 'no', why: 'Команда: заказы снова привязаны к бонусам.' },
    { id: 't3', t: 'Заказ изменён', ok: 'no', why: 'Слишком общее: читатель не поймёт, что случилось, и полезет в заказы за деталями.' },
    { id: 't4', t: 'Статус заказа', ok: 'no', why: 'Это атрибут, а не событие. События — это и есть смены статуса.' },
    { id: 't5', t: 'Кнопка «Оформить» нажата', ok: 'no', why: 'Событие интерфейса: нажали — ещё не значит, что заказ создан.' },
    { id: 't6', t: 'Запись в базе сохранена', ok: 'no', why: 'Технический слой: подписчикам важен смысл, а не таблица.' },
    { id: 't7', t: 'Лог ошибки', ok: 'no', why: 'Журнал, а не событие бизнеса.' }
  ];
  const board = {
    id: 'board', title: 'Доска событий: что из этого — событие жизни заказа',
    lead: ui.brief({
      situation: 'Среда. Разработчики накидали на доску всё, что, по их мнению, надо публиковать о заказе. Гоша: «Оставь только то, что действительно стоит рассказывать миру».',
      todo: ['Разложите карточки: «Событие жизни заказа» или «Не событие».', 'Нажмите «Проверить». Засчитывается, когда все семь событий найдены и не больше одной ошибки.'],
      look: 'Событие — факт в прошедшем времени о бизнесе: что случилось с заказом. Не «что сделать» и не «что записали в базу».'
    }),
    blank: () => ({ v: {} }),
    reference: () => ({ v: Object.fromEntries(CARDS.map(c => [c.id, c.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.v = a.v || {};
      let rv = null;
      if (ctx.result || ctx.readonly) { rv = {}; CARDS.forEach(c => { if (a.v[c.id]) rv[c.id] = a.v[c.id] === c.ok ? 'ok' : 'bad'; }); }
      ui.sort(el, { items: CARDS.map(c => ({ id: c.id, t: esc(c.t) })), buckets: [{ id: 'ev', t: 'Событие жизни заказа', sub: 'факт о бизнесе в прошедшем времени' }, { id: 'no', t: 'Не событие', sub: 'команда, атрибут, интерфейс, техника' }], value: a.v, reveal: rv, readonly: ctx.readonly, seed: 'ev-board', onChange: v => { a.v = v; ctx.save(); } });
    },
    check(ans) {
      const v = ans.v || {}, notes = [];
      const evs = CARDS.filter(c => c.ok === 'ev'), traps = CARDS.filter(c => c.ok === 'no');
      const foundEv = evs.filter(c => v[c.id] === 'ev').length, trapIn = traps.filter(c => v[c.id] === 'ev');
      const errors = CARDS.filter(c => v[c.id] && v[c.id] !== c.ok).length, empty = CARDS.filter(c => !v[c.id]).length;
      if (empty) notes.push({ ok: false, html: `Не разложено карточек: ${empty}.` });
      trapIn.forEach(c => notes.push({ ok: false, html: `«${esc(c.t)}» — ${esc(c.why)}` }));
      evs.filter(c => v[c.id] === 'no').forEach(c => notes.push({ ok: false, html: `«${esc(c.t)}» — а это разве не факт о заказе, который кому-то нужен?` }));
      const ok = foundEv === evs.length && errors <= 1 && !empty;
      return { ok, score: Math.max(0, (CARDS.length - errors - empty) / CARDS.length), notes, summary: `Событий найдено: ${foundEv} из ${evs.length}. Ловушек на доске событий: ${trapIn.length}.`, mentor: trapIn.some(c => c.id === 't1' || c.id === 't2') ? '«Начислить бонусы» — это мы снова говорим бонусам, что делать. Через месяц придёт антифрод, и заказы опять придётся менять.' : null };
    },
    flags: ans => { const v = ans.v || {}; return ['t1', 't2'].some(id => v[id] === 'ev') ? ['Назвал командой то, что должно быть событием'] : []; },
    answers: ans => ui.sortAnswers(CARDS, [{ id: 'ev', t: 'Событие жизни заказа' }, { id: 'no', t: 'Не событие' }], ans.v),
    explain: `<p>Семь событий жизни заказа: <b>создан, оплачен, собран, курьер назначен, передан курьеру, доставлен, отменён</b>. Каждое — факт о бизнесе в прошедшем времени.</p>
      ${ui.table(['Ловушка', 'Почему не событие'], CARDS.filter(c => c.ok === 'no').map(c => [esc(c.t), esc(c.why)]))}`,
    report: ans => CARDS.map(c => `- ${c.t} → ${(ans.v || {})[c.id] === 'ev' ? 'событие' : (ans.v || {})[c.id] === 'no' ? 'не событие' : '—'} ${(ans.v || {})[c.id] === c.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 2. Имена событий от разработчиков
  const NAMES = [
    { id: 'n1', t: '<code>OrderPaid</code>', ok: 'good', because: '«Заказ оплачен» — факт в прошедшем времени о бизнесе, понятный любому подписчику.' },
    { id: 'n2', t: '<code>SendPushNotification</code>', ok: 'cmd', because: '«Отправь пуш» — повеление конкретному получателю. Факт — «заказ оплачен», а отправить ли пуш, решает сервис пушей.' },
    { id: 'n3', t: '<code>OrderUpdated</code>', ok: 'vague', because: '«Заказ изменён» не говорит, что изменилось: читатель пойдёт в заказы переспрашивать. Нужны конкретные события: оплачен, собран, отменён.' },
    { id: 'n4', t: '<code>CourierAssigned</code>', ok: 'good', because: 'Конкретный факт: у заказа появился курьер.' },
    { id: 'n5', t: '<code>OrdersTableRowInserted</code>', ok: 'tech', because: 'Строка в таблице — внутренность сервиса заказов. Переименуют таблицу — сломается контракт; подписчикам важен смысл, а не база.' },
    { id: 'n6', t: '<code>AccrueBonusPoints</code>', ok: 'cmd', because: '«Начисли баллы» — команда бонусам. По факту «заказ оплачен» бонусы решают начислить сами.' },
    { id: 'n7', t: '<code>OrderStatusChanged</code> с полем <code>new_status</code>', ok: 'vague', because: 'Одно событие на все статусы прячет смысл переходов в поле: каждый подписчик разбирает статусы сам. Конкретные события читаются и версионируются проще — поэтому разбить.' },
    { id: 'n8', t: '<code>OrderDelivered</code>', ok: 'good', because: 'Конкретный финальный факт жизни заказа.' }
  ];
  const NAME_CH = [
    { v: 'good', t: 'Хорошее событие — оставить' },
    { v: 'cmd', t: 'Команда — переформулировать как факт' },
    { v: 'vague', t: 'Слишком общее — разбить на конкретные' },
    { v: 'tech', t: 'Технический шум — не публиковать' }
  ];
  const NAME_WHY = {
    n2: 'повелительное наклонение: «отправь». Факт — «заказ оплачен», а пуш решит отправить сервис пушей.',
    n3: 'читатель не знает, что изменилось, и пойдёт спрашивать заказы.',
    n5: 'название таблицы — внутренности сервиса. Переименуют таблицу — сломается контракт.',
    n6: '«начисли» — команда. Бонусы сами решают начислить по факту «заказ оплачен».',
    n7: 'спорный вариант: так делают, но тогда каждый подписчик разбирает статусы сам, а порядок и смысл переходов прячутся в поле. Конкретные события читаются и версионируются проще.'
  };
  const naming = {
    id: 'naming', title: 'Ревью имён: разработчики прислали названия событий',
    lead: ui.brief({ situation: 'В чате команды заказов — список имён для топика <code>order.events</code>. Вас просят «глянуть как аналитика».', todo: ['Для каждого имени выберите вердикт.', 'Нажмите «Проверить». Засчитывается от семи верных из восьми.'], look: 'Факт в прошедшем времени о бизнесе — хорошее событие. Всё остальное — к доработке.' }),
    blank: () => ({ m: {} }),
    reference: () => ({ m: Object.fromEntries(NAMES.map(r => [r.id, r.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || {};
      let rv = null;
      if (ctx.result || ctx.readonly) { rv = {}; NAMES.forEach(r => { const g = a.m[r.id]; if (g) rv[r.id] = { s: g === r.ok ? 'ok' : 'bad', why: g !== r.ok && !ctx.readonly && NAME_WHY[r.id] ? 'Подумайте: ' + NAME_WHY[r.id] : '' }; }); }
      ui.match(el, { rows: NAMES.map(r => ({ id: r.id, t: r.t })), choices: NAME_CH, value: a.m, reveal: rv, readonly: ctx.readonly, placeholder: 'Вердикт…', onChange: v => { a.m = v; ctx.save(); } });
    },
    check(ans) {
      const m = ans.m || {}, good = NAMES.filter(r => m[r.id] === r.ok).length;
      const notes = NAMES.filter(r => m[r.id] && m[r.id] !== r.ok).map(r => ({ ok: false, html: `${r.t}: ${NAME_WHY[r.id] ? esc(NAME_WHY[r.id]) : 'это факт о заказе в прошедшем времени — что с ним не так?'}` }));
      return { ok: good >= 7, score: good / NAMES.length, notes, summary: `Верно ${good} из ${NAMES.length}.` };
    },
    answers: ans => ui.matchAnswers(NAMES, NAME_CH, ans.m),
    explain: '<p>Имя события — часть контракта. Хорошее имя: <b>сущность + факт в прошедшем времени</b> (OrderPaid, CourierAssigned). Плохие имена выдают ошибку проектирования: команда (Send…, Accrue…) — отправитель решает за получателя; общее (Updated, Changed) — подписчик гадает, что случилось; техническое (TableRowInserted) — внутренности утекают в контракт.</p>',
    report: ans => NAMES.map(r => `- ${r.t.replace(/<[^>]+>/g, '')} → ${((NAME_CH.find(c => c.v === (ans.m || {})[r.id]) || {}).t) || '—'} ${(ans.m || {})[r.id] === r.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Теория 2. Сколько класть в событие
  const LEVELS = [
    { v: 'thin', t: 'Тонкое: только номер заказа', json: '{ "type": "OrderPaid", "order_id": 1042 }', back: 600, fields: 2, risk: 'низкий', note: 'Пятеро подписчиков получили номер — и пошли в сервис заказов за деталями. В пик это 120 × 5 = 600 запросов в секунду обратно в заказы. Синхронная зависимость вернулась через заднюю дверь.' },
    { v: 'mid', t: 'В меру: данные, которые нужны подписчикам', json: '{\n  "event_id": "7f3c…", "type": "OrderPaid", "version": 2,\n  "occurred_at": "2026-10-30T10:15:02Z",\n  "order_id": 1042, "customer_id": 88121,\n  "store_id": "msk-07", "total": 2390.00,\n  "items": [{ "sku": "milk-1l", "qty": 2 }]\n}', back: 0, fields: 9, risk: 'низкий', note: 'Каждый подписчик берёт своё из события. За деталями никто не ходит, а лишнего — нет.' },
    { v: 'fat', t: 'Толстое: вся строка из базы', json: '{ "type": "OrderPaid", ...все 47 колонок таблицы orders,\n  "internal_note": "...", "card_last4": "4417",\n  "phone": "+7 9…", "row_version": 18 }', back: 0, fields: 47, risk: 'высокий', note: 'Подписчики завязываются на поля, которых им никто не обещал. Любое изменение таблицы — риск сломать чужой сервис. Плюс персональные данные расходятся по всем, кто подписан.' }
  ];
  const howPayload = {
    id: 'how-payload', title: 'Как это работает: тонкое, толстое и «в меру»', covers: ['payload'], free: true, noReset: true,
    simple: { icon: '✉️', plain: 'В событии должно быть то, что нужно подписчикам, чтобы сделать своё дело, не переспрашивая. Меньше — они пойдут переспрашивать. Больше — завяжутся на лишнее и получат чужие секреты.', analogy: 'Записка соседу «Посылка у меня» заставит его прийти и спросить, какая. Записка с ксерокопией вашего паспорта — перебор. «Посылка из „Озона“, коробка 30×20, у меня до вечера» — в самый раз.', tech: 'Состав полезной нагрузки события: тонкое уведомление (event notification) против переноса состояния (event-carried state transfer). Конверт события: идентификатор, тип, версия схемы, время; затем бизнес-данные, нужные подписчикам. Мартин Фаулер, «What do you mean by Event-Driven?».' },
    lead: ui.brief({ situation: 'Три варианта события «Заказ оплачен».', todo: ['Переключайте варианты и смотрите на последствия.'], look: 'Обратные запросы в заказы, число полей в контракте, риск утечки.' }),
    render(el, ctx) {
      const a = ctx.ans; a.l = a.l || 'thin';
      const L = LEVELS.find(x => x.v === a.l);
      el.innerHTML = `<div class="stack">${ui.seg('l', LEVELS.map(x => ({ v: x.v, t: x.t.split(':')[0] })), a.l)}
        ${ui.code(L.json, 'json', L.t)}
        <div class="ev-lvl"><div class="stat"><span class="small muted">Обратных запросов в заказы в пик</span><b class="tnum" style="color:${L.back ? 'var(--bad)' : 'var(--ok)'}">${L.back}/с</b></div>
          <div class="stat"><span class="small muted">Полей в контракте</span><b class="tnum" style="color:${L.fields > 20 ? 'var(--bad)' : 'var(--text)'}">${L.fields}</b></div>
          <div class="stat"><span class="small muted">Риск утечки персональных данных</span><b style="color:${L.risk === 'высокий' ? 'var(--bad)' : 'var(--ok)'}">${L.risk}</b></div></div>
        <p class="small">${L.note}</p></div>`;
      ui.onSeg(el, (n, v) => { a.l = v; a.seen = Object.assign(a.seen || {}, { [v]: 1 }); ctx.save(); ctx.rerender(); });
      if (ctx.readonly || Object.keys(a.seen || {}).length >= 2) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 3. Конверт события
  const FIELDS = [
    { id: 'event_id', g: 'env', need: true, t: 'event_id', sub: 'уникальный номер события (UUID)', why: 'без него подписчик не узнает повтор — а в пятницу узнаем, что повторы будут' },
    { id: 'type', g: 'env', need: true, t: 'type', sub: '«OrderPaid»', why: 'подписчик должен понять, что случилось' },
    { id: 'version', g: 'env', need: true, t: 'version', sub: 'версия схемы события', why: 'формат меняется раз в две недели — без версии не понять, как читать' },
    { id: 'occurred_at', g: 'env', need: true, t: 'occurred_at', sub: 'когда случилось', why: 'время факта, а не время доставки: нужно аналитике и для разбора' },
    { id: 'order_id', g: 'biz', need: true, t: 'order_id', sub: 'номер заказа', why: 'без номера заказа событие ни к чему не привязать — и это будущий ключ' },
    { id: 'customer_id', g: 'biz', useful: true, t: 'customer_id', sub: 'кому начислить баллы и отправить пуш', because: 'бонусам — кому начислить, пушам — кому отправить. Без него оба пойдут в заказы переспрашивать' },
    { id: 'total', g: 'biz', useful: true, t: 'total', sub: 'сумма заказа — бонусам', because: 'бонусы считают баллы от суммы — без неё им пришлось бы запрашивать заказ' },
    { id: 'items', g: 'biz', useful: true, t: 'items', sub: 'состав заказа — складу', because: 'складу нужен состав, чтобы собрать заказ' },
    { id: 'store_id', g: 'biz', useful: true, t: 'store_id', sub: 'тёмный склад, который собирает', because: 'склад узнаёт, что заказ его: без store_id непонятно, какому тёмному складу собирать' },
    { id: 'card', g: 'bad', bad: true, t: 'card_number', sub: 'номер карты клиента', why: 'данные карты не должны покидать платёжный контур — никогда' },
    { id: 'phone', g: 'bad', bad: true, t: 'phone', sub: 'телефон клиента', why: 'персональные данные, которые подписчикам не нужны: пуши шлют по customer_id' },
    { id: 'all', g: 'bad', bad: true, t: 'order_row', sub: 'вся строка таблицы orders (47 полей)', why: 'подписчики завяжутся на внутренности заказов' },
    { id: 'push_text', g: 'bad', bad: true, t: 'push_text', sub: 'текст пуша «Ваш заказ оплачен!»', why: 'это решение сервиса пушей; в событии — факт, а не инструкция' }
  ];
  const payloadJson = sel => {
    const S = new Set(sel), o = {};
    if (S.has('event_id')) o.event_id = '7f3c2a9e-…'; if (S.has('type')) o.type = 'OrderPaid'; if (S.has('version')) o.version = 2; if (S.has('occurred_at')) o.occurred_at = '2026-10-30T10:15:02Z';
    if (S.has('order_id')) o.order_id = 1042; if (S.has('customer_id')) o.customer_id = 88121; if (S.has('store_id')) o.store_id = 'msk-07'; if (S.has('total')) o.total = 2390.0; if (S.has('items')) o.items = [{ sku: 'milk-1l', qty: 2 }];
    if (S.has('card')) o.card_number = '2200 7001 2345 4417'; if (S.has('phone')) o.phone = '+7 916 …'; if (S.has('push_text')) o.push_text = 'Ваш заказ оплачен!'; if (S.has('all')) o['…'] = '47 колонок таблицы orders';
    return JSON.stringify(o, null, 2);
  };
  const payload = {
    id: 'payload', title: 'Соберите событие «Заказ оплачен»',
    lead: ui.brief({
      situation: 'Подписчики события: склад (что собирать и где), бонусы (кому и с какой суммы), пуши (кому), аналитика (всё по смыслу, без секретов). Гоша: «Собери так, чтобы никто не ходил в заказы переспрашивать и чтобы через год было не стыдно».',
      todo: ['Отметьте поля, которые войдут в событие. Справа соберётся JSON.', 'Нажмите «Проверить». Засчитывается, когда есть весь конверт и номер заказа, не меньше трёх полей для подписчиков и ни одного лишнего.'],
      look: 'Конверт — то, что нужно любому событию. Данные — то, что нужно этим подписчикам. Остальное — лишнее.'
    }),
    blank: () => ({ f: [] }),
    reference: () => ({ f: FIELDS.filter(f => f.need || f.useful).map(f => f.id) }),
    render(el, ctx) {
      const a = ctx.ans; a.f = a.f || [];
      const judged = !!(ctx.result || ctx.readonly);
      const box = f => { const on = a.f.includes(f.id); let cls = ''; if (judged) cls = on ? (f.bad ? 'bad' : 'ok') : (f.need ? 'miss' : ''); return `<label class="ev-f ${cls}"><input type="checkbox" data-f="${f.id}" ${on ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}><span><code>${esc(f.t)}</code><small>${esc(f.sub)}</small></span></label>`; };
      el.innerHTML = `<div class="ev-two"><div class="ev-fields">${TR.shuffle(FIELDS, 'ev-fields').map(box).join('')}</div><div data-json></div></div>`;
      const dj = () => { TR.$('[data-json]', el).innerHTML = ui.code(payloadJson(a.f), 'json', 'order.events · OrderPaid'); };
      el.addEventListener('change', e => { const id = e.target.dataset.f; if (!id) return; a.f = e.target.checked ? a.f.concat(id) : a.f.filter(x => x !== id); ctx.save(); dj(); });
      dj();
    },
    check(ans) {
      const S = new Set(ans.f || []), notes = [];
      const needMiss = FIELDS.filter(f => f.need && !S.has(f.id)), badIn = FIELDS.filter(f => f.bad && S.has(f.id)), useful = FIELDS.filter(f => f.useful && S.has(f.id)).length;
      needMiss.forEach(f => notes.push({ ok: false, html: `Нет <code>${esc(f.t)}</code>: ${esc(f.why)}.` }));
      badIn.forEach(f => notes.push({ ok: false, html: `<code>${esc(f.t)}</code> — лишнее: ${esc(f.why)}.` }));
      if (useful < 3) notes.push({ ok: 'warn', html: 'Подписчикам не хватает данных — они пойдут в заказы переспрашивать. Что нужно складу? Бонусам?' });
      const score = Math.max(0, (5 - needMiss.length) / 5 * 0.5 + Math.min(useful, 4) / 4 * 0.3 + (badIn.length ? 0 : 0.2) - badIn.length * 0.1);
      return { ok: !needMiss.length && !badIn.length && useful >= 3, score, notes, summary: `Конверт: ${5 - needMiss.length} из 5 · данных для подписчиков: ${useful} из 4 · лишних: ${badIn.length}.`, mentor: S.has('card') ? 'Номер карты в событии, которое читают пять сервисов и аналитика, — это инцидент безопасности, а не поле.' : null };
    },
    flags: ans => { const S = new Set(ans.f || []), f = []; if (S.has('card')) f.push('Положил данные карты в событие'); if (!S.has('event_id')) f.push('Событие без event_id — повтор не узнать'); return f; },
    answers: ans => {
      const S = new Set(ans.f || []);
      return FIELDS.map(f => {
        const on = S.has(f.id);
        return { q: f.t + ' — ' + f.sub, mine: on ? 'положили в событие' : 'не положили', right: f.need ? 'обязательно, это конверт' : f.useful ? 'положить: нужно подписчикам' : 'не класть', ok: f.bad ? !on : on, why: esc(ui.cap(f.because || f.why || '')) + '.' };
      });
    },
    explain: `<p><b>Конверт</b> (нужен любому событию): <code>event_id</code> — чтобы узнавать повторы; <code>type</code>; <code>version</code> — чтобы менять формат без поломок; <code>occurred_at</code> — время факта. <b>Данные</b> — то, что нужно подписчикам: <code>order_id</code>, <code>customer_id</code>, <code>total</code>, <code>items</code>, <code>store_id</code>.</p>
      <p><b>Никогда</b>: данные карты. <b>Не надо</b>: телефон (пуши шлют по клиенту), текст пуша (это решение сервиса пушей), вся строка таблицы (внутренности становятся контрактом). Из этого JSON в воскресенье вырастет раздел постановки «Формат события».</p>`,
    report: ans => '```json\n' + payloadJson(ans.f || []) + '\n```'
  };

  // =====================================================================
  // Практика 4. Антифрод
  const AF = [
    { t: 'Ничего: антифрод подпишется на order.events своей группой', ok: true, why: 'Да. Отправитель не знает подписчиков — в этом весь смысл события.', because: 'Событие публикуют, не зная подписчиков: новый получатель подписывается на тот же топик своей группой консюмеров и читает со своей закладки. В сервисе заказов не меняется ни строчки — поэтому антифрод больше не может уронить оформление.' },
    { t: 'Добавить в сервис заказов вызов antifraud.check(order)', why: 'Так снова появится синхронная зависимость — путь к следующей пятнице.' },
    { t: 'Создать отдельный топик order.events.antifraud и публиковать туда копию', why: 'Отправитель снова начинает знать получателей. Копии на каждого подписчика — это команды в маскировке.' },
    { t: 'Попросить антифрод читать таблицу заказов', why: 'Это интеграция через базу — разобрали во вторник, почему нет.' }
  ];
  const antifraud = {
    id: 'antifraud', title: 'В следующем квартале — антифрод',
    lead: ui.brief({ situation: 'Лена: «А когда подключим антифрод, сколько времени команде заказов на доработку?»', todo: ['Выберите, что придётся сделать в сервисе заказов.', 'Нажмите «Проверить».'], look: 'Лаборатория «Начисли бонусы» против «заказ оплачен».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { ui.quiz(el, { q: 'Что изменится в сервисе заказов, когда подключат антифрод?', options: AF, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'ev-af', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: AF }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !AF[i].ok ? [{ ok: false, html: esc(AF[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    answers: ans => ui.quizAnswers('Что изменится в сервисе заказов, когда подключат антифрод?', AF, ans.q),
    explain: '<p>Ответ Лене: «Команде заказов — ноль дней. Антифрод подпишется сам». Это и есть бизнес-ценность событий: новые потребители подключаются без релиза источника. Но у неё есть цена — контракт события становится публичным, и менять его придётся аккуратно. Об этом — в субботу.</p>',
    report: ans => (ans.q || []).length ? AF[ans.q[0]].t : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 2, order: 30, slot: 'Ср 10:00', title: 'Доска событий',
    when: 'среда, 10:00 · доска со стикерами',
    intro: [
      { who: 'gosha', html: 'Карта есть: заказы публикуют, склад, бонусы, пуши и аналитика подписываются. Сегодня — что именно публикуем. Самая частая ошибка здесь — опубликовать команды и назвать их событиями.' },
      { who: 'lena', html: 'А можно сразу так, чтобы антифрод потом подключился без переделок?' }
    ],
    facts: ['F-subs', 'F-format'],
    glossary: [
      { term: 'Событие', simple: 'Факт в прошедшем времени: «заказ оплачен».', tech: 'Неизменяемая запись о том, что произошло в предметной области. Издатель не знает подписчиков и не ждёт от них ответа.' },
      { term: 'Команда', simple: 'Повеление одному получателю: «начисли бонусы».', tech: 'Сообщение-намерение, адресованное конкретному обработчику, который должен выполнить действие. Обычно передаётся через очередь.' },
      { term: 'Конверт события', simple: 'То, что пишут на любом конверте: номер, тип, версия, дата.', tech: 'Служебная часть события: идентификатор (event_id), тип, версия схемы, время возникновения, иногда источник и идентификатор корреляции.' },
      { term: 'event_id', simple: 'Уникальный номер события, по которому получатель узнаёт повтор.', tech: 'Глобально уникальный идентификатор (обычно UUID), который используется для дедупликации на стороне потребителя.' },
      { term: 'Тонкое событие', simple: '«Что-то случилось с заказом 1042» — за подробностями сходите сами.', tech: 'Event notification: событие несёт минимум данных, подписчики запрашивают детали у источника. Возвращает синхронную зависимость.' },
      { term: 'Event-carried state transfer', simple: 'В событии лежит всё, что нужно подписчикам.', tech: 'Событие переносит данные, достаточные потребителям без обращения к источнику (М. Фаулер).' }
    ],
    outro: 'Событий семь, имена — факты, конверт с <code>event_id</code> и версией. Завтра решаем, где эти события будут жить: Kafka или RabbitMQ, какой ключ и сколько партиций.',
    tasks: [howCmd, board, naming, antifraud, howPayload, payload]
  });
})();
