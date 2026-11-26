import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { mountApp } from './app';
import { cloudEnabled } from './platform/config';

const root = document.getElementById('app');
if (root) {
  if (cloudEnabled()) {
    // Con Firebase configurado: registro e ingreso; el SDK se carga solo en este caso.
    void import('./platform/session').then((m) => m.start(root));
  } else {
    // Sin configuración: modo local (progreso en este navegador), como antes.
    mountApp(root);
  }
}
