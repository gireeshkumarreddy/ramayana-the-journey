import { gsap } from "../core/scroll";
import { $, range, reduced } from "../core/env";
import { FrameSequence } from "../core/sequence";
import { beats, gateOpen, progress, whileVisible } from "../core/fx";
import media from "../data/media.json";

export function mount() {
  const s = $("#gods");
  const seq = new FrameSequence($<HTMLCanvasElement>(".seq", s), "airavata", media.seq.airavata);
  const omen = $(".omen", s);

  whileVisible(s, () => seq.start(), () => {}, "150% 0px");
  if (reduced) {
    seq.set(0.6);
    return;
  }

  gateOpen(s);
  beats(s);
  // The camera rides the valley as the visitor scrolls; the climb finishes a little early
  // so the last line sits over the elephant's full approach.
  progress(s, (p) => {
    seq.set(range(p, 0.02, 0.88));
    // A single ember, far to the south: the first sign of Rāvaṇa.
    const k = range(p, 0.66, 0.92);
    gsap.set(omen, { autoAlpha: k, scale: 0.6 + k * 1.2 });
  });
}
