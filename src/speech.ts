// "Read it to me": window.speechSynthesis with an es-MX (or any es-*) voice.
// Feature-detect; callers hide the button when no Spanish voice exists.

let spanishVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "es-MX") ??
    voices.find((v) => v.lang.startsWith("es-US")) ??
    voices.find((v) => v.lang.startsWith("es")) ??
    null
  );
}

export function speechAvailable(): boolean {
  if (!("speechSynthesis" in window)) return false;
  if (spanishVoice === undefined) {
    spanishVoice = pickVoice();
    // voices often load async
    window.speechSynthesis.onvoiceschanged = () => { spanishVoice = pickVoice(); };
  }
  return spanishVoice != null;
}

export function speak(text: string): void {
  if (!speechAvailable() || !spanishVoice) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = spanishVoice;
  u.lang = spanishVoice.lang;
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
