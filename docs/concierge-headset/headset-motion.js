// State and pointer controls for an inline copy of headset-bot.svg.
const HEADSET_STATES = {
  natural: { label: "Natural", message: "I’m here if you need me." },
  hover: { label: "Hover", message: "You have my attention." },
  active: { label: "Active", message: "I’m listening." },
  focus: { label: "Focus", message: "I’m ready to open." },
  typing: { label: "Typing", message: "I’m preparing your reply." },
  sleeping: { label: "Sleeping", message: "I’m resting, but you can wake me." },
  looking: { label: "Looking Cursor", message: "I see you nearby." },
};

let headsetInstance = 0;

class HeadsetBotMotion {
  constructor(svg) {
    this.svg = svg;
    this.head = svg.querySelector(".bot-head");
    this.gaze = svg.querySelector(".bot-gaze");
    this.eyes = [...svg.querySelectorAll(".bot-eye")];
    this.effects = [];
    this.state = "natural";
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.paused = false;

    const gradient = svg.querySelector("linearGradient");
    const shell = svg.querySelector(`[fill="url(#${gradient.id})"]`);
    gradient.id = `headset-shell-${++headsetInstance}`;
    shell.setAttribute("fill", `url(#${gradient.id})`);
    svg.dataset.state = this.state;
    this.scheduleBlink();
  }

  setState(state, { acknowledge = false } = {}) {
    if (!Object.hasOwn(HEADSET_STATES, state)) return;
    if (state !== this.state) {
      this.interrupt();
      this.state = state;
      this.svg.dataset.state = state;
      this.scheduleBlink();
    }
    if (state === "active" && acknowledge) this.nod();
  }

  setReduced(reduced) {
    this.reduced = reduced;
    this.svg.dataset.motion = reduced ? "reduce" : "full";
    this.interrupt();
    this.scheduleBlink();
  }

  setPaused(paused) {
    this.paused = paused;
    this.svg.toggleAttribute("data-paused", paused);
    this.interrupt();
    this.scheduleBlink();
  }

  interrupt() {
    for (const effect of this.effects) effect.cancel();
    this.effects = [];
    this.gaze.style.removeProperty("transform");
  }

  look(x, y) {
    if (this.reduced || this.paused || !["hover", "looking"].includes(this.state)) return;
    // x and y are a unit vector or a smaller offset near the button center.
    this.gaze.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
  }

  canAnimate() {
    return !this.reduced && !this.paused && !document.hidden;
  }

  scheduleBlink() {
    clearTimeout(this.blinkTimer);
    if (this.state !== "natural" || !this.canAnimate()) return;
    this.blinkTimer = setTimeout(() => {
      this.blink();
      this.scheduleBlink();
    }, 8500);
  }

  blink() {
    if (!this.canAnimate()) return;
    this.interrupt();
    this.effects = this.eyes.map((eye) => eye.animate([
      { transform: "scaleY(1)" },
      { transform: "scaleY(.14)", offset: .44 },
      { transform: "scaleY(1)" },
    ], { duration: 200, easing: "ease-in-out" }));
  }

  nod() {
    if (!this.canAnimate()) return;
    this.interrupt();
    const outward = "cubic-bezier(.23, 1, .32, 1)";
    this.effects = [this.head.animate([
      { transform: "none", easing: outward },
      { transform: "translateY(2.4%) rotate(2.5deg)", offset: .43, easing: outward },
      { transform: "translateY(-.54%) rotate(-.6deg)", offset: .8, easing: outward },
      { transform: "none" },
    ], { duration: 240 })];
  }

  demonstrateGaze() {
    if (!this.canAnimate()) return;
    this.interrupt();
    this.effects = [this.gaze.animate([
      { transform: "none" },
      { transform: "translate(-17px, -8px)", offset: .35 },
      { transform: "translate(20px, 2px)" },
    ], { duration: 620, easing: "ease-in-out" })];
  }
}
