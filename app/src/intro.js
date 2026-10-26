// Opening animation for the app. It starts on the exact frame of the native splash (the icon on the
// dark background), so the hand-off is invisible: then the icon bursts, five Neapolitan cards fly out
// face down, flip into a fan, the gold title rises in and everything dissolves into the menu.
// Tap anywhere to skip.

const BG = '#0B1226';
const CARDS = [20, 0, 16, 10, 30]; // asso di spade, asso di coppe, settebello, asso di denari, asso di bastoni
const ICON_ON_SPLASH = 560 / 2732; // icon size in assets/splash.png, which the splash scales to fill the screen

const CSS = `
#intro{position:fixed;inset:0;z-index:99999;overflow:hidden;pointer-events:auto;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;contain:strict}
#intro *{box-sizing:border-box}
#intro .in-bg{position:absolute;inset:0;background:${BG}}
#intro .in-stage{position:absolute;inset:0;transform-origin:0 0}
#intro .in-glow{position:absolute;left:50%;top:var(--fy);width:150vmin;height:150vmin;margin:-75vmin 0 0 -75vmin;
  background:radial-gradient(closest-side,rgba(242,196,81,.20),rgba(32,194,107,.10) 45%,transparent 72%);opacity:0}
#intro .in-icon{position:absolute;left:50%;top:50%;width:var(--is);height:var(--is);margin:calc(var(--is)/-2) 0 0 calc(var(--is)/-2);
  border-radius:22.5%;background:url(icone/icona-512.png) center/cover;box-shadow:0 18px 50px rgba(0,0,0,.45)}
#intro .in-ring{position:absolute;left:50%;top:50%;width:var(--is);height:var(--is);margin:calc(var(--is)/-2) 0 0 calc(var(--is)/-2);
  border-radius:50%;border:3px solid #F2C451;box-shadow:0 0 24px rgba(242,196,81,.7),inset 0 0 18px rgba(242,196,81,.5);opacity:0}
#intro .in-card{position:absolute;left:50%;top:var(--fy);width:var(--cw);height:calc(var(--cw) * 1.6);
  margin:calc(var(--cw) * -0.8) 0 0 calc(var(--cw) / -2);transform-style:preserve-3d;opacity:0}
#intro .in-card > i{position:absolute;inset:0;border-radius:calc(var(--cw) * .08);overflow:hidden;
  -webkit-backface-visibility:hidden;backface-visibility:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 14px 30px rgba(0,0,0,.5)}
#intro .in-card .f{background:#fff center/cover no-repeat}
#intro .in-card .b{transform:rotateY(180deg);background:
  radial-gradient(circle at 50% 50%,rgba(242,196,81,.95) 0 calc(var(--cw) * .12),transparent calc(var(--cw) * .125)),
  radial-gradient(circle at 50% 50%,#0B1226 0 calc(var(--cw) * .19),transparent calc(var(--cw) * .195)),
  repeating-linear-gradient(45deg,#141d3b 0 4px,#0f1630 4px 8px);border:calc(var(--cw) * .05) solid #fff}
#intro .in-title{position:absolute;left:0;right:0;top:var(--ty);text-align:center;margin:0;
  font-family:'Fredoka','Nunito',system-ui,sans-serif;font-weight:700;font-size:min(15vw,72px);line-height:1;letter-spacing:-.01em;
  filter:drop-shadow(0 4px 0 rgba(0,0,0,.25)) drop-shadow(0 0 22px rgba(242,196,81,.35))}
#intro .in-title span{display:inline-block;opacity:0;color:#F2C451;
  background:linear-gradient(180deg,#FFFBEA 0%,#FFF1B8 30%,#F2C451 62%,#C98E1E 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
#intro .in-sub{position:absolute;left:0;right:0;top:calc(var(--ty) + min(15vw,72px) + 14px);text-align:center;opacity:0;
  font-family:'Nunito',system-ui,sans-serif;font-weight:800;font-size:12px;letter-spacing:.32em;text-indent:.32em;text-transform:uppercase;color:rgba(255,241,184,.72)}
`;

const wait = ms => new Promise(r => setTimeout(r, ms));
const ease = {
  out: 'cubic-bezier(.22,1,.36,1)',
  spring: 'cubic-bezier(.2,1.35,.35,1)',
  in: 'cubic-bezier(.55,0,.75,.2)',
};

function preload(src) {
  const im = new Image();
  im.src = src;
  return (im.decode ? im.decode() : new Promise((res, rej) => { im.onload = res; im.onerror = rej; })).catch(() => {});
}

/**
 * Shows the intro. `onReady` runs once the first frame (identical to the native splash) is on screen,
 * which is the moment to hide the native splash. `haptic(style)` is optional.
 */
