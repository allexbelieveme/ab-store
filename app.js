/*
 * ab. — сайт приложений. Всё берётся из catalog.json — того же каталога, что у магазина ab.Store:
 * версии, даты, «что нового», ссылки. Публикация новой версии (publish.py) обновляет и сайт.
 *
 * Где открыт:
 *   • дома — с ПК (server/store_server.py, http://<ПК>:8770/): ссылки ведут прямо на компьютер, быстро;
 *   • в интернете — GitHub Pages: ссылки на GitHub, запасные — GitVerse.
 */
(function () {
  'use strict';

  var STORE_ID = 'ru.ab.store';
  var KINDS = { phone: 'Телефон', tablet: 'Планшет', tv: 'Телевизор' };
  // Windows-версии — не в каталоге магазина, а в своих репозиториях на GitHub
  var EXTRA = {
    'ru.abvpn.app': [{ label: 'Для Windows', url: 'https://github.com/allexbelieveme/ab-vpn-releases/releases/latest/download/ab.VPN.exe' }],
    'ru.myiptv.tv': [{ label: 'Для Windows', url: 'https://github.com/allexbelieveme/myiptv/raw/main/ab.TV.exe' }],
  };
  // что приложение умеет — коротко, для карточки (в каталоге есть только одна строка tagline)
  var ABOUT = {
    'ru.ab.store': 'Магазин ваших приложений: ставит, обновляет и откатывает их на телефоне, планшете и телевизоре. Дома качает с компьютера, вне дома — из интернета. Поставьте его первым — дальше всё обновляется само.',
    'ru.abvpn.app': 'VPN-клиент на ядрах sing-box и Xray: VLESS / Reality и подписки, маршрутизация «российское — напрямую». Android и Windows.',
    'ru.myiptv.tv': 'IPTV-плеер: плейлисты M3U, телепрограмма и архив передач. Пульт ТВ, касания на планшете и телефоне.',
    'ru.kinozal.tv': 'Новогодний домашний кинозал: фильмы с вашего компьютера на телевизоре, планшете и телефоне — дома по Wi‑Fi и вне дома.',
  };

  var view = document.getElementById('view');
  var catalog = null;
  var LOCAL = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);

  // ---------- утилиты ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    var y = +m[1] === new Date().getFullYear() ? '' : ' ' + m[1];
    return +m[3] + ' ' + MONTHS[+m[2] - 1] + y;
  }
  function fmtSize(b) {
    if (!b) return '';
    var mb = b / 1048576;
    return mb >= 10 ? Math.round(mb) + ' МБ' : mb >= 1 ? mb.toFixed(1).replace('.', ',') + ' МБ' : Math.round(b / 1024) + ' КБ';
  }
  function kinds(list) {
    return (list || []).map(function (k) { return KINDS[k] || k; }).join(' · ');
  }
  function host(u) {
    if (/gitverse/.test(u)) return 'GitVerse';
    if (/github/.test(u)) return 'GitHub';
    return 'компьютер';
  }
  function abs(u) { return new URL(u, location.href).href; }
  function isNew(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v && v.date || '');
    return m && (Date.now() - new Date(+m[1], +m[2] - 1, +m[3]).getTime()) < 3 * 86400000;
  }
  function app(id) { return (catalog.apps || []).filter(function (a) { return a.id === id; })[0]; }
  function latest(a) { return (a.versions || []).slice().sort(function (x, y) { return y.code - x.code; })[0]; }

  function tile(a, big) {
    return '<div class="tile' + (big ? ' big' : '') + '"><span>' + esc(a.mark || a.name.replace(/^ab\./, '').slice(0, 3)) + '<span class="dot">.</span></span></div>';
  }

  var ICON_DL = '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>';
  var ICON_QR = '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2"/></svg>';

  /** Кнопки скачивания всех сборок версии (+ Windows) и маленькие ссылки на зеркала. */
  function downloads(a, v, opts) {
    opts = opts || {};
    var builds = (v && v.builds) || [];
    var many = builds.length > 1;
    var out = '<div class="btns">';
    builds.forEach(function (b, i) {
      var label = many ? 'Для: ' + kinds(b.devices).toLowerCase() : (opts.primaryLabel || 'Скачать');
      out += '<a class="btn' + (i && !opts.allPrimary ? ' ghost' : '') + '" href="' + esc(b.url) + '" download>' + ICON_DL + esc(label) +
        (b.size ? ' <span style="font-weight:600;opacity:.75">' + fmtSize(b.size) + '</span>' : '') + '</a>';
    });
    if (!opts.noExtra) (EXTRA[a.id] || []).forEach(function (x) {
      out += '<a class="btn ghost" href="' + esc(x.url) + '">' + ICON_DL + esc(x.label) + '</a>';
    });
    if (opts.qr && builds[0]) {
      out += '<button class="btn ghost small qr-on-phone" type="button" data-qr="' + esc(abs(builds[0].url)) + '" data-cap="' + esc(a.name + ' ' + v.name) + '">' + ICON_QR + 'QR</button>';
    }
    out += '</div>';
    var mirrors = builds[0] ? (builds[0].mirrors || []) : [];
    if (mirrors.length && !opts.noMirrors) {
      out += '<div class="mirror">Если не качается: ' + mirrors.map(function (m) {
        return '<a href="' + esc(m) + '" download>' + host(m) + '</a>';
      }).join(' · ') + '</div>';
    }
    return out;
  }

  function qrSvg(url) {
    try {
      var q = qrcode(0, 'M');
      q.addData(url);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { return ''; }
  }

  // ---------- экраны ----------
  function renderApps() {
    var store = app(STORE_ID);
    var others = (catalog.apps || []).filter(function (a) { return a.id !== STORE_ID; });
    var h = '<h1>Приложения<span class="dot">.</span></h1>' +
      '<p class="lead">Мои приложения для телефона, планшета, телевизора и компьютера — свежие версии и что в них изменилось.</p>';

    if (store) {
      var sv = latest(store);
      var sb = sv && sv.builds[0];
      h += '<section class="card hero"><div class="hero-body">' +
        '<div class="hero-head">' + tile(store, true) + '<h3>ab.Store <span class="muted" style="font-weight:600;font-size:18px">' + esc(sv ? sv.name : '') + '</span></h3></div>' +
        '<p>' + esc(ABOUT[store.id] || store.tagline) + '</p>' +
        downloads(store, sv, { primaryLabel: 'Скачать магазин', qr: true }) + '</div>' +
        (sb ? '<div class="qr-side qr-only-desktop"><div class="qr">' + qrSvg(abs(sb.url)) + '</div><p class="qr-cap">Наведите камеру телефона</p></div>' : '') +
        '</section>';
    }

    h += '<div class="label">Все приложения</div><div class="grid">';
    others.forEach(function (a) {
      var v = latest(a);
      h += '<a class="card app" href="#/app/' + esc(a.id) + '">' +
        '<div class="app-head">' + tile(a) + '<div><div class="app-name">' + esc(a.name) + '</div>' +
        '<div class="app-tag">' + esc(a.tagline) + '</div></div></div>' +
        '<div class="pills"><span class="pill">' + esc(v ? v.name : '—') + '</span>' +
        (v && isNew(v) ? '<span class="pill new">Новое</span>' : '') +
        '<span class="pill">' + esc(kinds(a.devices)) + (EXTRA[a.id] ? ' · Windows' : '') + '</span></div>' +
        (v && v.notes ? '<p class="notes clamp">' + esc(v.notes) + '</p>' : '') +
        '<div class="spacer"></div>' +
        '<span class="btn ghost">Подробнее и скачать</span>' +
        '</a>';
    });
    h += '</div>';
    view.innerHTML = h;
  }

  function renderApp(id) {
    var a = app(id);
    if (!a) { location.hash = '#/'; return; }
    var vs = (a.versions || []).slice().sort(function (x, y) { return y.code - x.code; });
    var v = vs[0];
    var b = v && v.builds[0];
    var h = '<a class="back" href="#/">← Все приложения</a>' +
      '<div class="detail-head">' + tile(a, true) + '<div><h1>' + esc(a.name) + '<span class="dot">.</span></h1>' +
      '<div class="pills"><span class="pill">' + esc(kinds(a.devices)) + (EXTRA[a.id] ? ' · Windows' : '') + '</span>' +
      (v ? '<span class="pill">Версия ' + esc(v.name) + ' · ' + esc(fmtDate(v.date)) + '</span>' : '') + '</div></div></div>' +
      '<div class="cols"><div>' +
      '<section class="card"><p style="margin:0 0 16px;color:var(--text3)">' + esc(ABOUT[a.id] || a.description || a.tagline) + '</p>' +
      downloads(a, v, { qr: true }) + '</section>';
    if (v && v.notes) {
      h += '<div class="label">Что нового в ' + esc(v.name) + '</div><section class="card"><p class="notes">' + esc(v.notes) + '</p></section>';
    }
    h += '<div class="label">История версий</div><section class="card versions">';
    vs.forEach(function (x) {
      var xb = x.builds[0];
      h += '<div class="ver"><div class="ver-main"><div class="ver-name">' + esc(x.name) +
        (x === v ? ' <span class="pill new" style="margin-left:6px">последняя</span>' : '') + '</div>' +
        '<div class="ver-meta">' + esc(fmtDate(x.date)) + (xb && xb.size ? ' · ' + fmtSize(xb.size) : '') + '</div>' +
        (x.notes ? '<p class="notes">' + esc(x.notes) + '</p>' : '') + '</div>' +
        (x !== v && xb ? '<a class="btn ghost small" href="' + esc(xb.url) + '" download>' + ICON_DL + 'APK</a>' : '') + '</div>';
    });
    h += '</section></div>';
    // справа — QR для телефона (на ПК)
    if (b) {
      h += '<aside class="card qr-only-desktop" style="text-align:center">' +
        '<div class="qr" style="width:220px;height:220px;margin:0 auto">' + qrSvg(abs(b.url)) + '</div>' +
        '<p class="qr-cap">Наведите камеру телефона — скачается ' + esc(a.name) + ' ' + esc(v.name) + '</p>' +
        (a.id !== STORE_ID ? '<p class="qr-cap">Удобнее — через <a href="#/app/' + STORE_ID + '">ab.Store</a>: он сам будет обновлять</p>' : '') +
        '</aside>';
    }
    h += '</div>';
    view.innerHTML = h;
  }

  function renderNews() {
    var items = [];
    (catalog.apps || []).forEach(function (a) {
      (a.versions || []).forEach(function (v) { items.push({ a: a, v: v }); });
    });
    items.sort(function (x, y) { return (y.v.date || '').localeCompare(x.v.date || '') || y.v.code - x.v.code; });
    var h = '<h1>Что нового<span class="dot">.</span></h1><p class="lead">Все выпуски всех приложений — новые сверху.</p><div class="feed">';
    var day = '';
    items.slice(0, 80).forEach(function (it) {
      var d = fmtDate(it.v.date);
      if (d !== day) { day = d; h += '<div class="day">' + esc(d || 'без даты') + '</div>'; }
      h += '<a class="card" href="#/app/' + esc(it.a.id) + '">' + tile(it.a) + '<div style="min-width:0">' +
        '<div class="app-name" style="font-size:17px">' + esc(it.a.name) + ' ' + esc(it.v.name) + '</div>' +
        (it.v.notes ? '<p class="notes">' + esc(it.v.notes) + '</p>' : '') + '</div></a>';
    });
    view.innerHTML = h + '</div>';
  }

  function renderInstall() {
    var s = app(STORE_ID);
    var sv = s && latest(s);
    view.innerHTML =
      '<h1>Установка<span class="dot">.</span></h1>' +
      '<p class="lead">Приложения ставятся не из Google Play, а файлом APK. Это несложно — один раз разрешить, дальше всё обновляет ab.Store.</p>' +
      '<div class="steps">' +
      step('Скачайте ab.Store', 'Кнопка «Скачать магазин» на главной или QR-код с экрана компьютера. Файл — ab.Store.apk, около 1,5 МБ.' +
        (sv ? '<div style="margin-top:12px">' + downloads(s, sv, { primaryLabel: 'Скачать ab.Store ' + sv.name, noMirrors: true }) + '</div>' : '')) +
      step('Разрешите установку', 'Откройте скачанный файл. Android спросит «Разрешить установку из этого источника?» — включите для браузера (или «Файлов») и вернитесь назад.') +
      step('Play Защита', 'Если появится «Play Protect hasn’t seen this app» — это значит лишь, что приложение не из Google Play. Нажмите «Сканировать» (Google проверит файл и запомнит) или «Подробнее → Установить без проверки».') +
      step('Ставьте остальное из магазина', 'В ab.Store — все приложения. Он сам понимает, телефон это, планшет или телевизор, и ставит подходящую сборку. Обновления приходят уведомлением, по Wi‑Fi ставятся сами.') +
      step('Телевизор или приставка', 'Проще всего — из ab.Store на телефоне: вкладка «Устройства» → «Добавить телевизор» (на ТВ включите «Отладку по сети»). Или скачайте APK на флешку и откройте на ТВ файловым менеджером.') +
      step('Компьютер (Windows)', 'ab.VPN и ab.TV есть для Windows — кнопки «Для Windows» в карточках. Это один файл .exe, устанавливать не нужно.') +
      '</div>' +
      '<div class="label">Дома и вне дома</div>' +
      '<section class="card note" style="max-width:820px"><p class="notes">Дома этот же сайт открывается с компьютера — по адресу компьютера и порту 8770 (например http://192.168.3.123:8770). Файлы тогда качаются прямо с него, за секунды. Вне дома сайт и файлы — из интернета (GitHub, запасной — GitVerse).</p></section>';
  }
  function step(t, p) { return '<div class="card step"><div><h3>' + esc(t) + '</h3><p>' + p.replace(/^([^<]*)/, function (m) { return esc(m); }) + '</p></div></div>'; }

  // ---------- навигация ----------
  function route() {
    if (!catalog) return;
    var hsh = location.hash.replace(/^#\/?/, '');
    var m = /^app\/(.+)$/.exec(hsh);
    var sec = m ? 'apps' : (hsh || 'apps');
    document.querySelectorAll('.nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === sec); });
    if (m) renderApp(decodeURIComponent(m[1]));
    else if (hsh === 'news') renderNews();
    else if (hsh === 'install') renderInstall();
    else renderApps();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qr]');
    if (!b) return;
    e.preventDefault();
    var d = document.getElementById('qr');
    d.querySelector('.qr-box').innerHTML = qrSvg(b.dataset.qr);
    d.querySelector('.qr-cap').textContent = 'Наведите камеру другого телефона — скачается ' + b.dataset.cap;
    d.showModal();
  });

  document.getElementById('theme').addEventListener('click', function () {
    var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('ab.theme', t);
    document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#0F1115' : '#F4F5F7';
  });

  window.addEventListener('hashchange', route);

  // каталог лежит рядом с сайтом (дома на ПК и allexbelieveme.github.io/ab-store/),
  // а короткий адрес allexbelieveme.github.io берёт его из /ab-store/ — это тот же сайт GitHub Pages
  function getCatalog(urls) {
    var t = Math.floor(Date.now() / 60000);
    return fetch(urls[0] + '?t=' + t, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { if (urls.length > 1) return getCatalog(urls.slice(1)); throw e; });
  }
  getCatalog(['catalog.json', '/ab-store/catalog.json'])
    .then(function (c) {
      catalog = c;
      document.getElementById('updated').textContent = c.updated ? 'Каталог обновлён ' + fmtDate(c.updated) : '';
      document.getElementById('where').textContent = LOCAL ? 'Вы дома — файлы качаются с компьютера' : 'Файлы — с GitHub, запасной — GitVerse';
      route();
    })
    .catch(function (e) {
      view.innerHTML = '<h1>Приложения<span class="dot">.</span></h1><p class="lead">Не удалось загрузить каталог (' + esc(e.message) + '). Обновите страницу.</p>';
    });
})();
