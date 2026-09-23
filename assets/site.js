// The homepage plays out as one agent run: the name forms from particles, the
// agent thinks, read_file streams the intro token by token, and list_projects
// and get_contact run once they scroll into view. Every token sends a pulse
// from its position up into the name.

// ---------- Intro ----------
// One array per paragraph. Strings are plain text; objects may carry:
//   id   so later words can attend to this one
//   alt  candidate words with probabilities; the first is the default
//   att  earlier words this one attends to, as { id: weight } with weight 0–1
// Probabilities and weights are hand-written and illustrative.
const BIO = [
  [
    "I'm ",
    { t: "wick", id: "name", alt: [["wick", 0.93], ["Wen", 0.05]] },
    ", a ",
    { t: "full-stack", id: "fs", alt: [["full-stack", 0.72], ["backend", 0.19], ["software", 0.06]], att: { name: 0.3 } },
    " ",
    { t: "engineer", id: "eng", alt: [["engineer", 0.81], ["developer", 0.15], ["builder", 0.03]], att: { fs: 0.7 } },
    ".",
  ],
  [
    "I live by one rule: you ",
    { t: "build", id: "build", alt: [["build", 0.8], ["ship", 0.1], ["write", 0.06]], att: { eng: 0.4 } },
    " it, you ",
    { t: "run", id: "run", alt: [["run", 0.83], ["own", 0.1], ["fix", 0.04]], att: { build: 0.9 } },
    " it.",
  ],
  [
    "These days I'm putting serious time into ",
    { t: "learning", id: "learn", alt: [["learning", 0.66], ["studying", 0.21], ["building with", 0.1]] },
    " ",
    { t: "AI", id: "ai", alt: [["AI", 0.78], ["ML", 0.12], ["agents", 0.06]], att: { learn: 0.7, eng: 0.3 } },
    ".",
  ],
];

const NAME = "wick";

const agentStatus = createStatus();

const field = createField($("#field"), {
  ready: () => document.fonts.load(`800 100px "Bricolage Grotesque"`, NAME),
  build: (ctx, W, H) => textParticles(ctx, W, H, NAME, W < 640 ? 4 : 6),
});

// ---------- Rendering, streaming and sampling ----------

const bio = $("#bio");
const svg = $("#attn");
const pop = $("#pop");
const byId = new Map();
const sequence = [];

// Split plain text into 3–5 character pieces so it streams like real tokens.
function chunk(text) {
  const parts = [];
  for (let i = 0; i < text.length; ) {
    const n = 3 + ((i * 5) % 3);
    parts.push(text.slice(i, i + n));
    i += n;
  }
  return parts;
}

function renderBio() {
  for (const el of bio.querySelectorAll(".bio-fallback")) el.remove();
  for (const para of BIO) {
    const p = document.createElement("p");
    for (const item of para) {
      if (typeof item === "string") {
        for (const piece of chunk(item)) {
          const span = document.createElement("span");
          span.className = "tok";
          span.textContent = piece;
          p.append(span);
          sequence.push({ el: span });
        }
        continue;
      }
      // A span, not a <button>: buttons break inline wrapping and can orphan punctuation.
      const el = document.createElement("span");
      el.className = "tok";
      el.textContent = item.t;
      el.dataset.word = item.t;
      if (item.alt) {
        el.setAttribute("role", "button");
        el.tabIndex = 0;
        el.setAttribute("aria-describedby", "pop");
      }
      el.tokData = item;
      if (item.id) byId.set(item.id, el);
      p.append(el);
      sequence.push({ el, item });
    }
    bio.insertBefore(p, svg);
  }
}

function sampleWord(alt, temperature) {
  if (temperature < 0.05) return alt[0][0];
  const weights = alt.map(([, p]) => Math.pow(p, 1 / temperature));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < alt.length; i++) {
    r -= weights[i];
    if (r <= 0) return alt[i][0];
  }
  return alt[0][0];
}

function pulseFrom(el, strength) {
  const r = el.getBoundingClientRect();
  field.pulse(r.left + r.width / 2, r.top + r.height / 2, strength);
}

let streaming = false;

