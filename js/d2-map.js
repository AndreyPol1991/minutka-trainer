/* День 2 · Вторник. Карта интеграций: где ответ нужен сейчас, где нужна гарантия «узнает», где задача одному, где срез раз в сутки.
   Ключ преподавателя — _dev/key/20-map.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'map';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .map-svg{width:100%;height:auto;display:block}
  .map-svg text{font:600 12px var(--f-body);fill:var(--text)}
  .map-svg .nd{fill:var(--surface-2);stroke:var(--border-strong)}
  .map-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-2)}
  .map-legend i{display:inline-block;width:26px;height:0;border-top:3px solid;vertical-align:middle;margin-right:6px}
  .map-tl{display:grid;gap:6px}
  .map-tl .r{display:grid;grid-template-columns:110px 1fr 70px;gap:8px;align-items:center;font-size:13px}
  .map-tl .bar{height:16px;position:relative;background:var(--surface-3);border-radius:6px;overflow:hidden}
  .map-tl .bar i{position:absolute;top:0;bottom:0;border-radius:4px}
  .map-big{font:700 26px/1.1 var(--f-brand)}
  .map-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
  .map-box{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface-2);min-width:0}
  .map-msgs{display:flex;gap:6px;flex-wrap:wrap;min-height:30px}
  .map-msg{font:600 11px/1 var(--f-mono);padding:6px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent)}
  .map-msg.v{background:var(--violet-soft);color:var(--violet);border-color:color-mix(in srgb,var(--violet) 40%,transparent)}
  .map-cons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
  .map-con{border:1px dashed var(--border-strong);border-radius:10px;padding:8px;min-height:80px;min-width:0}
  .map-con b{display:block;font-size:12px;margin-bottom:6px}
  @media (max-width:520px){.map-tl .r{grid-template-columns:80px 1fr 56px}.map-cons{grid-template-columns:minmax(0,1fr)}}
  </style>`);

  // ---------- карта ----------
  const NODES = {
    app: { x: 70, y: 200, t: 'Приложение' }, orders: { x: 270, y: 200, t: 'Заказы' },
    pay: { x: 190, y: 50, t: 'Оплата' }, promo: { x: 360, y: 50, t: 'Промокоды' },
    wh: { x: 510, y: 110, t: 'Склад' }, bonus: { x: 510, y: 200, t: 'Бонусы' }, an: { x: 510, y: 290, t: 'Аналитика' },
    acc: { x: 270, y: 360, t: 'Бухгалтерия' }, pick: { x: 710, y: 110, t: 'Сборщики' },
    disp: { x: 510, y: 380, t: 'Диспетчерская' }, cour: { x: 710, y: 380, t: 'Курьеры' }
  };
  const LINKS = [
    { id: 'l1', from: 'app', to: 'orders', t: 'Приложение → Заказы', sub: 'клиент нажал «Оформить» и ждёт номер заказа', ok: 'rest' },
    { id: 'l2', from: 'orders', to: 'pay', t: 'Заказы → Оплата', sub: 'списать деньги с карты', ok: 'rest' },
    { id: 'l3', from: 'orders', to: 'promo', t: 'Заказы → Промокоды', sub: 'проверить промокод и пересчитать цену', ok: 'rest' },
    { id: 'l4', from: 'orders', to: 'wh', t: 'Заказы → Склад', sub: 'узнать про оплаченный заказ и начать сборку', ok: 'pub' },
    { id: 'l5', from: 'orders', to: 'bonus', t: 'Заказы → Бонусы', sub: 'начислить баллы за заказ', ok: 'pub' },
    { id: 'l6', from: 'orders', to: 'an', t: 'Заказы → Аналитика', sub: 'все события для отчётов', ok: 'pub' },
    { id: 'l7', from: 'wh', to: 'pick', t: 'Склад → Сборщики', sub: 'задание «собрать заказ №…»', ok: 'queue' },
    { id: 'l8', from: 'disp', to: 'cour', t: 'Диспетчерская → Курьеры', sub: 'предложить заказ курьеру, 20 с на принятие', ok: 'queue' },
    { id: 'l9', from: 'orders', to: 'acc', t: 'Заказы → Бухгалтерия', sub: 'выручка за сутки для отчётности', ok: 'batch' }
  ];
  const MODES = [
    { v: 'rest', t: 'REST: синхронный запрос', col: 'var(--info)', dash: '' },
    { v: 'pub', t: 'Pub/sub: топик, всем подписчикам', col: 'var(--violet)', dash: '8 5' },
    { v: 'queue', t: 'Очередь: задача одному исполнителю', col: 'var(--warn)', dash: '12 4 3 4' },
    { v: 'batch', t: 'Batch: выгрузка раз в сутки', col: 'var(--text-muted)', dash: '2 5' }
  ];
  const WHY = {
    l1: { pub: 'клиент смотрит на экран и ждёт номер заказа — «когда-нибудь» ему не подходит', queue: 'клиент ждёт ответ сейчас, а не обработку когда-нибудь', batch: 'клиент не может ждать до утра' },
    l2: { pub: 'оплата через брокер: клиент смотрит на крутилку, ответа «оплачено» больше нет — есть «когда-нибудь»', queue: 'нужен ответ «оплачено/отказ» прямо сейчас, пока клиент на экране', batch: 'деньги не списывают раз в сутки' },
    l3: { pub: 'без ответа промокодов не показать цену', queue: 'без ответа не показать итоговую цену', batch: 'цена нужна сейчас' },
    l4: { rest: 'так и было в пятницу: склад тормозит — встаёт оформление', queue: 'о заказе должен узнать не один из нескольких, а именно склад; и аналитике то же событие нужно тоже', batch: 'склад должен узнать за 30 секунд, а не утром' },
    l5: { rest: 'ровно это и уронило пятницу: бонусы задумались — встало оформление', queue: 'событие нужно не только бонусам; очередь отдаст его одному получателю', batch: 'клиент ждёт баллы сегодня, а не завтра' },
    l6: { rest: 'аналитика не должна тормозить заказ, а ещё ей нужно перечитывать историю', queue: 'из очереди сообщение уходит одному и исчезает — перечитать нельзя', batch: 'для отчётов срез раз в сутки возможен, но аналитике нужны события и перечитывание за 14 дней' },
    l7: { rest: 'склад не знает, какой сборщик свободен, и не должен ждать каждого', pub: 'в топике задание получат все сборщики — пятеро побегут собирать один заказ', batch: 'заказ на 15 минут не ждёт выгрузки' },
    l8: { rest: 'диспетчерская не должна стучаться к каждому курьеру и ждать', pub: 'все курьеры получат один и тот же заказ', batch: 'у курьера 20 секунд, а не сутки' },
    l9: { rest: 'бухгалтерии не нужен каждый заказ в момент оформления', pub: 'можно, но бухгалтерии нужен итог за день, а не поток событий', queue: 'это не задача исполнителю, а отчёт' }
  };

  function mapSvg(choice, judged, readonly) {
    let s = `<svg class="map-svg" viewBox="0 0 800 420" role="img" aria-label="Карта интеграций «Минутки»"><defs>${MODES.concat([{ v: 'none', col: 'var(--border-strong)' }, { v: 'bad', col: 'var(--bad)' }]).map(m => `<marker id="map-a-${m.v}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:${m.col}"/></marker>`).join('')}</defs>`;
    LINKS.forEach(l => {
      const a = NODES[l.from], b = NODES[l.to], c = choice[l.id], m = MODES.find(x => x.v === c);
      const bad = judged && c && c !== l.ok;
      const col = bad ? 'var(--bad)' : m ? m.col : 'var(--border-strong)';
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const x1 = a.x + ux * 62, y1 = a.y + uy * 22, x2 = b.x - ux * 64, y2 = b.y - uy * 24;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${col};stroke-width:${m ? 3 : 1.5};${m && m.dash ? `stroke-dasharray:${m.dash}` : ''};opacity:${m ? 1 : .6}" marker-end="url(#map-a-${bad ? 'bad' : m ? m.v : 'none'})"/>`;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      s += `<circle cx="${mx}" cy="${my}" r="10" style="fill:var(--surface);stroke:${col}"/><text x="${mx}" y="${my + 4}" text-anchor="middle" style="font-size:10px">${l.id.slice(1)}</text>`;
    });
    Object.values(NODES).forEach(n => { s += `<rect class="nd" x="${n.x - 60}" y="${n.y - 20}" width="120" height="40" rx="9"/><text x="${n.x}" y="${n.y + 4}" text-anchor="middle">${esc(n.t)}</text>`; });
    return s + '</svg>';
  }
  const legend = () => `<div class="map-legend">${MODES.map(m => `<span><i style="border-color:${m.col};${m.dash ? 'border-top-style:dashed' : ''}"></i>${esc(m.t)}</span>`).join('')}</div>`;

  // =====================================================================
  // Теория 1. Почему пятница упала: цепочка синхронных вызовов
  const CHAIN = [
    { id: 'pay', t: 'Оплата', ms: 300, sync: true }, { id: 'wh', t: 'Склад', ms: 80 }, { id: 'disp', t: 'Диспетчерская', ms: 120 },
    { id: 'push', t: 'Пуши', ms: 60 }, { id: 'bonus', t: 'Бонусы', ms: 90 }, { id: 'an', t: 'Аналитика', ms: 70 }
  ];
  const howSync = {
    id: 'how-sync', title: 'Как это работает: цепочка звонков против записки в почтовом ящике', covers: ['links'], free: true, noReset: true,
    simple: { icon: '☎️', plain: 'Синхронный вызов — позвонить и ждать на линии. Если звонить по очереди пятерым, клиент ждёт сумму всех разговоров, а если один не берёт трубку — не дождётся вовсе. Брокер — оставить записку в ящике и уйти: каждый заберёт свою, когда сможет.', analogy: 'Официант, который после каждого заказа сам бежит на кухню, в бар и в бухгалтерию, обслуживает один стол за вечер. Официант, который вешает чек на кухонную доску, обслуживает зал.', tech: 'При синхронной цепочке задержка отправителя — сумма задержек всех получателей, а доступность — произведение их доступностей. Асинхронная публикация через брокер развязывает отправителя и получателей по времени и по отказам.' },
    lead: ui.brief({ situation: 'Это пятница «Минутки». Сервис заказов после оплаты по очереди зовёт пятерых получателей.', todo: ['Двигайте ползунок «Бонусы отвечают» и смотрите, сколько ждёт клиент.', 'Включите «Бонусы лежат».', 'Переключите схему на «Через брокер» и повторите.'], look: 'Оплата остаётся синхронной в обеих схемах: клиенту нужен ответ «оплачено» на экране.' }),
    render(el, ctx) {
      const a = ctx.ans; a.mode = a.mode || 'sync'; a.bonus = a.bonus || 90; a.down = !!a.down;
      const draw = () => {
        const ms = id => id === 'bonus' ? a.bonus : CHAIN.find(c => c.id === id).ms;
        let t = 0, rows = '', total = 0, fail = false;
        const scale = 3600;
        CHAIN.forEach(c => {
          const sync = a.mode === 'sync' || c.sync, d = ms(c.id), down = c.id === 'bonus' && a.down;
          if (sync) {
            const w = down ? 3000 : d;
            rows += `<div class="r"><span>${esc(c.t)}</span><div class="bar"><i style="left:${t / scale * 100}%;width:${Math.max(.6, w / scale * 100)}%;background:${down ? 'var(--bad)' : 'var(--info)'}"></i></div><b class="tnum">${down ? 'таймаут' : d + ' мс'}</b></div>`;
            t += w; if (down) fail = true;
          } else {
            rows += `<div class="r"><span>${esc(c.t)}</span><div class="bar"><i style="left:${t / scale * 100}%;width:.8%;background:var(--violet)"></i></div><b class="tnum small">${down ? 'ждёт в брокере' : 'сам, потом'}</b></div>`;
          }
        });
        if (a.mode === 'async') t += 5;
        total = t;
        TR.$('[data-out]', el).innerHTML = `<div class="map-tl">${rows}</div>
          <div class="row between" style="margin-top:10px"><span>Клиент ждёт:</span><span class="map-big tnum" style="color:${fail ? 'var(--bad)' : total > 1500 ? 'var(--warn)' : 'var(--ok)'}">${fail ? 'ошибка оформления' : total + ' мс'}</span></div>
          <p class="small">${a.mode === 'sync' ? (fail ? 'Бонусы не ответили — оформление упало. Ровно это и было в пятницу.' : 'Каждый получатель добавляет своё время к ожиданию клиента.') : (a.down ? 'Бонусы лежат, а заказ оформлен: событие подождёт в брокере и будет обработано, когда бонусы поднимутся.' : 'Клиент ждёт только оплату и публикацию события. Остальные заберут событие сами.')}</p>`;
      };
      el.innerHTML = `<div class="stack">${ui.seg('mode', [{ v: 'sync', t: 'По очереди, синхронно' }, { v: 'async', t: 'Через брокер' }], a.mode)}
        <label class="field"><span>Бонусы отвечают: <b class="tnum" data-bv>${a.bonus}</b> мс</span><input type="range" min="50" max="3000" step="50" value="${a.bonus}" data-bonus ${ctx.readonly ? 'disabled' : ''}></label>
        <label class="toggle"><input type="checkbox" data-down ${a.down ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}> <span>Бонусы лежат</span></label>
        <div data-out></div></div>`;
      ui.onSeg(el, (n, v) => { a.mode = v; ctx.save(); draw(); });
      el.addEventListener('input', e => { if (e.target.matches('[data-bonus]')) { a.bonus = +e.target.value; TR.$('[data-bv]', el).textContent = a.bonus; ctx.save(); draw(); } });
      el.addEventListener('change', e => { if (e.target.matches('[data-down]')) { a.down = e.target.checked; ctx.save(); draw(); } });
      draw(); ctx.ready();
    }
  };

  // =====================================================================
  // Теория 2. Очередь и топик
  const howQT = {
    id: 'how-qt', title: 'Как это работает: очередь раздаёт, топик рассказывает всем', covers: ['new'], free: true, noReset: true,
    simple: { icon: '📮', plain: 'Очередь — стопка заданий: каждое берёт один свободный исполнитель, и из стопки оно исчезает. Топик — доска объявлений: каждое объявление видят все, кто подписан, и оно висит, пока не истечёт срок.', analogy: 'Талончики в поликлинике — очередь: каждого пациента принимает один врач. Объявление на подъезде «в четверг отключат воду» — топик: его прочитают все жильцы.', tech: 'Очередь (point-to-point, RabbitMQ): конкурирующие потребители, сообщение удаляется после подтверждения (ack). Топик (pub/sub, Kafka): у каждой группы потребителей своя копия потока и своё смещение (офсет); сообщения хранятся по сроку, а не до прочтения.' },
    lead: ui.brief({ situation: 'Соседний пример: пиццерия. Три сообщения «Заказ оплачен» и три получателя.', todo: ['Переключите «Очередь» и «Топик» и нажмите «Отправить 3 сообщения».', 'В режиме очереди включите «Повар 2 упал, не подтвердив» и отправьте снова.'], look: 'Вопрос, который отличает одно от другого: сколько получателей должно это сделать — один или каждый?' }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || 'queue'; a.crash = !!a.crash; a.sent = a.sent || 0;
      const draw = () => {
        const q = a.m === 'queue', cons = q ? ['Повар 1', 'Повар 2', 'Повар 3'] : ['Кухня', 'Курьеры', 'Бонусы'];
        const got = cons.map(() => []);
        for (let i = 0; i < a.sent; i++) {
          const msg = '#' + (101 + i);
          if (q) { let k = i % 3; if (a.crash && k === 1) { got[1].push({ msg, lost: true }); k = 2; } got[k].push({ msg }); }
          else cons.forEach((_, k) => got[k].push({ msg }));
        }
        TR.$('[data-cons]', el).innerHTML = cons.map((c, k) => `<div class="map-con"><b>${esc(c)}</b><div class="map-msgs">${got[k].map(g => g.lost ? `<span class="map-msg" style="background:var(--bad-soft);color:var(--bad);border-color:var(--bad);text-decoration:line-through">${g.msg}</span>` : `<span class="map-msg ${q ? '' : 'v'}">${g.msg}</span>`).join('')}</div></div>`).join('');
        TR.$('[data-say]', el).innerHTML = !a.sent ? '<p class="small dim">Нажмите «Отправить».</p>' : q
          ? `<p class="small">Каждый заказ взял ровно один повар — нагрузка поделена.${a.crash ? ' Повар 2 упал, не подтвердив #102, — брокер вернул его в очередь, и заказ забрал повар 3. Ничего не потерялось и не задвоилось.' : ''} Перечитать вчерашние заказы нельзя: подтверждённое из очереди удаляется.</p>`
          : '<p class="small">Каждый подписчик получил все три события. Добавить четвёртого (антифрод) можно, не трогая отправителя. События лежат в топике по сроку хранения — их можно перечитать.</p>';
      };
      el.innerHTML = `<div class="stack">${ui.seg('qm', [{ v: 'queue', t: 'Очередь' }, { v: 'topic', t: 'Топик' }], a.m)}
        <div class="row"><button type="button" class="btn sm primary" data-send ${ctx.readonly ? 'disabled' : ''}>Отправить 3 сообщения</button><button type="button" class="btn sm ghost" data-clr ${ctx.readonly ? 'disabled' : ''}>Очистить</button>
        <label class="toggle" ${a.m === 'queue' ? '' : 'hidden'}><input type="checkbox" data-crash ${a.crash ? 'checked' : ''} ${ctx.readonly ? 'disabled' : ''}> <span>Повар 2 упал, не подтвердив</span></label></div>
        <div class="map-cons" data-cons></div><div data-say></div></div>`;
      ui.onSeg(el, (n, v) => { a.m = v; a.sent = 0; ctx.save(); ctx.rerender(); });
      TR.on(el, 'click', '[data-send]', () => { a.sent = 3; ctx.save(); draw(); ctx.ready(); });
      TR.on(el, 'click', '[data-clr]', () => { a.sent = 0; ctx.save(); draw(); });
      el.addEventListener('change', e => { if (e.target.matches('[data-crash]')) { a.crash = e.target.checked; ctx.save(); draw(); } });
      draw(); if (a.sent || ctx.readonly) ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Карта
  const links = {
    id: 'links', title: 'Разметьте карту интеграций «Минутки»',
    lead: ui.brief({
      situation: 'Вторник. Гоша вывел на доску девять связей. «Для каждой — способ общения. Помни понедельник: кому нужен ответ сейчас, кто должен узнать, кому задача одному, кому срез раз в сутки».',
      todo: ['Для каждой связи выберите способ. Стрелка на карте окрасится в его цвет.', 'Нажмите «Проверить». Засчитывается от восьми верных из девяти, и оплата с промокодами не должна уйти на брокер.'],
      look: 'Четыре вопроса к каждой связи: ждёт ли кто-то ответа на экране? Должен ли узнать каждый подписчик? Задание — одному из нескольких? Нужен ли поток или итог за сутки?'
    }),
    blank: () => ({ m: {} }),
    reference: () => ({ m: Object.fromEntries(LINKS.map(l => [l.id, l.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || {};
      let judged = !!(ctx.result || ctx.readonly);
      el.innerHTML = `<div class="stack"><div data-svg style="overflow-x:auto"></div>${legend()}<div data-m></div></div>`;
      const drawSvg = () => { TR.$('[data-svg]', el).innerHTML = mapSvg(a.m, judged, ctx.readonly); };
      let rv = null;
      if (judged) { rv = {}; LINKS.forEach(l => { const g = a.m[l.id]; if (g) rv[l.id] = { s: g === l.ok ? 'ok' : 'bad', why: g !== l.ok && !ctx.readonly && WHY[l.id][g] ? 'Нет: ' + WHY[l.id][g] + '.' : '' }; }); }
      ui.match(TR.$('[data-m]', el), { rows: LINKS.map(l => ({ id: l.id, t: `<b>${l.id.slice(1)}.</b> ${esc(l.t)}`, sub: esc(l.sub) })), choices: MODES.map(m => ({ v: m.v, t: m.t })), value: a.m, reveal: rv, readonly: ctx.readonly, placeholder: 'Способ…', onChange: v => { a.m = v; ctx.save(); if (!ctx.readonly) judged = false; drawSvg(); } });
      drawSvg();
    },
    check(ans) {
      const m = ans.m || {}, notes = [];
      const good = LINKS.filter(l => m[l.id] === l.ok).length, empty = LINKS.filter(l => !m[l.id]).length;
      const critical = ['l1', 'l2', 'l3'].filter(id => m[id] && m[id] !== 'rest');
      if (empty) notes.push({ ok: false, html: `Не размечено связей: ${empty}.` });
      LINKS.forEach(l => { const g = m[l.id]; if (g && g !== l.ok) notes.push({ ok: false, html: `${l.id.slice(1)}. ${esc(l.t)}: ${WHY[l.id][g] ? esc(WHY[l.id][g]) + '.' : 'не сходится.'}` }); });
      if (critical.length) notes.unshift({ ok: false, html: 'Человек на экране ждёт ответа — такие связи на брокер не уводят. Брокер не «современнее», он для другого.' });
      if (!notes.length) notes.push({ ok: true, html: 'Все девять связей размечены верно.' });
      return {
        ok: good >= 8 && !critical.length, score: good / LINKS.length, notes, summary: `Верно ${good} из ${LINKS.length}.`,
        mentor: m.l7 === 'pub' || m.l8 === 'pub' ? 'Спроси себя: сколько получателей должно выполнить задание «собрать заказ №1042»? Один. А сколько должно узнать, что заказ оплачен? Все подписчики.' : null
      };
    },
    flags(ans) {
      const m = ans.m || {}, f = [];
      if (m.l2 && m.l2 !== 'rest') f.push('Перевёл оплату на брокер — человек ждёт ответа на экране');
      if (m.l7 === 'pub' || m.l8 === 'pub') f.push('Путает очередь и топик: задание одному исполнителю отправил всем подписчикам');
      if (Object.values(m).length && Object.values(m).every(v => v === 'pub' || v === 'queue')) f.push('«Всё через брокер»');
      return f;
    },
    explain: `${ui.table(['Связь', 'Способ', 'Почему'], [
        ['Приложение → Заказы', 'REST', 'человек ждёт номер заказа на экране'],
        ['Заказы → Оплата', 'REST', 'ответ нужен сейчас; таймаут и ключ идемпотентности'],
        ['Заказы → Промокоды', 'REST', 'без ответа не показать цену'],
        ['Заказы → Склад, Бонусы, Аналитика', 'Pub/sub', 'ответ не нужен, нужна гарантия «узнает»; новый подписчик не трогает заказы'],
        ['Склад → Сборщики', 'Очередь', 'одно задание — одному, неподтверждённое возвращается'],
        ['Диспетчерская → Курьеры', 'Очередь', 'одному курьеру, срок жизни сообщения 20 секунд'],
        ['Заказы → Бухгалтерия', 'Batch', 'нужен итог раз в сутки, а не поток']
      ])}
      <p>Главная мысль дня: брокер — не «современнее», а <b>для другого</b>. Где человек ждёт ответа — синхронный запрос. Где «должны узнать все» — топик. Где «сделать должен один» — очередь. Где «итог за период» — выгрузка.</p>`,
    report: ans => LINKS.map(l => `- ${l.t} → ${((MODES.find(x => x.v === (ans.m || {})[l.id]) || {}).t) || '—'} ${(ans.m || {})[l.id] === l.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 2. Почему не общая таблица
  const TABLE_OPTS = [
    { t: 'Таблица заказов станет чужим API без контракта: переименовали колонку — сломали склад', ok: true, why: 'Да: читатели завязываются на внутреннюю схему базы заказов.' },
    { t: 'Пять читателей, опрашивающих таблицу раз в 5 секунд, нагружают базу заказов как раз в пик', ok: true, why: 'Да: опрос идёт всегда, даже когда ничего не изменилось, и сильнее всего — в пик.' },
    { t: 'Между двумя опросами заказ может сменить статус дважды, и промежуточный статус никто не увидит', ok: true, why: 'Да: опрос видит состояние, а не события. «Собран» и «передан курьеру» за 5 секунд — склад увидит только второе.' },
    { t: 'Базы данных не умеют хранить столько заказов', why: 'Умеют. Проблема не в объёме, а в связности и нагрузке.' },
    { t: 'SQL-запрос всегда медленнее, чем сообщение в Kafka', why: 'Не всегда и не в этом дело.' },
    { t: 'Брокер гарантирует, что каждое сообщение будет обработано ровно один раз', why: 'Не гарантирует — об этом в пятницу. И к вопросу про таблицу это не относится.' }
  ];
  const table = {
    id: 'table', title: 'Ответьте разработчику: «А давайте все просто читают таблицу заказов»',
    lead: ui.brief({
      situation: 'На обсуждении разработчик бонусов предлагает: «Зачем брокер? Пусть каждый раз в 5 секунд читает таблицу заказов и забирает новое».',
      todo: ['Выберите все верные причины, почему так делать не стоит.', 'Нажмите «Проверить».'],
      look: 'Подумайте о трёх вещах: что будет при изменении схемы, что будет с базой в пик, что увидит читатель между опросами.'
    }),
    blank: () => ({ q: [] }),
    reference: () => ({ q: TABLE_OPTS.map((o, i) => o.ok ? i : -1).filter(i => i >= 0) }),
    render(el, ctx) {
      ui.quiz(el, { q: 'Почему общая таблица — плохая замена брокеру?', multi: true, options: TABLE_OPTS, value: ctx.ans.q, readonly: ctx.readonly, reveal: ctx.result || ctx.readonly ? true : null, seed: 'map-table', onChange: v => { ctx.ans.q = v; ctx.save(); } });
    },
    check(ans) {
      const r = ui.quizScore({ multi: true, options: TABLE_OPTS }, ans.q || []);
      const notes = (ans.q || []).filter(i => !TABLE_OPTS[i].ok).map(i => ({ ok: false, html: esc(TABLE_OPTS[i].t) + ' — ' + esc(TABLE_OPTS[i].why) }));
      const miss = TABLE_OPTS.filter((o, i) => o.ok && !(ans.q || []).includes(i)).length;
      if (miss) notes.push({ ok: 'warn', html: `Названы не все причины: не хватает ${miss}.` });
      return { ok: r.ok, score: r.score, notes, summary: r.ok ? 'Все три причины названы.' : 'Не все причины названы или есть лишние.' };
    },
    explain: '<p>Общая таблица — интеграция через базу данных. Она соблазнительна, потому что «ничего не надо строить». Цена: внутренняя схема сервиса заказов становится контрактом для пятерых, нагрузка опросом растёт с каждым новым читателем, а промежуточные состояния теряются. Брокер передаёт <b>события</b> — факты о том, что случилось, — а не состояние, которое надо угадывать.</p>',
    report: ans => (ans.q || []).map(i => '- ' + TABLE_OPTS[i].t + (TABLE_OPTS[i].ok ? ' ✓' : ' ✗')).join('\n') || '—'
  };

  // =====================================================================
  // Практика 3. Новые запросы недели — перенос на незнакомое
  const NEW = [
    { id: 'n1', t: 'Антифрод хочет знать о каждом оплаченном заказе', ok: 'pub', why: { rest: 'заказы снова начнут ждать нового получателя', queue: 'событие нужно и другим подписчикам', batch: 'антифрод нужен до доставки, а не завтра' } },
    { id: 'n2', t: 'Перед оплатой проверить, что товар есть на складе: клиент ждёт', ok: 'rest', why: { pub: 'клиент ждёт ответа «есть/нет» сейчас', queue: 'клиент ждёт ответа сейчас', batch: 'остатки на завтра не помогут клиенту сейчас' } },
    { id: 'n3', t: 'Раз в сутки выгрузить 30 тысяч чеков в налоговую', ok: 'batch', why: { rest: 'нет человека, ждущего ответа', pub: 'нужен итог за сутки, а не поток', queue: 'это не задание исполнителю, а выгрузка за период' } },
    { id: 'n4', t: 'Отправить письмо с чеком после доставки: одно письмо, повторить, если почтовый сервис сбоит', ok: 'queue', why: { rest: 'заказ не должен ждать почтовый сервис', pub: 'это команда «отправь письмо» одному отправителю писем, а не факт для всех', batch: 'письмо нужно сейчас, а не утром' } },
    { id: 'n5', t: 'Пересчитать рекомендации на главной после каждого заказа', ok: 'pub', why: { rest: 'заказы не должны ждать рекомендации', queue: 'событие заказа нужно не только рекомендациям', batch: 'можно, но рекомендации станут устаревшими на сутки' } },
    { id: 'n6', t: 'Раздать курьерам ночной смены заказы на завтра — каждому по одному', ok: 'queue', why: { rest: 'раздающий не должен ждать каждого курьера', pub: 'в топике заказ получат все курьеры', batch: 'раздача — работа исполнителям, а не отчёт' } }
  ];
  const nw = {
    id: 'new', title: 'Новые запросы: выберите способ сами',
    lead: ui.brief({
      situation: 'К вечеру вторника приходят шесть новых запросов от других команд. Гоша: «Теперь без меня. Тот же разговор — но у тебя».',
      todo: ['Для каждого запроса выберите способ.', 'Нажмите «Проверить». Засчитывается от пяти верных из шести.'],
      look: 'Те же четыре вопроса, что и для карты. Если сомневаетесь между топиком и очередью — это факт («оплачен») или повеление («отправь»)?'
    }),
    blank: () => ({ m: {} }),
    reference: () => ({ m: Object.fromEntries(NEW.map(r => [r.id, r.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || {};
      let rv = null;
      if (ctx.result || ctx.readonly) { rv = {}; NEW.forEach(r => { const g = a.m[r.id]; if (g) rv[r.id] = { s: g === r.ok ? 'ok' : 'bad', why: g !== r.ok && !ctx.readonly ? 'Нет: ' + r.why[g] + '.' : '' }; }); }
      ui.match(el, { rows: NEW.map(r => ({ id: r.id, t: esc(r.t) })), choices: MODES.map(m => ({ v: m.v, t: m.t })), value: a.m, reveal: rv, readonly: ctx.readonly, placeholder: 'Способ…', onChange: v => { a.m = v; ctx.save(); } });
    },
    check(ans) {
      const m = ans.m || {}, good = NEW.filter(r => m[r.id] === r.ok).length;
      const notes = NEW.filter(r => m[r.id] && m[r.id] !== r.ok).map(r => ({ ok: false, html: `${esc(r.t)}: ${esc(r.why[m[r.id]])}.` }));
      const empty = NEW.filter(r => !m[r.id]).length; if (empty) notes.unshift({ ok: false, html: `Без ответа: ${empty}.` });
      return { ok: good >= 5, score: good / NEW.length, notes, summary: `Верно ${good} из ${NEW.length}.` };
    },
    explain: '<p>Правило, которое работает почти всегда: <b>повеление — в очередь, факт — в топик</b>. «Отправь письмо» — повеление одному исполнителю: очередь с повторами. «Заказ оплачен» — факт, который может пригодиться кому угодно: топик. Где человек ждёт ответа — синхронный запрос, где нужен итог за период — выгрузка.</p>',
    report: ans => NEW.map(r => `- ${r.t} → ${((MODES.find(x => x.v === (ans.m || {})[r.id]) || {}).t) || '—'} ${(ans.m || {})[r.id] === r.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 4. Почему пятница не повторится
  const FRI_RUBRIC = [
    'Синхронными остаются только оплата и промокод: клиент ждёт только их',
    'Склад, бонусы, пуши и аналитика узнают о заказе через брокер — заказ их не ждёт',
    'Если бонусы лягут, заказ всё равно оформится, а события дождутся их в брокере',
    'Говорит языком Лены: без «топиков» и «pub/sub», или поясняет их'
  ];
  const FRI_REF = 'Лена, раньше сервис заказов после оплаты по очереди звонил складу, курьерам, пушам, бонусам и аналитике и ждал каждого. Бонусы задумались — и ждал клиент. Теперь клиент ждёт только оплату и проверку промокода. Остальным сервис заказов оставляет запись «заказ оплачен» в общем почтовом ящике — брокере, и сразу отвечает клиенту. Склад, бонусы, пуши и аналитика забирают запись сами. Если бонусы лягут, заказ всё равно оформится, а запись дождётся бонусов и баллы начислятся, когда они поднимутся.';
  const fri = {
    id: 'friday', rubric: FRI_RUBRIC, refText: FRI_REF, title: 'Объясните Лене, почему пятница не повторится',
    lead: ui.brief({ situation: 'Лена смотрит на вашу карту: «Красиво. А по-человечески: почему в следующую пятницу всё не встанет?»', todo: ['Ответьте в 4–6 предложениях, от 250 символов, без жаргона.', 'Проверьте с Гошей или сверьте с эталоном. Засчитывается от 60 %.'], lookTitle: 'На что опереться', look: 'Лаборатория «Цепочка звонков против записки» и ваша карта.' }),
    blank: () => ({ j: {} }),
    reference: () => ({ j: { text: FRI_REF, self: FRI_RUBRIC.map(() => true) } }),
    render(el, ctx) {
      el.insertAdjacentHTML('beforeend', ui.say('lena', 'Красиво. А по-человечески: почему в следующую пятницу всё не встанет?'));
      const j = document.createElement('div'); j.style.marginTop = '12px'; el.appendChild(j);
      ui.justify(j, { id: 'map-fri', q: 'Ваш ответ Лене', qPlain: 'Продакт сервиса доставки спрашивает, почему после перевода интеграций на брокер сообщений сбой одного получателя (бонусов) больше не остановит оформление заказов. Ответ без жаргона.', rubric: FRI_RUBRIC, reference: FRI_REF, value: ctx.ans.j, readonly: ctx.readonly, minLen: 250, placeholder: 'Лена, раньше… теперь…', onChange: v => { ctx.ans.j = v; ctx.save(); ctx.decide('Почему пятница не повторится', v.text || ''); } });
    },
    check(ans) { const s = ui.justifyScore(ans && ans.j); return { ok: s >= 0.6, score: s, summary: s ? `Оценка ответа: ${Math.round(s * 100)} %.` : 'Напишите ответ и проверьте его.', notes: s && s < 0.6 ? [{ ok: false, html: 'Покажите Лене разницу «раньше — теперь»: кого ждёт клиент и что будет, если бонусы лягут.' }] : [] }; },
    explain: '<p>Хорошее объяснение заказчику строится на сравнении «было — стало» и на его страхе: «а если бонусы лягут?». Термины не нужны — нужна картинка, которую Лена перескажет директору.</p>',
    report: ans => (ans.j && ans.j.text) ? ans.j.text : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 1, order: 20, slot: 'Вт 10:00', title: 'Карта интеграций',
    when: 'вторник, 10:00 · доска в переговорной',
    intro: [
      { who: 'gosha', html: 'Вчера мы узнали, что болит. Сегодня — карта: какие связи переводим на брокер, а какие нет. Спойлер: не все. Брокер — не «современнее», а для другого.' }
    ],
    facts: ['F-subs', 'F-sync', 'F-task', 'F-down'],
    glossary: [
      { term: 'REST', simple: 'Позвонить и получить ответ: «вот номер заказа».', tech: 'Архитектурный стиль синхронного взаимодействия по HTTP: клиент отправляет запрос к ресурсу и ждёт ответа с кодом статуса.' },
      { term: 'Pub/sub (публикация и подписка)', simple: 'Доска объявлений: отправитель вешает объявление, его читают все подписчики.', tech: 'Модель обмена, при которой издатель публикует сообщение в тему (топик), а каждый подписчик получает свою копию. Издатель не знает подписчиков.' },
      { term: 'Топик', simple: 'Лента событий, которую читают все подписчики, каждый в своём темпе.', tech: 'Именованный поток сообщений в брокере. В Kafka — упорядоченный журнал, разбитый на партиции; сообщения хранятся по сроку, а не до прочтения.' },
      { term: 'Очередь', simple: 'Стопка заданий: каждое берёт один свободный исполнитель.', tech: 'Структура «точка — точка» с конкурирующими потребителями: сообщение доставляется одному потребителю и удаляется после подтверждения (ack). Типичный брокер — RabbitMQ.' },
      { term: 'Подтверждение (ack)', simple: '«Получил, сделал» — после этого задание можно убрать из стопки.', tech: 'Сигнал потребителя брокеру об успешной обработке. Сообщение без подтверждения брокер передаёт снова.' },
      { term: 'Batch (пакетная выгрузка)', simple: 'Итог за день одной пачкой, а не каждый заказ по отдельности.', tech: 'Периодическая передача накопленных данных пакетом (файл, выгрузка, ETL), когда не нужна реакция на каждое событие.' },
      { term: 'Интеграция через базу данных', simple: 'Все читают одну таблицу — и все ломаются, когда её меняют.', tech: 'Антипаттерн общей базы: внутренняя схема сервиса становится неявным контрактом для других систем.' }
    ],
    outro: 'Карта готова: синхронно — только там, где человек ждёт ответа. Завтра решаем, <b>что</b> именно публикуем в топик: какие события и что в них класть.',
    tasks: [howSync, links, table, howQT, nw, fri]
  });
})();
