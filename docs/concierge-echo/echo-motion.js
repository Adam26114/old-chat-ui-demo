const root = document.documentElement;
const template = document.querySelector("#echo-art");
const settings = matchMedia("(prefers-reduced-motion: reduce)");
const toggles = [...document.querySelectorAll("[data-reduced-motion]")];
const poses = [...document.querySelectorAll(".motion-controls [data-pose]")];
const previewDescription = document.querySelector("#motion-description");
const demoLink = document.querySelector("#live-launcher-link");
const motionParameter = new URLSearchParams(location.search).get("motion");

const descriptions = {
  natural: "A quiet idle pose with an occasional blink.",
  hover: "The glass lifts and its shadow softens as the pointer enters.",
  active: "A small nod acknowledges the guest, then Echo settles.",
  focus: "An attentive gaze and a steady focus ring.",
  typing: "Echo glances up as three dots pulse from left to right.",
  sleeping: "The glass settles and the eyes close after a quiet minute.",
  looking: "Echo’s eyes follow a nearby pointer while the glass stays still."
};

function mountArt(host, index) {
  const svg = template.content.firstElementChild.cloneNode(true);
  const prefix = "echo-" + index + "-";
  for (const element of svg.querySelectorAll("[id]")) element.id = prefix + element.id;
  for (const element of svg.querySelectorAll("*")) {
    for (const name of ["href", "fill", "filter", "mask", "clip-path"]) {
      const value = element.getAttribute(name);
      if (value?.startsWith("url(#")) element.setAttribute(name, value.replace("url(#", "url(#" + prefix));
      if (name === "href" && value?.startsWith("#")) element.setAttribute(name, "#" + prefix + value.slice(1));
    }
  }
  svg.addEventListener("animationend", event => {
    if (event.animationName === "echo-blink") delete svg.dataset.blink;
    if (event.animationName === "echo-nod") delete svg.dataset.nod;
    if (event.animationName === "echo-look") delete svg.dataset.samplePath;
  });
  host.append(svg);
  return svg;
}

const art = { preview: [], live: [] };
const mode = root.classList.contains("review-mode") ? "live" : "preview";
for (const [index, host] of [...document.querySelectorAll('[data-echo="' + mode + '"]')].entries()) {
  art[mode].push(mountArt(host, index));
}

function clearCues(group) {
  for (const svg of art[group]) {
    delete svg.dataset.nod;
    delete svg.dataset.blink;
    delete svg.dataset.samplePath;
  }
}

function showPose(group, state) {
  clearCues(group);
  for (const svg of art[group]) svg.dataset.state = state;
}

function cue(group, name) {
  if (root.hasAttribute("data-reduced") || document.hidden) return;
  for (const svg of art[group]) svg.dataset[name] = "";
}

const launcher = document.querySelector(".echo-launcher");
const chat = document.querySelector("#echo-chat");
const closeButton = document.querySelector("#close-chat");
const send = document.querySelector("#send-question");
const reply = document.querySelector("#demo-reply");
const pendingActions = document.querySelector("#pending-actions");
const cancelReply = document.querySelector("#cancel-reply");
const failReply = document.querySelector("#fail-reply");
let selectedPose = "natural";
let livePose = "natural";
let replayFrame;
let reducedOverride = motionParameter === "reduce" ? true : motionParameter === "full" ? false : undefined;
let blinkTimer;
let sleepTimer;
let replyTimer;
let lastActivity = performance.now();
let pointerNear = false;
let pointerOver = false;
let open = false;
let pending = false;
let sleeping = false;

function scheduleBlink() {
  clearTimeout(blinkTimer);
  const state = mode === "live" ? livePose : selectedPose;
  if (state !== "natural" || document.hidden || root.hasAttribute("data-reduced")) return;
  blinkTimer = setTimeout(() => {
    cue(mode, "blink");
    scheduleBlink();
  }, 7000 + Math.random() * 3000);
}

function setReduced() {
  const reduced = reducedOverride ?? settings.matches;
  root.toggleAttribute("data-reduced", reduced);
  for (const toggle of toggles) toggle.checked = reduced;
  if (reduced) {
    cancelAnimationFrame(replayFrame);
    showPose(mode, mode === "live" ? livePose : selectedPose);
    for (const svg of art[mode]) delete svg.dataset.snap;
    setGaze(0, 0);
  }
  scheduleBlink();
}

function playPose(state) {
  selectedPose = state;
  for (const button of poses) button.setAttribute("aria-pressed", String(button.dataset.pose === state));
  previewDescription.textContent = descriptions[state];
  cancelAnimationFrame(replayFrame);

  const reduced = root.hasAttribute("data-reduced");
  for (const svg of art.preview) svg.toggleAttribute("data-snap", !reduced);
  showPose("preview", reduced ? state : "natural");
  if (!reduced) {
    // Commit the resting pose before replaying a transition to the same state.
    art.preview[0].getBoundingClientRect();
    replayFrame = requestAnimationFrame(() => {
      for (const svg of art.preview) delete svg.dataset.snap;
      showPose("preview", state);
      if (state === "natural") cue("preview", "blink");
      if (state === "active") cue("preview", "nod");
      if (state === "looking") cue("preview", "samplePath");
    });
  }
  scheduleBlink();
}

