/* 마리 홈페이지 관리자
 * - GitHub 저장소의 content.json을 불러와 편집하고
 * - 저장 시 content.json + 새 사진 + 다시 만든 페이지 HTML을 한 번의 커밋으로 올립니다.
 */
(function () {
  var LS = 'maryAdmin';
  var cfg = {}, C = null, original = null, pending = {}, dirty = false, tab = 'site', branch = 'main';

  // ---------- 공통 도우미 ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]);
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function get(path) { return path.reduce(function (o, k) { return o == null ? o : o[k]; }, C); }
  function set(path, v) {
    var o = C; for (var i = 0; i < path.length - 1; i++) o = o[path[i]];
    o[path[path.length - 1]] = v; markDirty();
  }
  function markDirty() { dirty = true; $('state').innerHTML = '<span class="dirty"></span>저장 안 된 변경 있음'; }
  function toast(t, err) {
    var m = el('div', { class: 'msg' + (err ? ' err' : ''), text: t });
    document.body.appendChild(m); setTimeout(function () { m.remove(); }, err ? 6000 : 3000);
  }
  function imgSrc(p) { return pending[p] ? pending[p].url : p; }

  // ---------- GitHub API ----------
  function gh(method, url, body) {
    return fetch('https://api.github.com/repos/' + cfg.owner + '/' + cfg.repo + url, {
      method: method,
      headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t.slice(0, 200)); });
      return r.json();
    });
  }
  function b64ToText(b64) {
    var bin = atob(b64.replace(/\n/g, '')), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(u);
  }

  // ---------- 로그인 ----------
  function login() {
    cfg = { owner: $('lgOwner').value.trim(), repo: $('lgRepo').value.trim(), token: $('lgToken').value.trim() };
    if (!cfg.owner || !cfg.repo || !cfg.token) return toast('세 칸을 모두 입력해 주세요.', true);
    $('lgBtn').disabled = true; $('lgBtn').textContent = '확인 중…';
    gh('GET', '').then(function (repo) {
      branch = repo.default_branch || 'main';
      if (!repo.permissions || !repo.permissions.push) throw new Error('이 토큰에는 저장소 쓰기 권한이 없습니다.');
      return gh('GET', '/contents/content.json?ref=' + branch);
    }).then(function (f) {
      C = MaryRender.ensure(JSON.parse(b64ToText(f.content)));
      original = JSON.parse(JSON.stringify(C));
      try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {}
      $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
      $('state').textContent = '불러오기 완료';
      buildTabs(); renderTab();
    }).catch(function (e) {
      toast('로그인 실패: ' + e.message, true);
    }).finally(function () { $('lgBtn').disabled = false; $('lgBtn').textContent = '로그인'; });
  }

  // ---------- 사진 처리 (자동 크기 줄이기) ----------
  function prepImage(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var png = file.type === 'image/png';
        var max = png ? 1000 : 1600, w = img.naturalWidth, h = img.naturalHeight;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        if (!png) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); }
        cx.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
        var type = png ? 'image/png' : 'image/jpeg';
        var data = cv.toDataURL(type, 0.85);
        var path = 'images/uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + (png ? '.png' : '.jpg');
        pending[path] = { b64: data.split(',')[1], url: data };
        res(path);
      };
      img.onerror = function () { rej(new Error(file.name + ' 사진을 읽을 수 없습니다.')); };
      img.src = url;
    });
  }
  function uploadBtn(text, multiple, onPaths) {
    var inp = el('input', { type: 'file', accept: 'image/*', multiple: multiple ? 'multiple' : null });
    inp.addEventListener('change', function () {
      var files = Array.prototype.slice.call(inp.files);
      if (!files.length) return;
      Promise.all(files.map(prepImage)).then(function (paths) { onPaths(paths); markDirty(); renderTab(); })
        .catch(function (e) { toast(e.message, true); });
    });
    return el('label', { class: 'upl' }, ['📷 ' + text, inp]);
  }

  // ---------- 입력 요소 ----------
  function field(label, path, opt) {
    opt = opt || {};
    var v = get(path) || '';
    var inp = opt.multi
      ? el('textarea', { rows: opt.rows || 3, placeholder: opt.ph || '' })
      : el('input', { type: 'text', placeholder: opt.ph || '' });
    inp.value = v;
    inp.addEventListener('input', function () { set(path, inp.value); });
    return el('div', { class: 'f' }, [el('label', { text: label }), inp, opt.hint ? el('small', { html: opt.hint }) : null]);
  }
  function ctrlBtns(arr, i, after) {
    return el('div', { class: 'ctrl' }, [
      el('button', { class: 'btn line sm', title: '위로', text: '↑', on: { click: function () { if (i > 0) { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); markDirty(); (after || renderTab)(); } } } }),
      el('button', { class: 'btn line sm', title: '아래로', text: '↓', on: { click: function () { if (i < arr.length - 1) { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); markDirty(); (after || renderTab)(); } } } }),
      el('button', { class: 'btn del sm', text: '삭제', on: { click: function () { if (confirm('삭제할까요?')) { arr.splice(i, 1); markDirty(); (after || renderTab)(); } } } })
    ]);
  }
  // 사진 여러 장 (순서 변경/삭제)
  function photoList(path, addText) {
    var arr = get(path);
    var box = el('div', { class: 'thumbs' }, arr.map(function (p, i) {
      return el('div', { class: 'thumb' }, [el('span', { class: 'no', text: String(i + 1) }), el('img', { src: imgSrc(p), alt: '' }), ctrlBtns(arr, i)]);
    }));
    return el('div', {}, [box, uploadBtn(addText || '사진 추가 (여러 장 가능)', true, function (ps) { ps.forEach(function (p) { arr.push(p); }); })]);
  }
  // 한 줄짜리 표 (예: 운영시간 요일/시간)
  function rowList(path, cols, blank, addText) {
    var arr = get(path);
    var rows = arr.map(function (o, i) {
      return el('div', { class: 'row' }, cols.map(function (c) {
        var inp = el('input', { type: 'text', placeholder: c.ph });
        inp.value = o[c.k] || '';
        inp.addEventListener('input', function () { o[c.k] = inp.value; markDirty(); });
        return inp;
      }).concat([ctrlBtns(arr, i)]));
    });
    return el('div', {}, rows.concat([el('button', { class: 'btn line sm', text: '+ ' + (addText || '줄 추가'), on: { click: function () { arr.push(JSON.parse(JSON.stringify(blank))); markDirty(); renderTab(); } } })]));
  }
  function card(title, hint, kids) {
    return el('div', { class: 'card' }, [el('h2', { text: title }), hint ? el('p', { class: 'hint', html: hint }) : null].concat(kids));
  }

  // ---------- 탭별 화면 ----------
  var TABS = [
    { id: 'site', name: '기본정보', file: 'index.html' },
    { id: 'menu', name: '메뉴', file: 'index.html' },
    { id: 'home', name: 'Home', file: 'index.html' },
    { id: 'about', name: '센터소개', file: 'about.html' },
    { id: 'counselors', name: '상담사소개', file: 'counselors.html' },
    { id: 'reservation', name: '상담신청안내', file: 'reservation.html' },
    { id: 'location', name: '오시는 길', file: 'location.html' }
  ];
  var LINE_HINT = '한 줄에 하나씩 입력하세요. 비워 두면 그 항목은 홈페이지에 표시되지 않습니다.';

  var VIEWS = {
    site: function () {
      var s = ['site'];
      function logoField(label, key) {
        var p = s.concat(key);
        return el('div', { class: 'f' }, [el('label', { text: label }),
          el('div', { class: 'one-photo' }, [el('img', { src: imgSrc(get(p)), alt: '', style: 'width:auto;max-width:200px;height:60px;object-fit:contain' }),
            uploadBtn('바꾸기', false, function (ps) { set(p, ps[0]); })])]);
      }
      return [
        card('연락처', '여기서 바꾼 전화번호·카카오톡 링크는 모든 페이지의 버튼과 하단 정보에 함께 적용됩니다.', [
          field('센터명', s.concat('name')),
          field('전화번호', s.concat('phone'), { ph: '02-375-4200', hint: '누르면 바로 전화가 걸립니다.' }),
          field('카카오톡 채팅 링크', s.concat('kakaoUrl'), { ph: 'http://pf.kakao.com/_xxxxx/chat', hint: '카카오톡 채널 관리자센터 → 채널 URL 뒤에 <b>/chat</b>을 붙이면 바로 채팅창이 열립니다. 비워 두면 카톡 버튼이 숨겨집니다.' }),
          field('이메일', s.concat('email'))
        ]),
        card('하단 정보', null, [
          el('div', { class: 'grid2' }, [field('우편번호', s.concat('zip')), field('사업자등록번호', s.concat('bizNumber'))]),
          field('주소', s.concat('address')),
          field('저작권 문구', s.concat('copyright'))
        ]),
        card('로고', 'PNG(배경 투명) 파일을 권장합니다.', [logoField('상단 로고', 'logo'), logoField('Home 가운데 로고', 'emblem')]),
        card('검색 등록 (선택)', '네이버 서치어드바이저·구글 서치콘솔에서 받은 “HTML 태그” 인증값(content=\"…\" 안의 값)만 넣으세요.', [
          field('네이버 인증값', s.concat('naverVerify')),
          field('구글 인증값', s.concat('googleVerify'))
        ])
      ];
    },

    home: function () {
      var ep = ['site', 'emblem'];
      return [
        card('가운데 로고', '홈 화면 가운데 갈색 로고입니다. PNG(배경 투명) 파일을 권장합니다. (기본정보 탭의 “Home 가운데 로고”와 같은 항목)', [
          el('div', { class: 'one-photo' }, [el('img', { src: imgSrc(get(ep)), alt: '', style: 'width:110px;height:110px;object-fit:contain;background:#fff' }),
            uploadBtn('로고 바꾸기', false, function (ps) { set(ep, ps[0]); })])
        ]),
        card('가운데 문구', '<b>**글자**</b>처럼 별표 두 개로 감싸면 굵게 표시됩니다. 줄바꿈은 그대로 반영됩니다.', [
          field('제목', ['home', 'title'], { multi: true, rows: 2 }),
          field('문구', ['home', 'text'], { multi: true, rows: 3 })
        ]),
        card('슬라이드 사진', '올린 순서대로 01, 02, 03… 으로 넘어갑니다. 가로로 긴 사진이 잘 어울립니다.', [photoList(['home', 'slides'])])
      ];
    },

    about: function () {
      var albums = C.about.albums;
      var albumEls = albums.map(function (al, i) {
        var nameInp = el('input', { type: 'text', placeholder: '예: 외부전경, 대기실, 상담실' });
        nameInp.value = al.name || '';
        nameInp.addEventListener('input', function () { al.name = nameInp.value; markDirty(); });
        return el('div', { class: 'item' }, [
          el('div', { class: 'item-head' }, [el('b', { text: '사진 묶음 ' + (i + 1) }), ctrlBtns(albums, i)]),
          el('div', { class: 'f' }, [el('label', { text: '이름 (사진 아래 표시)' }), nameInp]),
          photoList(['about', 'albums', i, 'photos'], '이 묶음에 사진 추가')
        ]);
      });
      return [
        card('위쪽 문구', null, [
          field('제목', ['about', 'title']),
          field('소개 문구', ['about', 'desc'], { multi: true }),
          field('상담 분야', ['about', 'services'], { hint: '예: 놀이심리상담/청소년상담/심리평가' }),
          el('div', { class: 'f' }, [el('label', { text: '운영시간' }), rowList(['about', 'hours'], [{ k: 'day', ph: '요일 (예: Mon - Fri)' }, { k: 'time', ph: '시간 (예: AM11 – PM08)' }], { day: '', time: '' })])
        ]),
        card('센터 사진', '사진 묶음마다 한 칸씩 표시됩니다. 한 묶음에 사진을 여러 장 올리면 그 칸에서 자동으로 넘어가고, 누르면 크게 넘겨 볼 수 있습니다.', [
          field('제목', ['about', 'galleryTitle']),
          el('div', {}, albumEls),
          el('button', { class: 'btn dark sm', text: '+ 사진 묶음 추가', on: { click: function () { albums.push({ name: '', photos: [] }); markDirty(); renderTab(); } } })
        ])
      ];
    },

    counselors: function () {
      var list = C.counselors;
      var F = [['education', '학력'], ['certs', '자격사항'], ['career', '경력'], ['training', '연수 및 교육'], ['society', '학회 활동'], ['research', '연구']];
      var items = list.map(function (p, i) {
        var base = ['counselors', i];
        var photo = has(p.photo)
          ? el('img', { src: imgSrc(p.photo), alt: '' })
          : el('div', { class: 'empty', text: '사진 없음' });
        var photoBox = el('div', { class: 'one-photo' }, [photo, el('div', {}, [
          uploadBtn(has(p.photo) ? '사진 바꾸기' : '사진 올리기', false, function (ps) { p.photo = ps[0]; }),
          has(p.photo) ? el('div', { style: 'margin-top:8px' }, [el('button', { class: 'btn del sm', text: '사진 빼기', on: { click: function () { p.photo = ''; markDirty(); renderTab(); } } })]) : null,
          el('small', { style: 'display:block;color:#8a8077;font-size:12px;margin-top:6px', text: '세로 사진(3:4) 권장. 사진이 없으면 글만 표시됩니다.' })
        ])]);
        return el('details', { class: 'item', open: i === openIdx ? 'open' : null }, [
          el('summary', { style: 'cursor:pointer;font-weight:700;margin-bottom:8px' }, [((p.role || '') + ' ' + (p.name || '(이름 없음)')).trim()]),
          el('div', { class: 'item-head' }, [el('b', { text: '' }), ctrlBtns(list, i)]),
          photoBox,
          el('div', { class: 'grid2' }, [field('직함', base.concat('role'), { ph: '소장 / 상담연구원' }), field('이름', base.concat('name'))]),
          field('전문분야', base.concat('field'))
        ].concat(F.map(function (f) { return field(f[1], base.concat(f[0]), { multi: true, rows: 3 }); })));
      });
      return [
        card('상담사', LINE_HINT + ' 순서는 ↑↓로 바꿀 수 있습니다.', items.concat([
          el('button', { class: 'btn dark sm', text: '+ 상담사 추가', on: { click: function () {
            list.push({ photo: '', role: '상담연구원', name: '', field: '', education: '', certs: '', career: '', training: '', society: '', research: '' });
            openIdx = list.length - 1; markDirty(); renderTab();
          } } })
        ]))
      ];
    },

    reservation: function () {
      return [
        card('첫 줄 안내 · 연락 버튼', '전화번호와 카카오톡 링크는 기본정보와 같은 값입니다(한 곳에서 바꾸면 모두 바뀜).', [
          field('안내 문구', ['reservation', 'notice']),
          field('전화번호 (전화 버튼)', ['site', 'phone']),
          field('카카오톡 채팅 링크 (카톡 버튼)', ['site', 'kakaoUrl'], { ph: 'http://pf.kakao.com/_xxxxx/chat', hint: '비워 두면 카톡 버튼이 숨겨집니다.' })
        ]),
        card('상담절차', '단계 이름과 설명(선택)을 적으세요. 단계 수는 자유롭게 늘리고 줄일 수 있습니다.', [
          field('제목', ['reservation', 'stepsTitle']),
          rowList(['reservation', 'steps'], [{ k: 'title', ph: '단계 이름' }, { k: 'desc', ph: '설명 (선택)' }], { title: '', desc: '' }, '단계 추가')
        ]),
        card('상담시간', null, [
          field('제목', ['reservation', 'hoursTitle']),
          rowList(['reservation', 'hours'], [{ k: 'day', ph: '요일' }, { k: 'time', ph: '시간' }], { day: '', time: '' }, '시간 추가')
        ])
      ];
    },

    location: function () {
      var secs = C.location.sections;
      var secEls = secs.map(function (s, i) {
        var t = el('input', { type: 'text', placeholder: '소제목 (예: 지하철이용시)' }); t.value = s.title || '';
        var x = el('textarea', { rows: 3, placeholder: '내용' }); x.value = s.text || '';
        t.addEventListener('input', function () { s.title = t.value; markDirty(); });
        x.addEventListener('input', function () { s.text = x.value; markDirty(); });
        return el('div', { class: 'item' }, [el('div', { class: 'item-head' }, [el('b', { text: '문단 ' + (i + 1) }), ctrlBtns(secs, i)]), el('div', { class: 'f' }, [t]), x]);
      });
      return [
        card('지도', '지도를 누르면 카카오맵·네이버지도·티맵 중 골라서 열 수 있습니다.', [
          field('지도에 표시할 주소', ['location', 'mapAddress'], { hint: '도로명 주소를 권장합니다.' }),
          field('길찾기 앱 검색어', ['location', 'mapKeyword'], { hint: '카카오맵·네이버지도·티맵에서 이 이름으로 검색해 엽니다. 지도 앱에 등록된 센터 이름과 똑같이 적어 주세요.' })
        ]),
        card('오시는 길', null, [
          field('제목', ['location', 'title']),
          field('첫 문장', ['location', 'lead'])
        ].concat(secEls).concat([
          el('button', { class: 'btn dark sm', text: '+ 문단 추가', on: { click: function () { secs.push({ title: '', text: '' }); markDirty(); renderTab(); } } })
        ])),
        card('사업자정보', '전화번호·이메일 형식은 자동으로 눌러서 연결됩니다. 값을 비우면 그 줄은 표시되지 않습니다.', [
          field('제목', ['location', 'bizTitle']),
          rowList(['location', 'biz'], [{ k: 'label', ph: '항목' }, { k: 'value', ph: '내용' }], { label: '', value: '' })
        ])
      ];
    }
  };
  var openIdx = -1;

  // ---------- 메뉴 ----------
  var PAGE_NAMES = { index: 'Home 페이지', about: '센터소개 페이지', counselors: '상담사소개 페이지', reservation: '상담신청안내 페이지', location: '오시는 길 페이지' };
  VIEWS.menu = function () {
    var list = C.menu;
    var rows = list.map(function (m, i) {
      var lab = el('input', { type: 'text', placeholder: '메뉴 이름' }); lab.value = m.label || '';
      lab.addEventListener('input', function () { m.label = lab.value; markDirty(); });
      var showBox = el('input', { type: 'checkbox' }); showBox.checked = m.show !== false;
      showBox.addEventListener('change', function () { m.show = showBox.checked; markDirty(); });
      var kind = m.type === 'page' ? PAGE_NAMES[m.page] : m.type === 'custom' ? '새로 만든 페이지' : '외부 링크';
      var extra = null;
      if (m.type === 'link') {
        var url = el('input', { type: 'text', placeholder: 'https://… (예: 네이버 블로그 주소)' }); url.value = m.url || '';
        url.addEventListener('input', function () { m.url = url.value.trim(); markDirty(); });
        var nt = el('input', { type: 'checkbox' }); nt.checked = m.newTab !== false;
        nt.addEventListener('change', function () { m.newTab = nt.checked; markDirty(); });
        extra = el('div', { class: 'row' }, [url, el('label', { style: 'white-space:nowrap;font-size:12px' }, [nt, ' 새 창으로'])]);
      }
      var ctrl = ctrlBtns(list, i, function () { buildTabs(); renderTab(); });
      if (m.type === 'page') ctrl.lastChild.remove(); // 기본 페이지는 삭제 대신 숨기기
      if (m.type === 'custom') {
        ctrl.insertBefore(el('button', { class: 'btn line sm', text: '내용 편집', on: { click: function () { tab = 'custom:' + m.id; buildTabs(); renderTab(); window.scrollTo(0, 0); } } }), ctrl.firstChild);
      }
      return el('div', { class: 'item' }, [
        el('div', { class: 'item-head' }, [el('b', { text: (i + 1) + '. ' + kind }), ctrl]),
        el('div', { class: 'row' }, [lab, el('label', { style: 'white-space:nowrap;font-size:12px' }, [showBox, ' 메뉴에 보이기'])]),
        extra
      ]);
    });
    return [
      card('상단 메뉴', '이름을 바꾸고 ↑↓로 순서를 정하세요. “메뉴에 보이기”를 끄면 메뉴에서만 빠지고 페이지는 그대로 남습니다. 기본 페이지는 삭제할 수 없고 숨기기만 됩니다.', rows.concat([
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
          el('button', { class: 'btn dark sm', text: '+ 새 페이지 추가', on: { click: function () {
            var id = Date.now().toString(36);
            list.push({ type: 'custom', id: id, label: '새 페이지', show: true });
            C.pages[id] = { title: '새 페이지', intro: '', sections: [{ heading: '', text: '', photos: [] }] };
            markDirty(); tab = 'custom:' + id; buildTabs(); renderTab(); window.scrollTo(0, 0);
          } } }),
          el('button', { class: 'btn line sm', text: '+ 외부 링크 추가 (블로그 등)', on: { click: function () {
            list.push({ type: 'link', label: '블로그', url: '', show: true, newTab: true }); markDirty(); renderTab();
          } } })
        ])
      ]))
    ];
  };

  // ---------- 새로 만든 페이지 편집 ----------
  function customView(id) {
    var pg = C.pages[id] || (C.pages[id] = { title: '', intro: '', sections: [] });
    var secs = pg.sections || (pg.sections = []);
    var secEls = secs.map(function (x, i) {
      if (!x.photos) x.photos = [];
      return el('div', { class: 'item' }, [
        el('div', { class: 'item-head' }, [el('b', { text: '문단 ' + (i + 1) }), ctrlBtns(secs, i)]),
        field('소제목', ['pages', id, 'sections', i, 'heading']),
        field('내용', ['pages', id, 'sections', i, 'text'], { multi: true, rows: 4 }),
        photoList(['pages', id, 'sections', i, 'photos'], '이 문단에 사진 추가')
      ]);
    });
    return [
      card('페이지 제목 · 소개', '메뉴 이름은 “메뉴” 탭에서 바꿉니다. **글자**는 굵게 표시됩니다.', [
        field('페이지 제목', ['pages', id, 'title']),
        field('소개 문구 (선택)', ['pages', id, 'intro'], { multi: true })
      ]),
      card('내용', '문단마다 소제목·내용·사진을 넣을 수 있습니다. 빈 칸은 표시되지 않습니다.', secEls.concat([
        el('button', { class: 'btn dark sm', text: '+ 문단 추가', on: { click: function () { secs.push({ heading: '', text: '', photos: [] }); markDirty(); renderTab(); } } })
      ]))
    ];
  }
  function allTabs() {
    var extra = (C ? C.menu : []).filter(function (m) { return m.type === 'custom'; }).map(function (m) {
      return { id: 'custom:' + m.id, name: '📄 ' + (m.label || '새 페이지'), file: 'page-' + m.id + '.html' };
    });
    return TABS.concat(extra);
  }
  function has(s) { return String(s || '').trim() !== ''; }

  function buildTabs() {
    var nav = $('tabs'); nav.innerHTML = '';
    allTabs().forEach(function (t) {
      nav.appendChild(el('button', { class: t.id === tab ? 'on' : '', text: t.name, on: { click: function () { tab = t.id; openIdx = -1; buildTabs(); renderTab(); window.scrollTo(0, 0); } } }));
    });
  }
  function renderTab() {
    var y = window.scrollY, p = $('panel'); p.innerHTML = '';
    if (tab.indexOf('custom:') === 0 && !C.menu.some(function (m) { return 'custom:' + m.id === tab; })) tab = 'menu';
    (tab.indexOf('custom:') === 0 ? customView(tab.slice(7)) : VIEWS[tab]()).forEach(function (n) { p.appendChild(n); });
    // 상담사 카드 열림 상태 유지
    if (tab === 'counselors') Array.prototype.forEach.call(p.querySelectorAll('details'), function (d, i) {
      d.addEventListener('toggle', function () { if (d.open) openIdx = i; });
    });
    window.scrollTo(0, y);
  }

  // ---------- 미리보기 ----------
  function preview() {
    var file = allTabs().filter(function (t) { return t.id === tab; })[0].file;
    var html = MaryRender.renderAll(C)[file];
    Object.keys(pending).forEach(function (p) { html = html.split(p).join(pending[p].url); });
    $('pvFrame').srcdoc = html; $('pvFrame').style.maxWidth = ''; $('pv').classList.remove('hidden');
  }

  // ---------- 저장 (한 번의 커밋) ----------
  function collectUploads(o, set) {
    if (typeof o === 'string') { if (o.indexOf('images/uploads/') === 0) set[o] = 1; }
    else if (o && typeof o === 'object') for (var k in o) collectUploads(o[k], set);
    return set;
  }
  function save() {
    // 메뉴에서 삭제한 “새 페이지”의 내용 정리
    var nowIds = {}; C.menu.forEach(function (m) { if (m.type === 'custom') nowIds[m.id] = 1; });
    Object.keys(C.pages).forEach(function (id) { if (!nowIds[id]) delete C.pages[id]; });
    var btn = $('saveBtn'); btn.disabled = true; btn.textContent = '저장 중…';
    var pages = MaryRender.renderAll(C);
    var used = collectUploads(C, {}), before = collectUploads(original, {});
    var files = [{ path: 'content.json', content: JSON.stringify(C, null, 2), encoding: 'utf-8' }];
    Object.keys(pages).forEach(function (f) { files.push({ path: f, content: pages[f], encoding: 'utf-8' }); });
    Object.keys(pending).forEach(function (p) { if (used[p]) files.push({ path: p, content: pending[p].b64, encoding: 'base64' }); });
    var removed = Object.keys(before).filter(function (p) { return !used[p]; });
    // 메뉴에서 삭제한 “새 페이지”는 html 파일도 지움
    (original.menu || []).forEach(function (m) { if (m.type === 'custom' && !nowIds[m.id]) removed.push('page-' + m.id + '.html'); });
    var headSha;
    gh('GET', '/git/ref/heads/' + branch).then(function (ref) {
      headSha = ref.object.sha;
      return gh('GET', '/git/commits/' + headSha);
    }).then(function (commit) {
      // 사진 등 파일을 하나씩 올린 뒤 한 번에 묶기
      var chain = Promise.resolve(), tree = [];
      files.forEach(function (f) {
        chain = chain.then(function () {
          return gh('POST', '/git/blobs', { content: f.content, encoding: f.encoding }).then(function (b) {
            tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha });
          });
        });
      });
      return chain.then(function () {
        removed.forEach(function (p) { tree.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
        return gh('POST', '/git/trees', { base_tree: commit.tree.sha, tree: tree });
      });
    }).then(function (t) {
      var d = new Date();
      return gh('POST', '/git/commits', { message: '홈페이지 수정 (' + d.toLocaleString('ko-KR') + ')', tree: t.sha, parents: [headSha] });
    }).then(function (c) {
      return gh('PATCH', '/git/refs/heads/' + branch, { sha: c.sha });
    }).then(function () {
      pending = {}; dirty = false; original = JSON.parse(JSON.stringify(C));
      $('state').textContent = '저장 완료 · 1~2분 뒤 홈페이지에 반영';
      toast('저장했습니다. 1~2분 뒤 홈페이지에 반영됩니다.');
      renderTab();
    }).catch(function (e) {
      toast('저장 실패: ' + e.message, true);
    }).finally(function () { btn.disabled = false; btn.textContent = '저장하기'; });
  }

  // ---------- 시작 ----------
  $('lgBtn').addEventListener('click', login);
  $('lgToken').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  $('saveBtn').addEventListener('click', save);
  $('pvBtn').addEventListener('click', preview);
  $('pvClose').addEventListener('click', function () { $('pv').classList.add('hidden'); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pvw]'), function (b) {
    b.addEventListener('click', function () { var w = b.getAttribute('data-pvw'); var f = $('pvFrame'); f.style.maxWidth = w ? w + 'px' : ''; f.style.margin = '0 auto'; });
  });
  $('logout').addEventListener('click', function (e) {
    e.preventDefault(); if (dirty && !confirm('저장하지 않은 변경이 사라집니다. 로그아웃할까요?')) return;
    try { localStorage.removeItem(LS); } catch (x) {} location.reload();
  });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  try {
    var saved = JSON.parse(localStorage.getItem(LS) || 'null');
    if (saved) { $('lgOwner').value = saved.owner; $('lgRepo').value = saved.repo; $('lgToken').value = saved.token; login(); }
  } catch (e) {}
})();
