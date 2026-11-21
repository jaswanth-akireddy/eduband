// Deterministic word timings: no randomness, so every difference in output is
// caused by the input we chose, not by noise.
const FILLER = /^(um+|uh+|er+|erm|ah)[,.]?$/i;
module.exports = function speak(text, o = {}) {
  const wpm = o.wpm ?? 140, conf = o.conf ?? 0.95, lead = o.lead ?? 0.3, tail = o.tail ?? 0.5;
  const slot = 60 / wpm, dur = slot * 0.8, gap = slot * 0.2;
  const words = []; let t = lead;
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    words.push({ word: tok, startSec: +t.toFixed(2), endSec: +(t + dur).toFixed(2), confidence: conf });
    t += dur;
    if (/[.!?]$/.test(tok)) t += o.sentencePause ?? 0.45;   // natural breath between sentences
    else if (FILLER.test(tok)) t += o.fillerPause ?? 0.5;  // hesitation after a filler
    else t += gap;
  }
  return { transcript: { text, words }, durationSec: +(t + tail).toFixed(2) };
};
