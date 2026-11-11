// 画面モックを枠の幅に合わせて縮小
function fit() {
  document.querySelectorAll('.viewport').forEach(vp => {
    const w = +vp.dataset.w, h = +vp.dataset.h, s = vp.clientWidth / w;
    vp.style.height = (h * s) + 'px';
    vp.firstElementChild.style.transform = `scale(${s})`;
  });
}
addEventListener('resize', fit); addEventListener('load', fit); fit();

// 案A: 1〜4キーでチャンネル切替
(function () {
  const desk = document.getElementById('ca-desk'); if (!desk) return;
  const names = { 1: 'ラジオ', 2: '記事', 3: 'コラボレーター', 4: 'CV' };
  let active = false;
  desk.closest('.frame').addEventListener('click', () => active = true);
  document.addEventListener('click', e => { if (!e.target.closest('#a')) active = false; });
  function tune(n) {
    const st = desk.querySelector('.ca-static'), osd = desk.querySelector('.ca-osd');
    st.classList.remove('on'); void st.offsetWidth; st.classList.add('on');
    osd.style.opacity = 0;
    setTimeout(() => { osd.innerHTML = `<b>${n}</b><span>${names[n]}</span>`; osd.style.opacity = 1; }, 220);
    desk.querySelectorAll('.ca-ch>div').forEach((d, i) => d.classList.toggle('is-on', i === n));
  }
  document.addEventListener('keydown', e => { if (active && names[e.key]) tune(+e.key); });
  desk.querySelectorAll('.ca-ch>div').forEach((d, i) => { if (i) { d.style.cursor = 'pointer'; d.addEventListener('click', () => tune(i)); } });
})();

// 案C: マウスで版ズレ・クリックでハンコ
document.querySelectorAll('.cc').forEach(cc => {
  cc.addEventListener('mousemove', e => {
    const r = cc.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - .5) * 14, y = ((e.clientY - r.top) / r.height - .5) * 10;
    cc.style.setProperty('--mx', x.toFixed(1) + 'px'); cc.style.setProperty('--my', y.toFixed(1) + 'px');
  });
  cc.addEventListener('mouseleave', () => { cc.style.setProperty('--mx', '0px'); cc.style.setProperty('--my', '0px'); });
  cc.addEventListener('click', e => {
    const r = cc.getBoundingClientRect(), s = r.width / cc.offsetWidth;
    const st = document.createElement('div');
    st.className = 'cc-click'; st.textContent = '伏';
    st.style.left = ((e.clientX - r.left) / s) + 'px'; st.style.top = ((e.clientY - r.top) / s) + 'px';
    st.style.setProperty('--r', (Math.random() * 40 - 20).toFixed(0) + 'deg');
    st.style.transform = `rotate(${st.style.getPropertyValue('--r')})`;
    cc.appendChild(st);
    const all = cc.querySelectorAll('.cc-click'); if (all.length > 12) all[0].remove();
  });
});
