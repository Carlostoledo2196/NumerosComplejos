/**
 * Escena 10 · Reto de integración final y autoevaluación DUA (Cierre + encuesta).
 *  1. Reto de programación conceptual: constructor de circuitos por bloques (corrección #7 del guion).
 *  2. Cuestionario integrador: un reactivo por RAP, elegido del banco y con opciones barajadas.
 *  3. Informe: nota 40/60, rúbrica, desempeño por RAP (lista de medidores), insignia y exportación.
 *  4. Autoevaluación DUA y confianza final (comparada con la inicial).
 */
import { h, button, select, field } from '../ui/dom';
import { renderMath, tex } from '../ui/math';
import { Feedback } from '../ui/feedback';
import { play } from '../ui/audio';
import { sceneShell, prose, panel, choiceQuestion } from '../ui/widgets';
import { matrixTex } from '../ui/matrix-lab';
import { store } from '../state/store';
import { selectQuiz, reportFor, reportText, CIRCUITS_REQUIRED } from '../state/report';
import { CIRCUIT_CHALLENGES, evaluateCircuit, nameState, type CircuitChallenge } from '../core/circuits';
import { GATES, type GateId, type Qubit } from '../core/quantum';
import { CRITERIA, type Rap } from '../core/assessment';
import { format } from '../core/complex';
import type { SceneDef } from './types';

const stateTex = (q: Qubit) => `${format(q[0]!, 3)}\\,|0\\rangle ${q[1]!.re < 0 || (q[1]!.re === 0 && q[1]!.im < 0) ? '' : '+'} (${format(q[1]!, 3)})\\,|1\\rangle`;

/* ------------------------------ 1. Constructor de circuitos ------------------------------ */

function circuitBuilder(): HTMLElement {
  let ch: CircuitChallenge = CIRCUIT_CHALLENGES[0]!;
  let gates: GateId[] = [];
  const fb = new Feedback();
  const statement = h('div', {});
  const palette = h('div', { class: 'btn-row', role: 'group', 'aria-label': 'Compuertas disponibles' });
  const wire = h('ol', { class: 'circuit', 'aria-label': 'Circuito (en orden de aplicación)' });
  const code = h('pre', { class: 'code', 'aria-label': 'Código conceptual equivalente' });
  const traceBox = h('div', { class: 'steps-box' });
  const chip = h('span', { class: 'chip' });

  const paintChip = () => {
    const n = store.get().circuitsSolved.length;
    chip.textContent = `Resueltos: ${n} / ${CIRCUIT_CHALLENGES.length} (se requieren ${CIRCUITS_REQUIRED})`;
    chip.classList.toggle('chip--ok', n >= CIRCUITS_REQUIRED);
  };

  const renderCircuit = () => {
    wire.replaceChildren(
      h('li', { class: 'circuit__start' }, ch.startLabel),
      ...gates.map((g, k) => h('li', { class: 'circuit__gate' },
        h('span', {}, g),
        button('×', () => {
          gates.splice(k, 1);
          renderCircuit();
        }, 'circuit__remove', { 'aria-label': `Quitar la compuerta ${g} de la posición ${k + 1}` }),
      )),
      h('li', { class: 'circuit__end', 'aria-hidden': 'true' }, '→ ?'),
    );
    code.textContent = [`q = ${ch.startLabel}`, ...gates.map((g) => `q = ${g}(q)`), 'medir(q)'].join('\n');
    palette.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = gates.length >= ch.maxGates));
    traceBox.replaceChildren();
    fb.hide();
  };

  const load = () => {
    gates = [];
    statement.innerHTML = `<p><strong>${ch.title}.</strong> ${ch.statement}</p><p class="muted">Máximo ${ch.maxGates} compuerta(s)${ch.exactPhase ? ' · se exige la fase global exacta' : ' · se acepta una fase global distinta'}.</p>`;
    renderMath(statement);
    palette.replaceChildren(...ch.allowedGates.map((g) => button(g, () => {
      if (gates.length < ch.maxGates) gates.push(g);
      renderCircuit();
    }, 'btn', { 'aria-label': `Agregar ${GATES[g].name}`, title: GATES[g].name })));
    renderCircuit();
  };

  const run = () => {
    const r = evaluateCircuit(ch, gates);
    if (r.verdict === 'empty') {
      fb.show('info', r.message);
      return;
    }
    const steps = r.trace.map((q, k) => {
      const nm = nameState(q);
      const head = k === 0 ? 'Inicio' : `Tras ${gates[k - 1]}`;
      return `${head}: $${stateTex(q)}$${nm ? ` (estado ${nm})` : ''}`;
    });
    const U = gates.length ? `<p>Matriz total del circuito (se multiplica de derecha a izquierda): ${tex(`U = ${[...gates].reverse().join('')} = ${matrixTex(r.unitary)}`)}</p>` : '';
    traceBox.innerHTML = U;
    if (r.correct) {
      store.update((s) => { if (!s.circuitsSolved.includes(ch.id)) s.circuitsSolved.push(ch.id); });
      paintChip();
    }
    fb.show(r.correct ? 'ok' : 'err', r.message, { steps, title: r.correct ? '¡Circuito correcto!' : r.verdict === 'wrong-phase' ? 'Casi' : 'Revisa' });
  };

  const sel = select(CIRCUIT_CHALLENGES.map((c, k) => [c.id, `Reto ${k + 1}: ${c.title} (${c.startLabel} → ${c.targetLabel})`]), (v) => {
    ch = CIRCUIT_CHALLENGES.find((c) => c.id === v)!;
    load();
  });

  queueMicrotask(() => {
    load();
    paintChip();
  });

  return panel(
    h('p', { class: 'panel__title' }, '1 · Reto de programación conceptual de compuertas', chip),
    prose('<p>Arma un circuito con bloques: cada compuerta multiplica el vector de estado por su matriz. El evaluador simula tu circuito y compara el resultado con el objetivo.</p>'),
    field('Reto', sel),
    statement,
    h('div', { class: 'cols' },
      h('div', { class: 'panel panel--outline' }, h('p', { class: 'panel__title' }, 'Bloques'), palette, h('p', { class: 'panel__title' }, 'Tu circuito'), wire,
        h('div', { class: 'btn-row' },
          button('Ejecutar circuito', run, 'btn btn--primary'),
          button('Deshacer', () => { gates.pop(); renderCircuit(); }, 'btn btn--small'),
          button('Limpiar', () => { gates = []; renderCircuit(); }, 'btn btn--small'),
        )),
      h('div', { class: 'panel panel--outline' }, h('p', { class: 'panel__title' }, 'Código conceptual'), code, traceBox),
    ),
    fb.el,
  );
}

