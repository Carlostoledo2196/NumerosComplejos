# Recorridos de punta a punta (Playwright)

Scripts que usan la OVA como lo haría un estudiante y un docente, y verifican cada paso.
Requieren Playwright con Chromium (`npm i -D playwright && npx playwright install chromium`).

**Modo local** (sin Firebase):

```bash
npm run dev
```

En otra terminal:

```bash
node e2e/recorrido-local.cjs http://localhost:5173/ /tmp/captura
```

**Con Firebase** (emuladores, nunca toca la nube):

```bash
npm run emuladores
```

```bash
VITE_USE_EMULATORS=true npx vite --port 5174
```

```bash
node e2e/recorrido-firebase.cjs http://localhost:5174 /tmp/captura
```
