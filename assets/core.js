// Shared helpers, the nav status pill, and the particle field.

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover)");

function fmtDuration(ms) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ---------- Status pill ----------

function createStatus() {
  const el = $("#status");
  const text = $("#status-text");
  const count = $("#status-count");
  let busy = 0;
  let tokens = 0;
  return {
    busy(on) {
      busy = Math.max(0, busy + (on ? 1 : -1));
      el.classList.toggle("busy", busy > 0);
      text.textContent = busy > 0 ? "generating" : "idle";
    },
    token() {
      tokens += 1;
      count.textContent = `${tokens} tokens`;
    },
  };
}

// ---------- Particle field ----------
// build(ctx, W, H) draws a shape on an offscreen canvas and returns the
// particles' home positions as [{ x, y }]. Particles fly in on reveal(),
// scatter away from the pointer, and light up gold when a pulse passes.

function createField(canvas, { build, ready }) {
  const stage = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const BUCKETS = 6;
  const SIZE = 2.6;
  let W = 0, H = 0;
  let parts = [];
  let ripples = [];
  let colors = null;
  let raf = 0;
  let revealed = false;
  const mouse = { x: -1e4, y: -1e4, at: 0 };

  function rgb(v) {
    const hex = v.trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }

  // Precompute a violet-to-gold ramp; particles are drawn in buckets by activation.
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const a = rgb(cs.getPropertyValue("--violet"));
    const b = rgb(cs.getPropertyValue("--gold"));
    colors = Array.from({ length: BUCKETS }, (_, i) => {
      const t = i / (BUCKETS - 1);
      const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    });
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth);
    H = Math.round(canvas.clientHeight);
    if (!W || !H) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    // On resize, particles land in their new homes without replaying the intro.
    parts = build(off.getContext("2d", { willReadFrequently: true }), W, H).map(({ x, y }) => ({
      hx: x, hy: y, x, y, vx: 0, vy: 0, a: 0, start: 0,
    }));
    draw();
  }

  function step(now) {
    raf = 0;
    let moving = false;
    ripples = ripples.filter((r) => now - r.t0 < r.life);
    const mouseLive = now - mouse.at < 1200;

    for (const p of parts) {
      if (now > p.start) {
        p.vx = (p.vx + (p.hx - p.x) * 0.018) * 0.84;
        p.vy = (p.vy + (p.hy - p.y) * 0.018) * 0.84;
      }

      if (mouseLive) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 6400) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 80) * 2.4;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          p.a = Math.max(p.a, 1 - d / 80);
        }
      }

      for (const r of ripples) {
        const age = now - r.t0;
        const dx = p.hx - r.x, dy = p.hy - r.y;
        const off = Math.abs(Math.sqrt(dx * dx + dy * dy) - age * 0.75);
        if (off < 60) p.a = Math.max(p.a, (1 - off / 60) * r.strength * (1 - age / r.life));
      }

      p.x += p.vx;
      p.y += p.vy;
      p.a *= 0.93;
      if (Math.abs(p.vx) + Math.abs(p.vy) > 0.03 || Math.abs(p.x - p.hx) > 0.4 || p.a > 0.02) moving = true;
    }

    draw();
    if (moving || ripples.length || mouseLive) kick();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!revealed) return;
    const buckets = Array.from({ length: BUCKETS }, () => []);
    for (const p of parts) buckets[Math.min(BUCKETS - 1, Math.floor(p.a * BUCKETS))].push(p);
    buckets.forEach((list, i) => {
      if (!list.length) return;
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.85 + i * 0.03;
      ctx.beginPath();
      for (const p of list) {
        const s = SIZE + p.a * 2.2;
        ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(step);
  }

  function toLocal(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function pulseLocal(x, y, strength) {
    if (reduceMotion || !parts.length) return;
    ripples.push({ x, y, t0: performance.now(), life: 1500, strength });
    if (ripples.length > 40) ripples.shift();
    kick();
  }

  async function init() {
    readColors();
    try {
      await Promise.race([ready ? ready() : null, wait(2500)]);
    } catch { /* Fall back to whatever font is available. */ }
    stage.classList.add("live");
    layout();

    if (!reduceMotion) {
      canvas.addEventListener("pointermove", (e) => {
        Object.assign(mouse, toLocal(e.clientX, e.clientY), { at: performance.now() });
        kick();
      });
      canvas.addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });
      canvas.addEventListener("pointerdown", (e) => {
        const { x, y } = toLocal(e.clientX, e.clientY);
        pulseLocal(x, y, 1);
      });
    }

    let resizeTimer = 0;
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", () => {
      // Mobile address bars change only the height; skip those.
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });
  }

  return {
    init,
    // Fly particles in from random spots, left to right like streamed tokens.
    reveal() {
      revealed = true;
      if (reduceMotion) return draw();
      const now = performance.now();
      for (const p of parts) {
        p.x = Math.random() * W;
        p.y = H * 0.5 + (Math.random() - 0.5) * H * 1.6;
        p.vx = p.vy = 0;
        p.a = 0.9;
        p.start = now + (p.hx / W) * 900 + Math.random() * 180;
      }
      kick();
    },
    // Send a ring of activation from any point on the page (viewport coordinates).
    pulse(clientX, clientY, strength = 0.8) {
      const { x, y } = toLocal(clientX, clientY);
      pulseLocal(x, y, strength);
    },
  };
}

// Draw one line of text scaled to fill the canvas, then sample it on a grid.
function textParticles(ctx, W, H, text, gap) {
  const font = (px) => `800 ${px}px "Bricolage Grotesque", system-ui, sans-serif`;
  // Fit by the glyphs' actual bounds: lowercase letters are shorter than the em box.
  let px = 100;
  ctx.font = font(px);
  const m = ctx.measureText(text);
  px *= Math.min(
    (H * 0.94) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent),
    (W * 0.98) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight),
  );
  ctx.font = font(px);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(-px * 0.02).toFixed(1)}px`;
  const fm = ctx.measureText(text);
  const top = (H - (fm.actualBoundingBoxAscent + fm.actualBoundingBoxDescent)) / 2;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.fillText(text, fm.actualBoundingBoxLeft, top + fm.actualBoundingBoxAscent);

  const data = ctx.getImageData(0, 0, W, H).data;
  const out = [];
  for (let y = 0; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      if (data[(y * W + x) * 4 + 3] > 140) out.push({ x, y });
    }
  }
  return out;
}
