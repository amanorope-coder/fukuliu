/* =====================================================================
   伏流 — 地層デザイン（strata.js）
   ・index.html 末尾の radioEpisodes / articles / ARTICLE_CATEGORIES /
     RADIO_SHOW_URL と、articles/manifest.json・collaborators/manifest.json・
     site/photos.json・site/cv.json を読んで描画する
   ・層の境界のギザギザ、ページを貫く伏流（水脈）、深度計、岩盤の水を描く
   ・tools/site-editor.html のプレビュー用に window.FK_SITE を公開
   ===================================================================== */
(function () {
    'use strict';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const NS = 'http://www.w3.org/2000/svg';
    const PREVIEW = new URLSearchParams(location.search).has('preview');
    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const EPS = typeof radioEpisodes !== 'undefined' ? radioEpisodes : [];
    const STATIC_ARTICLES = typeof articles !== 'undefined' ? articles : [];
    const CATS = typeof ARTICLE_CATEGORIES !== 'undefined' ? ARTICLE_CATEGORIES : {};
    const SHOW_URL = typeof RADIO_SHOW_URL !== 'undefined' ? RADIO_SHOW_URL : 'https://open.spotify.com/show/6TLeThJuz0o47VzxMjzZap';

    const LAYER = {
        article: { name: '記事層', depth: '−8m' },
        radio:   { name: '配信層', depth: '−20m' },
        people:  { name: '人物層', depth: '−34m' }
    };

    // ------------------------------------------------------------ utils
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function strip(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
    function brOnly(s) { return esc(String(s || '').replace(/<br\s*\/?>/gi, '\n')).replace(/\n/g, '<br>'); }
    function isExt(u) { return /^https?:\/\//.test(u || ''); }
    function href(u) { return (!u || u === '#') ? '' : `href="${esc(u)}"${isExt(u) ? ' target="_blank" rel="noopener noreferrer"' : ''}`; }
    function dkey(d) { return String(d || '').replace(/\D/g, '').slice(0, 8); }
    function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
    function spotifyId(v) { const m = String(v || '').match(/episode\/([a-zA-Z0-9]+)/); return m ? m[1] : String(v || '').split('?')[0]; }
    function spotifyUrl(v) { return isExt(v) ? String(v).trim() : (v ? `https://open.spotify.com/episode/${spotifyId(v)}` : ''); }
    function catLabel(c) { return (CATS[c] && CATS[c].label) || '記事'; }
    function pos(x, y) { return `${x != null ? x : 50}% ${y != null ? y : 50}%`; }
    function zoom(z) { const v = +z || 100; return Math.max(1, Math.min(3, v / 100)); }
    // 写真の表示位置＋拡大（拡大は「見せたい中心」に向かって寄る）
    function frame(img, x, y, z) {
        img.style.objectPosition = pos(x, y);
        img.style.transformOrigin = pos(x, y);
        img.style.transform = zoom(z) > 1 ? `scale(${zoom(z)})` : '';
    }
    let heroZoom = 1, heroZoomM = 1;
    const PORTRAIT = matchMedia('(orientation: portrait)');
    function idDate(id) {
        const t = parseInt(String(id || ''), 10);
        if (!t || t < 1e12) return '';
        const d = new Date(t);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }
    // 記事の写真：サムネイルがあればそれ、なければカバー写真
    function artImg(a) {
        if (a && a.thumb) return { src: a.thumb, x: a.thumbX, y: a.thumbY };
        if (a && a.cover) return { src: a.cover, x: a.coverX, y: a.coverY };
        return null;
    }
    function imgTag(im) { return `<img src="${esc(im.src)}" alt="" loading="lazy" style="object-position:${pos(im.x, im.y)}">`; }
    function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

    const state = { articles: [], collabs: [], filter: 'all', shown: 7, archFilter: 'all', archShown: 10, cols: 0 };

    // ================================================================
    //  地表：最新
    // ================================================================
    function renderSurface() {
        const box = $('#now');
        if (!box) return;
        const a = state.articles[0], ep = EPS[0], c = state.collabs[0];
        const cards = [];
        if (a) cards.push(`
            <article class="nc nc--article rv">
                <div class="nc__swatch"><b>記事</b><span>FROM ${LAYER.article.name} ${LAYER.article.depth}</span></div>
                <a class="nc__body" ${href(a.url)}>
                    ${artImg(a) ? `<div class="nc__img">${imgTag(artImg(a))}</div>` : ''}
                    <p class="nc__kind">最新の記事 <span class="cat cat--${esc(a.cat)}">${esc(catLabel(a.cat))}</span><time>${esc(a.date)}</time></p>
                    <h3>${esc(a.title)}</h3>
                    ${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ''}
                    ${a.author ? `<p class="nc__by">${esc(a.author)}</p>` : ''}
                </a>
                <a class="nc__dive" href="#article">記事層へ潜る<small>↓ ${LAYER.article.depth}</small></a>
            </article>`);
        if (ep) cards.push(`
            <article class="nc nc--radio rv" style="--rd:.08s">
                <div class="nc__swatch"><b>配信</b><span>FROM ${LAYER.radio.name} ${LAYER.radio.depth}</span></div>
                <a class="nc__body" href="#radio" data-play="0">
                    ${ep.cover ? `<div class="nc__img"><img src="${esc(ep.cover)}" alt="" loading="lazy"></div>` : ''}
                    <p class="nc__kind">${esc(ep.ep || '最新の配信')}<time>${esc(ep.date)}</time></p>
                    <h3>${brOnly(ep.title)}</h3>
                    ${ep.guest ? `<p>ゲスト：${esc(ep.guest)}</p>` : ''}
                </a>
                <a class="nc__dive" href="#radio">配信層へ潜る<small>↓ ${LAYER.radio.depth}</small></a>
            </article>`);
        if (c) cards.push(`
            <article class="nc nc--people rv" style="--rd:.16s">
                <div class="nc__swatch"><b>人物</b><span>FROM ${LAYER.people.name} ${LAYER.people.depth}</span></div>
                <a class="nc__body" href="tokubetsu-kyoryoku.html">
                    ${c.photo ? `<div class="nc__peb"><img src="${esc(c.photo)}" alt="" loading="lazy" style="object-position:${pos(c.photoX, c.photoY)}"></div>` : ''}
                    <p class="nc__kind">新しいコラボレーター${c._date ? `<time>${esc(c._date)}</time>` : ''}</p>
                    <h3>${esc(c.name)}</h3>
                    ${c.bio ? `<p>${esc(c.bio)}</p>` : ''}
                    ${c.role ? `<p class="nc__by">${esc(c.role)}</p>` : ''}
                </a>
                <a class="nc__dive" href="#people">人物層へ潜る<small>↓ ${LAYER.people.depth}</small></a>
            </article>`);
        box.innerHTML = cards.join('');

        // 更新ログ
        const items = [
            ...state.articles.map(x => ({ k: 'article', label: '記事', date: x.date, title: x.title, url: x.url })),
            ...EPS.map((x, i) => ({ k: 'radio', label: '配信', date: x.date, title: `${x.ep || ''} ${strip(x.title)}`.trim(), url: '#radio', play: i })),
            ...state.collabs.filter(x => x._date).map(x => ({ k: 'people', label: '人物', date: x._date, title: `${x.name}${x.role ? '（' + x.role + '）' : ''}`, url: 'tokubetsu-kyoryoku.html' }))
        ].sort((p, q) => dkey(q.date).localeCompare(dkey(p.date))).slice(0, 8);
        const log = $('#log');
        if (log) log.innerHTML = items.map(x => `
            <li><a ${href(x.url)}${x.play != null ? ` data-play="${x.play}"` : ''}>
                <time>${esc(String(x.date).slice(0, 10))}</time><span class="lk lk--${x.k}">${x.label}</span><span class="lt">${esc(x.title)}</span><span class="ld">${LAYER[x.k].depth}</span>
            </a></li>`).join('');

        // ヒーローの観測データ
        const all = items.length ? items[0].date : '';
        const sd = $('#st-date'), sc = $('#st-count');
        if (sd) sd.textContent = String(all).slice(0, 10) || '—';
        if (sc) sc.textContent = `${state.articles.length}・${EPS.length}・${state.collabs.length}`;
    }

    // ================================================================
    //  記事層
    // ================================================================
    function colCount() { return innerWidth >= 1000 ? 3 : innerWidth >= 640 ? 2 : 1; }

    function renderArticles() {
        const all = state.articles;
        const list = state.filter === 'all' ? all : all.filter(a => a.cat === state.filter);

        // フィルター
        const fbox = $('#article-filters');
        if (fbox) {
            const counts = {};
            all.forEach(a => { counts[a.cat] = (counts[a.cat] || 0) + 1; });
            const keys = ['all', ...Object.keys(CATS).filter(k => counts[k])];
            fbox.innerHTML = keys.map(k => `<button type="button" data-cat="${k}" class="${state.filter === k ? 'is-on' : ''}">${k === 'all' ? 'すべて' : esc(catLabel(k))}<small>${k === 'all' ? all.length : counts[k]}</small></button>`).join('');
        }

        // 最新の堆積
        const f = list[0];
        const feat = $('#article-feature');
        if (feat) feat.innerHTML = f ? `
            <a class="feat rv${artImg(f) ? ' feat--img' : ''}" ${href(f.url)}>
                ${artImg(f) ? `<div class="feat__img">${imgTag(artImg(f))}</div>` : ''}
                <div class="feat__l">
                    <p class="feat__tag">最新の堆積 / LATEST DEPOSIT <span class="cat cat--${esc(f.cat)}">${esc(catLabel(f.cat))}</span><time>${esc(f.date)}</time></p>
                    <h3>${esc(f.title)}</h3>
                </div>
                <div class="feat__r">
                    ${f.excerpt ? `<p>${esc(f.excerpt)}</p>` : ''}
                    <p class="feat__by"><span>${esc(f.author || '')}</span><span>読む →</span></p>
                </div>
            </a>` : '<p class="empty">この層には、まだ何も堆積していません。</p>';

        // 残り：3列にずらして積む
        const rest = list.slice(1, state.shown);
        const cols = colCount();
        state.cols = cols;
        const buckets = Array.from({ length: cols }, () => []);
        rest.forEach((a, i) => buckets[i % cols].push(`
            <a class="ac rv" ${href(a.url)} data-t="${(a.title.length + i) % 3}" style="--rd:${(i % cols) * 0.07}s">
                ${artImg(a) ? `<span class="ac__img">${imgTag(artImg(a))}</span>` : ''}
                <div class="ac__meta"><span class="cat cat--${esc(a.cat)}">${esc(catLabel(a.cat))}</span><time>${esc(a.date)}</time></div>
                <h4>${esc(a.title)}</h4>
                ${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ''}
                <div class="ac__by"><span>${esc(a.author || '')}</span><span>→</span></div>
            </a>`));
        const dep = $('#articles-list');
        if (dep) {
            dep.style.setProperty('--cols', cols);
            dep.innerHTML = buckets.map(b => `<div class="deposit__col">${b.join('')}</div>`).join('');
        }

        const more = $('#article-more');
        if (more) {
            const left = Math.max(0, list.length - 1 - rest.length);
            more.hidden = left === 0;
            more.querySelector('small').textContent = `あと${left}件`;
        }
        afterRender();
    }

    // ================================================================
    //  配信層
    // ================================================================
    function renderRadio() {
        const cta = $('#radio-show-cta');
        if (cta) cta.href = SHOW_URL;
        const list = $('#radio-list');
        if (!list) return;
        list.innerHTML = EPS.map((ep, i) => `
            <li class="ep" data-i="${i}">
                <button type="button" aria-label="${esc(strip(ep.title))} を再生">
                    <span class="ep__core">${ep.cover ? `<img src="${esc(ep.cover)}" alt="" loading="lazy">` : ''}</span>
                    <span>
                        <span class="ep__no"><span>${esc(ep.ep || '')}</span><span>${esc(ep.date || '')}</span></span>
                        <span class="ep__t">${brOnly(ep.title)}</span>
                        ${ep.guest ? `<span class="ep__g">${esc(ep.guest)}</span>` : ''}
                    </span>
                </button>
            </li>`).join('');
        list.addEventListener('click', e => {
            const li = e.target.closest('.ep');
            if (li) setPlayer(+li.dataset.i, true);
        });
        setPlayer(0, false);
    }

    function setPlayer(i, focus) {
        const ep = EPS[i];
        const box = $('#radio-player');
        if (!ep || !box) return;
        const id = spotifyId(ep.id);
        const ok = id && !id.startsWith('REPLACE_');
        box.innerHTML = `
            <div class="player__top"><span class="player__on"><i></i>受信中</span><span>${esc(ep.ep || '')} · ${esc(ep.date || '')}</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>
            ${ep.cover ? `<div class="player__cover"><img src="${esc(ep.cover)}" alt=""></div>` : ''}
            <h3>${brOnly(ep.title)}</h3>
            ${ep.guest ? `<p class="player__guest">ゲスト：${esc(ep.guest)}</p>` : ''}
            ${ep.excerpt ? `<p class="player__ex">${esc(ep.excerpt)}</p>` : ''}
            ${ok ? `<iframe src="https://open.spotify.com/embed/episode/${esc(id)}?utm_source=generator" height="152" loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="${esc(strip(ep.title))}"></iframe>`
                 : '<div class="player__soon">準備中</div>'}`;
        $$('#radio-list .ep').forEach(li => li.classList.toggle('is-on', +li.dataset.i === i));
        if (focus && innerWidth < 900) box.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }

    // 地表・更新ログの「配信」から、そのエピソードを受信して配信層へ
    document.addEventListener('click', e => {
        const a = e.target.closest('[data-play]');
        if (a && !PREVIEW) setPlayer(+a.dataset.play, false);
    });

    // ================================================================
    //  人物層
    // ================================================================
    const BLOBS = ['58% 42% 50% 50% / 52% 48% 52% 48%', '44% 56% 46% 54% / 58% 44% 56% 42%', '52% 48% 60% 40% / 46% 54% 46% 54%', '62% 38% 46% 54% / 50% 60% 40% 50%', '47% 53% 40% 60% / 55% 45% 55% 45%'];
    function renderCollabs() {
        const ul = $('#collab-list');
        if (!ul) return;
        const r = rng(7);
        ul.innerHTML = state.collabs.length ? state.collabs.map((c, i) => `
            <li class="pebble rv" style="--br:${BLOBS[i % BLOBS.length]};--rot:${(r() * 14 - 7).toFixed(1)}deg;--rd:${(i % 6) * 0.06}s">
                <a href="tokubetsu-kyoryoku.html">
                    <span class="pebble__img">${c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.name)}" loading="lazy" style="object-position:${pos(c.photoX, c.photoY)}">` : ''}</span>
                    <b>${esc(c.name)}</b>${c.role ? `<small>${esc(c.role)}</small>` : ''}
                </a>
            </li>`).join('') : '<li class="empty">準備中です。</li>';
        afterRender();
    }

    const IG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
    function historyHTML(text) {
        const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return '';
        return `<dl class="cv-card__history">${lines.map(l => {
            const m = l.match(/^([0-9０-９]{4}[0-9０-９.\/年月\-–〜~ ]*?)[\s　:：]+(.+)$/);
            return m ? `<div class="cv-card__row"><dt>${esc(m[1].trim())}</dt><dd>${esc(m[2])}</dd></div>`
                     : `<div class="cv-card__row"><dt></dt><dd>${esc(l)}</dd></div>`;
        }).join('')}</dl>`;
    }
    function applyCV(data) {
        const grid = $('#cv-grid');
        if (!grid) return;
        const ms = (data && data.members) || [];
        grid.innerHTML = ms.length ? ms.map((m, i) => `
            <article class="cv-card rv" style="--rd:${i * 0.08}s">
                <div class="cv-card__photo">${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" style="object-position:${pos(m.photoX, m.photoY)};transform-origin:${pos(m.photoX, m.photoY)};transform:scale(${zoom(m.photoZoom)})">` : `<span class="cv-card__initial">${esc((m.name || '?').charAt(0))}</span>`}</div>
                <div>
                    ${m.role ? `<span class="cv-card__role">${esc(m.role)}</span>` : ''}
                    <h4 class="cv-card__name">${esc(m.name)}</h4>
                    ${m.nameEn ? `<p class="cv-card__name-en">${esc(m.nameEn)}</p>` : ''}
                    ${m.instagram ? `<a class="cv-card__ig" href="${esc(m.instagram)}" target="_blank" rel="noopener noreferrer">${IG}Instagram</a>` : ''}
                    ${m.bio ? `<p class="cv-card__bio">${esc(m.bio).replace(/\n/g, '<br>')}</p>` : ''}
                    ${m.history ? `<p class="cv-card__sub">経歴 / HISTORY</p>${historyHTML(m.history)}` : ''}
                    ${!m.bio && !m.history ? '<p class="cv-card__note">経歴は準備中です。</p>' : ''}
                </div>
            </article>`).join('') : '<p class="cv-empty">準備中です。</p>';
        afterRender();
    }

    // ================================================================
    //  岩盤：アーカイブ
    // ================================================================
    function archiveItems() {
        return [
            ...state.articles.map(a => ({ type: 'article', date: a.date, title: a.title, url: a.url })),
            ...EPS.map(ep => ({ type: 'radio', date: ep.date, title: `${ep.ep || ''} ${strip(ep.title)}`.trim(), url: spotifyUrl(ep.id) }))
        ].sort((a, b) => dkey(b.date).localeCompare(dkey(a.date)));
    }
    function renderArchive() {
        const ul = $('#archive-list');
        if (!ul) return;
        const all = archiveItems();
        const items = state.archFilter === 'all' ? all : all.filter(x => x.type === state.archFilter);
        const shown = items.slice(0, state.archShown);
        ul.innerHTML = shown.length ? shown.map(x => {
            const inner = `<time>${esc(String(x.date).slice(0, 10))}</time><span class="ty ty--${x.type}">${x.type === 'radio' ? '配信' : '記事'}</span><span class="tt">${esc(x.title)}</span><span class="go">${x.url ? (isExt(x.url) ? '↗' : '→') : '準備中'}</span>`;
            return `<li>${x.url ? `<a ${href(x.url)}>${inner}</a>` : `<span class="row">${inner}</span>`}</li>`;
        }).join('') : '<li class="empty">該当する記録はまだありません。</li>';
        const st = $('#archive-status');
        if (st) st.textContent = `${items.length} RECORDS`;
        const more = $('#archive-more');
        if (more) {
            const left = items.length - shown.length;
            more.hidden = left <= 0;
            more.querySelector('small').textContent = `あと${left}件`;
        }
        afterRender();
    }

    // ================================================================
    //  写真（site/photos.json）
    // ================================================================
    function applyPhotos(cfg) {
        cfg = cfg || {};
        const hero = $('[data-slot="hero"]');
        if (hero) {
            const h = cfg.hero || {};
            const has = !!h.src;
            const img = hero.querySelector('.hero__img');
            hero.classList.toggle('has-photo', has);
            hero.dataset.pos = h.text || 'bottom-left';
            hero.dataset.tone = has ? (h.tone || 'light') : 'dark';
            hero.style.setProperty('--hero-shade', ((h.shade != null ? h.shade : 30) / 100).toFixed(2));
            // スマホ（縦長の画面）: crop=同じ写真を別の中心で / fit=全体を見せる / photo=別の写真
            const m = h.mobile || {};
            const mode = has ? (m.mode === 'photo' && !m.src ? 'crop' : (m.mode || 'crop')) : 'crop';
            hero.dataset.mmode = mode;
            const num = (v, d) => (v != null && v !== '' ? v : d);
            const px = num(h.x, 50), py = num(h.y, 50);
            const mx = mode === 'photo' ? num(m.x, 50) : num(m.x, px);
            const my = mode === 'photo' ? num(m.y, 50) : num(m.y, py);
            hero.style.setProperty('--hx', px + '%'); hero.style.setProperty('--hy', py + '%');
            hero.style.setProperty('--mx', mx + '%'); hero.style.setProperty('--my', my + '%');
            heroZoom = has ? zoom(h.zoom) : 1;
            heroZoomM = !has || mode === 'fit' ? 1 : zoom(mode === 'photo' ? num(m.zoom, 100) : num(m.zoom, h.zoom));
            const srcM = hero.querySelector('.hero__src-m'), blur = hero.querySelector('.hero__blur');
            if (srcM) { if (mode === 'photo') srcM.srcset = m.src; else srcM.removeAttribute('srcset'); }
            if (blur) { if (has && mode === 'fit') blur.src = h.src; else blur.removeAttribute('src'); }
            if (img) { img.style.objectPosition = ''; img.style.transformOrigin = ''; if (has) img.src = h.src; else img.removeAttribute('src'); }
            heroTransform();
            const hd = $('#hd');
            if (hd) hd.dataset.tone = hero.dataset.tone;
        }
        $$('.outcrop[data-slot]').forEach(fig => {
            const b = cfg[fig.dataset.slot] || {};
            const img = fig.querySelector('img');
            const cap = fig.querySelector('.outcrop__cap');
            fig.hidden = !b.src;
            fig.dataset.size = b.size || 'm';
            if (b.src) { img.src = b.src; frame(img, b.x, b.y, b.zoom); }
            if (cap) { cap.textContent = b.caption || ''; cap.hidden = !b.caption; }
        });
        const collab = $('[data-slot="collab"]');
        if (collab) {
            const c = cfg.collab || {};
            const img = collab.querySelector('.collab__media img');
            collab.classList.toggle('has-photo', !!c.src);
            collab.style.setProperty('--collab-tint', ((c.tint != null ? c.tint : 70) / 100).toFixed(2));
            if (img) { if (c.src) { img.src = c.src; frame(img, c.x, c.y, c.zoom); } else img.removeAttribute('src'); }
        }
        afterRender();
    }

    function scrollToSlot(name) {
        const el = name === 'cv' ? $('#cv') : $(`[data-slot="${name}"]`);
        if (!el) return;
        const target = el.hidden ? el.closest('section') : el;
        target.scrollIntoView({ behavior: 'smooth', block: name === 'hero' ? 'start' : 'center' });
    }

    // ================================================================
    //  ページの文章（site/texts.json）
    //  HTML の data-text="キー" が付いた要素が対象。texts.json には変更した分だけ入る
    // ================================================================
    const TEXT_DEFAULTS = {};
    function textOf(el) {
        const t = document.createElement('div');
        t.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<wbr\s*\/?>/gi, '');
        return t.textContent.trim();
    }
    function textHTML(v) {
        // 改行はそのまま改行に。「、」「。」の後ろは折り返してよい位置にする
        return esc(v).replace(/\n/g, '<br>').replace(/([、。])(?!<br>|$)/g, '$1<wbr>');
    }
    function initTexts() { $$('[data-text]').forEach(el => { TEXT_DEFAULTS[el.dataset.text] = textOf(el); }); }
    function applyTexts(map) {
        map = map || {};
        $$('[data-text]').forEach(el => {
            const k = el.dataset.text;
            const v = Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : TEXT_DEFAULTS[k];
            el.innerHTML = textHTML(v || '');
            el.hidden = !String(v || '').trim();
        });
        afterRender();
    }
    function textFields() {
        return $$('[data-text]').map(el => ({ key: el.dataset.text, label: el.dataset.label || el.dataset.text, def: TEXT_DEFAULTS[el.dataset.text] || '' }));
    }
    function focusText(key) {
        const el = $(`[data-text="${key}"]`);
        if (!el) return;
        const target = el.hidden ? el.parentElement : el;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('fk-flash'); void el.offsetWidth; el.classList.add('fk-flash');
    }

    window.FK_SITE = { applyPhotos, applyCV, scrollToSlot, applyTexts, textFields, focusText };

    // ================================================================
    //  境界のギザギザ（つなぎの層・接触面）
    // ================================================================
    function edgePoints(seed, amp, n) {
        const r = rng(seed);
        const a = r() * 6.28, b = r() * 6.28, c = r() * 6.28;
        const f1 = 1 + Math.floor(r() * 3), f2 = 4 + Math.floor(r() * 5);
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            let y = 0.5 + 0.28 * Math.sin(t * 6.283 * f1 + a) + 0.14 * Math.sin(t * 6.283 * f2 + b) + 0.06 * Math.sin(t * 6.283 * 17 + c) + (r() - 0.5) * 0.12;
            y = Math.max(0, Math.min(1, y)) * amp;
            pts.push([t * 100, y]);
        }
        return pts;
    }
    function clipFrom(pts) {
        return `polygon(${pts.map(p => `${p[0].toFixed(2)}% ${p[1].toFixed(1)}px`).join(',')},100% 100%,0 100%)`;
    }
    function drawEdges() {
        $$('.seam > i').forEach((el, i) => { el.style.clipPath = clipFrom(edgePoints(101 + i * 37, 12, 48)); });
        $$('.contact').forEach((el, i) => {
            const amp = 14;
            const pts = edgePoints(503 + i * 59, amp, 40);
            el.querySelector('.contact__fill').style.clipPath = clipFrom(pts);
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', `0 0 100 ${amp}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.setAttribute('aria-hidden', 'true');
            const pl = document.createElementNS(NS, 'polyline');
            pl.setAttribute('points', pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' '));
            svg.appendChild(pl);
            el.appendChild(svg);
        });
    }

    // ================================================================
    //  ヘッダー下の仕切り：直線をベースに、山の稜線（右のメニューの下は直線）
    // ================================================================
    function drawRidge() {
        const hd = $('#hd');
        if (!hd) return;
        const W = hd.clientWidth, H = hd.offsetHeight, base = H - 1;
        const nav = $('.hd__nav'), btn = $('.hd__menu');
        const right = nav && nav.offsetWidth ? nav : btn && btn.offsetWidth ? btn : null;
        const stop = right ? right.getBoundingClientRect().left - 28 : W;
        const r = rng(1859);
        // 山（ふもとが広く、頂がとがった形）をいくつか置く
        const peaks = [];
        let x = 18 + r() * 40;
        while (x < stop - 50) {
            const w = 70 + r() * 190, h = 6 + r() * 9;
            peaks.push({ c: x + w * 0.5, w, h });
            if (r() < 0.75) peaks.push({ c: x + w * (0.15 + r() * 0.7), w: w * (0.35 + r() * 0.2), h: h * (0.5 + r() * 0.35) });   // 前山・肩
            x += w * (0.45 + r() * 0.55) + r() * 70;
        }
        const pts = [];
        for (let px = 0; px <= W; px += 3) {
            let h = 0;
            if (px < stop) {
                peaks.forEach(p => { const t = Math.abs(px - p.c) / (p.w / 2); if (t < 1) h = Math.max(h, p.h * Math.pow(1 - t, 1.25)); });
                if (h > 1) h += (r() - 0.5) * 1.8;             // 稜線の細かなギザギザ
                h *= Math.min(1, (stop - px) / 60);            // メニュー手前で直線に戻す
            }
            pts.push([px, base - Math.max(0, h)]);
        }
        if (pts[pts.length - 1][0] < W) pts.push([W, base]);
        const d = 'M' + pts.map(p => `${p[0]} ${p[1].toFixed(1)}`).join(' L');
        let svg = $('.hd__ridge', hd);
        if (!svg) {
            svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'hd__ridge');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = '<path pathLength="1"/>';
            hd.appendChild(svg);
        }
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        $('path', svg).setAttribute('d', d);
        // ヘッダーの背景も稜線で切る（稜線より下はページが見える）
        hd.style.clipPath = `polygon(0 0, ${W}px 0, ${W}px ${H + 1}px, ${pts.slice().reverse().map(p => `${p[0]}px ${(p[1] + 1).toFixed(1)}px`).join(', ')})`;
    }

    // ================================================================
    //  伏流（ページを貫く水脈）
    // ================================================================
    const Vein = {
        svg: null, core: null, clip: null, tip: null, ring: null, samples: [], top: 0, height: 0, ready: false,
        init() {
            const main = $('#strata');
            if (!main) return;
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('class', 'vein');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = `
                <defs><clipPath id="vein-clip"><rect x="-50" y="0" width="99999" height="0"/></clipPath></defs>
                <path class="vein__route"/>
                <g clip-path="url(#vein-clip)"><path class="vein__glow"/><path class="vein__core"/><path class="vein__flow"/></g>
                <circle class="vein__ring" r="6"/><circle class="vein__tip" r="6"/>`;
            main.prepend(svg);
            this.svg = svg;
            this.paths = $$('path', svg);
            this.core = $('.vein__core', svg);
            this.clip = $('#vein-clip rect', svg);
            this.tip = $('.vein__tip', svg);
            this.ring = $('.vein__ring', svg);
        },
        build() {
            const main = $('#strata');
            if (!this.svg || !main) return;
            const mr = main.getBoundingClientRect();
            const W = main.clientWidth, H = main.offsetHeight;
            this.top = mr.top + scrollY;
            this.height = H;
            this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            this.svg.setAttribute('width', W);
            this.svg.setAttribute('height', H);
            this.svg.style.height = H + 'px';

            // 本文の左右の余白（ガター）を水の通り道にする
            const wrap = $('#surface .wrap');
            const cs = getComputedStyle(wrap);
            const wr = wrap.getBoundingClientRect();
            const cl = wr.left - mr.left + parseFloat(cs.paddingLeft);
            const cr = wr.right - mr.left - parseFloat(cs.paddingRight);
            const gl = Math.max(13, cl - Math.min(46, cl * 0.5));
            const gr = Math.min(W - 13, cr + Math.min(46, (W - cr) * 0.5));
            const rel = el => { const r = el.getBoundingClientRect(); return { top: r.top - mr.top, bottom: r.bottom - mr.top }; };

            const spring = $('#spring');
            if (spring) spring.style.left = gl + 'px';
            const sp = spring.getBoundingClientRect();
            const pts = [{ x: gl, y: sp.top - mr.top + sp.height / 2 }];
            const aq = $('#aquifer');
            const aqTop = aq ? rel(aq).top : H;
            const plan = [['#surface', gl], ['#article', gl], ['#radio', gr], ['#people', gl], ['#bedrock', gr]];
            plan.forEach(([sel, x], i) => {
                const el = $(sel);
                if (!el) return;
                const b = rel(el);
                const y0 = i === 0 ? pts[0].y + 40 : b.top + 18;
                const y1 = i === plan.length - 1 ? aqTop + 40 : b.bottom - 16;
                pts.push({ x, y: y0 });
                let k = 0;
                for (let y = y0 + 300; y < y1 - 160; y += 300, k++) pts.push({ x: x + (k % 2 ? -10 : 10), y });
                pts.push({ x, y: y1 });
            });
            // 岩のすき間を抜けて、底の水（帯水層）に合流
            if (aq) {
                const ah = aq.offsetHeight, sc = Math.max(W / 1440, ah / 620);
                pts.push({ x: gr - (gr - W / 2) * 0.25, y: aqTop + ah * 0.45 });
                pts.push({ x: gr - (gr - W / 2) * 0.4, y: aqTop + ah - 92 * sc });
            }
            this.endY = pts[pts.length - 1].y;

            let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
            for (let i = 1; i < pts.length; i++) {
                const p = pts[i - 1], q = pts[i], m = (q.y - p.y) / 2;
                d += ` C${p.x.toFixed(1)} ${(p.y + m).toFixed(1)} ${q.x.toFixed(1)} ${(q.y - m).toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
            }
            this.paths.forEach(p => p.setAttribute('d', d));

            // y → 位置 の対応表（水の先端を描くため）
            const L = this.core.getTotalLength();
            const s = [];
            for (let l = 0; l <= L; l += 8) s.push(this.core.getPointAtLength(l));
            s.push(this.core.getPointAtLength(L));
            this.samples = s;
            this.ready = true;
            this.update();
        },
        update() {
            if (!this.ready) return;
            const y = REDUCED ? this.height : scrollY - this.top + innerHeight * 0.9;
            this.clip.setAttribute('height', Math.max(0, y));
            const s = this.samples;
            let lo = 0, hi = s.length - 1;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid].y < y) lo = mid + 1; else hi = mid; }
            const p = s[lo];
            const show = y > s[0].y && y < this.endY;
            [this.tip, this.ring].forEach(c => { c.setAttribute('cx', p.x); c.setAttribute('cy', Math.min(p.y, y)); c.style.visibility = show ? 'visible' : 'hidden'; });
        }
    };

    // ================================================================
    //  深度計・ヘッダー
    // ================================================================
    const SEGS = [
        { id: 'top', name: '地上', d: 0 },
        { id: 'article', name: '記事層', d: 8 },
        { id: 'radio', name: '配信層', d: 20 },
        { id: 'people', name: '人物層', d: 34 },
        { id: 'bedrock', name: '古層', d: 50 }
    ];
    const END_DEPTH = 64;
    const Gauge = {
        bounds: [], H: 1, top: 0,
        build() {
            const main = $('#strata');
            const col = $('#gauge-col');
            if (!main || !col) return;
            const mr = main.getBoundingClientRect();
            this.top = mr.top + scrollY;
            this.H = main.offsetHeight;
            this.bounds = SEGS.map(s => { const el = document.getElementById(s.id); return el ? el.getBoundingClientRect().top - mr.top : 0; });
            this.bounds[0] = 0;
            const sf = $('#surface');
            this.ground = sf ? sf.getBoundingClientRect().top - mr.top : 0;
            const ptr = $('#gauge-ptr');
            $$('a', col).forEach(a => a.remove());
            SEGS.forEach((s, i) => {
                const a = document.createElement('a');
                a.href = '#' + s.id;
                a.className = 'g-' + s.id;
                a.style.flexGrow = Math.max(1, (this.bounds[i + 1] != null ? this.bounds[i + 1] : this.H) - this.bounds[i]);
                a.innerHTML = `<span>${s.name}　${s.d ? '−' + s.d + 'm' : '±0m'}</span>`;
                col.insertBefore(a, ptr);
            });
            this.update();
        },
        update() {
            if (!this.bounds.length) return;
            const y = scrollY - this.top + innerHeight * 0.5;
            let i = 0;
            while (i < SEGS.length - 1 && y >= this.bounds[i + 1]) i++;
            const b0 = this.bounds[i], b1 = i < SEGS.length - 1 ? this.bounds[i + 1] : this.H;
            const d0 = SEGS[i].d, d1 = i < SEGS.length - 1 ? SEGS[i + 1].d : END_DEPTH;
            // 地上（写真の部分）は ±0m。地表から下で深くなる
            const g0 = i === 0 ? this.ground : b0;
            const t = Math.max(0, Math.min(1, (y - g0) / Math.max(1, b1 - g0)));
            const depth = d0 + (d1 - d0) * t;
            const num = $('#gauge-num'), name = $('#gauge-name'), ptr = $('#gauge-ptr'), g = $('#gauge');
            if (num) num.textContent = depth < 0.05 ? '±0.0m' : `−${depth.toFixed(1)}m`;
            if (name) name.textContent = SEGS[i].name;
            if (ptr) ptr.style.top = (Math.max(0, Math.min(1, y / this.H)) * 100) + '%';
            if (g) g.classList.toggle('is-deep', SEGS[i].id === 'bedrock');
            $$('.hd__nav a').forEach(a => a.classList.toggle('is-on', a.dataset.layer === SEGS[i].id));
            const hd = $('#hd');
            if (hd) {
                const hero = $('.hero');
                const past = hero ? scrollY > hero.offsetHeight - 70 : scrollY > 10;
                hd.classList.toggle('is-solid', past && SEGS[i].id !== 'bedrock');
                hd.classList.toggle('is-deep', past && SEGS[i].id === 'bedrock');
            }
        }
    };

    // ================================================================
    //  岩盤：岩の集まりと、しみ出す水
    // ================================================================
    function drawAquifer() {
        const box = $('#aquifer');
        if (!box) return;
        const W = 1440, H = 620, r = rng(2026);
        const out = [];
        out.push(`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <defs>
                <linearGradient id="rk0" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#4a4d55"/><stop offset="1" stop-color="#1f2126"/></linearGradient>
                <linearGradient id="rk1" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#3d4047"/><stop offset="1" stop-color="#181a1e"/></linearGradient>
                <linearGradient id="rk2" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#55524d"/><stop offset="1" stop-color="#211f1d"/></linearGradient>
                <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d11" stop-opacity="0"/><stop offset="1" stop-color="#05070a" stop-opacity=".65"/></linearGradient>
                <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15171b"/><stop offset="1" stop-color="#15171b" stop-opacity="0"/></linearGradient>
                <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d4fbf" stop-opacity=".55"/><stop offset="1" stop-color="#0f2150"/></linearGradient>
                <filter id="aq-blur" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="3"/></filter>
            </defs>
            <rect width="${W}" height="${H}" fill="#0b0d11"/>`);

        // 水の筋（岩の後ろ → すき間から見える）
        const smooth = pts => {
            let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
            for (let i = 1; i < pts.length; i++) {
                const p = pts[i - 1], q = pts[i], m = (q[1] - p[1]) / 2;
                d += ` C${p[0].toFixed(1)} ${(p[1] + m).toFixed(1)} ${q[0].toFixed(1)} ${(q[1] - m).toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
            }
            return d;
        };
        const streams = [];
        const N = 26;
        for (let i = 0; i < N; i++) {
            let x = (i + 0.2 + r() * 0.6) * (W / N);
            const pts = [[x, -10]];
            for (let y = 40; y < H + 40; y += 38 + r() * 30) { x += (r() - 0.5) * 46; pts.push([x, y]); }
            streams.push(smooth(pts));
        }
        out.push(`<g filter="url(#aq-blur)">${streams.map(d => `<path class="s-glow" d="${d}"/>`).join('')}</g>`);
        out.push(streams.map(d => `<path class="s-core" d="${d}"/>`).join(''));
        out.push(streams.map(d => `<path class="s-flow" d="${d}" style="--d:${(1.6 + r() * 2.4).toFixed(2)}s"/>`).join(''));

        // 岩（下に行くほど大きく、密に）
        const rocks = [];
        let y = 26;
        let row = 0;
        while (y < H + 60) {
            const t = y / H;
            const base = 24 + t * 58;
            let x = -base * (0.3 + r() * 0.6) - (row % 2) * base * 0.6;
            while (x < W + base) {
                const rad = base * (0.75 + r() * 0.5);
                const n = 8 + Math.floor(r() * 4);
                const sq = 0.68 + r() * 0.22;
                const rot = r() * 6.28;
                const cx = x + rad, cy = y + (r() - 0.5) * base * 0.5;
                const verts = [];
                for (let k = 0; k < n; k++) {
                    const ang = rot + (k / n) * 6.283 + (r() - 0.5) * 0.35;
                    const rr = rad * (0.8 + r() * 0.24);
                    verts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * sq]);
                }
                const g = Math.floor(r() * 3);
                const hl = verts.map(v => [cx + (v[0] - cx) * 0.62 - rad * 0.12, cy + (v[1] - cy) * 0.5 - rad * sq * 0.2]);
                rocks.push(`<polygon points="${verts.map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ')}" fill="url(#rk${g})" stroke="#050608" stroke-width="1.6"/>` +
                           `<polygon points="${hl.map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ')}" fill="#fff" opacity=".035"/>`);
                x += rad * 2 * (0.86 + r() * 0.16) + 4 + r() * rad * 0.28;
            }
            y += base * (1.05 + r() * 0.25);
            row++;
        }
        out.push(rocks.join(''));

        // 岩の表面をつたう水
        const tr = [];
        for (let i = 0; i < 18; i++) {
            let x = r() * W, yy = 40 + r() * (H - 200);
            const pts = [[x, yy]];
            const len = 50 + r() * 110;
            for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 20; yy += len / 4; pts.push([x, yy]); }
            tr.push(`<path class="s-trick" d="${smooth(pts)}" style="--d:${(2 + r() * 2.5).toFixed(2)}s"/>`);
        }
        out.push(tr.join(''));

        // しずく
        const dr = [];
        for (let i = 0; i < 26; i++) {
            dr.push(`<circle class="drop" cx="${(r() * W).toFixed(0)}" cy="${(40 + r() * (H - 180)).toFixed(0)}" r="${(1.3 + r() * 1.2).toFixed(1)}" style="--d:${(1.8 + r() * 2).toFixed(2)}s;--dl:${(-r() * 4).toFixed(2)}s"/>`);
        }
        out.push(dr.join(''));
        out.push(`<rect width="${W}" height="${H}" fill="url(#dark)"/><rect width="${W}" height="110" fill="url(#fade)"/>`);

        // 底にたまった水（帯水層）
        const wave = (amp, len, y0) => {
            let d = `M0 ${y0}`;
            for (let x = 0; x < W * 2; x += len) d += ` q${len / 4} ${-amp} ${len / 2} 0 t${len / 2} 0`;
            return d + ` V${H} H0Z`;
        };
        const wy = H - 96;
        out.push(`<g class="wave"><path d="${wave(7, 120, wy)}" fill="url(#water)"/></g>`);
        out.push(`<g class="wave wave--2" opacity=".7"><path d="${wave(5, 90, wy + 10)}" fill="#0f2150" fill-opacity=".8"/></g>`);
        out.push(`<g class="wave" style="animation-duration:11s"><path d="${wave(7, 120, wy).replace(/ V.*$/, '')}" fill="none" stroke="#7fa6ff" stroke-opacity=".55" stroke-width="1.5"/></g>`);
        out.push(`<rect y="${H - 40}" width="${W}" height="40" fill="#0f2150"/>`);
        out.push('</svg>');
        box.innerHTML = out.join('');
    }

    // ================================================================
    //  演出：しみ出す文字・ヒーローの視差・スクロールで出す
    // ================================================================
    function seepText() {
        const el = $('.hero__catch');
        if (!el || el.dataset.split) return;
        el.dataset.split = '1';
        el.setAttribute('aria-label', el.textContent);
        let i = 0;
        el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(part => {
            const tmp = document.createElement('div');
            tmp.innerHTML = part;
            return Array.from(tmp.textContent.trim()).map(ch => `<span aria-hidden="true" style="--i:${i++}">${esc(ch)}</span>`).join('');
        }).join('<br>');
    }

    let io = null;
    function reveal() {
        if (REDUCED || !('IntersectionObserver' in window)) { $$('.rv').forEach(el => el.classList.add('is-in')); return; }
        if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
        $$('.rv:not(.is-in):not([data-obs])').forEach(el => { el.dataset.obs = '1'; io.observe(el); });
    }

    const relayout = debounce(() => { Vein.build(); Gauge.build(); drawRidge(); }, 120);
    function afterRender() { reveal(); relayout(); }

    function heroTransform() {
        const img = $('.hero__img');
        if (!img) return;
        const ty = REDUCED ? 0 : Math.min(scrollY, innerHeight * 1.2) * 0.28;
        const z = PORTRAIT.matches ? heroZoomM : heroZoom;
        img.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)${z > 1 ? ` scale(${z})` : ''}`;
    }

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            Vein.update();
            Gauge.update();
            if (scrollY < innerHeight * 1.2) heroTransform();
        });
    }

    // ================================================================
    //  イベント
    // ================================================================
    function bind() {
        $('#article-filters')?.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            state.filter = b.dataset.cat;
            state.shown = 7;
            renderArticles();
        });
        $('#article-more')?.addEventListener('click', () => { state.shown += 6; renderArticles(); });
        $('#archive-filters')?.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            $$('#archive-filters button').forEach(x => x.classList.toggle('is-on', x === b));
            state.archFilter = b.dataset.filter;
            state.archShown = 10;
            renderArchive();
        });
        $('#archive-more')?.addEventListener('click', () => { state.archShown += 10; renderArchive(); });

        const menu = $('#menu'), open = $('#menu-open');
        const setMenu = on => { menu.classList.toggle('is-open', on); menu.setAttribute('aria-hidden', String(!on)); open.setAttribute('aria-expanded', String(on)); document.body.style.overflow = on ? 'hidden' : ''; };
        open?.addEventListener('click', () => setMenu(true));
        $('#menu-close')?.addEventListener('click', () => setMenu(false));
        $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', () => {
            if (colCount() !== state.cols) renderArticles();
            heroTransform();
            relayout();
        });
        if ('ResizeObserver' in window) new ResizeObserver(relayout).observe($('#strata'));
        addEventListener('load', relayout);
        document.fonts && document.fonts.ready.then(relayout);

        if (PREVIEW) {
            document.documentElement.classList.add('is-preview');
            document.addEventListener('click', e => {
                const t = e.target.closest('[data-text]');
                if (t) { e.preventDefault(); e.stopPropagation(); window.parent.postMessage({ type: 'fk-text-click', key: t.dataset.text }, '*'); return; }
                if (e.target.closest('a')) e.preventDefault();
            }, true);
        }
    }

    // ================================================================
    //  起動
    // ================================================================
    function start() {
        initTexts();
        seepText();
        drawEdges();
        drawRidge();
        drawAquifer();
        Vein.init();
        bind();
        renderRadio();
        renderSurface();
        renderArticles();
        renderCollabs();
        renderArchive();
        applyPhotos({});
        applyCV(null);

        const json = (u, fb) => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : fb).catch(() => fb);
        Promise.all([json('articles/manifest.json', []), json('collaborators/manifest.json', [])]).then(([man, col]) => {
            const merged = [...(Array.isArray(man) ? man : []), ...STATIC_ARTICLES];
            state.articles = merged.map((a, i) => Object.assign({ _i: i }, a))
                .sort((a, b) => dkey(b.date).localeCompare(dkey(a.date)) || a._i - b._i);
            state.collabs = (Array.isArray(col) ? col : []).map(c => Object.assign({ _date: idDate(c.id) }, c))
                .sort((a, b) => String(b.id).localeCompare(String(a.id)));
            renderSurface();
            renderArticles();
            renderCollabs();
            renderArchive();
        });

        if (PREVIEW) {
            window.parent && window.parent !== window && window.parent.postMessage({ type: 'fk-preview-ready' }, '*');
        } else {
            json('site/photos.json', {}).then(applyPhotos);
            json('site/cv.json', {}).then(applyCV);
            json('site/texts.json', {}).then(applyTexts);
        }
        onScroll();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
