import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA (21/08/2026) : enregistre le service worker une fois la page chargée,
// pour ne jamais retarder l'affichage initial. Si le navigateur ne le
// supporte pas (très rare aujourd'hui), l'app fonctionne simplement sans
// le mode hors ligne partiel — aucune dépendance bloquante.
// Installation sur l'écran d'accueil (07/11/2026) : Chrome et Android
// proposent l'installation via l'événement « beforeinstallprompt », émis
// une seule fois et très tôt. On le garde de côté pour que le bouton
// « Installer EchoTalk » de l'EchoProfil puisse l'utiliser plus tard.
// (iPhone n'émet jamais cet événement : le bouton y affiche les étapes.)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as Window & { __installEchoTalk?: Event }).__installEchoTalk = e;
  window.dispatchEvent(new Event('echotalk-installable'));
})
window.addEventListener('appinstalled', () => {
  (window as Window & { __installEchoTalk?: Event }).__installEchoTalk = undefined;
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
