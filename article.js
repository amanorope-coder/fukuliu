/* =====================================================================
   伏流 — 記事ページ（article.js）
   記事HTMLには「見出し・カバー写真・本文」だけが入っていて、
   ヘッダー／読んだ深さ／シェア／いいね・コメント／ほかの記事／フッターはここで差し込む。
   （デザインを直すときは article.css と このファイルだけ直せば全記事に反映される）
   ===================================================================== */
(function () {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const NS = 'http://www.w3.org/2000/svg';
    const ROOT = '../';
    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CATS = { essay: 'エッセイ', critique: '批評', blog: 'ブログ', art: '美術', dialogue: '対談', review: '展示レビュー' };
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
    const main = $('main.ar');
    if (!main) return;
    const ID = location.pathname.replace(/.*\//, '').replace('.html', '') || 'article';

    // ------------------------------------------------------------ ヘッダー・メニュー
    const NAV = [['#top', '地上', '±0'], ['#article', '記事', '−8m'], ['#radio', '配信', '−20m'], ['#people', '人物', '−34m'], ['#bedrock', '古層', '−50m']];
    document.body.insertAdjacentHTML('afterbegin', `
        <header class="hd" id="hd">
            <a class="hd__logo" href="${ROOT}index.html" aria-label="伏流 トップへ"><img src="${ROOT}fukuryu-logo.png" alt="伏流"></a>
            <nav class="hd__nav" aria-label="層の一覧">${NAV.map(([h, n, d]) => `<a href="${ROOT}index.html${h}"${h === '#article' ? ' class="is-on"' : ''}><b>${n}</b><small>${d}</small></a>`).join('')}</nav>
            <button class="hd__menu" id="menu-open" type="button" aria-expanded="false" aria-controls="menu"><i></i>潜る</button>
        </header>
        <div class="menu" id="menu" aria-hidden="true">
            <div class="menu__top"><img src="${ROOT}fukuryu-logo.png" alt="伏流"><button class="menu__close" id="menu-close" type="button">閉じる</button></div>
            <nav class="menu__col">${NAV.map(([h, n, d]) => `<a href="${ROOT}index.html${h}">${n}<small>${d === '±0' ? 'GL ±0.0m' : d}</small></a>`).join('')}</nav>
        </div>
        <div class="ar-progress" aria-hidden="true"><i><span id="ar-depth">−8.0m</span></i></div>
        <div class="ar-mprog" aria-hidden="true"></div>`);
    const menu = $('#menu'), open = $('#menu-open');
    const setMenu = on => { menu.classList.toggle('is-open', on); menu.setAttribute('aria-hidden', String(!on)); open.setAttribute('aria-expanded', String(on)); document.body.style.overflow = on ? 'hidden' : ''; };
    open.addEventListener('click', () => setMenu(true));
    $('#menu-close').addEventListener('click', () => setMenu(false));

    // ヘッダー下の稜線（右のメニューの下は直線）
    function ridge() {
        const hd = $('#hd'), W = hd.clientWidth, H = hd.offsetHeight, base = H - 1;
        const nav = $('.hd__nav'), btn = $('.hd__menu');
        const right = nav.offsetWidth ? nav : btn;
        const stop = right ? right.getBoundingClientRect().left - 28 : W;
        const r = rng(1859), peaks = [];
        let x = 18 + r() * 40;
        while (x < stop - 50) {
            const w = 70 + r() * 190, h = 6 + r() * 9;
            peaks.push({ c: x + w * 0.5, w, h });
            if (r() < 0.75) peaks.push({ c: x + w * (0.15 + r() * 0.7), w: w * (0.35 + r() * 0.2), h: h * (0.5 + r() * 0.35) });
            x += w * (0.45 + r() * 0.55) + r() * 70;
        }
        const pts = [];
        for (let px = 0; px <= W; px += 3) {
            let h = 0;
            if (px < stop) {
                peaks.forEach(p => { const t = Math.abs(px - p.c) / (p.w / 2); if (t < 1) h = Math.max(h, p.h * Math.pow(1 - t, 1.25)); });
                if (h > 1) h += (r() - 0.5) * 1.8;
                h *= Math.min(1, (stop - px) / 60);
            }
            pts.push([px, base - Math.max(0, h)]);
        }
        pts.push([W, base]);
        let svg = $('.hd__ridge', hd);
        if (!svg) { svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'hd__ridge'); svg.innerHTML = '<path/>'; hd.appendChild(svg); }
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        $('path', svg).setAttribute('d', 'M' + pts.map(p => `${p[0]} ${p[1].toFixed(1)}`).join(' L'));
        hd.style.clipPath = `polygon(0 0, ${W}px 0, ${W}px ${H + 1}px, ${pts.slice().reverse().map(p => `${p[0]}px ${(p[1] + 1).toFixed(1)}px`).join(', ')})`;
    }

    // ------------------------------------------------------------ 記事の頭：左にカテゴリのタブ、右に題
    const CAT_EN = { essay: 'ESSAY', critique: 'CRITIQUE', blog: 'BLOG', art: 'ART', dialogue: 'DIALOGUE', review: 'REVIEW' };
    const head = $('.ar-head');
    const cat = main.dataset.cat || 'essay';
    if (head) {
        const inner = $('.ar-head__in', head);
        const date = ($('.ar-meta time', head) || {}).textContent || '';
        if (inner && !$('.ar-badge', inner)) {
            const mainBox = document.createElement('div');
            mainBox.className = 'ar-head__main';
            while (inner.firstChild) mainBox.appendChild(inner.firstChild);
            mainBox.insertAdjacentHTML('afterbegin', `<p class="ar-crumb"><a href="${ROOT}index.html#article">ARTICLE</a><span>記事層 −8m</span></p>`);
            inner.insertAdjacentHTML('afterbegin', `
                <div class="ar-badge cat--${esc(cat)}" aria-hidden="true">
                    <span class="ar-badge__en">${esc(CAT_EN[cat] || 'ARTICLE')}</span>
                    <span class="ar-badge__jp">${esc(CATS[cat] || '記事')}</span>
                    <img class="ar-badge__logo" src="${ROOT}fukuryu-logo.png" alt="">
                    <time class="ar-badge__date">${esc(date)}</time>
                </div>`);
            inner.appendChild(mainBox);
        }
        const by = $('.ar-by', head);
        if (by && !by.dataset.done) { by.dataset.done = '1'; by.innerHTML = `<span>text</span>${by.innerHTML}`; }
    }
    if ($('.ar-cover')) main.classList.add('has-cover');

    // カバー写真はふわっと
    const cover = $('.ar-cover img');
    if (cover) { const on = () => cover.classList.add('is-in'); if (cover.complete) on(); else { cover.addEventListener('load', on); cover.addEventListener('error', on); } }

    // ------------------------------------------------------------ 本文のあと：シェアと戻る
    const body = $('.ar-body');
    const title = ($('.ar-title') || {}).textContent || document.title;
    if (body) {
        const url = location.href.split('#')[0];
        body.insertAdjacentHTML('beforeend', `
            <div class="ar-after">
                <span class="ar-after__label">SHARE</span>
                <button class="ar-share" type="button" id="ar-copy">URLをコピー</button>
                <a class="ar-share" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title + ' — 伏流')}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer">X でシェア</a>
                <a class="ar-back" href="${ROOT}index.html#article">記事層に戻る ↑</a>
            </div>`);
        $('#ar-copy').addEventListener('click', e => {
            const b = e.currentTarget;
            const done = () => { b.textContent = 'コピーしました'; b.classList.add('is-done'); setTimeout(() => { b.textContent = 'URLをコピー'; b.classList.remove('is-done'); }, 2000); };
            if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
        });
    }

    // ------------------------------------------------------------ いいね・コメント（このブラウザに保存）
    const LK = 'fk_likes_' + ID, LD = 'fk_liked_' + ID, CM = 'fk_comments_' + ID;
    main.insertAdjacentHTML('beforeend', `
        <section class="ar-react">
            <div class="ar-react__in">
                <div>
                    <h2>反応<small>REACTION</small></h2>
                    <button class="like-btn" id="like-btn" type="button" aria-label="いいね">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        <span id="like-count">0</span>
                    </button>
                    <p class="reaction-note">※ いいね・コメントはこのブラウザにだけ保存されます</p>
                </div>
                <div>
                    <form class="comment-form" id="comment-form">
                        <input type="text" id="comment-nick" placeholder="ニックネーム" required maxlength="30">
                        <textarea id="comment-text" placeholder="感想や問いを残す…" required maxlength="500" rows="4"></textarea>
                        <button type="submit" class="comment-submit">残す</button>
                    </form>
                    <div id="comments-list"></div>
                </div>
            </div>
        </section>`);
    const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
    const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    function likeUI() { $('#like-btn').classList.toggle('is-liked', get(LD) === '1'); $('#like-count').textContent = parseInt(get(LK, '0'), 10) || 0; }
    $('#like-btn').addEventListener('click', () => {
        const liked = get(LD) === '1', n = parseInt(get(LK, '0'), 10) || 0;
        set(LD, liked ? '0' : '1'); set(LK, String(liked ? Math.max(0, n - 1) : n + 1)); likeUI();
    });
    function comments() { try { return JSON.parse(get(CM, '[]')) || []; } catch (e) { return []; } }
    function renderComments() {
        const list = comments();
        $('#comments-list').innerHTML = list.length
            ? list.map(c => `<div class="comment-item"><div class="comment-meta"><span class="comment-nick">${esc(c.nick)}</span><span class="comment-date">${esc(c.date)}</span></div><p class="comment-body">${esc(c.text)}</p></div>`).join('')
            : '<p class="no-comments">まだコメントはありません。</p>';
    }
    $('#comment-form').addEventListener('submit', e => {
        e.preventDefault();
        const nick = $('#comment-nick').value.trim(), text = $('#comment-text').value.trim();
        if (!nick || !text) return;
        const d = new Date();
        const list = comments();
        list.push({ nick, text, date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` });
        set(CM, JSON.stringify(list));
        $('#comment-nick').value = ''; $('#comment-text').value = '';
        renderComments();
    });
    likeUI(); renderComments();

    // ------------------------------------------------------------ ほかの記事（manifest.json から）
    main.insertAdjacentHTML('beforeend', `<section class="ar-more" id="ar-more" hidden><div class="ar-more__in">
        <div class="ar-more__head"><h2><span>MORE ARTICLES</span>記事層の、ほかの記事</h2><a href="${ROOT}index.html#article">すべて見る →</a></div>
        <div class="ar-more__grid" id="ar-more-grid"></div></div></section>`);
    fetch(ROOT + 'articles/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(list => {
        const me = 'articles/' + ID + '.html';
        const others = (Array.isArray(list) ? list : []).filter(a => a.url && a.url !== me)
            .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
        if (!others.length) return;
        const pos = (x, y) => `${x != null ? x : 50}% ${y != null ? y : 50}%`;
        $('#ar-more-grid').innerHTML = others.map((a, i) => {
            const img = a.thumb || a.cover;
            const x = a.thumb ? a.thumbX : a.coverX, y = a.thumb ? a.thumbY : a.coverY;
            const md = img
                ? `<span class="md"><img src="${ROOT}${esc(img)}" alt="" loading="lazy" style="object-position:${pos(x, y)}"></span>`
                : `<span class="md md--tp tp--${esc(a.cat)} tp--q"><span class="tp__k"><span>${esc(CAT_EN[a.cat] || 'ARTICLE')}</span><span>FUKURYU</span></span><span class="tp__t">${esc(String(a.excerpt || a.title).replace(/…$/, ''))}</span></span>`;
            return `<a class="mc rv" style="--rd:${i * 0.08}s" href="${ROOT}${esc(a.url)}">
                ${md}
                <span class="mt"><span class="mt__c cat--${esc(a.cat)}">${esc(CATS[a.cat] || '記事')}</span><time>${esc(a.date)}</time></span>
                <span class="mc__t">${esc(a.title)}</span>
                ${a.author ? `<span class="mc__by">${esc(a.author)}</span>` : ''}
            </a>`;
        }).join('');
        $('#ar-more').hidden = false;
        reveal();
    }).catch(() => {});

    // ------------------------------------------------------------ フッター
    document.body.insertAdjacentHTML('beforeend', `
        <footer class="ar-foot"><div class="ar-foot__in">
            <a href="${ROOT}index.html"><img class="ar-foot__logo" src="${ROOT}fukuryu-logo.png" alt="伏流"></a>
            <ul>
                <li><a href="${ROOT}index.html">トップ</a></li>
                <li><a href="${ROOT}index.html#article">記事</a></li>
                <li><a href="${ROOT}index.html#radio">配信</a></li>
                <li><a href="${ROOT}tokubetsu-kyoryoku.html">コラボレーター</a></li>
                <li><a href="https://open.spotify.com/show/6TLeThJuz0o47VzxMjzZap" target="_blank" rel="noopener noreferrer">Spotify</a></li>
                <li><a href="https://www.instagram.com/fukuliu.from.art" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            </ul>
            <div class="ar-foot__base"><span>&copy; 2026 FUKURYU / ART Platform</span><span>Designed in Kansai.</span></div>
        </div></footer>`);

    // ------------------------------------------------------------ 読んだ深さ・目次の現在地
    const toc = $$('.ar-toc a[href^="#"]');
    const depthEl = $('#ar-depth'), bar = $('.ar-progress'), mbar = $('.ar-mprog');
    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            if (body) {
                const r = body.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (innerHeight * 0.5 - r.top) / Math.max(1, r.height)));
                bar.style.setProperty('--p', (p * 100).toFixed(1) + '%');
                bar.style.opacity = r.bottom < innerHeight * 0.45 ? 0 : 1;
                mbar.style.setProperty('--p', (p * 100).toFixed(1) + '%');
                depthEl.textContent = `−${(8 + p * 12).toFixed(1)}m`;
            }
            if (toc.length) {
                const y = 140;
                let active = null;
                toc.forEach(a => { const t = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (t && t.getBoundingClientRect().top <= y) active = a; });
                toc.forEach(a => a.classList.toggle('is-active', a === active));
            }
        });
    }

    // ------------------------------------------------------------ スクロールで出す
    let io = null;
    function reveal() {
        if (REDUCED || !('IntersectionObserver' in window)) { $$('.rv').forEach(el => el.classList.add('is-in')); return; }
        if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
        $$('.rv:not(.is-in)').forEach(el => io.observe(el));
    }

    addEventListener('scroll', onScroll, { passive: true });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(ridge, 120); onScroll(); });
    ridge(); onScroll(); reveal();
    document.fonts && document.fonts.ready.then(ridge);
})();