export function playIntro({ onReady = () => {}, haptic = () => {} } = {}) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const W = innerWidth, H = innerHeight;
  const iconSize = Math.round(Math.max(W, H) * ICON_ON_SPLASH);
  const cw = Math.round(Math.min(W * 0.24, H * 0.13, 128));
  const fanY = Math.round(H * 0.41);
  const el = document.createElement('div');
  el.id = 'intro';
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--is', iconSize + 'px');
  el.style.setProperty('--cw', cw + 'px');
  el.style.setProperty('--fy', fanY + 'px');
  el.style.setProperty('--ty', Math.round(fanY + cw * 0.8 + Math.max(36, H * 0.07)) + 'px');
  const title = 'Napoletane';
  el.innerHTML = `<div class="in-bg"></div><div class="in-glow"></div><div class="in-ring"></div><div class="in-stage">` +
    CARDS.map(c => `<div class="in-card"><i class="f" style="background-image:url(carte/${c}.jpg?v=2)"></i><i class="b"></i></div>`).join('') +
    `<h1 class="in-title">${[...title].map(ch => `<span>${ch}</span>`).join('')}</h1>` +
    `<div class="in-sub">Tressette · Briscola · Scopa</div></div><div class="in-icon"></div>`;
  document.documentElement.appendChild(el);

  const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false, finishing = null;

  // Where the menu's own title is, if the menu is what the intro is uncovering.
  const heroTarget = () => {
    const menu = document.getElementById('menu'), spans = document.querySelectorAll('.hero h1 span');
    if (!menu || menu.hidden || spans.length < 2) return null;
    const a = spans[0].getBoundingClientRect(), b = spans[spans.length - 1].getBoundingClientRect();
    if (!a.width || b.right <= a.left) return null;
    return { left: a.left, right: b.right, cy: (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2 };
  };
  const spanBox = () => {
    const sp = $$('.in-title span'), a = sp[0].getBoundingClientRect(), b = sp[sp.length - 1].getBoundingClientRect();
    return { left: a.left, right: b.right, cy: (a.top + a.bottom) / 2 };
  };

  const finish = (quick = false) => {
    if (finishing) return finishing;
    finishing = (async () => {
      const dur = reduce ? 250 : quick ? 380 : 700;
      const to = !reduce && heroTarget();
      // Freeze every running animation at its current frame so the exit starts from what is on screen.
      el.getAnimations({ subtree: true }).forEach(a => { try { a.commitStyles(); } catch (e) {} a.cancel(); });
      el.animate([{ opacity: 1 }, { opacity: 0 }], to
        ? { duration: dur * 0.4, delay: dur * 0.6, easing: 'linear', fill: 'forwards' }
        : { duration: dur * 0.75, delay: dur * 0.25, easing: ease.out, fill: 'forwards' });
      $('.in-icon').style.opacity = 0;
      if (to) {
        // The fan and the title glide up and shrink onto the menu's title while the dark background dissolves.
        const from = spanBox(), sc = (to.right - to.left) / (from.right - from.left);
        const tx = (to.left + to.right) / 2 - sc * (from.left + from.right) / 2, ty = to.cy - sc * from.cy;
        $('.in-stage').animate([{ transform: 'none' }, { transform: `translate(${tx}px,${ty}px) scale(${sc})` }],
          { duration: dur, easing: 'cubic-bezier(.5,0,.15,1)', fill: 'forwards' });
        $('.in-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.8, easing: ease.out, fill: 'forwards' });
        $('.in-glow').animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.5, fill: 'forwards' });
      }
      await wait(dur + 30);
      el.remove(); style.remove(); done = true;
    })();
    return finishing;
  };
  el.addEventListener('pointerdown', () => finish(true), { once: true });

  // The native splash goes away only once the same picture is painted here, icon included.
  Promise.race([preload('icone/icona-512.png'), wait(600)])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(() => onReady())));

  const run = async () => {
    if (reduce) { await wait(400); return finish(); }
    await Promise.race([Promise.all([preload('icone/icona-512.png'), ...CARDS.map(c => preload(`carte/${c}.jpg?v=2`))]), wait(800)]);
    if (finishing) return;

    // 1. The icon gathers itself, then bursts into a gold ring.
    const icon = $('.in-icon');
    icon.animate([
      { transform: 'scale(1)', opacity: 1, offset: 0 },
      { transform: 'scale(.9)', opacity: 1, offset: .45 },
      { transform: 'scale(1.18)', opacity: 0, offset: 1 },
    ], { duration: 520, easing: ease.out, fill: 'forwards' });
    $('.in-ring').animate([
      { transform: 'scale(.7)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1, offset: .25 },
      { transform: 'scale(3.4)', opacity: 0 },
    ], { duration: 900, delay: 230, easing: ease.out, fill: 'forwards' });
    $('.in-glow').animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 1200, delay: 250, easing: ease.out, fill: 'forwards' });

    // 2. Cards fly out face down from where the icon was and flip open into a fan, centre card first.
    const fromY = H / 2 - fanY;
    const spread = cw * 0.62, drop = cw * 0.09;
    const order = [2, 1, 3, 0, 4];
    $$('.in-card').forEach((card, i) => {
      const k = i - 2, delay = 300 + order.indexOf(i) * 75;
      card.style.zIndex = 10 - Math.abs(k);
      card.animate([
        { opacity: 0, transform: `translate(0px,${fromY}px) rotate(0deg) rotateY(180deg) scale(.35)` },
        { opacity: 1, offset: .12 },
        { opacity: 1, transform: `translate(${k * spread}px,${Math.abs(k) * Math.abs(k) * drop}px) rotate(${k * 11}deg) rotateY(0deg) scale(1)` },
      ], { duration: 820, delay, easing: ease.spring, fill: 'forwards' });
    });
    setTimeout(() => haptic('light'), 300 + 4 * 75 + 600);

    // 3. Title letters rise in, then the subtitle.
    $$('.in-title span').forEach((s, i) => s.animate([
      { opacity: 0, transform: 'translateY(26px) scale(.8)', filter: 'blur(6px)' },
      { opacity: 1, transform: 'none', filter: 'blur(0)' },
    ], { duration: 560, delay: 1050 + i * 38, easing: ease.spring, fill: 'forwards' }));
    $('.in-sub').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: 1500, easing: ease.out, fill: 'forwards' });
    setTimeout(() => haptic('light'), 1450);

    // 4. Breathe for a moment, then dissolve into the menu.
    await wait(2300);
    if (!done) finish();
  };
  run();
  return { finish };
}