/* ------------------------------ 2. Cuestionario integrador ------------------------------ */

function finalQuiz(onGraded: () => void): HTMLElement {
  const wrap = h('div', { class: 'cols' });
  const fb = new Feedback();
  const status = h('span', { class: 'chip' });

  const render = () => {
    const s = store.get();
    const slots = selectQuiz(s.finalSeed);
    wrap.replaceChildren(...slots.map(({ item, order }, k) => {
      const chosen = s.finalAnswers[item.id] ?? null;
      return choiceQuestion(
        { prompt: item.prompt, options: item.options, correct: item.correct, ok: item.explain, err: item.explain },
        `RAP ${item.rap} · Pregunta ${k + 1} de ${slots.length}`,
        (idx) => {
          store.update((st) => { st.finalAnswers[item.id] = idx; st.finalGraded = false; });
          paintStatus();
        },
        // antes de calificar no se revela acierto/error; después, cada reactivo muestra su explicación
        { order, selected: chosen, reveal: s.finalGraded, deferred: !s.finalGraded },
      );
    }));
    // calificado: respuestas bloqueadas; para cambiarlas se pide un nuevo intento (otras preguntas)
    if (s.finalGraded) wrap.querySelectorAll<HTMLButtonElement>('button.option').forEach((b) => (b.disabled = true));
    paintStatus();
  };

  const paintStatus = () => {
    const s = store.get();
    const slots = selectQuiz(s.finalSeed);
    const answered = slots.filter(({ item }) => s.finalAnswers[item.id] !== undefined).length;
    status.textContent = s.finalGraded ? 'Calificado' : `Respondidas ${answered} / ${slots.length}`;
  };

  const grade = () => {
    const s = store.get();
    const slots = selectQuiz(s.finalSeed);
    if (slots.some(({ item }) => s.finalAnswers[item.id] === undefined)) {
      fb.show('err', 'Responde los 5 reactivos antes de calificar.', { title: 'Faltan respuestas' });
      return;
    }
    store.update((st) => { st.finalGraded = true; });
    const right = slots.filter(({ item }) => s.finalAnswers[item.id] === item.correct).length;
    fb.show(right >= 3 ? 'ok' : 'err', `Acertaste ${right} de ${slots.length}. Revisa la explicación de cada reactivo y tu informe más abajo.`, { title: 'Reto calificado' });
    render();
    onGraded();
  };

  const retry = () => {
    store.update((st) => {
      st.finalSeed = Math.floor(Math.random() * 2 ** 31);
      st.finalAnswers = {};
      st.finalGraded = false;
    });
    fb.hide();
    render();
    onGraded();
  };

  queueMicrotask(render);
  return panel(
    h('p', { class: 'panel__title' }, '2 · Cuestionario integrador (RAP 1 a RAP 5)', status),
    h('p', { class: 'muted' }, 'Las preguntas salen de un banco y las opciones se barajan en cada intento. Califica cuando hayas respondido todas.'),
    wrap,
    h('div', { class: 'btn-row' }, button('Calificar reto integrador', grade, 'btn btn--primary'), button('Nuevo intento (otras preguntas)', retry)),
    fb.el,
  );
}