function setGaze(x, y) {
  for (const svg of art.live) {
    const gaze = svg.querySelector(".echo-gaze");
    gaze.style.setProperty("--gaze-x", x + "px");
    gaze.style.setProperty("--gaze-y", y + "px");
  }
}

function syncLivePose() {
  let state = "natural";
  if (pending && open) state = "typing";
  else if (open) state = "active";
  else if (launcher.matches(":focus-visible")) state = "focus";
  else if (pointerOver) state = "hover";
  else if (pointerNear) state = "looking";
  else if (sleeping) state = "sleeping";

  if (state === livePose) return;
  livePose = state;
  showPose("live", state);
  scheduleBlink();
}

function scheduleSleep() {
  clearTimeout(sleepTimer);
  if (document.hidden || open || sleeping || pointerNear || launcher.matches(":focus-visible")) return;
  const remaining = 60000 - (performance.now() - lastActivity);
  if (remaining <= 0) {
    sleeping = true;
    syncLivePose();
  } else {
    sleepTimer = setTimeout(scheduleSleep, remaining);
  }
}

function recordActivity(wake = false) {
  lastActivity = performance.now();
  if (wake) sleeping = false;
  if (!sleepTimer || wake) scheduleSleep();
}

function updatePointer(event) {
  if (event.pointerType !== "mouse" || open) return;
  const { left, top, width, height } = launcher.getBoundingClientRect();
  const x = event.clientX - left - width / 2;
  const y = event.clientY - top - height / 2;
  const distance = Math.hypot(x, y);
  const wasNear = pointerNear;
  pointerNear = distance <= 160;
  pointerOver = pointerNear && Math.abs(x) <= width / 2 && Math.abs(y) <= height / 2
    && launcher.contains(document.elementFromPoint(event.clientX, event.clientY));
  if (pointerNear && !root.hasAttribute("data-reduced")) {
    const gain = 44.8 / Math.max(46, distance);
    setGaze(x * gain, y * gain);
  } else {
    setGaze(0, 0);
  }
  recordActivity(pointerNear && !wasNear);
  if (wasNear && !pointerNear) scheduleSleep();
  syncLivePose();
}

function resetPointer() {
  pointerNear = false;
  pointerOver = false;
  setGaze(0, 0);
}

function finishReply(message) {
  clearTimeout(replyTimer);
  pending = false;
  reply.textContent = message;
  send.disabled = false;
  if (pendingActions.contains(document.activeElement) && open) send.focus();
  pendingActions.hidden = true;
  syncLivePose();
}

function openChat() {
  resetPointer();
  open = true;
  recordActivity(true);
  root.setAttribute("data-chat-open", "");
  chat.hidden = false;
  launcher.setAttribute("aria-expanded", "true");
  launcher.setAttribute("aria-label", "Close hotel chat");
  syncLivePose();
  cue("live", "nod");
  closeButton.focus();
}

function closeChat() {
  if (!open) return;
  open = false;
  if (pending) finishReply("Welcome to The Fern House.");
  chat.hidden = true;
  root.removeAttribute("data-chat-open");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-label", "Open hotel chat");
  launcher.focus();
  recordActivity(true);
  syncLivePose();
}

if (mode === "preview") {
  for (const button of poses) button.addEventListener("click", () => playPose(button.dataset.pose));
  document.querySelector("#replay").addEventListener("click", () => playPose(selectedPose));
  previewDescription.textContent = descriptions.natural;
} else {
  launcher.addEventListener("click", () => open ? closeChat() : openChat());
  launcher.addEventListener("focusin", () => {
    recordActivity(true);
    syncLivePose();
  });
  launcher.addEventListener("focusout", () => queueMicrotask(() => {
    syncLivePose();
    scheduleSleep();
  }));
  document.addEventListener("pointermove", updatePointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    resetPointer();
    syncLivePose();
    scheduleSleep();
  });
  document.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" && !open) resetPointer();
    recordActivity();
    syncLivePose();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeChat();
      return;
    }
    recordActivity();
    if (document.activeElement === launcher) queueMicrotask(syncLivePose);
  });
  closeButton.addEventListener("click", closeChat);
  send.addEventListener("click", () => {
    pending = true;
    reply.textContent = "Preparing your reply…";
    pendingActions.hidden = false;
    cancelReply.focus();
    send.disabled = true;
    syncLivePose();
    replyTimer = setTimeout(() => {
      finishReply("Check-in starts at 3:00 PM. We can hold your bags if you arrive early.");
    }, 3400);
  });
  cancelReply.addEventListener("click", () => finishReply("Reply canceled."));
  failReply.addEventListener("click", () => finishReply("Couldn’t prepare a reply. Try again."));
  scheduleSleep();
}

for (const toggle of toggles) {
  toggle.addEventListener("change", () => {
    reducedOverride = toggle.checked;
    const demoUrl = new URL(demoLink.href);
    demoUrl.searchParams.set("motion", reducedOverride ? "reduce" : "full");
    demoLink.href = demoUrl.href;
    setReduced();
  });
}
settings.addEventListener("change", setReduced);
document.addEventListener("visibilitychange", () => {
  root.toggleAttribute("data-page-hidden", document.hidden);
  scheduleBlink();
  if (mode === "live") scheduleSleep();
});
setReduced();
