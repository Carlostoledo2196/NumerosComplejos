# Conectar la OVA con Firebase

Con Firebase, la OVA pide **registro e ingreso** a los estudiantes, guarda su progreso en la nube y habilita el **panel docente** en `/docente.html`.
Sin configuración, la OVA sigue funcionando en modo local (progreso solo en el navegador, sin registro).

Todo funciona en el **plan gratuito Spark**.

## 1. Activar el ingreso con correo y contraseña

Consola de Firebase → tu proyecto → **Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña → Habilitar** (sin «vínculo de correo electrónico») → Guardar.

Recomendado: **Authentication → Plantillas** → idioma **español** para los correos de verificación y recuperación de contraseña.

## 2. Crear la base de datos Firestore

**Firestore Database → Crear base de datos** → ubicación cercana (p. ej. `southamerica-east1` o `us-east1`) → **modo de producción**.

## 3. Publicar las reglas de seguridad

**Firestore → Reglas** → reemplaza todo por el contenido de [`firestore.rules`](../firestore.rules) → **Publicar**.

(Alternativa por terminal: `npx firebase deploy --only firestore:rules --project ID_DE_TU_PROYECTO`.)

Las reglas garantizan que:
- cada estudiante solo lee y escribe **su propio** documento, y no puede cambiar su perfil ni su consentimiento;
- solo los **docentes autorizados con correo verificado** leen los resultados de todos;
- nadie puede darse permisos de docente desde la aplicación.

Están probadas con 16 casos contra el emulador: `npm run test:rules`.

## 4. Autorizar docentes

**Firestore → Iniciar colección** → ID de colección: `docentes` → ID del documento: **el correo del docente en minúsculas** (ej. `juan.cuero@unilibre.edu.co`) → agrega cualquier campo (p. ej. `nombre` = «Juan Carlos Cuero») → Guardar.

Repite por cada docente. Para quitar el acceso, borra su documento.

Luego el docente entra a `https://TU-SITIO/docente.html`, pulsa **Crear cuenta docente** con ese mismo correo, abre el enlace de verificación que le llega y pulsa **Ya verifiqué**.

## 5. Registrar la app web y copiar la configuración

**Configuración del proyecto (⚙) → General → Tus apps → `</>` (Web)** → apodo «OVA» → Registrar (no hace falta Firebase Hosting). Copia los valores de `firebaseConfig`.

## 6. Variables de entorno en Netlify

Netlify → tu sitio → **Site configuration → Environment variables → Add a variable**:

| Variable | Valor (de `firebaseConfig`) |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_OVA_GRUPOS` *(opcional)* | Grupos separados por coma, p. ej. `Grupo 1,Grupo 2`. Con esto el registro muestra una lista en vez de texto libre (evita «grupo 1» vs «Grupo1») |

Estos valores **no son secretos**: Firebase los diseña para ir en el navegador. La protección la dan las reglas del paso 3.

Después: **Deploys → Trigger deploy → Deploy site** (las variables se aplican en el siguiente build).

## 7. Autorizar el dominio de Netlify

Firebase → **Authentication → Configuración → Dominios autorizados → Agregar dominio** → `tu-sitio.netlify.app` (y tu dominio propio, si lo tienes).

## Desarrollo local con emuladores

```bash
npm run emuladores
```

En otra terminal:

```bash
VITE_USE_EMULATORS=true npm run dev
```

El proyecto `demo-ova` de los emuladores nunca toca la nube. Para crear un docente en el emulador, usa la interfaz REST del emulador o las pruebas en `e2e/`.

## Qué se guarda (modelo de datos)

| Ruta | Contenido |
|---|---|
| `docentes/{correo}` | Lista de docentes autorizados (solo desde la consola) |
| `estudiantes/{uid}` | `perfil` (nombre, código, grupo, correo) · `consentimiento` (versión y fecha del servidor) · `creado`, `ultimoAcceso`, `actualizado` · `estado` (progreso completo) · `resumen` (notas, nivel, RAP, módulos, laboratorios, confianza, encuesta) |

## Límites conocidos

- **Las notas se calculan en el navegador del estudiante.** Las reglas impiden que alguien escriba en el documento de otro, pero un estudiante con conocimientos técnicos podría alterar *su propio* resumen. Para una evaluación con nota oficial, cruza con el informe o usa la OVA como formativa. Calcular las notas en el servidor requiere Cloud Functions (plan Blaze, de pago por uso).
- **Datos personales:** el texto de autorización (Ley 1581 de 2012) está en `src/content/privacy.ts` y es un **borrador**. Ajústalo con la política oficial de tratamiento de datos de la Universidad Libre antes de usarlo con estudiantes.