/* ------------------------------ 3. Informe ------------------------------ */

function meterList(rows: [string, number][]): HTMLElement {
  return h('ul', { class: 'meters' }, ...rows.map(([name, f]) => {
    const p = Math.round(f * 100);
    return h('li', { class: 'meter' },
      h('span', { class: 'meter__name' }, name),
      h('span', { class: 'meter__track', role: 'img', 'aria-label': `${name}: ${p} %` }, h('span', { class: 'meter__fill', style: `width: ${p}%` })),
      h('span', { class: 'meter__value' }, `${p} %`),
    );
  }));
}

function badgeSvg(): string {
  return `<svg viewBox="0 0 96 96" aria-hidden="true">
    <circle cx="48" cy="40" r="30" fill="var(--primary)" />
    <circle cx="48" cy="40" r="22" fill="none" stroke="var(--on-primary)" stroke-width="2" />
    <ellipse cx="48" cy="40" rx="22" ry="7" fill="none" stroke="var(--on-primary)" stroke-width="1.5" stroke-dasharray="3 2" />
    <line x1="48" y1="40" x2="62" y2="27" stroke="var(--on-primary)" stroke-width="3" stroke-linecap="round" />
    <path d="M30 64 L24 90 L36 84 L42 94 L48 70 Z M66 64 L72 90 L60 84 L54 94 L48 70 Z" fill="var(--primary-strong)" />
  </svg>`;
}

