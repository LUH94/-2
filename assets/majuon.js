(() => {
  'use strict';

  const tabs = [...document.querySelectorAll('.talk-tab')];
  const panels = [...document.querySelectorAll('.talk-panel')];
  const hero = document.querySelector('.talk-hero');
  const heroImage = document.getElementById('hero-image');
  const desktop = window.matchMedia('(min-width: 1280px)');
  const labels = ['소통톡', '수업톡', '미래톡', '행정톡'];
  let activeIndex = 0;

  function selectTalk(index) {
    if (!Number.isInteger(index) || index < 0 || index >= tabs.length) {
      throw new Error('올바른 톡 메뉴 이름이 필요합니다.');
    }
    activeIndex = index;
    tabs.forEach((tab, current) => {
      const selected = current === index;
      tab.classList.toggle('selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[current].classList.toggle('selected', selected);
      panels[current].hidden = !selected;
    });
    heroImage.src = panels[index].dataset.background;
    hero.style.backgroundColor = index === 0 || index === 3 ? '#cddfe8' : '#e2e8ed';
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTalk(index));
    tab.addEventListener('focus', () => selectTalk(index));
    tab.addEventListener('mouseenter', () => { if (desktop.matches) selectTalk(index); });
    tab.addEventListener('keydown', event => {
      const targets = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const next = targets[event.key];
      selectTalk(next);
      tabs[next].focus();
    });
  });
  document.querySelectorAll('[data-talk-hover], .talk-panel').forEach(region => {
    region.addEventListener('mouseenter', () => {
      if (desktop.matches) selectTalk(Number(region.dataset.talkHover ?? region.dataset.talkIndex));
    });
  });

  function restoreTalk() {
    const index = panels.findIndex(panel => '#' + panel.id === window.location.hash);
    selectTalk(index >= 0 ? index : activeIndex);
    if (index >= 0 && !desktop.matches) {
      document.getElementById('mobile-' + panels[index].id).scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', restoreTalk);
  window.addEventListener('pageshow', restoreTalk);
  restoreTalk();

  const today = new Date();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('current-date').textContent = `${today.getMonth() + 1}월 ${today.getDate()}일(${weekday[today.getDay()]})`;
  document.getElementById('dismiss-schedule').addEventListener('click', () => {
    document.getElementById('schedule-bar').hidden = true;
  });

  document.querySelectorAll('[data-open-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      document.getElementById(button.dataset.openDialog).showModal();
    });
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  });

  let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sameDay = (left, right) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  function renderCalendar() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    document.getElementById('calendar-month').textContent = `${year}년 ${month + 1}월`;
    const days = document.getElementById('calendar-days');
    days.replaceChildren();
    for (let blank = 0; blank < calendarMonth.getDay(); blank++) days.appendChild(document.createElement('span'));
    const count = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= count; day++) {
      const date = new Date(year, month, day);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day);
      button.setAttribute('aria-label', `${year}년 ${month + 1}월 ${day}일`);
      button.setAttribute('aria-pressed', String(sameDay(date, selectedDate)));
      if (sameDay(date, today)) button.setAttribute('aria-current', 'date');
      button.addEventListener('click', () => {
        selectedDate = date;
        days.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      });
      days.appendChild(button);
    }
  }
  document.getElementById('previous-month').addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  renderCalendar();

  const chatbot = document.querySelector('.chatbot-area iframe');
  window.addEventListener('resize', () => {
    chatbot.style.height = `${window.innerWidth < 768 ? 270 : window.innerWidth < 851 ? 180 : 151}px`;
  });
  window.addEventListener('message', event => {
    if (event.origin !== 'https://aitalk.cne.go.kr' || event.source !== chatbot.contentWindow) return;
    if (event.data?.type !== 'SEARCH_SUBMIT' || typeof event.data.message !== 'string') return;
    const url = new URL('https://aitalk.cne.go.kr/');
    url.searchParams.set('message', event.data.message);
    window.open(url.href, '_blank', 'noopener,noreferrer');
  });

  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'show_talk_section',
        title: '톡 메뉴 열기',
        description: '소통톡, 수업톡, 미래톡 또는 행정톡을 화면에 펼칩니다. 외부 사이트를 열지 않습니다.',
        inputSchema: { type: 'object', properties: { section: { type: 'string', enum: labels } }, required: ['section'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const index = labels.indexOf(input?.section);
          selectTalk(index);
          return { section: labels[index], visible: true };
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Optional browser integration must not block the page. */ }
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  }
})();
