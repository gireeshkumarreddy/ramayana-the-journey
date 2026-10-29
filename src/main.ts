import "@fontsource/cormorant/300.css";
import "@fontsource/cormorant/300-italic.css";
import "@fontsource/cormorant/400.css";
import "@fontsource/cormorant/400-italic.css";
import "@fontsource/cormorant/500.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/tiro-devanagari-sanskrit/400.css";

import "./styles/base.css";
import "./styles/chrome.css";
import "./styles/chapters.css";

import { initScroll, ScrollTrigger } from "./core/scroll";
import { reduced } from "./core/env";
import { initAuto } from "./core/clips";
import { gate } from "./scenes/gate";
import * as chrome from "./scenes/chrome";
import * as awakening from "./scenes/awakening";
import * as gods from "./scenes/gods";
import * as ayodhya from "./scenes/ayodhya";
import * as ravana from "./scenes/ravana";
import * as avatar from "./scenes/avatar";
import * as cast from "./scenes/cast";
import * as journey from "./scenes/journey";
import * as jatayu from "./scenes/jatayu";
import * as sundara from "./scenes/sundara";
import * as road from "./scenes/road";
import * as war from "./scenes/war";
import * as legacy from "./scenes/legacy";

if (reduced) document.documentElement.classList.add("reduced");
history.scrollRestoration = "manual";
window.scrollTo(0, 0);

initScroll();
chrome.mount();
for (const scene of [awakening, gods, ayodhya, ravana, avatar, cast, journey, jatayu, sundara, road, war, legacy]) {
  try {
    scene.mount();
  } catch (err) {
    // One scene failing must never take the journey down with it.
    console.error(err);
  }
}
initAuto();
ScrollTrigger.refresh();

addEventListener("load", () => ScrollTrigger.refresh());
document.fonts.ready.then(() => ScrollTrigger.refresh());

gate().then(() => awakening.intro());
