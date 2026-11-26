import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { mountApp } from './app';

const root = document.getElementById('app');
if (root) mountApp(root);
