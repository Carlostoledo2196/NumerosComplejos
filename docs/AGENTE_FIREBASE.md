# Instrucciones para configurar Firebase · OVA Números Complejos

> Antes de entregar este archivo al agente, reemplaza los dos valores marcados con ✏️:
> los correos de los docentes (tarea 4) y el dominio de Netlify (tarea 6).

## Contexto

Configura el proyecto de Firebase **`numeroscomplejos`** (número de proyecto `1031485943862`) para un Objeto Virtual de Aprendizaje (OVA). Es una aplicación web estática alojada en Netlify, ya programada. Solo necesita que el proyecto quede configurado así:

- **Estudiantes:** se registran con correo y contraseña. Cada uno guarda su progreso en Firestore, en `estudiantes/{uid}`.
- **Docentes:** son los correos que aparecen como documentos en la colección `docentes`. Con correo verificado, pueden leer los resultados de todos los estudiantes.
- **Plan:** gratuito (Spark). No uses Cloud Functions, Storage ni Hosting.

**Restricciones importantes:**
- **No modifiques las reglas de seguridad** de la tarea 3: publícalas exactamente como están. No las relajes ni las abras «temporalmente» en modo de prueba.
- **No crees documentos en `estudiantes`**: la aplicación los crea al registrarse cada estudiante.
- **Datos ya existentes:** si el proyecto ya tiene datos o reglas, avísame antes de sobrescribir algo.

## Tareas

### 1. Authentication: correo y contraseña

1. Habilita Firebase Authentication, si aún no lo está.
2. En el método de acceso, activa **Correo electrónico/contraseña**. **No** actives «Vínculo de correo electrónico (acceso sin contraseña)».
3. En las plantillas de correo (verificación de correo y restablecimiento de contraseña), pon el idioma en **español**.

### 2. Base de datos Firestore

1. Crea la base de datos `(default)` en **modo de producción**.
2. Ubicación: **`southamerica-east1`** (São Paulo), la más cercana a Colombia. Si no está disponible, usa `us-east1`.

### 3. Reglas de seguridad de Firestore

Publica **exactamente** estas reglas y reemplaza las que existan:

```
rules_version = '2';

// Reglas de seguridad de la OVA. Publicar con: npx firebase deploy --only firestore:rules
// (o copiarlas en Consola de Firebase → Firestore → Reglas).
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    // Docente = correo verificado que existe como documento en /docentes/{correo en minúsculas}.
    function isTeacher() {
      return signedIn()
        && request.auth.token.email_verified == true
        && exists(/databases/$(database)/documents/docentes/$(request.auth.token.email.lower()));
    }

    function validProfile(p) {
      return p.keys().hasOnly(['nombre', 'codigo', 'grupo', 'email'])
        && p.nombre is string && p.nombre.size() >= 5 && p.nombre.size() <= 120
        && p.codigo is string && p.codigo.matches('^[A-Za-z0-9-]{3,30}$')
        && p.grupo is string && p.grupo.size() >= 1 && p.grupo.size() <= 40
        && p.email == request.auth.token.email.lower();
    }

    // Las marcas de tiempo, si cambian, deben ser la hora del servidor (no se pueden falsificar).
    function stampOk(field) {
      return !(field in request.resource.data.diff(resource.data).affectedKeys())
        || request.resource.data[field] == request.time;
    }

    // Lista de docentes autorizados: se administra solo desde la consola de Firebase.
    match /docentes/{email} {
      allow read: if signedIn() && request.auth.token.email.lower() == email;
      allow write: if false;
    }

    match /estudiantes/{uid} {
      // El estudiante lee su documento; los docentes autorizados leen todos.
      allow read: if (signedIn() && request.auth.uid == uid) || isTeacher();

      // Registro: solo el propio estudiante, con perfil válido y consentimiento de datos aceptado.
      allow create: if signedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['perfil', 'consentimiento', 'creado', 'ultimoAcceso', 'actualizado', 'estado', 'resumen'])
        && validProfile(request.resource.data.perfil)
        && request.resource.data.consentimiento.aceptado == true
        && request.resource.data.consentimiento.version is string
        && request.resource.data.consentimiento.fecha == request.time
        && request.resource.data.creado == request.time;

      // Progreso: solo el propio estudiante; perfil, consentimiento y fecha de creación no cambian.
      allow update: if signedIn() && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado', 'resumen', 'actualizado', 'ultimoAcceso'])
        && stampOk('actualizado') && stampOk('ultimoAcceso');

      allow delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Lista de docentes autorizados

Crea la colección **`docentes`**, con un documento por cada docente:

- **ID del documento:** el correo del docente, **todo en minúsculas** y sin espacios.
- **Campo:** `nombre` (tipo string) con el nombre del docente.

| ID del documento | Campo `nombre` |
|---|---|
| ✏️ `correo.docente1@unilibre.edu.co` | ✏️ Juan Carlos Cuero Yepes |
| ✏️ `correo.docente2@unilibre.edu.co` | ✏️ María José López Serrano |

No crees ninguna otra colección.

### 5. Registrar la app web

1. Si el proyecto no tiene una app web, registra una llamada **«OVA Web»**. No actives Firebase Hosting: el sitio está en Netlify.
2. Entrégame su objeto `firebaseConfig` completo: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` y `appId`.

### 6. Dominios autorizados para Authentication

En Authentication → Configuración → Dominios autorizados, agrega:

- ✏️ `NOMBRE-DE-TU-SITIO.netlify.app`

Mantén `localhost` y `numeroscomplejos.firebaseapp.com`.

## Qué necesito que me devuelvas al terminar

1. El objeto `firebaseConfig` de la tarea 5.
2. La confirmación de cada tarea (1 a 6), o el error exacto si alguna falló.
3. La ubicación final de Firestore.

## Fuera del alcance de este agente

Esto lo hace el equipo de la OVA después:

- **Variables de entorno en Netlify:** se configuran con el `firebaseConfig`.

  | Variable | Valor de `firebaseConfig` |
  |---|---|
  | `VITE_FIREBASE_API_KEY` | `apiKey` |
  | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
  | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
  | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
  | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
  | `VITE_FIREBASE_APP_ID` | `appId` |

- **Nuevo despliegue del sitio** en Netlify, para que tome las variables.
- **Cuentas de los docentes:** cada docente entra a `/docente.html`, crea su cuenta con el mismo correo de la tarea 4 y lo verifica con el enlace que le llega.
