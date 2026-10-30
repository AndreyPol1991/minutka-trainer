/* День 1 · Понедельник. Созвон с Леной: вопросы, без которых интеграцию через брокер не спроектировать.
   Ключ преподавателя — _dev/key/10-ask.md. */
'use strict';
(function () {
  const TR = window.TR, ui = TR.ui, esc = TR.esc;
  const ID = 'ask';

  document.head.insertAdjacentHTML('beforeend', `<style>
  .ask-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .ask-area{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--surface-2);min-width:0}
  .ask-area b{display:block;font-size:13px}.ask-area span{font-size:12px;color:var(--text-muted)}
  .ask-area.on{border-color:color-mix(in srgb,var(--ok) 55%,var(--border));background:var(--ok-soft)}
  .ask-area.on span{color:var(--ok)}
  .ask-qs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px}
  .ask-q{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface);min-width:0}
  .ask-q p{margin:0;font-size:14px;min-width:0}
  .ask-q.done{opacity:.55}.ask-q.good{border-color:color-mix(in srgb,var(--ok) 50%,var(--border))}.ask-q.bad{border-color:color-mix(in srgb,var(--bad) 50%,var(--border))}
  .ask-budget{display:flex;gap:4px;flex-wrap:wrap}.ask-budget i{width:14px;height:14px;border-radius:4px;background:var(--surface-3);display:block}
  .ask-budget i.used{background:var(--accent)}
  .ask-log{max-height:420px;overflow:auto;padding-right:4px}
  .ask-flip{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
  .ask-card{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--surface-2);text-align:left;cursor:pointer;font:inherit;color:inherit;min-height:120px}
  .ask-card .k{font:600 11px/1.2 var(--f-mono);text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)}
  .ask-card .front{font-weight:600;margin-top:6px}.ask-card .back{display:none;margin-top:6px;font-size:14px}
  .ask-card[aria-pressed="true"]{border-color:var(--bad);background:var(--bad-soft)}.ask-card[aria-pressed="true"] .back{display:block}
  .ask-calc{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .ask-calc input[type=range]{width:100%}
  .ask-out{font:600 22px/1.2 var(--f-brand)}
  .ask-bars{display:grid;gap:6px}.ask-bar{display:grid;grid-template-columns:150px 1fr 70px;gap:8px;align-items:center;font-size:13px}
  .ask-bar>div{height:14px;border-radius:6px;background:var(--surface-3);overflow:hidden}.ask-bar>div i{display:block;height:100%;background:var(--accent)}
  .ask-num{display:grid;grid-template-columns:minmax(0,1fr) 140px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--border)}
  .ask-num input{width:100%}.ask-num.ok input{border-color:var(--ok)}.ask-num.bad input{border-color:var(--bad)}
  @media (max-width:520px){.ask-num{grid-template-columns:minmax(0,1fr)}.ask-bar{grid-template-columns:100px 1fr 56px}}
  </style>`);

  // ---------- вопросы созвона ----------
  const AREAS = [
    { id: 'vol', t: 'Объёмы и пики' }, { id: 'who', t: 'Кто получает' }, { id: 'ord', t: 'Порядок' },
    { id: 'dup', t: 'Потери и дубли' }, { id: 'speed', t: 'Скорость' }, { id: 'hist', t: 'История и формат' }
  ];
  const Q = [
    { id: 'q-daily', area: 'vol', fact: 'F-daily', t: 'Сколько заказов в обычный день и как они делятся по городам?' },
    { id: 'q-peak', area: 'vol', fact: 'F-peak', t: 'Что было в акцию: сколько заказов в худшую минуту и сколько раз за жизнь меняется статус заказа?' },
    { id: 'q-subs', area: 'who', fact: 'F-subs', t: 'Кто должен узнавать, что заказ оплачен?' },
    { id: 'q-sync', area: 'who', fact: 'F-sync', t: 'От кого из них нужен ответ, пока клиент ждёт на экране?' },
    { id: 'q-order', area: 'ord', fact: 'F-order', t: 'Важно ли, в каком порядке приходят события одного заказа?' },
    { id: 'q-loss', area: 'dup', fact: 'F-loss', t: 'Что хуже: потерять событие или обработать его дважды?' },
    { id: 'q-down', area: 'dup', fact: 'F-down', t: 'Что должно происходить, если получатель — например, бонусы — лежит?' },
    { id: 'q-wh', area: 'speed', fact: 'F-wh30', t: 'Через сколько секунд склад должен узнать о новом заказе?' },
    { id: 'q-task', area: 'speed', fact: 'F-task', t: 'Как раздаются задания сборщикам и курьерам: всем сразу или одному?' },
    { id: 'q-hist', area: 'hist', fact: 'F-history', t: 'Нужна ли кому-то история событий — и за какой срок?' },
    { id: 'q-format', area: 'hist', fact: 'F-format', t: 'Кто и как часто меняет формат событий?' },
    { id: 'q-tool', bad: true, t: 'Что берём — Kafka или RabbitMQ?', who: 'lena', answer: 'Ой. Это вы мне скажите — вы же технари. Я вам рассказываю, что болит, вы мне — чем лечить.', why: 'Выбор инструмента — решение команды. Его делают из ответов заказчика про порядок, дубли, пики и историю, а не спрашивают у заказчика.' },
    { id: 'q-lang', bad: true, t: 'На каком языке пишут бэкенд?', who: 'lena', answer: 'Понятия не имею. Это к Гоше.', why: 'Это знает команда, а не заказчик. На требования к интеграции почти не влияет.' },
    { id: 'q-k8s', bad: true, t: 'Есть ли у вас Kubernetes?', who: 'lena', answer: 'Это что-то про кубики? Спросите у ребят из эксплуатации.', why: 'Инфраструктура — вопрос к эксплуатации. Минута созвона с заказчиком потрачена впустую.' },
    { id: 'q-fields', bad: true, t: 'Какие поля будут в сообщении?', who: 'lena', answer: 'А какие нужны? Вы же их и придумаете.', why: 'Поля проектирует аналитик из того, что нужно подписчикам. У заказчика спрашивают, кому и что надо знать, — это уже вопрос «кто получает».' },
    { id: 'q-team', bad: true, t: 'Сколько человек в команде?', who: 'lena', answer: 'Шестеро. А это важно для брокера?', why: 'На требования к обмену сообщениями размер команды не влияет.' }
  ];
  const GOOD = Q.filter(q => !q.bad), BAD = Q.filter(q => q.bad);
  const BUDGET = 12;
  const qById = id => Q.find(q => q.id === id);

  function evalCall(ans) {
    const asked = (ans && ans.asked || []).filter(qById);
    const good = asked.filter(id => !qById(id).bad), bad = asked.filter(id => qById(id).bad);
    const areas = new Set(good.map(id => qById(id).area));
    const score = Math.max(0, Math.min(1, (good.length - 0.5 * bad.length) / GOOD.length));
    return { asked, good, bad, areas, score, hasOrder: good.includes('q-order'), hasLoss: good.includes('q-loss'), tool: bad.includes('q-tool') };
  }

  // =====================================================================
  // Теория 1. Зачем эти вопросы: что ломается, если не спросить
  const BREAKS = [
    { k: 'Объёмы и пики', front: 'Не спросили про худшую минуту', back: 'Считаете по среднему за день — и в акцию очередь растёт быстрее, чем её разбирают. Ошибка в разы, а не в проценты.' },
    { k: 'Кто получает', front: 'Не спросили, кому нужен ответ сейчас', back: 'На брокер уезжает оплата, и клиент смотрит на крутилку: ответа «оплачено» больше нет, есть «когда-нибудь».' },
    { k: 'Порядок', front: 'Не спросили про порядок', back: 'Без ключа события одного заказа обгоняют друг друга: пуш «доставлено» приходит раньше «в пути».' },
    { k: 'Потери и дубли', front: 'Не спросили, что хуже', back: 'Брокер повторяет доставку, а бонусы не умеют узнавать повтор — и снова раздают лишние баллы.' },
    { k: 'Скорость', front: 'Не спросили, как раздаются задания', back: 'Задание сборщикам рассылают всем как событие — и пятеро бегут собирать один заказ.' },
    { k: 'История и формат', front: 'Не спросили, кто меняет формат', back: 'Поле переименуют в обычный вторник, и аналитика неделю считает ерунду. Ночью падают бонусы.' }
  ];
  const howBreak = {
    id: 'how-break', title: 'Как это работает: шесть вопросов, без которых брокер не спроектировать', covers: ['call'], free: true, noReset: true,
    simple: { icon: '📞', plain: 'Брокер сообщений — это почта между программами. Чтобы настроить почту, надо знать, сколько писем, кому, в каком порядке и что делать, если письмо пришло дважды. Это знает заказчик — но словами своего бизнеса.', analogy: 'Курьерская служба спрашивает не «каким фургоном возить», а «сколько посылок в пятницу, можно ли опоздать, что если адресата нет дома». Фургон выберет сама.', tech: 'Выявление требований к асинхронной интеграции: объём и пиковая нагрузка, состав получателей и кому нужен синхронный ответ, требования к порядку, допустимость потерь и повторов, задержка, срок хранения и изменение контракта.' },
    lead: ui.brief({ situation: 'Перед созвоном Гоша раскладывает шесть тем на столе. По каждой — карточка: что сломается, если о ней промолчать.', todo: ['Нажимайте на карточки и читайте, чем кончается молчание по каждой теме.'], look: 'Заметьте: ни одна тема не про Kafka. Все — про бизнес Лены, но каждая потом превратится в строчку конфига.' }),
    render(el, ctx) {
      const st = ctx.ans.open || (ctx.ans.open = {});
      el.innerHTML = `<div class="ask-flip">${BREAKS.map((b, i) => `<button type="button" class="ask-card" data-i="${i}" aria-pressed="${!!st[i] || ctx.readonly}"><div class="k">${esc(b.k)}</div><div class="front">${esc(b.front)}</div><div class="back">${esc(b.back)}</div></button>`).join('')}</div>
        <p class="small dim" style="margin-top:8px">Открыто ${Object.keys(st).length} из ${BREAKS.length}.</p>`;
      TR.on(el, 'click', '.ask-card', (e, b) => { if (ctx.readonly) return; st[b.dataset.i] = 1; ctx.save(); ctx.rerender(); if (Object.keys(st).length === BREAKS.length) ctx.ready(); });
      if (Object.keys(st).length === BREAKS.length) ctx.ready();
    }
  };

  // =====================================================================
  // Теория 2. Из слов заказчика — в цифры нагрузки
  const howNumbers = {
    id: 'how-numbers', title: 'Как это работает: из слов заказчика — в сообщения в секунду', covers: ['load'], free: true, noReset: true,
    simple: { icon: '🧮', plain: 'Брокер считают не в заказах, а в сообщениях в секунду. Одно действие клиента рождает несколько сообщений, и считать надо худшую минуту, а не средний день.', analogy: 'Кассы в супермаркете рассчитывают не по среднему за сутки, а по субботе в шесть вечера: ночью в среднем почти пусто, а очередь бывает в субботу.', tech: 'Пропускная способность = пиковое число операций в единицу времени × число сообщений на операцию. Среднее за сутки занижает пик в разы (у доставки еды — в 5–10 раз).' },
    lead: ui.brief({ situation: 'Соседний пример: аптечная сеть, не «Минутка». В день акции 90 тыс. заказов, в худшую минуту — 600, у заказа 4 смены статуса.', todo: ['Двигайте ползунки и смотрите, как меняется нагрузка на брокер.', 'Сравните пик со средним: во сколько раз они расходятся?'], look: 'Формула одна: заказов в минуту × событий на заказ ÷ 60 = сообщений в секунду.' }),
    render(el, ctx) {
      const a = ctx.ans; a.pm = a.pm || 600; a.ev = a.ev || 4; a.day = a.day || 90000;
      const draw = () => {
        const peak = a.pm * a.ev / 60, avg = a.day * a.ev / 86400, ratio = avg ? peak / avg : 0;
        TR.$('[data-out]', el).innerHTML = `<div class="ask-bars">
          <div class="ask-bar"><span>Пик, сообщ./с</span><div><i style="width:100%"></i></div><b class="tnum">${peak.toFixed(1)}</b></div>
          <div class="ask-bar"><span>Среднее за день</span><div><i style="width:${Math.min(100, avg / peak * 100).toFixed(1)}%;background:var(--info)"></i></div><b class="tnum">${avg.toFixed(1)}</b></div></div>
          <p class="small">Пик больше среднего в <b class="tnum">${ratio.toFixed(1)}</b> раза. Если строить по среднему, в худшую минуту каждую секунду будет копиться ${Math.max(0, peak - avg).toFixed(0)} необработанных сообщений.</p>`;
      };
      el.innerHTML = `<div class="ask-calc">
        <label class="field"><span>Заказов в худшую минуту: <b class="tnum" data-v="pm">${a.pm}</b></span><input type="range" min="100" max="2000" step="50" value="${a.pm}" data-k="pm" ${ctx.readonly ? 'disabled' : ''}></label>
        <label class="field"><span>Событий на заказ: <b class="tnum" data-v="ev">${a.ev}</b></span><input type="range" min="1" max="10" step="1" value="${a.ev}" data-k="ev" ${ctx.readonly ? 'disabled' : ''}></label>
        <label class="field"><span>Заказов за весь день акции: <b class="tnum" data-v="day">${a.day.toLocaleString('ru-RU')}</b></span><input type="range" min="10000" max="300000" step="10000" value="${a.day}" data-k="day" ${ctx.readonly ? 'disabled' : ''}></label>
      </div><div data-out style="margin-top:12px"></div>`;
      el.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; a[k] = +e.target.value; TR.$(`[data-v="${k}"]`, el).textContent = a[k].toLocaleString('ru-RU'); ctx.save(); draw(); });
      draw(); ctx.ready();
    }
  };

  // =====================================================================
  // Практика 1. Созвон
  const call = {
    id: 'call', title: 'Созвон: задайте Лене вопросы',
    lead: ui.brief({
      situation: 'Понедельник, 10:00. У Лены полчаса — это примерно двенадцать вопросов. Гоша: «Нам нужно понять, что болит, и ни одного технического решения не перекладывать на неё».',
      todo: ['Выбирайте вопросы и нажимайте «Спросить». Ответ Лены записывается в блокнот 📓 и пригодится в следующих днях.', `Вопросов не больше ${BUDGET}. Заданный вопрос не забрать — созвон не переиграть (переиграть можно только целиком, кнопкой «Сбросить ответ»).`, 'Нажмите «Проверить». Засчитывается, когда закрыто хотя бы пять тем из шести, есть вопросы про порядок и про потери и дубли, и техническое решение не переложено на Лену.'],
      look: 'Сверху — шесть тем. Тема закрывается полезным вопросом. Лишний вопрос стоит половину полезного.'
    }),
    blank: () => ({ asked: [] }),
    reference: () => ({ asked: GOOD.map(q => q.id) }),
    render(el, ctx) {
      const a = ctx.ans; a.asked = a.asked || [];
      const ev = evalCall(a), left = BUDGET - a.asked.length, judged = !!(ctx.result || ctx.readonly);
      const order = TR.shuffle(Q.map(q => q.id), 'ask-call');
      el.innerHTML = `<div class="stack">
        <div class="ask-areas">${AREAS.map(ar => { const on = ev.areas.has(ar.id); return `<div class="ask-area ${on ? 'on' : ''}"><b>${esc(ar.t)}</b><span>${on ? 'закрыто' : 'не спрошено'}</span></div>`; }).join('')}</div>
        <div class="row between"><span class="small">Вопросов осталось: <b class="tnum">${left}</b> из ${BUDGET}</span><div class="ask-budget" aria-hidden="true">${Array.from({ length: BUDGET }, (_, i) => `<i class="${i < a.asked.length ? 'used' : ''}"></i>`).join('')}</div></div>
        <div class="ask-qs">${order.map(id => {
          const q = qById(id), done = a.asked.includes(id);
          const cls = done ? 'done' + (judged ? (q.bad ? ' bad' : ' good') : '') : '';
          return `<div class="ask-q ${cls}"><p>${esc(q.t)}</p>${ctx.readonly ? '' : `<button type="button" class="btn xs ${done ? 'ghost' : ''}" data-ask="${id}" ${done || left <= 0 ? 'disabled' : ''}>${done ? 'Спрошено' : 'Спросить'}</button>`}</div>`;
        }).join('')}</div>
        ${a.asked.length ? `<div class="eyebrow">Ход созвона</div><div class="ask-log stack tight">${a.asked.map(id => {
          const q = qById(id), f = q.fact ? TR.FACTS[q.fact] : null;
          return ui.say('me', esc(q.t)) + ui.say(f ? f.who : q.who, esc(f ? f.answer : q.answer));
        }).join('')}</div>` : '<p class="small dim">Созвон ещё не начался. Начните с вопроса, без которого всё остальное не имеет смысла.</p>'}
        ${left <= 0 && !ctx.readonly ? ui.note('warn', 'Время созвона вышло', 'Лена убежала на следующую встречу. Проверьте, что получилось.') : ''}
      </div>`;
      TR.on(el, 'click', '[data-ask]', (e, b) => {
        if (ctx.readonly) return;
        const id = b.dataset.ask, q = qById(id);
        if (!q || a.asked.includes(id) || a.asked.length >= BUDGET) return;
        a.asked.push(id); ctx.save();
        if (q.fact) ctx.facts.unlock(q.fact, 'ask');
        ctx.rerender();
      });
    },
    check(ans) {
      const ev = evalCall(ans), notes = [];
      const HINT = {
        vol: 'Про объёмы ничего не известно. На что вы будете считать брокер в пятницу, когда снова будет акция?',
        who: 'Неясно, кто получает события и кому нужен ответ прямо сейчас. Как тогда решить, что уводить на брокер, а что нет?',
        ord: 'Про порядок вы не спросили. Что будет, если пуш «доставлено» придёт раньше «в пути»?',
        dup: 'Про потери и повторы вы не спросили. Брокеры иногда доставляют сообщение дважды — что тогда случится с бонусами?',
        speed: 'Про скорость и раздачу заданий не спросили. Склад может узнать через минуту? Задание сборщикам — всем или одному?',
        hist: 'Про историю и формат не спросили. Кто-то будет перечитывать события? Кто их меняет и как часто?'
      };
      AREAS.forEach(ar => { if (!ev.areas.has(ar.id)) notes.push({ ok: ['ord', 'dup'].includes(ar.id) ? false : 'warn', html: `«${esc(ar.t)}»: ${HINT[ar.id]}` }); });
      ev.bad.forEach(id => { const q = qById(id); notes.push({ ok: false, html: `Лишний вопрос «${esc(q.t)}» — ${esc(q.why)}` }); });
      if (!ev.asked.length) notes.push({ ok: false, html: 'Вы не задали ни одного вопроса.' });
      if (ev.areas.size >= 5 && !ev.bad.length) notes.push({ ok: true, html: `Закрыто тем: ${ev.areas.size} из 6, лишних вопросов нет.` });
      if (ev.asked.length && !(ev.areas.size >= 5 && ev.hasOrder && ev.hasLoss && !ev.tool)) notes.push({ ok: 'info', html: 'Созвон не переиграть по одному вопросу. Чтобы попробовать заново, нажмите «Сбросить ответ» — блокнот при этом сохранится.' });
      const ok = ev.areas.size >= 5 && ev.hasOrder && ev.hasLoss && !ev.tool && ev.score >= 0.5;
      return {
        ok, score: ok ? Math.max(ev.score, 0.8) : Math.min(ev.score, 0.75), notes,
        summary: `Полезных вопросов: ${ev.good.length} из ${GOOD.length}. Лишних: ${ev.bad.length}. Тем закрыто: ${ev.areas.size} из 6.`,
        mentor: ev.tool ? '«Kafka или RabbitMQ» — вопрос к нам с вами, а не к Лене. Она расскажет, что болит, а инструмент мы выберем сами — из её ответов про порядок, дубли и пики.' : (!ev.hasOrder ? 'Без вопроса про порядок мы в четверг не поймём, зачем вообще нужен ключ сообщения.' : null)
      };
    },
    flags(ans) {
      const ev = evalCall(ans), f = [];
      if (ev.tool) f.push('Спросил заказчика «Kafka или RabbitMQ?» — переложил техническое решение на бизнес');
      if (!ev.hasOrder) f.push('Не спросил про порядок событий');
      if (!ev.hasLoss) f.push('Не спросил, что хуже — потерять или задвоить');
      return f;
    },
    explain: `<p>Сильный созвон закрывает все шесть тем и не тратит минуты Лены на технику. Каждый ответ потом превращается в решение:</p>
      ${ui.table(['Ответ Лены', 'Во что превращается'], [
        ['Пик 1 200 заказов в минуту × ~6 событий', 'Расчёт партиций и консюмеров (четверг)'],
        ['Синхронно — только оплата и промокод', 'Карта интеграций: остальное — на брокер (вторник)'],
        ['Порядок внутри заказа важен', 'Ключ сообщения — номер заказа (четверг)'],
        ['Не терять и не начислять дважды', 'acks=all, коммит после обработки, идемпотентные бонусы (пятница)'],
        ['Задание — одному исполнителю', 'Очередь, а не топик (вторник, четверг)'],
        ['История 14 дней', 'Срок хранения топика (пятница)'],
        ['Формат меняется раз в две недели', 'Реестр схем и правила совместимости (суббота)']
      ])}
      <p>Главный красный флаг дня — «Kafka или RabbitMQ?» заказчику. Это перекладывание технического решения на человека, который не может его принять. Хороший вопрос заказчику звучит про его бизнес: «что хуже», «сколько в худшую минуту», «кто должен узнать».</p>`,
    report: ans => { const ev = evalCall(ans); return ev.asked.map(id => `- ${qById(id).bad ? '✗' : '✓'} ${qById(id).t}`).join('\n') + `\n\nТем закрыто: ${ev.areas.size} из 6 · полезных ${ev.good.length}/${GOOD.length} · лишних ${ev.bad.length}`; }
  };

  // =====================================================================
  // Практика 2. Что значат ответы Лены для интеграции
  const MEAN = [
    { id: 'm1', t: '«Пуш „доставлено“ раньше „в пути“ — и люди звонят в поддержку»', ok: 'key' },
    { id: 'm2', t: '«Бонусы на повторах начислили лишних 400 тысяч баллов»', ok: 'idem' },
    { id: 'm3', t: '«Пусть доделают, когда поднимутся, — главное, чтобы заказы оформлялись»', ok: 'async' },
    { id: 'm4', t: '«Клиент ждёт на экране, пока проходит оплата»', ok: 'sync' },
    { id: 'm5', t: '«Задание берёт один свободный сборщик, не все сразу»', ok: 'queue' },
    { id: 'm6', t: '«Аналитике нужно перечитать события за две недели»', ok: 'retention' },
    { id: 'm7', t: '«Переименовали поле — аналитика неделю считала ерунду»', ok: 'schema' },
    { id: 'm8', t: '«Пятеро получателей, а в следующем квартале — ещё антифрод»', ok: 'topic' }
  ];
  const MEAN_CH = [
    { v: 'key', t: 'Ключ сообщения — номер заказа: события заказа идут по порядку' },
    { v: 'idem', t: 'Получатель узнаёт повтор и не делает работу дважды' },
    { v: 'async', t: 'Асинхронная связь: отправитель не ждёт получателя' },
    { v: 'sync', t: 'Синхронный вызов с таймаутом: ответ нужен сейчас' },
    { v: 'queue', t: 'Очередь: каждое задание достаётся одному исполнителю' },
    { v: 'retention', t: 'Брокер хранит события 14 дней, читатель может перечитать' },
    { v: 'schema', t: 'Контракт события и проверка совместимости схемы' },
    { v: 'topic', t: 'Топик: каждый подписчик получает своё, новый подключается без правок отправителя' },
    { v: 'servers', t: 'Купить серверы помощнее' },
    { v: 'cache', t: 'Поставить кэш перед базой заказов' }
  ];
  const MEAN_WHY = {
    servers: 'мощность не лечит ни порядок, ни повторы, ни зависимость от лежащего получателя',
    cache: 'кэш ускоряет чтение, но тут речь не о скорости чтения базы'
  };
  const meaning = {
    id: 'meaning', title: 'Переведите слова Лены на язык интеграции',
    lead: ui.brief({
      situation: 'После созвона Гоша просит: «Не пересказывай мне Лену. Скажи, что из её слов следует для системы».',
      todo: ['Для каждой фразы Лены выберите техническое следствие.', 'Два варианта в списке лишние.', 'Нажмите «Проверить». Засчитывается от семи верных из восьми.'],
      look: 'Ищите не «про что фраза», а «что придётся построить, чтобы это выполнилось».'
    }),
    blank: () => ({ m: {} }),
    reference: () => ({ m: Object.fromEntries(MEAN.map(r => [r.id, r.ok])) }),
    render(el, ctx) {
      const a = ctx.ans; a.m = a.m || {};
      let rv = null;
      if (ctx.result || ctx.readonly) { rv = {}; MEAN.forEach(r => { const g = a.m[r.id]; if (g) rv[r.id] = { s: g === r.ok ? 'ok' : 'bad', why: g !== r.ok && MEAN_WHY[g] && !ctx.readonly ? 'Нет: ' + MEAN_WHY[g] + '.' : '' }; }); }
      ui.match(el, { rows: MEAN.map(r => ({ id: r.id, t: esc(r.t) })), choices: MEAN_CH, value: a.m, reveal: rv, readonly: ctx.readonly, placeholder: 'Что это значит для системы…', onChange: v => { a.m = v; ctx.save(); } });
    },
    check(ans) {
      const m = ans.m || {}, good = MEAN.filter(r => m[r.id] === r.ok).length, empty = MEAN.filter(r => !m[r.id]).length;
      const notes = [];
      if (empty) notes.push({ ok: false, html: `Без ответа: ${empty} ${TR.plural(empty, 'фраза', 'фразы', 'фраз')}.` });
      MEAN.forEach(r => { const g = m[r.id]; if (g && g !== r.ok) notes.push({ ok: false, html: `${esc(r.t)} — не сходится. ${MEAN_WHY[g] ? 'Это ' + MEAN_WHY[g] + '.' : 'Спросите себя: что придётся построить, чтобы Лена была довольна?'}` }); });
      if (m.m4 && m.m4 !== 'sync') notes.push({ ok: 'warn', html: 'Оплата — особый случай: человек ждёт ответа на экране. Что будет, если ответ придёт «когда-нибудь»?' });
      return { ok: good >= 7, score: good / MEAN.length, notes, summary: `Верно ${good} из ${MEAN.length}.` };
    },
    explain: `<p>Каждая фраза заказчика — требование, сказанное словами бизнеса. Аналитик переводит его в то, что придётся построить, и проверяет перевод вопросом «а если иначе — что увидит Лена?».</p>
      <p>Важно различать две похожие фразы: «пусть доделают потом» (асинхронно: отправитель не ждёт) и «задание берёт один» (очередь: из нескольких получателей сделает один). Первое — про <b>время</b>, второе — про <b>число получателей</b>. Это различие разберём во вторник.</p>`,
    report: ans => MEAN.map(r => `- ${r.t} → ${((MEAN_CH.find(c => c.v === (ans.m || {})[r.id]) || {}).t) || '—'} ${(ans.m || {})[r.id] === r.ok ? '✓' : '✗'}`).join('\n')
  };

  // =====================================================================
  // Практика 3. Нагрузка в пик
  const NUM = [
    { id: 'peak', t: 'Сколько сообщений в секунду получит брокер в худшую минуту акции?', ok: 120, tol: 0.5 },
    { id: 'day', t: 'Сколько событий заказов за весь день акции?', ok: 1500000, tol: 1000 },
    { id: 'avg', t: 'А в среднем за этот день — сколько сообщений в секунду? (округлите до целого)', ok: 17.4, tol: 0.7 }
  ];
  const BASIS = [
    { t: 'По худшей минуте: брокер и получатели должны выдержать пик', ok: true, why: 'Да. Среднее выглядит спокойно, а очередь копится именно в пик.' },
    { t: 'По среднему за день акции: пики сгладятся', why: 'Не сгладятся: в худшую минуту приходит в семь раз больше среднего, и лишнее копится.' },
    { t: 'По обычному дню: акции бывают редко', why: 'Именно в акцию всё и упало в пятницу.' },
    { t: 'По числу брокеров в кластере', why: 'Число брокеров — следствие расчёта, а не его основа.' }
  ];
  const parseNum = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'); return s === '' ? NaN : +s; };
  const load = {
    id: 'load', title: 'Посчитайте нагрузку в пик',
    lead: ui.brief({
      situation: 'Гоша: «Прежде чем что-то выбирать, давай цифры. Сколько сообщений в секунду получит брокер в пятницу?» Цифры возьмите из блокнота — из ответа Лены про акцию.',
      todo: ['Посчитайте три числа.', 'Выберите, по какой цифре считать мощность.', 'Нажмите «Проверить». Засчитывается, когда пик и день посчитаны верно и выбрана правильная основа расчёта.'],
      look: 'Нет цифр акции в блокноте? Нажмите плашку «Объёмы и пики: не выяснено» над заданиями — Лена ответит, но вопрос вдогонку стоит доверия.'
    }),
    blank: () => ({ n: {}, b: [] }),
    reference: () => ({ n: { peak: '120', day: '1500000', avg: '17' }, b: [0] }),
    render(el, ctx) {
      const a = ctx.ans; a.n = a.n || {}; a.b = a.b || [];
      const judged = !!(ctx.result || ctx.readonly);
      const has = TR.facts.has('F-peak') || ctx.readonly;
      el.innerHTML = `<div class="stack">
        ${has ? ui.note('info', 'Из блокнота', esc(TR.FACTS['F-peak'].text)) : ui.note('warn', 'Цифр акции в блокноте нет', 'Вы не спросили Лену про акцию. Нажмите плашку «Объёмы и пики: не выяснено» над заданиями, чтобы уточнить.')}
        <div>${NUM.map(r => { const v = parseNum(a.n[r.id]); const st = judged && a.n[r.id] ? (Math.abs(v - r.ok) <= r.tol + 0.5 * (r.id === 'avg') ? 'ok' : 'bad') : ''; return `<div class="ask-num ${st}"><label for="ask-n-${r.id}">${esc(r.t)}</label><input id="ask-n-${r.id}" type="text" inputmode="decimal" value="${esc(a.n[r.id] || '')}" data-n="${r.id}" ${ctx.readonly ? 'readonly' : ''} placeholder="число"></div>`; }).join('')}</div>
        <div data-q></div>
        ${judged && a.n.peak && a.n.avg ? `<div class="ask-bars"><div class="ask-bar"><span>Пик</span><div><i style="width:100%"></i></div><b class="tnum">120/с</b></div><div class="ask-bar"><span>Среднее за день</span><div><i style="width:14.5%;background:var(--info)"></i></div><b class="tnum">≈17/с</b></div></div>` : ''}
      </div>`;
      el.addEventListener('input', e => { const k = e.target.dataset.n; if (!k) return; a.n[k] = e.target.value; ctx.save(); });
      ui.quiz(TR.$('[data-q]', el), { q: 'По какой цифре считать мощность брокера и получателей?', options: BASIS, value: a.b, readonly: ctx.readonly, reveal: judged ? true : null, seed: 'ask-basis', onChange: v => { a.b = v; ctx.save(); } });
    },
    check(ans) {
      const n = ans.n || {}, notes = [];
      const okOf = r => { const v = parseNum(n[r.id]); return !isNaN(v) && Math.abs(v - r.ok) <= r.tol + (r.id === 'avg' ? 0.5 : 0); };
      const res = NUM.map(okOf);
      if (!res[0]) notes.push({ ok: false, html: isNaN(parseNum(n.peak)) ? 'Пиковая нагрузка не посчитана.' : 'Пик не сходится. Сколько событий рождает один заказ? И сколько секунд в минуте?' });
      if (!res[1]) notes.push({ ok: false, html: isNaN(parseNum(n.day)) ? 'События за день не посчитаны.' : 'За день не сходится: заказов за день акции × событий на заказ.' });
      if (!res[2]) notes.push({ ok: 'warn', html: 'Среднее не сходится: события за день ÷ секунд в сутках (86 400).' });
      const b = ui.quizScore({ options: BASIS }, ans.b || []);
      if (!b.ok) notes.push({ ok: false, html: (ans.b || []).length ? esc(BASIS[(ans.b || [])[0]].why) : 'Не выбрана основа расчёта.' });
      const score = (res[0] * 0.35 + res[1] * 0.2 + res[2] * 0.15 + (b.ok ? 0.3 : 0));
      if (res[0] && res[2]) notes.push({ ok: true, html: 'Пик больше среднего примерно в семь раз — вот почему пятница упала, а обычные дни нет.' });
      return { ok: res[0] && res[1] && b.ok, score, notes, summary: `Пик: ${res[0] ? 'верно' : 'нет'} · день: ${res[1] ? 'верно' : 'нет'} · среднее: ${res[2] ? 'верно' : 'нет'} · основа: ${b.ok ? 'верно' : 'нет'}.` };
    },
    flags: ans => { const b = (ans.b || [])[0]; return b != null && b !== 0 ? ['Считает мощность не по пику, а «' + BASIS[b].t.split(':')[0] + '»'] : []; },
    explain: `<p><b>Расчёт.</b> 1 200 заказов в минуту × 6 событий = 7 200 событий в минуту ÷ 60 = <b>120 сообщений в секунду</b>. За день акции: 250 000 × 6 = <b>1 500 000</b> событий. Среднее за день: 1 500 000 ÷ 86 400 ≈ <b>17 в секунду</b>.</p>
      <p>Пик в семь раз выше среднего. Кто считает по среднему, получает систему, которая в обычный день скучает, а в акцию копит очередь. Эти 120 сообщений в секунду в четверг превратятся в число партиций и консюмеров.</p>`,
    report: ans => `Пик: ${(ans.n || {}).peak || '—'} сообщ./с · за день: ${(ans.n || {}).day || '—'} · среднее: ${(ans.n || {}).avg || '—'} · основа: ${(ans.b || []).length ? BASIS[ans.b[0]].t : '—'}`
  };

  // =====================================================================
  // Практика 4. Ответ Лене про «Kafka или RabbitMQ»
  const TOOL_RUBRIC = [
    'Говорит, что выбор инструмента — решение команды, и его делают по требованиям, а не по моде',
    'Переводит на язык Лены: заказы оформляются, даже когда бонусы лежат; события не теряются; баллы не начисляются дважды',
    'Называет, от каких её ответов зависит выбор: порядок, дубли, пик, история 14 дней',
    'Обещает показать решение и его цену (сроки, риски) понятными ей словами, а не названием продукта'
  ];
  const TOOL_REF = 'Лена, название инструмента директору ничего не скажет, а выбирать его — наша работа: мы подбираем его под ваши ответы. Вы сказали, что порядок внутри заказа важен, терять нельзя, баллы дважды начислять нельзя, в худшую минуту 1 200 заказов, а аналитике нужна история за две недели. Под это мы и выберем. Директору можно сказать так: после переделки заказ оформляется, даже если бонусы или пуши лежат; ни одно событие не теряется; повторное начисление баллов невозможно. В пятницу я покажу схему и сколько это стоит по срокам.';
  const tool = {
    id: 'tool', rubric: TOOL_RUBRIC, refText: TOOL_REF, title: 'Ответьте Лене: «Так Kafka или RabbitMQ?»',
    lead: ui.brief({
      situation: 'Вечером Лена пишет в чат: «Мне директор задаст вопрос — мы что выбираем, Kafka или RabbitMQ? Что ему сказать?»',
      todo: ['Напишите ответ в 4–6 предложениях, от 250 символов.', 'Нажмите «Проверить с Гошей (Claude)» или «Сверить с эталоном самому» и честно отметьте раскрытые пункты. Засчитывается от 60 %.'],
      lookTitle: 'На что опереться', look: 'На то, что вы выяснили на созвоне. Директору важен результат для бизнеса, а не логотип продукта.'
    }),
    blank: () => ({ j: {} }),
    reference: () => ({ j: { text: TOOL_REF, self: TOOL_RUBRIC.map(() => true) } }),
    render(el, ctx) {
      el.insertAdjacentHTML('beforeend', ui.say('lena', 'Мне директор задаст вопрос — мы что выбираем, Kafka или RabbitMQ? Что ему сказать?'));
      const j = document.createElement('div'); j.style.marginTop = '12px'; el.appendChild(j);
      ui.justify(j, {
        id: 'ask-tool', q: 'Ваш ответ Лене', qPlain: 'Продакт сервиса доставки спрашивает, что ответить директору: Kafka или RabbitMQ. Ответьте ей так, чтобы она поняла, почему выбор за командой и что важно для бизнеса.',
        rubric: TOOL_RUBRIC, reference: TOOL_REF, value: ctx.ans.j, readonly: ctx.readonly, minLen: 250,
        placeholder: 'Лена, … (почему выбор за командой; что изменится для бизнеса; от чего зависит выбор; что покажете)',
        onChange: v => { ctx.ans.j = v; ctx.save(); ctx.decide('Ответ Лене про инструмент', v.text || ''); }
      });
    },
    check(ans) {
      const s = ui.justifyScore(ans && ans.j);
      return { ok: s >= 0.6, score: s, summary: s ? `Оценка ответа: ${Math.round(s * 100)} %.` : 'Напишите ответ (от 250 символов) и проверьте его.', notes: s && s < 0.6 ? [{ ok: false, html: 'Лене нужно не название продукта, а то, что изменится для её бизнеса. И она должна понять, что выбор — ваша работа, сделанная по её ответам.' }] : [] };
    },
    explain: '<p>Сильный ответ не уходит от вопроса и не читает лекцию про брокеры. Он возвращает выбор команде, переводит его в результат для бизнеса и показывает, что решение будет сделано из ответов Лены, а не из моды. Так вы сохраняете доверие заказчика и право принимать техническое решение.</p>',
    report: ans => (ans.j && ans.j.text) ? ans.j.text : '—'
  };

  // =====================================================================
  TR.stage({
    id: ID, act: 1, order: 10, slot: 'Пн 10:00', title: 'Созвон с заказчиком',
    when: 'понедельник, 10:00 · созвон с Леной',
    intro: [
      { who: 'lena', html: 'В пятницу на акции у нас всё встало. Бонусы задумались на три секунды — и люди не могли оформить заказ. Я не хочу больше таких пятниц.' },
      { who: 'gosha', html: 'Мы переводим интеграции на брокер сообщений. Но прежде чем рисовать схемы, нужно понять, что Лене важно. Сегодня задаём вопросы — правильные. От них зависит вся неделя.' }
    ],
    facts: ['F-peak', 'F-daily'],
    glossary: [
      { term: 'Брокер сообщений', simple: 'Почтовое отделение между программами: отправитель оставил письмо и пошёл дальше, получатель заберёт, когда сможет.', tech: 'Промежуточное ПО, которое принимает сообщения от отправителей (продюсеров), хранит их и доставляет получателям (консюмерам). Примеры: Apache Kafka, RabbitMQ.' },
      { term: 'Синхронный вызов', simple: 'Позвонить и ждать ответа на линии.', tech: 'Взаимодействие, при котором вызывающая сторона ждёт ответа (например, REST-запрос). Доступность и задержка получателя становятся доступностью и задержкой отправителя.' },
      { term: 'Асинхронное взаимодействие', simple: 'Оставить записку и уйти: ответ придёт потом или не нужен вовсе.', tech: 'Обмен, при котором отправитель не ждёт обработки сообщения получателем. Реализуется через брокер, очередь или журнал событий.' },
      { term: 'Пиковая нагрузка', simple: 'Худшая минута, а не средний день.', tech: 'Максимальная интенсивность запросов или сообщений за короткий интервал. По ней рассчитывают мощность, а не по среднему за сутки.' },
      { term: 'Сообщений в секунду', simple: 'Сколько писем в секунду проходит через почтовое отделение.', tech: 'Мера пропускной способности брокера и получателей. Считается как операции в секунду × сообщения на операцию.' },
      { term: 'Требование', simple: 'То, что должно выполняться, сказанное словами заказчика и переведённое в проверяемое условие.', tech: 'Условие или возможность, которой должна обладать система, чтобы решить задачу заинтересованного лица (ISO/IEC/IEEE 29148).' }
    ],
    outro: 'Отличный понедельник. У нас есть цифры пика, список получателей и главное — что Лене важно: порядок, ни потерь, ни двойных бонусов. Завтра решаем, какие связи вообще уводить на брокер.',
    tasks: [howBreak, call, meaning, howNumbers, load, tool]
  });
})();
