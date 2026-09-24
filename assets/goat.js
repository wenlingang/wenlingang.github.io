// LeBron's pre-game chalk toss: a puff of chalk goes up, and the particles
// that fly out with it settle into his portrait.

const portrait = new Image();
portrait.src = "/assets/lebron.png";

// Sample the cut-out photo on a grid. Brighter pixels become bigger particles,
// so the shading comes from size alone.
function portraitParticles(ctx, W, H, gap) {
  const scale = Math.min(W / portrait.naturalWidth, H / portrait.naturalHeight);
  const w = portrait.naturalWidth * scale;
  const h = portrait.naturalHeight * scale;
  ctx.drawImage(portrait, (W - w) / 2, H - h, w, h);

  const data = ctx.getImageData(0, 0, W, H).data;
  const out = [];
  const unit = gap / 4;
  for (let y = 0; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      const i = (y * W + x) * 4;
      const l = data[i] / 255;
      // Soft edges are dithered: the fainter the pixel, the more likely it's skipped.
      if (data[i + 3] < 30 + Math.random() * 200 || l < 0.05) continue;
      out.push({ x, y, s: (0.35 + 1.05 * l) * unit });
    }
  }
  return out;
}

// The chalk cloud itself: soft dust that never settles, drawn on its own canvas.
function createDust(canvas) {
  const ctx = canvas.getContext("2d");
  let motes = [];
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    raf = 0;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    motes = motes.filter((m) => now - m.t0 < m.life);
    for (const m of motes) {
      const t = (now - m.t0) / m.life;
      m.vx *= 0.955;
      m.vy = m.vy * 0.955 + 0.025;
      m.x += m.vx;
      m.y += m.vy;
      ctx.globalAlpha = 0.5 * (1 - t) * Math.min(1, t * 8);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (1 + t * 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (motes.length) raf = requestAnimationFrame(frame);
  }

  return {
    puff(x, y, count = 520) {
      if (reduceMotion) return;
      resize();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
      const t0 = performance.now();
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const speed = 2 + Math.random() * 13;
        motes.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 0.6 + Math.random() * 1.8,
          t0: t0 + Math.random() * 120,
          life: 1600 + Math.random() * 1600,
        });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
  };
}

const canvas = $("#field");
const dust = createDust($("#dust"));

const field = createField(canvas, {
  palette: ["--text", "--gold"],
  ready: () => portrait.decode(),
  build: (ctx, W, H) => portraitParticles(ctx, W, H, W < 640 ? 3 : 4),
});

function toss() {
  const x = canvas.clientWidth / 2;
  const y = canvas.clientHeight * 0.92;
  dust.puff(x, y);
  field.toss(x, y);
}

createStatus();
field.init().then(() => {
  toss();
  $("#again").hidden = false;
});
$("#again").addEventListener("click", toss);
