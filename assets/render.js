/* 마리아동청소년상담센터 — 페이지 생성기
 * content.json 내용을 받아 각 페이지의 완성된 HTML을 만듭니다.
 * 관리자 페이지(admin.html)에서 저장할 때 이 파일로 HTML을 다시 만들어 함께 올립니다.
 */
(function (root) {
  var MENU = [
    ['index.html', 'Home'],
    ['about.html', '센터소개'],
    ['counselors.html', '상담사소개'],
    ['reservation.html', '상담신청안내'],
    ['location.html', '오시는 길']
  ];

  // 메뉴 기본값 (content.json에 menu가 없던 예전 데이터도 그대로 동작)
  var PAGE_FILE = { index: 'index.html', about: 'about.html', counselors: 'counselors.html', reservation: 'reservation.html', location: 'location.html' };
  function ensure(c) {
    if (!c.menu || !c.menu.length) {
      c.menu = MENU.map(function (m) { return { type: 'page', page: m[0].replace('.html', ''), label: m[1], show: true }; });
    }
    if (!c.pages) c.pages = {};
    return c;
  }
  function menuHref(m) {
    if (m.type === 'page') return PAGE_FILE[m.page] || 'index.html';
    if (m.type === 'custom') return 'page-' + m.id + '.html';
    return m.url || '#';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  // 줄바꿈 → <br>, **굵게** → <b>
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\r?\n/g, '<br>');
  }
  function lines(s) {
    return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function has(s) { return String(s || '').trim() !== ''; }
  function tel(p) { return 'tel:' + String(p || '').replace(/[^0-9+]/g, ''); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var Q = {
    kakao: function (k) { return 'https://map.kakao.com/link/search/' + encodeURIComponent(k); },
    naver: function (k) { return 'https://map.naver.com/p/search/' + encodeURIComponent(k); },
    tmap: function (k) { return 'tmap://search?name=' + encodeURIComponent(k); },
    google: function (a) { return 'https://maps.google.com/maps?q=' + encodeURIComponent(a) + '&z=16&output=embed'; }
  };

  function layout(c, file, title, desc, body, extraHead) {
    var s = c.site;
    var url = s.siteUrl.replace(/\/$/, '') + '/' + (file === 'index.html' ? '' : file);
    var nav = c.menu.filter(function (m) { return m.show !== false && has(m.label); }).map(function (m) {
      var href = menuHref(m), ext = m.type === 'link';
      return '<a href="' + esc(href) + '"' + (!ext && href === file ? ' class="on"' : '') +
        (ext && m.newTab !== false ? ' target="_blank" rel="noopener"' : '') + '>' + esc(m.label) + '</a>';
    }).join('\n      ');
    var firstImg = (c.home.slides && c.home.slides[0]) || s.emblem;
    var kakaoBtn = has(s.kakaoUrl) ? '<a class="kakao" href="' + esc(s.kakaoUrl) + '" target="_blank" rel="noopener">💬 카톡 상담</a>' : '';
    return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n' +
      '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n' +
      '<meta name="description" content="' + esc(desc) + '">\n' +
      '<link rel="canonical" href="' + esc(url) + '">\n' +
      '<meta property="og:type" content="website">\n<meta property="og:title" content="' + esc(title) + '">\n' +
      '<meta property="og:description" content="' + esc(desc) + '">\n<meta property="og:url" content="' + esc(url) + '">\n' +
      '<meta property="og:image" content="' + esc(s.siteUrl.replace(/\/$/, '') + '/' + firstImg) + '">\n' +
      '<meta name="naver-site-verification" content="' + esc(s.naverVerify || '') + '">\n' +
      '<meta name="google-site-verification" content="' + esc(s.googleVerify || '') + '">\n' +
      '<link rel="icon" href="' + esc(s.emblem) + '">\n' +
      '<link rel="stylesheet" href="assets/style.css">\n' + (extraHead || '') +
      '</head>\n<body>\n' +
      '<header>\n  <div class="nav">\n' +
      '    <a href="index.html" class="logo" aria-label="홈으로"><img src="' + esc(s.logo) + '" alt="' + esc(s.name) + '"></a>\n' +
      '    <nav class="menu" id="menu">\n      ' + nav + '\n    </nav>\n' +
      '    <button class="burger" id="burger" aria-label="메뉴" aria-expanded="false"><span></span><span></span><span></span></button>\n' +
      '  </div>\n  <div class="hr"></div>\n</header>\n\n<main>\n' + body + '\n</main>\n\n' +
      '<footer>\n' +
      '  <span class="line">' + esc(s.name) + '</span><span class="sep">|</span>' +
      '<span class="line">우)' + esc(s.zip) + ' ' + esc(s.address) + '</span><span class="sep">|</span>' +
      '<span class="line">사업자등록번호 ' + esc(s.bizNumber) + '</span><br>\n' +
      '  <span class="line">전화번호: <a href="' + tel(s.phone) + '">' + esc(s.phone) + '</a></span><span class="sep">|</span>' +
      '<span class="line">이메일: <a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></span><br>\n' +
      '  ' + esc(s.copyright) + '\n</footer>\n\n' +
      '<div class="callbar"><a href="' + tel(s.phone) + '">📞 ' + esc(s.phone) + '</a>' + kakaoBtn + '</div>\n' +
      '<div class="lightbox" id="lightbox"><button class="lb-x" aria-label="닫기">×</button><button class="lb-prev" aria-label="이전">‹</button><img alt=""><button class="lb-next" aria-label="다음">›</button><p></p></div>\n' +
      '<script src="assets/site.js"></script>\n</body>\n</html>\n';
  }

  function pageHome(c) {
    var h = c.home, s = c.site;
    var slides = (h.slides || []).filter(has);
    var imgs = slides.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="' + esc(s.name) + ' 사진 ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + '>';
    }).join('\n      ');
    var dots = slides.length > 1 ? '<div class="dots">' + slides.map(function (_, i) {
      return '<button' + (i === 0 ? ' class="on"' : '') + '>' + pad(i + 1) + '</button>';
    }).join('') + '</div>' : '';
    var ld = {
      '@context': 'https://schema.org', '@type': 'LocalBusiness', name: s.name,
      url: s.siteUrl + '/', telephone: s.phone, email: s.email,
      address: { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'KR' }
    };
    var body =
      '<div class="home-emblem"><img src="' + esc(s.emblem) + '" alt="' + esc(s.name) + ' 로고"></div>\n' +
      '<section class="slider">\n  <div class="wrap">\n    <div>\n' +
      '      <h1>' + fmt(h.title) + '</h1>\n' +
      '      <p>' + fmt(h.text) + '</p>\n      ' + dots + '\n    </div>\n' +
      (slides.length ? '    <div class="slides">\n      ' + imgs + '\n    </div>\n' : '') +
      '  </div>\n</section>';
    var desc = s.name + ' — ' + String(c.about.services || '').replace(/\//g, ', ') + '. 사전예약 ' + s.phone;
    return layout(c, 'index.html', s.name, desc, body,
      '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n');
  }

  function pageAbout(c) {
    var a = c.about, s = c.site;
    var hours = (a.hours || []).filter(function (x) { return has(x.day) || has(x.time); })
      .map(function (x) { return '<dt>' + esc(x.day) + '</dt><dd>' + esc(x.time) + '</dd>'; }).join('\n    ');
    var albums = (a.albums || []).filter(function (al) { return (al.photos || []).filter(has).length; });
    var gal = albums.map(function (al) {
      var ph = al.photos.filter(has);
      return '    <figure class="album" data-photos=\'' + esc(JSON.stringify(ph)) + '\' data-name="' + esc(al.name) + '">\n' +
        '      <div class="album-img">' + ph.map(function (p, i) {
          return '<img src="' + esc(p) + '" alt="' + esc(al.name) + ' ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : '') + ' loading="lazy">';
        }).join('') + (ph.length > 1 ? '<span class="count">' + ph.length + '</span>' : '') + '</div>\n' +
        '      <figcaption>' + esc(al.name) + '</figcaption>\n    </figure>';
    }).join('\n');
    var body =
      '<div class="wrap intro">\n' +
      '  <h1 class="page-title">' + fmt(a.title) + '</h1>\n' +
      (has(a.desc) ? '  <p class="desc">' + fmt(a.desc) + '</p>\n' : '') +
      (has(a.services) ? '  <p class="svc">' + fmt(a.services) + '</p>\n' : '') +
      (hours ? '  <dl class="hours">\n    ' + hours + '\n  </dl>\n' : '') +
      '</div>\n' +
      (albums.length ? '<div class="wrap">\n  <h2 class="page-title gal-title">' + fmt(a.galleryTitle) + '</h2>\n  <div class="gallery">\n' + gal + '\n  </div>\n</div>' : '');
    return layout(c, 'about.html', '센터소개 | ' + s.name, s.name + ' 센터소개 — ' + String(a.services || '').replace(/\//g, ', '), body);
  }

  var CFIELDS = [
    ['education', '학 력'], ['certs', '자격사항'], ['career', '경 력'],
    ['training', '연수 및 교육'], ['society', '학회 활동'], ['research', '연 구']
  ];
  function pageCounselors(c) {
    var s = c.site;
    var list = (c.counselors || []).filter(function (p) { return has(p.name); });
    // 첫 화면: 사진 + 이름 + 전문분야 카드
    var cards = list.map(function (p, i) {
      var full = (has(p.role) ? p.role + ' ' : '') + p.name;
      var ph = has(p.photo)
        ? '<img src="' + esc(p.photo) + '" alt="' + esc(full) + '" loading="lazy">'
        : '<span class="noimg"><img src="' + esc(s.emblem) + '" alt=""></span>';
      return '  <a class="c-card" href="#c' + (i + 1) + '">' +
        '<div class="c-card-img">' + ph + '</div>' +
        '<div class="c-card-txt">' + (has(p.role) ? '<span class="role">' + esc(p.role) + '</span>' : '') +
        '<strong>' + esc(p.name) + '</strong>' +
        (has(p.field) ? '<p>' + esc(p.field) + '</p>' : '') +
        '<span class="more">자세히 보기 →</span></div></a>';
    }).join('\n');
    // 클릭 후 상세 화면
    var details = list.map(function (p, i) {
      var full = (has(p.role) ? p.role + ' ' : '') + p.name;
      var secs = CFIELDS.filter(function (f) { return lines(p[f[0]]).length; }).map(function (f) {
        return '<h3>' + f[1] + '</h3><ul>' + lines(p[f[0]]).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      }).join('');
      var photo = has(p.photo) ? '<div class="c-photo"><img src="' + esc(p.photo) + '" alt="' + esc(full) + '" loading="lazy"></div>' : '';
      var prev = i > 0 ? '<a href="#c' + i + '">← ' + esc(list[i - 1].name) + '</a>' : '<span></span>';
      var next = i < list.length - 1 ? '<a href="#c' + (i + 2) + '">' + esc(list[i + 1].name) + ' →</a>' : '<span></span>';
      return '  <article class="c-detail" id="c' + (i + 1) + '">' +
        '<a class="c-back" href="#list">← 상담사 목록</a>' +
        '<div class="counselor' + (photo ? ' with-photo' : '') + '">' + photo + '<div class="c-body">' +
        '<h2>' + esc(full) + '</h2>' +
        (has(p.field) ? '<p class="field">전문분야: ' + esc(p.field) + '</p>' : '') + secs + '</div></div>' +
        '<div class="divider"><span></span><i></i><span></span></div>' +
        '<nav class="c-nav">' + prev + '<a href="#list">목록</a>' + next + '</nav></article>';
    }).join('\n');
    var body = '<div class="wrap cwrap">\n<h1 class="page-title" id="list">상담사소개</h1>\n' +
      '<div class="c-grid">\n' + cards + '\n</div>\n' + details + '\n</div>';
    var names = (c.counselors || []).map(function (p) { return p.name; }).filter(has).join(', ');
    return layout(c, 'counselors.html', '상담사소개 | ' + s.name, s.name + ' 상담사 소개 — ' + names, body);
  }

  var STEP_ICONS = ['📞', '📝', '🚪', '🌱', '🤝', '💬', '📋', '⭐'];
  function pageReservation(c) {
    var r = c.reservation, s = c.site;
    var steps = (r.steps || []).filter(function (x) { return has(x.title); });
    var stepHtml = steps.map(function (st, i) {
      return '    <li class="step"><div class="dot"><span class="num">' + pad(i + 1) + '</span><span class="ico">' + STEP_ICONS[i % STEP_ICONS.length] + '</span></div>' +
        '<div class="txt"><strong>' + fmt(st.title) + '</strong>' + (has(st.desc) ? '<small>' + fmt(st.desc) + '</small>' : '') + '</div></li>';
    }).join('\n');
    var hours = (r.hours || []).filter(function (x) { return has(x.day) || has(x.time); }).map(function (x) {
      return '<li><span class="d">' + esc(x.day) + '</span><span class="t">' + esc(x.time) + '</span></li>';
    }).join('');
    var body =
      '<div class="wrap notice">\n' +
      '  <h1>' + fmt(r.notice) + '</h1>\n' +
      '  <div class="contact-btns">\n' +
      '    <a class="cbtn tel" href="' + tel(s.phone) + '"><span>전화 예약</span><b>Tel. ' + esc(s.phone) + '</b></a>\n' +
      (has(s.kakaoUrl) ? '    <a class="cbtn kakao" href="' + esc(s.kakaoUrl) + '" target="_blank" rel="noopener"><span>카카오톡 채팅</span><b>💬 카톡으로 문의하기</b></a>\n' : '') +
      '  </div>\n' +
      (steps.length ? '  <h2>- ' + esc(r.stepsTitle) + ' -</h2>\n  <ol class="process" style="--n:' + steps.length + '">\n' + stepHtml + '\n  </ol>\n' : '') +
      (hours ? '  <h2>- ' + esc(r.hoursTitle) + ' -</h2>\n  <ul class="times">' + hours + '</ul>\n' : '') +
      '</div>';
    return layout(c, 'reservation.html', '상담신청안내 | ' + s.name, String(r.notice || '').replace(/"/g, '') + ' Tel. ' + s.phone, body);
  }

  function bizValue(v) {
    var t = String(v || '');
    if (/^[0-9+][0-9\- ]{6,}$/.test(t.trim())) return '<a href="' + tel(t) + '">' + esc(t) + '</a>';
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.trim())) return '<a href="mailto:' + esc(t.trim()) + '">' + esc(t) + '</a>';
    return esc(t);
  }
  function pageLocation(c) {
    var l = c.location, s = c.site, k = l.mapKeyword || s.name;
    var secs = (l.sections || []).filter(function (x) { return has(x.title) || has(x.text); }).map(function (x) {
      return (has(x.title) ? '<h3>' + esc(x.title) + '</h3>' : '') + (has(x.text) ? '<p>- ' + fmt(x.text) + '</p>' : '');
    }).join('\n      ');
    var biz = (l.biz || []).filter(function (x) { return has(x.value); }).map(function (x) {
      return '<p>' + esc(x.label) + ' : ' + bizValue(x.value) + '</p>';
    }).join('\n      ');
    var apps =
      '<a class="app kakao" href="' + Q.kakao(k) + '" target="_blank" rel="noopener"><i>K</i>카카오맵</a>' +
      '<a class="app naver" href="' + Q.naver(k) + '" target="_blank" rel="noopener"><i>N</i>네이버지도</a>' +
      '<a class="app tmap" href="' + Q.tmap(k) + '" data-tmap><i>T</i>티맵</a>';
    var body =
      '<div class="wrap">\n' +
      (has(l.mapAddress) ?
        '  <div class="mapbox">\n' +
        '    <iframe class="map" title="' + esc(s.name) + ' 위치" loading="lazy" src="' + Q.google(l.mapAddress) + '"></iframe>\n' +
        '    <button class="map-hit" id="mapHit" aria-label="길찾기 앱 선택"><span>📍 지도를 누르면 길찾기 앱으로 연결됩니다</span></button>\n' +
        '    <div class="map-sheet" id="mapSheet"><div class="sheet-in"><p>어떤 지도로 열까요?</p><div class="apps">' + apps + '</div><button class="sheet-x" id="mapClose">닫기</button><small class="tmap-note" id="tmapNote">티맵은 휴대폰에서 열립니다.</small></div></div>\n' +
        '  </div>\n  <div class="map-links">' + apps + '</div>\n' : '') +
      '  <div class="loc-row">\n    <h2>' + fmt(l.title) + '</h2>\n    <div>\n' +
      (has(l.lead) ? '      <p class="lead">' + fmt(l.lead) + '</p>\n' : '') +
      '      ' + secs + '\n    </div>\n  </div>\n' +
      (biz ? '  <div class="loc-row biz">\n    <h2>' + fmt(l.bizTitle) + '</h2>\n    <div>\n      ' + biz + '\n    </div>\n  </div>\n' : '') +
      '</div>';
    return layout(c, 'location.html', '오시는 길 | ' + s.name, s.name + ' 오시는 길 — ' + (l.mapAddress || s.address), body);
  }

  // 새로 추가한 자유 페이지 (소제목 · 내용 · 사진)
  function pageCustom(c, m) {
    var s = c.site, pg = c.pages[m.id] || {}, file = 'page-' + m.id + '.html';
    var secs = (pg.sections || []).filter(function (x) { return has(x.heading) || has(x.text) || (x.photos || []).filter(has).length; });
    var html = secs.map(function (x) {
      var ph = (x.photos || []).filter(has);
      var gal = ph.length ? '<div class="gallery cp-gallery">' + ph.map(function (p, i) {
        return '<figure class="album" data-photos=\'' + esc(JSON.stringify(ph)) + '\' data-name="' + esc(x.heading || pg.title || '') + '">' +
          '<div class="album-img"><img src="' + esc(p) + '" alt="' + esc((x.heading || pg.title || '') + ' ' + (i + 1)) + '" class="on" loading="lazy"></div></figure>';
      }).join('') + '</div>' : '';
      return '<section class="cp-sec">' + (has(x.heading) ? '<h2>' + esc(x.heading) + '</h2>' : '') +
        (has(x.text) ? '<p>' + fmt(x.text) + '</p>' : '') + gal + '</section>';
    }).join('\n');
    var body = '<div class="wrap custom-page">\n<h1 class="page-title">' + fmt(pg.title || m.label) + '</h1>\n' +
      (has(pg.intro) ? '<p class="cp-intro">' + fmt(pg.intro) + '</p>\n' : '') + html + '\n</div>';
    var desc = s.name + ' ' + (pg.title || m.label) + (has(pg.intro) ? ' — ' + String(pg.intro).replace(/\s+/g, ' ').slice(0, 120) : '');
    return layout(c, file, (pg.title || m.label) + ' | ' + s.name, desc, body);
  }

  function sitemap(c) {
    var base = c.site.siteUrl.replace(/\/$/, '');
    var urls = c.menu.filter(function (m) { return m.show !== false && m.type !== 'link'; }).map(function (m) {
      var f = menuHref(m); return '  <url><loc>' + base + '/' + (f === 'index.html' ? '' : f) + '</loc></url>\n';
    });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('') + '</urlset>\n';
  }

  function renderAll(c) {
    ensure(c);
    var out = {
      'index.html': pageHome(c),
      'about.html': pageAbout(c),
      'counselors.html': pageCounselors(c),
      'reservation.html': pageReservation(c),
      'location.html': pageLocation(c),
      'sitemap.xml': sitemap(c)
    };
    c.menu.forEach(function (m) { if (m.type === 'custom') out['page-' + m.id + '.html'] = pageCustom(c, m); });
    return out;
  }

  var api = { renderAll: renderAll, ensure: ensure, MENU: MENU, PAGE_FILE: PAGE_FILE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MaryRender = api;
})(this);
