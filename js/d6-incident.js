/* День 6 · Суббота, 03:12. Ночной инцидент: ядовитое сообщение и DLQ, совместимость схем, потерянные события и outbox.
   Ключ преподавателя — _dev/key/60-incident.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'incident';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .in-alert{border:1px solid var(--bad);background:var(--bad-soft);border-radius:12px;padding:12px 14px;font:13px/1.5 var(--f-mono);overflow-x:auto}
  .in-alert b{color:var(--bad)}
  .in-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .in-stats .stat{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--surface-2);min-width:0}
  .in-stats .stat span{font-size:11.5px;color:var(--text-muted);display:block}.in-stats .stat b{font:700 18px/1.2 var(--f-brand)}
  .in-chart{width:100%;height:auto;display:block}
  .in-compat{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  .in-res{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface-2);min-width:0}
  .in-res.ok{border-color:var(--ok);background:var(--ok-soft)}.in-res.bad{border-color:var(--bad);background:var(--bad-soft)}
  .in-hole{border:1px dashed var(--warn);background:var(--warn-soft);border-radius:12px;padding:12px}
  @media (max-width:520px){.in-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style>`);

  const ALERT = `<div class="in-alert"><b>🔴 ALERT 03:12</b> consumer-group <b>bonus-service</b> lag = <b>184 312</b> ↑
bonus-service-3  ERROR  NullPointerException: field 'total' is null
                 at OrderPaidHandler.accrue(…) offset=88 120 517 partition=7
bonus-service-3  restarting… (restart #41)
group bonus-service  rebalance started · rebalance completed · rebalance started…</div>`;

  // =====================================================================
  // Теория 1. Ядовитое сообщение
  const POL = [
    { v: 'restart', t: 'Перезапускать' }, { v: 'skip', t: 'Сдвинуть офсет' }, { v: 'more', t: 'Добавить консюмеров' }, { v: 'dlq', t: '3 попытки → DLQ' }
  ];
  const howDlq = {
    id: 'how-dlq', title: 'Как это работает: ядовитое сообщение и очередь недоставленных', covers: ['now', 'retry'], free: true, noReset: true,
    simple: { icon: '☠️', plain: 'Ядовитое сообщение — то, на котором консюмер падает каждый раз. Пока оно первое в партиции, вся партиция стоит: консюмер падает, перезапускается, снова читает его и снова падает. Выход — после нескольких попыток отложить его в отдельное место и разобрать днём.', analogy: 'На кассе товар без штрихкода. Кассир может бесконечно пробовать его отсканировать — очередь стоит. А может отложить в корзину «разобраться» и продолжить.', tech: 'Poison message. Политика: N повторов с паузой → публикация в dead letter topic/queue (DLQ) с причиной ошибки и исходными координатами (топик, партиция, офсет) → коммит офсета → оповещение. DLQ требует владельца и процесса разбора.' },
    lead: ui.brief({ situation: 'Партиция 7: на офсете 88 120 517 лежит событие без поля total. Консюмер падает на нём. Сообщений в секунду приходит 10 на партицию.', todo: ['Выбирайте политику и смотрите, что будет за 10 минут.'], look: 'Четыре счётчика: обработано, потеряно молча, отложено в DLQ, ребалансов.' }),
    render(el, ctx) {
      const a = ctx.ans; a.p = a.p || 'restart';
      const M = 10, pts = [];
      let lag = 0, done = 0, lost = 0, dlq = 0, reb = 0;
      for (let m = 0; m <= M; m++) {
        if (m > 0) {
          if (a.p === 'restart' || a.p === 'more') { lag += 600; reb += a.p === 'more' ? 9 : 6; }
          else if (a.p === 'skip') { done += 600; if (m === 1) lost = 1; }
          else { done += 600 - (m === 1 ? 30 : 0); if (m === 1) dlq = 1; lag = m === 1 ? 30 : 0; }
        }
        pts.push(lag);
      }
      const mx = Math.max(6000, ...pts), W = 600, H = 140;
      const path = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / M * (W - 40) + 30).toFixed(1)} ${(H - 20 - v / mx * (H - 40)).toFixed(1)}`).join(' ');
      const note = { restart: 'Бесконечный цикл: каждый перезапуск — ребаланс всей группы, и стоят все партиции, а не только седьмая.', skip: 'Партиция поехала, но заказ, на котором упали, остался без баллов — и никто об этом не узнает. Тихая потеря хуже громкой.', more: 'Новый экземпляр получает партицию 7 — и падает на том же сообщении. Ребалансов стало больше, лаг тот же.', dlq: 'После трёх попыток сообщение ушло в order.events.dlq с причиной, офсет закоммичен, партиция поехала, дежурному пришёл алерт. Утром разберут и переобработают один заказ.' }[a.p];
      el.innerHTML = `<div class="stack">${ui.seg('p', POL, a.p)}
        <svg class="in-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Лаг партиции 7 за 10 минут"><line x1="30" y1="${H - 20}" x2="${W - 10}" y2="${H - 20}" style="stroke:var(--border-strong)"/><text x="30" y="14" style="fill:var(--text-muted);font-size:11px">лаг партиции 7</text><text x="${W - 70}" y="${H - 4}" style="fill:var(--text-muted);font-size:11px">10 минут</text><path d="${path}" style="fill:none;stroke:${lag > 100 ? 'var(--bad)' : 'var(--ok)'};stroke-width:3"/></svg>
        <div class="in-stats"><div class="stat"><span>обработано</span><b class="tnum">${done}</b></div><div class="stat"><span>потеряно молча</span><b class="tnum" style="color:${lost ? 'var(--bad)' : 'inherit'}">${lost}</b></div><div class="stat"><span>в DLQ</span><b class="tnum" style="color:${dlq ? 'var(--warn)' : 'inherit'}">${dlq}</b></div><div class="stat"><span>ребалансов</span><b class="tnum" style="color:${reb ? 'var(--bad)' : 'inherit'}">${reb}</b></div></div>
        <p class="small">${note}</p></div>`;
      ui.onSeg(el, (n, v) => { a.p = v; a.seen = Object.assign(a.seen || {}, { [v]: 1 }); ctx.save(); ctx.rerender(); });
      if (ctx.readonly || (a.seen && a.seen.dlq)) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Что делаем сейчас
  const NOW = [
    { t: '3 попытки → отправить сообщение в order.events.dlq с причиной → закоммитить офсет → алерт, днём разобрать', ok: true, why: 'Да: партиция едет, сообщение не потеряно, о нём знают.' },
    { t: 'Перезапускать, пока не пройдёт', why: 'Оно не пройдёт: поле total пустое при каждом чтении. Это бесконечный цикл с ребалансом всей группы.' },
    { t: 'Сдвинуть офсет группы на одно сообщение вперёд', why: 'Партиция поедет, но баллы за этот заказ молча потеряны — никто не узнает.' },
    { t: 'Поднять ещё 4 экземпляра бонусов', why: 'Новый экземпляр получит партицию 7 и упадёт на том же сообщении.' }
  ];
  const now = {
    id: 'now', title: '03:12. Что делаем прямо сейчас',
    lead: ui.brief({ situation: 'Суббота, 03:12. Звонит дежурный Саша: «Лаг бонусов 184 тысячи и растёт. Консюмер падает и перезапускается. Что делаем?»', todo: ['Прочитайте алерт.', 'Выберите действие.', 'Нажмите «Проверить».'], look: 'Лаборатория «Ядовитое сообщение».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { el.innerHTML = ALERT + '<div data-q style="margin-top:12px"></div>'; ui.quiz(TR.$('[data-q]', el), { q: 'Что делаем прямо сейчас?', options: NOW, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'in-now', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: NOW }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !NOW[i].ok ? [{ ok: false, html: esc(NOW[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    flags: ans => (ans.q || [])[0] === 2 ? ['Пропускает ядовитое сообщение, не сохранив его'] : [],
    explain: '<p>Ночью задача одна: чтобы поток поехал и ничего не потерялось. DLQ делает обе вещи. Важно, что у DLQ есть <b>владелец и разбор</b>: сообщение в DLQ без процесса — это та же потеря, только отложенная. В постановке это отдельная строка: кто смотрит DLQ, как переобрабатывать.</p>',
    report: ans => (ans.q || []).length ? NOW[ans.q[0]].t : '—'
  };

  // =====================================================================
  // Теория 2. Совместимость схем
  const CHANGES = [
    { v: 'add', t: 'Добавить поле discount со значением по умолчанию 0', old: true, back: true, note: 'Старый консюмер не знает нового поля и просто его не читает. Новый консюмер, читая старые события, подставит 0.' },
    { v: 'rename', t: 'Переименовать total → amount', old: false, back: false, note: 'Старый консюмер ищет total — его нет. Именно это и случилось ночью.' },
    { v: 'remove', t: 'Удалить обязательное поле store_id', old: false, back: false, note: 'Склад, которому оно нужно, упадёт или начнёт собирать «нигде».' },
    { v: 'type', t: 'Сменить тип total: число → строка «2 390,00 ₽»', old: false, back: false, note: 'Консюмер ждёт число и получает строку. Падение или — хуже — молча ноль.' },
    { v: 'two', t: 'Добавить amount, оставить total на время перехода', old: true, back: true, note: 'Так переименовывают безопасно: консюмеры переходят на amount по одному, потом total удаляют новой версией.' }
  ];
  const howSchema = {
    id: 'how-schema', title: 'Как это работает: какие изменения события ломают читателей', covers: ['schema'], free: true, noReset: true,
    simple: { icon: '🧩', plain: 'Событие — договор между тем, кто пишет, и теми, кто читает. Добавить новое поле безопасно: старые читатели его не заметят. Переименовать, удалить или сменить тип — значит сломать тех, кто читает старое.', analogy: 'В бланке заявления добавили графу «e-mail (необязательно)» — старые бланки по-прежнему принимают. Переименовали «Фамилия» в «Last name» — канцелярия перестала понимать половину заявлений.', tech: 'Реестр схем (Schema Registry) проверяет каждую новую версию схемы на совместимость. BACKWARD — новая схема читает данные, записанные старой (консюмеры обновляются первыми); FORWARD — старая читает новые; FULL — оба направления. Безопасное изменение — добавить поле со значением по умолчанию.' },
    lead: ui.brief({ situation: 'Команда заказов выпускает новую версию события OrderPaid. Бонусы ещё на старой версии.', todo: ['Выбирайте изменения и смотрите, что будет со старым консюмером и что скажет реестр схем.'], look: 'Реестр в режиме BACKWARD не пустит несовместимую схему в прод — ошибку увидят на сборке, а не в 03:12.' }),
    render(el, ctx) {
      const a = ctx.ans; a.c = a.c || 'add';
      const C = CHANGES.find(x => x.v === a.c);
      el.innerHTML = `<div class="stack">${ui.seg('c', CHANGES.map(x => ({ v: x.v, t: x.t.split(' ').slice(0, 2).join(' ') + '…' })), a.c, 'wrap')}
        <p><b>${esc(C.t)}</b></p>
        <div class="in-compat"><div class="in-res ${C.old ? 'ok' : 'bad'}"><div class="eyebrow">Старый консюмер бонусов</div><b>${C.old ? 'читает спокойно' : 'падает'}</b></div>
          <div class="in-res ${C.back ? 'ok' : 'bad'}"><div class="eyebrow">Реестр схем, BACKWARD</div><b>${C.back ? 'версия принята' : 'версия отклонена при публикации'}</b></div></div>
        <p class="small">${esc(C.note)}</p></div>`;
      ui.onSeg(el, (n, v) => { a.c = v; a.seen = Object.assign(a.seen || {}, { [v]: 1 }); ctx.save(); ctx.rerender(); });
      if (ctx.readonly || Object.keys(a.seen || {}).length >= 2) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 2. Как не повторить
  const SCHEMA = [
    { t: 'Реестр схем в режиме BACKWARD: несовместимую версию не опубликовать; поля только добавляем, переименование — через новое поле плюс старое на время перехода', ok: true, why: 'Да: проверка автоматическая и срабатывает до выкатки.' },
    { t: 'Запретить команде заказов менять событие', why: 'Нереально: формат меняется раз в две недели, бизнес растёт.' },
    { t: 'Договориться предупреждать об изменениях в общем чате', why: 'Чат не проверяет контракт. В этот раз тоже «предупредили».' },
    { t: 'Сделать консюмер, который не падает: пустое поле считать нулём', why: 'Тогда бонусы молча начислят ноль баллов — тихая ошибка хуже громкой.' }
  ];
  const schema = {
    id: 'schema', title: 'Почему total оказался null — и как не повторить',
    lead: ui.brief({ situation: 'Разбор показал: в пятницу вечером команда заказов переименовала total в amount. Бонусы читают total — там пусто.', todo: ['Выберите решение, которое не даст повториться.', 'Нажмите «Проверить».'], look: 'Лаборатория «Какие изменения ломают читателей».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) {
      const asked = TR.facts.has('F-format');
      el.innerHTML = (!asked && !ctx.readonly ? `<div class="in-hole"><b>Дыра с понедельника.</b> Вы не спросили Лену, кто и как часто меняет формат событий. А она ответила бы: «команда заказов, раз в две недели, уже ломали аналитику переименованием поля». Этот инцидент можно было предсказать в понедельник.</div>` : '') + '<div data-q style="margin-top:12px"></div>';
      ui.quiz(TR.$('[data-q]', el), { q: 'Что сделать, чтобы переименование поля больше не роняло бонусы?', options: SCHEMA, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'in-schema', onChange: v => { ctx.ans.q = v; ctx.save(); } });
    },
    check(ans) { const r = ui.quizScore({ options: SCHEMA }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !SCHEMA[i].ok ? [{ ok: false, html: esc(SCHEMA[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    explain: '<p>Контракт события проверяет машина, а не люди: реестр схем, режим совместимости, проверка в сборке продюсера. Правила эволюции для постановки: <b>поля только добавляем, со значением по умолчанию</b>; переименование — новое поле + старое на время перехода; удаление — новой мажорной версией и только после того, как все читатели перешли.</p>',
    report: ans => (ans.q || []).length ? SCHEMA[ans.q[0]].t : '—'
  };

  // =====================================================================
  // Теория 3. Outbox
  const L3 = [{ id: 'svc', t: 'Сервис заказов' }, { id: 'db', t: 'База заказов' }, { id: 'kf', t: 'Kafka' }];
  const L4 = [{ id: 'svc', t: 'Сервис заказов' }, { id: 'db', t: 'База: orders + outbox' }, { id: 'rl', t: 'Отправщик' }, { id: 'kf', t: 'Kafka' }];
  const SEQ = {
    two: [
      { from: 'svc', to: 'db', t: 'INSERT заказ, COMMIT', note: 'Заказ сохранён — клиент увидит его в истории.' },
      { from: 'svc', to: 'svc', t: '💥 сервис перезапустился', kind: 'bad', note: 'Деплой, нехватка памяти, падение пода — неважно что. Между двумя шагами.' },
      { from: 'svc', to: 'kf', t: 'publish OrderPaid', lost: true, kind: 'bad', note: 'Публикации не было. Заказ в базе есть, события нет — склад не соберёт, бонусы не начислят. Повторить некому: сервис забыл, что не отправил.' }
    ],
    outbox: [
      { from: 'svc', to: 'db', t: 'BEGIN; INSERT заказ; INSERT в outbox; COMMIT', kind: 'ok', note: 'Заказ и запись о событии сохраняются одной транзакцией: либо оба, либо ни одного.' },
      { from: 'svc', to: 'svc', t: '💥 сервис перезапустился', kind: 'bad', note: 'Падение теперь не страшно: событие уже лежит в таблице outbox.' },
      { from: 'rl', to: 'db', t: 'SELECT неотправленные из outbox', note: 'Отдельный отправщик (или CDC, например Debezium, читающий журнал базы) находит неотправленное.' },
      { from: 'rl', to: 'kf', t: 'publish OrderPaid (acks=all)', kind: 'ok', note: 'Отправляет в Kafka и ждёт подтверждения.' },
      { from: 'rl', to: 'db', t: 'UPDATE outbox: отправлено', note: 'Если упадёт перед этой отметкой — отправит повторно. Это повтор, а не потеря, и бонусы его переживут: event_id.' }
    ]
  };
  const howOutbox = {
    id: 'how-outbox', title: 'Как это работает: «сохранить и отправить» двумя шагами против outbox', covers: ['lost', 'steps'], free: true, noReset: true,
    simple: { icon: '📤', plain: 'Сохранить заказ в базу и отправить событие в Kafka — два разных действия в двух разных системах. Если упасть между ними, одно случится, а другое нет. Outbox: событие сначала записывают в таблицу той же базы в той же транзакции, а отдельный отправщик доставляет его в Kafka.', analogy: 'Вместо «оформить заказ, а потом не забыть позвонить курьеру» — положить заявку курьеру в тот же конверт, что и заказ. Конверт либо отправлен целиком, либо нет. А почтальон заберёт заявку, даже если вы заболели.', tech: 'Transactional outbox: запись бизнес-данных и события в одной локальной транзакции, затем асинхронная публикация отправщиком (polling publisher) или захватом изменений журнала (CDC, Debezium). Даёт at least once, повторы гасит идемпотентный получатель.' },
    lead: ui.brief({ situation: 'Проиграйте оба варианта: «два шага» и outbox, с одинаковым падением посередине.', todo: ['Переключайте вариант и нажимайте «Проиграть» или «Шаг».'], look: 'Где оказывается событие, когда сервис падает.' }),
    render(el, ctx) {
      const a = ctx.ans; a.v = a.v || 'two';
      el.innerHTML = `<div class="stack">${ui.seg('v', [{ v: 'two', t: 'Два шага' }, { v: 'outbox', t: 'Outbox' }], a.v)}<div data-seq></div></div>`;
      ui.seq(TR.$('[data-seq]', el), { lanes: a.v === 'two' ? L3 : L4, steps: SEQ[a.v], start: ctx.readonly ? 'all' : 0, laneW: 170, onEnd: () => { a.seen = Object.assign(a.seen || {}, { [a.v]: 1 }); ctx.save(); if (Object.keys(a.seen).length >= 2) ctx.ready(); } });
      ui.onSeg(el, (n, v) => { a.v = v; ctx.save(); ctx.rerender(); });
      if (ctx.readonly || Object.keys(a.seen || {}).length >= 2) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 3. 37 потерянных заказов
  const LOST = [
    { t: 'Outbox: событие пишется в таблицу той же транзакцией, что и заказ; отправщик повторяет до подтверждения', ok: true, why: 'Да: заказ и событие сохраняются вместе, а доставку повторяет тот, кто не забудет.' },
    { t: 'Поменять порядок: сначала отправить в Kafka, потом сохранить заказ', why: 'Упадём между шагами — получим событие о заказе, которого нет в базе. Склад соберёт призрак.' },
    { t: 'Обернуть запись в базу и отправку в Kafka в одну транзакцию базы', why: 'Транзакция базы не управляет Kafka: откат базы не отменит отправленное сообщение.' },
    { t: 'В catch повторять отправку три раза', why: 'Повторять некому: сервис умер между шагами, а catch умер вместе с ним.' }
  ];
  const lost = {
    id: 'lost', title: '37 заказов есть в базе, но не в топике',
    lead: ui.brief({ situation: 'Утром аналитик Вика сверила: 37 оплаченных заказов есть в базе, а событий по ним в order.events нет. Все — в момент ночных перезапусков сервиса заказов после выкатки.', todo: ['Выберите решение.', 'Нажмите «Проверить».'], look: 'Лаборатория «Сохранить и отправить двумя шагами против outbox».' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { el.innerHTML = ui.say('vika', 'Тридцать семь заказов в базе есть, а в топике их нет. Клиенты без баллов, а пять заказов склад вообще не собирал — их собрали вручную по звонкам.') + '<div data-q style="margin-top:12px"></div>'; ui.quiz(TR.$('[data-q]', el), { q: 'Как сделать, чтобы событие не терялось между базой и Kafka?', options: LOST, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'in-lost', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: LOST }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !LOST[i].ok ? [{ ok: false, html: esc(LOST[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    flags: ans => { const i = (ans.q || [])[0]; return i != null && i !== 0 ? ['«Сохранить в базу и отправить в Kafka» двумя шагами без outbox'] : []; },
    explain: '<p>Проблема называется <b>двойная запись</b> (dual write): две системы, одна операция, без общей транзакции. Outbox сводит её к одной записи в одну базу. Цена — ещё одна таблица и отправщик (или CDC), и повторы при доставке, которые гасит идемпотентность бонусов из пятницы.</p>',
    report: ans => (ans.q || []).length ? LOST[ans.q[0]].t : '—'
  };

  // =====================================================================
  // Практика 4. Шаги outbox по порядку
  const STEPS = [
    { id: 's1', t: 'Открыть транзакцию в базе заказов' },
    { id: 's2', t: 'Записать заказ в таблицу orders' },
    { id: 's3', t: 'Записать событие OrderPaid в таблицу outbox' },
    { id: 's4', t: 'Закоммитить транзакцию и ответить клиенту' },
    { id: 's5', t: 'Отправщик выбирает неотправленные записи outbox' },
    { id: 's6', t: 'Отправщик публикует событие в Kafka и ждёт подтверждения (acks=all)' },
    { id: 's7', t: 'Отправщик отмечает запись outbox как отправленную' }
  ];
  const steps = {
    id: 'steps', title: 'Расставьте шаги outbox для постановки',
    lead: ui.brief({ situation: 'Гоша: «Опиши outbox по шагам — это пойдёт в постановку как есть».', todo: ['Расставьте шаги по порядку стрелками ↑ ↓ или перетаскиванием.', 'Нажмите «Проверить». Засчитывается, когда порядок верный.'], look: 'Сначала всё, что внутри одной транзакции, потом — то, что делает отправщик.' }),
    blank: () => ({ o: [] }),
    reference: () => ({ o: STEPS.map(s => s.id) }),
    render(el, ctx) {
      const a = ctx.ans;
      let rv = null; if ((ctx.result || ctx.readonly) && a.o && a.o.length) { rv = {}; a.o.forEach((id, i) => { rv[id] = STEPS[i].id === id ? 'ok' : 'bad'; }); }
      ui.order(el, { items: STEPS, value: a.o, reveal: rv, readonly: ctx.readonly, seed: 'in-steps', onChange: v => { a.o = v; ctx.save(); } });
    },
    check(ans) {
      const o = ans.o || [];
      if (o.length !== STEPS.length) return { ok: false, score: 0, summary: 'Расставьте все шаги.' };
      const sc = ui.orderScore(o, STEPS.map(s => s.id)), exact = o.every((id, i) => id === STEPS[i].id), notes = [];
      if (o.indexOf('s3') > o.indexOf('s4')) notes.push({ ok: false, html: 'Событие записано в outbox после коммита — это снова два шага. Что будет, если упасть между ними?' });
      if (o.indexOf('s7') < o.indexOf('s6')) notes.push({ ok: false, html: 'Отметка «отправлено» до подтверждения Kafka: упадём — событие потеряно.' });
      if (o.indexOf('s6') < o.indexOf('s4')) notes.push({ ok: false, html: 'Публикация до коммита: транзакция может откатиться, а событие уже ушло.' });
      return { ok: exact, score: sc, notes, summary: exact ? 'Порядок верный.' : `Порядок сходится на ${Math.round(sc * 100)} %.` };
    },
    explain: '<p>Шаги 1–4 — одна транзакция, клиент получает ответ после коммита. Шаги 5–7 — асинхронно, в отдельном процессе. Отметка «отправлено» — только после подтверждения Kafka: падение между 6 и 7 даёт повтор, но не потерю.</p>',
    report: ans => (ans.o || []).map((id, i) => `${i + 1}. ${(STEPS.find(s => s.id === id) || {}).t}`).join('\n')
  };

  // =====================================================================
  // Практика 5. Retry-топики и порядок
  const RETRY = [
    { t: 'Сообщение, ушедшее в retry-топик, обгонят следующие события того же заказа: порядок по ключу сломается. Выбор «порядок или пропускная способность» — вопрос к Лене', ok: true, why: 'Да. Это компромисс, который надо проговорить с бизнесом, а не решить молча.' },
    { t: 'Хорошая идея, минусов нет: повторы через минуту разгрузят основной поток', why: 'Минус есть: повтор по заказу 1042 придёт после «доставлен» того же заказа.' },
    { t: 'Retry-топик не нужен: DLQ решает всё', why: 'DLQ — для того, что не пройдёт никогда. Временные сбои CRM лучше переждать повтором — вопрос только в порядке.' },
    { t: 'Retry-топик нарушит порядок между разными заказами, это недопустимо', why: 'Порядок между разными заказами Лене не нужен — нужен внутри заказа. Ломается именно он.' }
  ];
  const retry = {
    id: 'retry', title: 'Предложение: retry-топик order.events.retry-1m',
    lead: ui.brief({ situation: 'На разборе Петя предлагает: «Когда CRM бонусов отвечает ошибкой, будем перекладывать сообщение в order.events.retry-1m и пробовать через минуту, не блокируя партицию».', todo: ['Выберите, что важно сказать на разборе.', 'Нажмите «Проверить».'], look: 'Вспомните, что Лена говорила про порядок, и как ключ его обеспечивает.' }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: [0] }),
    render(el, ctx) { ui.quiz(el, { q: 'Что сказать про retry-топик?', options: RETRY, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'in-retry', onChange: v => { ctx.ans.q = v; ctx.save(); } }); },
    check(ans) { const r = ui.quizScore({ options: RETRY }, ans.q || []); const i = (ans.q || [])[0]; return { ok: r.ok, score: r.score, notes: i != null && !RETRY[i].ok ? [{ ok: false, html: esc(RETRY[i].why) }] : [], summary: r.ok ? 'Верно.' : 'Не сходится.' }; },
    explain: '<p>Retry-топики и DLQ — разные инструменты: retry для временных сбоев, DLQ для того, что не пройдёт никогда. Но любая перекладка сообщения из партиции ломает порядок по ключу. Для бонусов это может быть приемлемо (начисление за «оплачен» не зависит от «доставлен»), для пушей — нет. Это решение аналитик выносит на обсуждение, а не принимает молча.</p>',
    report: ans => (ans.q || []).length ? RETRY[ans.q[0]].t : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 3, order: 60, slot: 'Сб 03:12', title: 'Ночной инцидент',
    when: 'суббота, 03:12 · звонит дежурный',
    intro: [
      { who: 'sasha', html: 'Извини, что ночью. Лаг бонусов 184 тысячи и растёт, консюмер падает на одном сообщении и перезапускается по кругу. Я уже три раза его поднимал. Что делаем?' },
      { who: 'gosha', html: 'Это хорошая ночь для обучения. Три проблемы в одной: ядовитое сообщение, сломанный контракт и — утром выяснится — потерянные события. Разберём все три.' }
    ],
    facts: ['F-format', 'F-loss', 'F-order'],
    glossary: [
      { term: 'Лаг консюмера', simple: 'Сколько сообщений группа ещё не прочитала.', tech: 'Разница между последним офсетом партиции и закоммиченным офсетом группы. Основной показатель здоровья консюмера.' },
      { term: 'Ядовитое сообщение', simple: 'Сообщение, на котором консюмер падает каждый раз.', tech: 'Poison message: сообщение, обработка которого стабильно завершается ошибкой и блокирует партицию при бесконечных повторах.' },
      { term: 'DLQ (очередь недоставленных)', simple: 'Корзина «разобраться»: туда откладывают то, что не получилось обработать.', tech: 'Dead letter queue/topic: место для сообщений, исчерпавших попытки обработки, вместе с причиной ошибки. Требует владельца и процесса разбора.' },
      { term: 'Реестр схем', simple: 'Склад договоров на события: не пустит изменение, которое сломает читателей.', tech: 'Schema Registry: хранит версии схем (Avro, Protobuf, JSON Schema) и проверяет совместимость новой версии с выбранным правилом.' },
      { term: 'BACKWARD-совместимость', simple: 'Новые читатели понимают старые события.', tech: 'Новая версия схемы может читать данные, записанные предыдущей. Разрешает добавлять поля со значением по умолчанию и удалять необязательные.' },
      { term: 'Outbox', simple: 'Заявку на событие кладут в тот же конверт, что и заказ.', tech: 'Transactional outbox: событие записывается в таблицу outbox в той же транзакции, что и бизнес-данные, и публикуется отдельным процессом или через CDC.' },
      { term: 'CDC (захват изменений)', simple: 'Чтение журнала базы: всё, что записали, становится событием.', tech: 'Change Data Capture: публикация изменений из журнала транзакций базы (WAL), например Debezium.' },
      { term: 'Двойная запись', simple: 'Записать в два места без общей гарантии — однажды запишется только в одно.', tech: 'Dual write: изменение двух систем без распределённой транзакции; падение между операциями оставляет их несогласованными.' }
    ],
    outro: 'Ночь пережили: DLQ вместо перезапусков, реестр схем вместо чата, outbox вместо двух шагов. Завтра — генеральная репетиция: тройной пик и постановка задачи, которую сдадим команде.',
    tasks: [howDlq, now, howSchema, schema, howOutbox, lost, steps, retry]
  });
})();
