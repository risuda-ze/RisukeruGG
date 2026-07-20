(() => {
  if (document.body.dataset.lpInit) return;
  document.body.dataset.lpInit = '1';

  /* アニメーション有効化フラグ（JS無効環境ではCSSが常時表示のまま） */
  if ('IntersectionObserver' in window) {
    document.body.classList.add('lp-anim');
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    );
    document.querySelectorAll('.fade-up, .problem-card').forEach((elem) => {
      observer.observe(elem);
    });
  }

  /* ヒーロー演出（カオス→整列＋HUD起動＋終幕グロー、reduced-motion時は再生しない） */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const boardWrap = document.querySelector('.hero-board-wrap');
    if (boardWrap) boardWrap.classList.add('play');
    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('play');
  }

  /* HUD時計（JST） */
  const clock = document.getElementById('hud-clock');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('ja-JP', {
        hour12: false,
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ティッカーをシームレスにループさせるため内容を複製 */
  const track = document.getElementById('ticker-track');
  if (track) {
    track.innerHTML += track.innerHTML;
  }
})();