// Stream the intro token by token and return the token count.
async function streamBio({ fast = false, skippable = false } = {}) {
  streaming = true;
  agentStatus.busy(true);
  bio.classList.remove("ready");
  hidePop();

  let skipped = false;
  const skip = () => { skipped = true; };
  if (skippable) {
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
  }

  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");

  for (const { el } of sequence) el.classList.add("pending");

  for (const { el, item } of sequence) {
    agentStatus.token();
    el.classList.remove("pending");
    if (skipped) continue;
    el.after(caret);
    const word = item ? el.dataset.word : null;
    if (item && item.alt && item.alt.length > 1) {
      // Flash through the other candidates before settling on the sampled word.
      el.classList.add("sampling");
      for (const [w] of item.alt.filter(([w]) => w !== word).reverse()) {
        el.textContent = w;
        await wait(fast ? 35 : 50);
      }
      el.textContent = word;
      el.classList.remove("sampling");
      pulseFrom(el, 1);
      await wait(fast ? 35 : 55);
    } else {
      if (word) el.textContent = word;
      pulseFrom(el, 0.45);
      await wait((fast ? 8 : 12) + el.textContent.length * (fast ? 4 : 7));
    }
  }

  window.removeEventListener("keydown", skip);
  window.removeEventListener("pointerdown", skip);
  for (const { el, item } of sequence) {
    el.classList.remove("pending", "sampling");
    if (item) el.textContent = el.dataset.word;
  }
  sequence[sequence.length - 1].el.after(caret);
  bio.classList.add("ready");
  agentStatus.busy(false);
  streaming = false;
  return sequence.length;
}

function bindControls() {
  const temp = $("#temp");
  const out = $("#temp-out");
  const regen = $("#regen");
  const stats = $("#stats");

  temp.addEventListener("input", () => { out.textContent = Number(temp.value).toFixed(1); });

  regen.addEventListener("click", async () => {
    if (streaming) return;
    regen.disabled = true;
    const T = Number(temp.value);
    let changed = 0;
    for (const { el, item } of sequence) {
      if (!item || !item.alt) continue;
      const w = sampleWord(item.alt, T);
      el.dataset.word = w;
      el.classList.toggle("changed", w !== item.t);
      if (w !== item.t) changed += 1;
    }
    const t0 = performance.now();
    const n = await streamBio({ fast: true });
    stats.textContent = `Generated ${n} tokens in ${fmtDuration(performance.now() - t0)}. At temperature ${T.toFixed(1)}, ${changed} ${changed === 1 ? "word" : "words"} changed.`;
    regen.disabled = false;
  });

  return (n, ms) => {
    stats.textContent = `Generated ${n} tokens in ${fmtDuration(ms)}.`;
    $("#controls").hidden = false;
    $("#hint").hidden = false;
  };
}

// ---------- Candidates and attention ----------

let activeEl = null;

function relRect(el, root) {
  const r = el.getClientRects()[0] || el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
}

function attentionOf(el) {
  const out = Object.entries(el.tokData.att || {})
    .map(([id, w]) => ({ el: byId.get(id), w }))
    .filter((a) => a.el && a.el !== el);
  // Words without att lightly attend to the previous token.
  if (!out.length) {
    const idx = sequence.findIndex((s) => s.el === el);
    if (idx > 0) out.push({ el: sequence[idx - 1].el, w: 0.35 });
  }
  return out;
}

function drawAttention(el) {
  const src = relRect(el, bio);
  const sx = src.x + src.w / 2;
  const sy = src.y + src.h * 0.12;
  const paths = [];

  for (const { el: target, w } of attentionOf(el)) {
    const t = relRect(target, bio);
    const tx = t.x + t.w / 2;
    const ty = t.y + t.h * 0.12;
    const dist = Math.hypot(tx - sx, ty - sy);
    const cy = Math.min(sy, ty) - (18 + dist * 0.22);
    paths.push({ d: `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${((sx + tx) / 2).toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`, w });
    target.classList.add("attended");
    target.style.setProperty("--w", (0.12 + w * 0.3).toFixed(2));
  }

  svg.innerHTML = paths
    .map(({ d, w }) => `<path d="${d}" stroke-width="${(1 + w * 2.5).toFixed(2)}" opacity="${(0.35 + w * 0.65).toFixed(2)}"/>`)
    .join("");
  for (const path of svg.querySelectorAll("path")) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = reduceMotion ? 0 : len;
  }
}

