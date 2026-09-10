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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
