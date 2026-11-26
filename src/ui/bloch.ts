/**
 * Esfera de Bloch en canvas 2D con proyección 3D sencilla.
 * Rotación de cámara con arrastre (ratón/toque) o con las flechas del teclado.
 */
import { h, cssVar } from './dom';
import type { BlochPoint } from '../core/quantum';

export interface BlochVector {
  point: Pick<BlochPoint, 'x' | 'y' | 'z'>;
  label: string;
  /** variable CSS del color, p. ej. '--vec-1' */
  colorVar: string;
}

export class BlochView {
  readonly canvas = h('canvas', {
    tabindex: 0,
    role: 'img',
    'aria-label': 'Esfera de Bloch. Usa las flechas del teclado para rotar la vista.',
  });
  readonly el = h('div', { class: 'canvas-wrap' }, this.canvas);
  private yaw = 0.65;
  private pitch = 0.35;
  private vectors: BlochVector[] = [];

  constructor() {
    let last: { x: number; y: number } | null = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      last = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!last || !this.canvas.hasPointerCapture(e.pointerId)) return;
      this.rotate((e.clientX - last.x) * 0.01, (e.clientY - last.y) * 0.01);
      last = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointerup', () => (last = null));
    this.canvas.addEventListener('keydown', (e) => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] };
      const v = d[e.key];
      if (!v) return;
      e.preventDefault();
      this.rotate(v[0], v[1]);
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => this.draw()).observe(this.el);
  }

  private rotate(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + dPitch));
    this.draw();
  }

  resetCamera(): void {
    this.yaw = 0.65;
    this.pitch = 0.35;
    this.draw();
  }

  set(vectors: BlochVector[]): void {
    this.vectors = vectors;
    this.draw();
  }

  /** Proyección: z arriba, rotación yaw alrededor de z y pitch alrededor del eje horizontal de la pantalla. */
  private project(x: number, y: number, z: number, cx: number, cy: number, R: number) {
    const cyw = Math.cos(this.yaw), syw = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = x * cyw - y * syw;
    const y1 = x * syw + y * cyw;
    const z2 = z * cp - y1 * sp;
    return { px: cx + x1 * R, py: cy - z2 * R };
  }

  draw(): void {
    const cv = this.canvas;
    const w = cv.clientWidth || 360;
    const hgt = cv.clientHeight || 360;
    if (w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr;
    cv.height = hgt * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const cx = w / 2, cy = hgt / 2, R = Math.min(w, hgt) * 0.34;
    const font = getComputedStyle(document.body).fontFamily;
    const axis = cssVar('--axis'), grid = cssVar('--grid'), muted = cssVar('--text-muted'), text = cssVar('--text');

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = axis;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const circle = (fn: (t: number) => [number, number, number], dashed: boolean) => {
      ctx.beginPath();
      ctx.setLineDash(dashed ? [4, 4] : []);
      for (let k = 0; k <= 72; k++) {
        const [x, y, z] = fn((k / 72) * Math.PI * 2);
        const p = this.project(x, y, z, cx, cy, R);
        if (k === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.strokeStyle = dashed ? grid : axis;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.setLineDash([]);
    };
    circle((t) => [Math.cos(t), Math.sin(t), 0], false);
    circle((t) => [Math.cos(t), 0, Math.sin(t)], true);
    circle((t) => [0, Math.cos(t), Math.sin(t)], true);

    const o = this.project(0, 0, 0, cx, cy, R);
    const axes: [number, number, number, string][] = [
      [1.22, 0, 0, '|+⟩  x'], [-1.22, 0, 0, '|−⟩'], [0, 1.22, 0, '|+i⟩  y'], [0, -1.22, 0, '|−i⟩'], [0, 0, 1.2, '|0⟩  z'], [0, 0, -1.2, '|1⟩'],
    ];
    ctx.font = `12px ${font}`;
    ctx.textAlign = 'center';
    for (const [x, y, z, lbl] of axes) {
      const p = this.project(x, y, z, cx, cy, R);
      ctx.beginPath();
      ctx.moveTo(o.px, o.py);
      ctx.lineTo(p.px, p.py);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(lbl, p.px, p.py + 4);
    }

    for (const v of this.vectors) {
      const color = cssVar(v.colorVar);
      const tip = this.project(v.point.x, v.point.y, v.point.z, cx, cy, R);
      ctx.beginPath();
      ctx.moveTo(o.px, o.py);
      ctx.lineTo(tip.px, tip.py);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tip.px, tip.py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = text;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = `700 13px ${font}`;
      ctx.fillText(v.label, tip.px + 18, tip.py - 10);
    }
  }
}