function fillPop(el) {
  const current = el.dataset.word;
  pop.replaceChildren();
  const title = document.createElement("p");
  title.className = "pop-title";
  title.textContent = "Candidates at this position";
  const list = document.createElement("ol");
  for (const [word, p] of el.tokData.alt) {
    const li = document.createElement("li");
    if (word === current) li.className = "chosen";
    const pct = `${Math.round(p * 100)}%`;
    li.innerHTML = `<span></span><span class="bar"><i style="width:${pct}"></i></span><span class="pct">${pct}</span>`;
    li.firstChild.textContent = word;
    list.append(li);
  }
  pop.append(title, list);
  pop.hidden = false;

  const host = pop.offsetParent || document.body;
  const r = relRect(el, host);
  const left = Math.max(8, Math.min(r.x, host.clientWidth - pop.offsetWidth - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${r.y + r.h + 10}px`;
}

function showPop(el) {
  if (!bio.classList.contains("ready")) return;
  hidePop();
  activeEl = el;
  el.classList.add("active");
  drawAttention(el);
  fillPop(el);
  pulseFrom(el, 1);
}

function hidePop() {
  if (activeEl) activeEl.classList.remove("active");
  activeEl = null;
  svg.innerHTML = "";
  pop.hidden = true;
  for (const el of bio.querySelectorAll(".attended")) el.classList.remove("attended");
}

function bindTokens() {
  for (const el of bio.querySelectorAll(".tok[role=button]")) {
    el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showPop(el); });
    el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hidePop(); });
    el.addEventListener("focus", () => showPop(el));
    el.addEventListener("blur", hidePop);
    // Touch: tap to open, tap again to close. With a mouse, hover already opened it.
    el.addEventListener("click", () => {
      if (canHover.matches) return showPop(el);
      activeEl === el ? hidePop() : showPop(el);
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hidePop();
    const el = e.target.closest && e.target.closest(".tok[role=button]");
    if (el && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      activeEl === el ? hidePop() : showPop(el);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (activeEl && !e.target.closest(".tok[role=button]")) hidePop();
  });
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth !== lastWidth) hidePop();
    lastWidth = window.innerWidth;
  });
}

// ---------- Agent steps ----------

const steps = [...document.querySelectorAll(".step")];
let chain = Promise.resolve();
const triggered = new Set();

async function runStep(step, work, latency) {
  step.classList.add("running");
  agentStatus.busy(true);
  const t0 = performance.now();
  pulseFrom(step.querySelector(".call"), 0.9);
  await wait(reduceMotion ? 0 : latency);
  step.classList.add("shown");
  if (work) await work();
  step.classList.remove("running");
  step.classList.add("done");
  step.querySelector(".dur").textContent = fmtDuration(performance.now() - t0);
  agentStatus.busy(false);
}

async function think() {
  const step = $('[data-step="think"]');
  const label = $("#think-label");
  const text = $("#think-text");
  const thought = text.textContent;
  step.classList.add("running", "shown");
  agentStatus.busy(true);
  text.textContent = "";
  const t0 = performance.now();
  const total = reduceMotion ? 0 : 1100;
  while (performance.now() - t0 < total) {
    label.textContent = `Thinking ${((performance.now() - t0) / 1000).toFixed(1)}s`;
    await wait(80);
  }
  label.textContent = `Thought for ${Math.max(0.1, (performance.now() - t0) / 1000).toFixed(1)}s`;
  if (reduceMotion) {
    text.textContent = thought;
  } else {
    for (const ch of thought) {
      text.textContent += ch;
      await wait(22);
    }
  }
  step.classList.remove("running");
  step.classList.add("done");
  agentStatus.busy(false);
}

// Steps run in order; jumping ahead first runs any earlier steps that were skipped.
function trigger(name) {
  const idx = steps.findIndex((s) => s.dataset.step === name);
  for (const step of steps.slice(0, idx + 1)) {
    const key = step.dataset.step;
    if (triggered.has(key)) continue;
    triggered.add(key);
    chain = chain.then(() => WORK[key]());
  }
}

const WORK = {
  think,
  bio: () => runStep($('[data-step="bio"]'), async () => {
    const t0 = performance.now();
    const n = await streamBio({ skippable: true });
    revealControls(n, performance.now() - t0);
  }, 520),
  work: () => runStep($("#work"), () => wait(reduceMotion ? 0 : 700), 640),
  contact: () => runStep($("#contact"), null, 280),
};

function observeSteps() {
  const lazy = ["work", "contact"];
  if (!("IntersectionObserver" in window)) {
    lazy.forEach(trigger);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      trigger(e.target.dataset.step);
    }
  }, { rootMargin: "0px 0px -15% 0px" });
  for (const name of lazy) io.observe(document.querySelector(`[data-step="${name}"]`));
}

// ---------- Misc ----------

function bindCopy() {
  for (const btn of document.querySelectorAll(".copy")) {
    const note = btn.parentElement.querySelector(".copied");
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        note.textContent = "Copied";
      } catch {
        note.textContent = "Copy failed. Select it manually.";
      }
      setTimeout(() => { note.textContent = ""; }, 2000);
    });
  }
}

$("#year").textContent = new Date().getFullYear();
renderBio();
bindTokens();
const revealControls = bindControls();
bindCopy();
field.init().then(() => field.reveal());
trigger("bio");
observeSteps();
