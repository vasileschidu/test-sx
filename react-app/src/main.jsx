import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';
import './index.css';
import logoLightUrl from '../../assets/img/smart-hub.svg?url';
import logoDarkUrl from '../../assets/img/smart-hub-dark.svg?url';
import logoMarkUrl from '../../assets/img/smart-hub-mark.svg?url';
import '../../src/scripts/theme-init.js';
import '../../src/scripts/stp-state.js';
import '../../src/scripts/nav-component.js';
import '../../src/scripts/topbar-component.js';

window.__APP_SHELL_ASSET_URLS = {
  logoLight: logoLightUrl,
  logoDark: logoDarkUrl,
  logoMark: logoMarkUrl,
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
