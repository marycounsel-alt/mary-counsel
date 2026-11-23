(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // 모바일 메뉴
  var burger = $('#burger'), menu = $('#menu');
  if (burger) burger.addEventListener('click', function () {
    burger.setAttribute('aria-expanded', menu.classList.toggle('open'));
  });

  // 상담사: 카드를 누르면 상세 화면을 맨 위부터 보여주기
  function topOnDetail() { if (/^#c\d+$/.test(location.hash)) window.scrollTo(0, 0); }
  window.addEventListener('hashchange', topOnDetail); topOnDetail();

  // 홈 슬라이드 (01 02 03 …, 5초마다 자동)
  var slides = $$('.slides img'), dots = $$('.dots button');
  if (slides.length > 1) {
    var cur = 0, timer;
    var go = function (i) {
      cur = i;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    };
    var auto = function () { clearInterval(timer); timer = setInterval(function () { go((cur + 1) % slides.length); }, 5000); };
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); auto(); }); });
    auto();
  }

  // 센터 사진: 사진이 여러 장인 앨범은 자동으로 넘어감
  $$('.album').forEach(function (al, idx) {
    var imgs = $$('.album-img img', al);
    if (imgs.length < 2) return;
    var i = 0;
    setTimeout(function () {
      setInterval(function () {
        imgs[i].classList.remove('on'); i = (i + 1) % imgs.length; imgs[i].classList.add('on');
      }, 3500);
    }, idx * 700);
  });

  // 사진 크게 보기 (좌우 넘기기)
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('img', lb), lbCap = $('p', lb), list = [], name = '', pos = 0;
    var show = function () {
      lbImg.src = list[pos];
      lbCap.textContent = name + (list.length > 1 ? '  ' + (pos + 1) + ' / ' + list.length : '');
      $('.lb-prev', lb).style.display = $('.lb-next', lb).style.display = list.length > 1 ? '' : 'none';
    };
    var move = function (d) { pos = (pos + d + list.length) % list.length; show(); };
    var close = function () { lb.classList.remove('on'); };
    $$('.album').forEach(function (al) {
      al.addEventListener('click', function () {
        list = JSON.parse(al.getAttribute('data-photos') || '[]'); name = al.getAttribute('data-name') || '';
        var on = $('.album-img img.on', al), all = $$('.album-img img', al);
        pos = Math.max(0, all.indexOf(on)); show(); lb.classList.add('on');
      });
    });
    $('.lb-prev', lb).addEventListener('click', function (e) { e.stopPropagation(); move(-1); });
    $('.lb-next', lb).addEventListener('click', function (e) { e.stopPropagation(); move(1); });
    $('.lb-x', lb).addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1);
    });
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1); });
  }

  // 지도 클릭 → 카카오맵 / 네이버지도 / 티맵 선택
  var hit = $('#mapHit'), sheet = $('#mapSheet');
  if (hit && sheet) {
    hit.addEventListener('click', function () { sheet.classList.add('on'); });
    $('#mapClose').addEventListener('click', function () { sheet.classList.remove('on'); });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.classList.remove('on'); });
  }
  // 티맵은 앱 전용 → PC에서는 안내
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  $$('[data-tmap]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (mobile) return;
      e.preventDefault();
      var note = $('#tmapNote');
      if (note) { sheet.classList.add('on'); note.classList.add('on'); }
    });
  });
})();