function reportPanel(): { el: HTMLElement; refresh: () => void } {
  const body = h('div', { class: 'report' });
  const refresh = () => {
    const s = store.get();
    const r = reportFor(s);
    if (!s.finalGraded) {
      body.replaceChildren(h('p', { class: 'muted' }, 'Completa los laboratorios, el reto de circuitos y califica el cuestionario integrador para generar tu informe (nota de 1.0 a 5.0).'));
      return;
    }
    const conf = r.confidence;
    body.replaceChildren(
      h('div', { class: 'panel panel--outline' },
        h('p', { class: 'panel__title' }, 'Nota final ponderada'),
        h('p', {}, h('span', { class: 'grade' }, r.final.grade.toFixed(1)), ' / 5.0 · ', h('strong', {}, `Nivel ${r.final.level}`)),
        h('div', { class: 'table-wrap' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Componente'), h('th', { scope: 'col' }, 'Peso en la nota final'), h('th', { scope: 'col' }, 'Nota'), h('th', { scope: 'col' }, 'Nivel'))),
          h('tbody', {},
            h('tr', {}, h('th', { scope: 'row' }, 'Formativa (laboratorios)'), h('td', {}, '40 %'), h('td', {}, r.formative.grade.toFixed(1)), h('td', {}, '—')),
            ...CRITERIA.map((c) => h('tr', {}, h('th', { scope: 'row' }, `${c.id} · ${c.name}`), h('td', {}, `${Math.round(c.weight * 60)} %`), h('td', {}, r.summative.criteria[c.id].grade.toFixed(1)), h('td', {}, r.summative.criteria[c.id].level))),
          ),
        )),
        h('p', { class: 'muted' }, 'Los criterios C1–C3 forman el 60 % sumativo (30/30/40 de la rúbrica analítica).'),
        conf.delta !== null ? h('p', {}, `Confianza: ${conf.before} → ${conf.after} / 5 (${conf.delta > 0 ? '+' : ''}${conf.delta}).`) : null,
      ),
      h('div', { class: 'panel panel--outline' },
        h('p', { class: 'panel__title' }, 'Desempeño por RAP (reto integrador)'),
        meterList([...([1, 2, 3, 4, 5] as Rap[]).map((k) => [`RAP ${k}`, r.raps[k]] as [string, number]), ['Circuitos', Math.min(1, s.circuitsSolved.length / CIRCUITS_REQUIRED)]]),
        h('div', { class: `badge${r.badge ? ' is-earned' : ''}` },
          h('div', { html: badgeSvg() }),
          h('strong', {}, r.badge ? 'Insignia digital de evocación matemática cuántica obtenida' : 'Insignia pendiente'),
          h('span', { class: 'muted' }, r.badge ? '¡Felicitaciones!' : 'Se obtiene con una nota sumativa de 3.0 o más.'),
        ),
      ),
    );
  };
  const exportBtn = button('Descargar informe (.txt)', () => {
    const blob = new Blob([reportText(store.get())], { type: 'text/plain;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'informe-ova-complejos.txt' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'btn');
  refresh();
  store.subscribe(refresh);
  return {
    el: panel(h('p', { class: 'panel__title' }, '3 · Informe de desempeño en competencias', exportBtn), body),
    refresh,
  };
}

/* ------------------------------ 4. Autoevaluación DUA ------------------------------ */

function survey(onChange: () => void): HTMLElement {
  const s = store.get();
  const clarity = select([['', 'Selecciona una valoración…'], ['5 · Muy claro y accesible', '5 · Muy claro y accesible'], ['4 · Claro, me ayudó a evocar', '4 · Claro, me ayudó a evocar'], ['3 · Aceptable', '3 · Aceptable'], ['2 · Requiere mayor guía', '2 · Requiere mayor guía'], ['1 · Confuso', '1 · Confuso']],
    (v) => store.update((st) => { st.survey.clarity = v; }));
  clarity.value = s.survey.clarity;
  const transfer = select([['', 'Selecciona una opción…'], ['Sí, comprendo los algoritmos y su uso en cúbits', 'Sí, comprendo los algoritmos y su uso en cúbits'], ['Parcialmente, necesito reforzar matrices', 'Parcialmente, necesito reforzar matrices'], ['Todavía necesito más práctica', 'Todavía necesito más práctica']],
    (v) => store.update((st) => { st.survey.transfer = v; }));
  transfer.value = s.survey.transfer;
  const comment = h('textarea', { class: 'textarea', maxlength: 1000 });
  comment.value = s.survey.comment;
  comment.addEventListener('change', () => store.update((st) => { st.survey.comment = comment.value.trim(); }));

  const scale = h('div', { class: 'scale', role: 'group', 'aria-label': 'Confianza final del 1 al 5' });
  const paint = () => scale.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(store.get().confidenceAfter === i + 1)));
  for (let i = 1; i <= 5; i++) {
    scale.append(button(String(i), () => {
      store.update((st) => { st.confidenceAfter = i; });
      play('ok');
      paint();
      onChange();
    }, 'btn', { 'aria-pressed': 'false' }));
  }
  paint();

  return panel('4 · Autoevaluación DUA y percepción de la OVA',
    h('p', {}, `Ahora, ¿qué tan seguro te sientes operando en ℂ? (al inicio marcaste ${s.confidenceBefore ?? '—'} / 5)`),
    scale,
    h('div', { class: 'fields' },
      field('Claridad de las explicaciones paso a paso y de las representaciones', clarity),
      field('¿Te sientes más preparado para operar en ℂ sin depender a ciegas de la calculadora?', transfer),
    ),
    field('Reflexión breve o sugerencia sobre la OVA', comment),
  );
}

export const scene10: SceneDef = {
  id: 'e10',
  number: 10,
  title: 'Reto de integración final y autoevaluación DUA',
  minutes: 15,
  tag: 'Sumativa 60 % + encuesta',
  mount() {
    const report = reportPanel();
    return sceneShell('e10', 10, this.title, `${this.tag} · ${this.minutes} min`,
      prose('<p>Este es el cierre: resuelve al menos tres retos de circuitos, califica el cuestionario integrador (un reactivo por RAP) y genera tu informe. La nota final pondera los laboratorios (40 %) y el reto integrador (60 %).</p>'),
      circuitBuilder(),
      finalQuiz(report.refresh),
      report.el,
      survey(report.refresh),
    );
  },
};
