/** Tonos de acierto/error (DUA 3) y locución por síntesis de voz (DUA 1). */
import { store } from '../state/store';

let ctx: AudioContext | null = null;

export function play(kind: 'ok' | 'err'): void {
  if (!store.get().prefs.sound) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    osc.type = kind === 'ok' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(kind === 'ok' ? 523.25 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(kind === 'ok' ? 659.25 : 165, t + 0.15);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t);
    osc.stop(t + 0.24);
  } catch {
    /* audio bloqueado por el navegador: la retroalimentación visual basta */
  }
}

export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Lee un texto en voz alta en español. Devuelve una función para detener la lectura. */
export function speak(text: string, onEnd?: () => void): () => void {
  if (!canSpeak()) {
    onEnd?.();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-CO';
  u.rate = 0.98;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return () => {
    window.speechSynthesis.cancel();
    onEnd?.();
  };
}
