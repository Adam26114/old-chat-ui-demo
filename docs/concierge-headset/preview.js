const artTemplate = document.querySelector("#bot-art");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const animatedBots = [];

function mountBot(host, still = false) {
  const svg = artTemplate.content.firstElementChild.cloneNode(true);
  svg.removeAttribute("role");
  svg.removeAttribute("aria-label");
  svg.setAttribute("aria-hidden", "true");
  host.append(svg);
  const bot = new HeadsetBotMotion(svg);
  if (still) bot.setReduced(true);
  else animatedBots.push(bot);
  return bot;
}

function startReview() {
  const hero = mountBot(document.querySelector("#hero-bot"));
  const name = document.querySelector("#state-name");
  const message = document.querySelector("#state-message");
  const states = document.querySelector("#states");
  const buttons = new Map();
  let selected = "natural";
  let replayFrame;

  function play(state) {
    selected = state;
    for (const [key, button] of buttons) {
      button.setAttribute("aria-pressed", String(key === state));
    }
    name.textContent = HEADSET_STATES[state].label;
    message.textContent = HEADSET_STATES[state].message;
    cancelAnimationFrame(replayFrame);
    if (hero.reduced || state === "natural") {
      hero.setState(state);
      if (state === "natural") hero.blink();
      return;
    }
    hero.setState("natural");
    // Commit the baseline pose so replay also works for the selected state.
    hero.svg.getBoundingClientRect();
    replayFrame = requestAnimationFrame(() => {
      hero.setState(state, { acknowledge: true });
      if (state === "looking") hero.demonstrateGaze();
    });
  }

  for (const [state, details] of Object.entries(HEADSET_STATES)) {
    const row = document.createElement("tr");
    row.dataset.pose = state;
    const heading = document.createElement("th");
    heading.scope = "row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "state-button";
    button.textContent = details.label;
    button.setAttribute("aria-pressed", String(state === selected));
    button.addEventListener("click", () => play(state));
    buttons.set(state, button);
    heading.append(button);
    row.append(heading);

    for (const surface of ["light", "dark"]) {
      const cell = document.createElement("td");
      const swatch = document.createElement("div");
      swatch.className = `swatch ${surface}`;
      swatch.setAttribute("role", "img");
      swatch.setAttribute("aria-label", `${details.label} at 56 and 32 pixels`);
      for (const size of [56, 32]) {
        const sample = document.createElement("div");
        sample.className = size === 32 ? "small-bot tiny" : "small-bot";
        swatch.append(sample);
        mountBot(sample, true).setState(state);
      }
      cell.append(swatch);
      row.append(cell);
    }
    states.append(row);
  }

  document.querySelector("#replay").addEventListener("click", () => play(selected));
}

function startLauncher() {
  const launcher = document.querySelector("#launcher");
  const chat = document.querySelector("#chat");
  const close = document.querySelector("#close-chat");
  const question = document.querySelector("#question");
  const cancel = document.querySelector("#cancel");
  const reply = document.querySelector("#reply");
  const bot = mountBot(launcher);
  const avatar = mountBot(document.querySelector("#chat-bot"));
  avatar.setState("active");

  let pointerNear = false;
  let pointerOver = false;
  let sleeping = false;
  let pending = false;
  let sleepTimer;
  let replyTimer;

  function syncState() {
    let state = "natural";
    if (!chat.hidden) state = pending ? "typing" : "active";
    else if (launcher.matches(":focus-visible")) state = "focus";
    else if (pointerOver) state = "hover";
    else if (pointerNear) state = "looking";
    else if (sleeping) state = "sleeping";
    bot.setState(state);
    avatar.setState(pending ? "typing" : "active");
  }

  function scheduleSleep() {
    clearTimeout(sleepTimer);
    if (document.hidden || !chat.hidden || pointerNear || launcher.matches(":focus-visible")) return;
    sleepTimer = setTimeout(() => {
      sleeping = true;
      syncState();
    }, 60000);
  }

  function resetPointer() {
    pointerNear = false;
    pointerOver = false;
    syncState();
    scheduleSleep();
  }

  function finishReply(text) {
    clearTimeout(replyTimer);
    pending = false;
    reply.textContent = text;
    question.removeAttribute("aria-disabled");
    if (document.activeElement === cancel) question.focus();
    cancel.hidden = true;
    syncState();
  }

  function closeChat() {
    finishReply("Welcome to The Fern House.");
    chat.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Open hotel chat");
    launcher.focus({ preventScroll: true });
    resetPointer();
  }

  launcher.addEventListener("click", (event) => {
    if (!chat.hidden) {
      closeChat();
      return;
    }
    sleeping = false;
    chat.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Close hotel chat");
    resetPointer();
    if (event.detail > 0) {
      bot.nod();
      avatar.nod();
    }
    close.focus({ preventScroll: true });
  });

  close.addEventListener("click", closeChat);

  question.addEventListener("click", () => {
    if (pending) return;
    pending = true;
    reply.textContent = "Preparing your reply…";
    question.setAttribute("aria-disabled", "true");
    cancel.hidden = false;
    syncState();
    replyTimer = setTimeout(() => finishReply("Check-in is from 3 pm. If you arrive early, we can store your bags."), 3200);
  });

  cancel.addEventListener("click", () => finishReply("Reply cancelled. Ask whenever you’re ready."));

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !chat.hidden) return;
    const bounds = launcher.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(x, y);
    pointerNear = distance <= 160;
    pointerOver = launcher.contains(event.target);
    if (pointerNear) sleeping = false;
    syncState();
    if (pointerNear) bot.look(x / Math.max(36, distance), y / Math.max(36, distance));
    scheduleSleep();
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", resetPointer);
  window.addEventListener("blur", resetPointer);
  document.addEventListener("visibilitychange", resetPointer);
  launcher.addEventListener("focus", () => {
    sleeping = false;
    syncState();
    scheduleSleep();
  });
  launcher.addEventListener("blur", () => {
    syncState();
    scheduleSleep();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !chat.hidden) {
      event.preventDefault();
      closeChat();
      return;
    }
    if (event.target === launcher) syncState();
    scheduleSleep();
  });
  scheduleSleep();
}

if (document.documentElement.classList.contains("live-mode")) startLauncher();
else startReview();

const motionToggle = document.querySelector("[data-motion-setting]");
let motionOverride;

function syncMotionPreference() {
  const reduced = motionOverride ?? motionPreference.matches;
  motionToggle.checked = reduced;
  for (const bot of animatedBots) bot.setReduced(reduced);
}

motionToggle.addEventListener("change", () => {
  motionOverride = motionToggle.checked;
  syncMotionPreference();
});

motionPreference.addEventListener("change", syncMotionPreference);
document.addEventListener("visibilitychange", () => {
  for (const bot of animatedBots) bot.setPaused(document.hidden);
});
syncMotionPreference();
