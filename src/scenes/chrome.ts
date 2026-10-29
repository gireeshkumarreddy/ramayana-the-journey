import { gsap, ScrollTrigger, scrollTo } from "../core/scroll";
import { $, $$ } from "../core/env";
import { sound, type Mood } from "../core/audio";

const TONES: Record<string, { accent: string; mood: Mood }> = {
  night: { accent: "#d8b46a", mood: "calm" },
  silver: { accent: "#a9bccb", mood: "divine" },
  gold: { accent: "#d8b46a", mood: "calm" },
  sindoor: { accent: "#e2573f", mood: "ravana" },
  dusk: { accent: "#8fb0d6", mood: "calm" },
  leaf: { accent: "#b0472c", mood: "calm" },
  dawn: { accent: "#e2a945", mood: "divine" },
  indigo: { accent: "#f09a4a", mood: "night" },
};

/** Header, the ayana progress line, the chapter index and the sound toggle. */
export function mount() {
  const chapters = $$<HTMLElement>("main > .ch");
  const nodes = $(".ayana__nodes");
  const list = $(".chapters__list");
  const numEl = $(".chrome__num");
  const nameEl = $(".chrome__name");
  const root = document.documentElement;

  const label = (c: HTMLElement) => c.dataset.title!.replace(/&amp;/g, "&");

  chapters.forEach((c, i) => {
    const ravana = c.id === "ravana";
    const li = document.createElement("li");
    li.className = "ayana__node" + (ravana ? " ayana__node--ravana" : "");
    li.innerHTML = `<a href="#${c.id}"><span class="ayana__label">${c.dataset.num} · ${label(c)}</span></a>`;
    nodes.appendChild(li);

    const item = document.createElement("li");
    item.innerHTML = `<a href="#${c.id}"${ravana ? ' class="is-ravana"' : ""}><span>${c.dataset.num}</span>${label(c)}</a>`;
    list.appendChild(item);
    void i;
  });

  // Nodes are spaced by where each chapter actually sits in the scroll.
  const place = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    $$<HTMLElement>(".ayana__node", nodes).forEach((n, i) => {
      n.style.top = `${(Math.min(1, chapters[i].offsetTop / total) * 100).toFixed(2)}%`;
    });
  };
  ScrollTrigger.addEventListener("refresh", place);

  const fill = $(".ayana__fill");
  const vertical = () => innerWidth > 900;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      fill.style.transform = vertical() ? `scaleY(${self.progress})` : `scaleX(${self.progress})`;
    },
  });

  chapters.forEach((c, i) => {
    ScrollTrigger.create({
      trigger: c,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (!self.isActive) return;
        const tone = TONES[c.dataset.tone || "night"];
        root.style.setProperty("--accent", tone.accent);
        sound.setMood(tone.mood);
        if (numEl.textContent !== c.dataset.num) {
          gsap.fromTo([numEl, nameEl], { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05 });
          numEl.textContent = c.dataset.num!;
          nameEl.textContent = label(c);
        }
        $$(".ayana__node", nodes).forEach((n, j) => {
          n.classList.toggle("is-past", j <= i);
          n.classList.toggle("is-current", j === i);
        });
      },
    });
  });

  // Anchor links travel rather than jump.
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector<HTMLElement>(a.getAttribute("href")!);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollTo(target);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  // Chapters overlay
  const menu = $("#chapters");
  const toggle = $<HTMLButtonElement>("#menu-toggle");
  const openMenu = () => {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
    gsap.fromTo($$(".chapters__list li", menu), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.03, duration: 0.7, ease: "expo.out" });
    $<HTMLAnchorElement>(".chapters__list a", menu).focus();
  };
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
  $(".chapters__close", menu).addEventListener("click", closeMenu);
  addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  // Sound
  const sbtn = $<HTMLButtonElement>("#sound-toggle");
  const slabel = $(".chrome__btn-label", sbtn);
  sbtn.addEventListener("click", () => sound.setOn(!sound.on));
  sound.onChange((on) => {
    sbtn.setAttribute("aria-pressed", String(on));
    slabel.textContent = on ? "Sound on" : "Sound off";
    root.classList.toggle("is-sound", on);
  });
}
