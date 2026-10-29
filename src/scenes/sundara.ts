import { $, desktop, reduced } from "../core/env";
import { beats, progress, whileVisible } from "../core/fx";
import { sound } from "../core/audio";
import { Sea } from "../core/sea";

/**
 * Sundara Kāṇḍa. Hanumān isn't in the footage, so this chapter is rendered: a moonlit
 * ocean, Mount Mahendra on the shore, Laṅkā on the horizon, and the leap as a saffron
 * comet the visitor carries across the sky by scrolling.
 */
export function mount() {
  const s = $("#sundara");
  const canvas = $<HTMLCanvasElement>(".ocean", s);
  if (!Sea.supported()) {
    canvas.style.background = "radial-gradient(ellipse at 70% 30%, #1a1f46, #050716 70%)";
    return;
  }
  const sea = new Sea(canvas, desktop() ? 0.8 : 0.6);
  if (reduced) {
    sea.p = 0.6;
    sea.render(0);
    return;
  }

  whileVisible(s, () => sea.start(), () => sea.stop(), "0px");
  beats(s);

  let leapt = false;
  let burned = false;
  progress(s, (v) => {
    sea.p = v;
    if (v > 0.4 && !leapt) {
      leapt = true;
      sound.whoosh(1.4);
    }
    if (v > 0.85 && !burned) {
      burned = true;
      sound.boom(0.8);
    }
    if (v < 0.3) leapt = burned = false;
  });
}
