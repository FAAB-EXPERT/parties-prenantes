// Point d'entrée universel compatible Vite (AI Studio) et GitHub Pages (branche brute main / root)
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.indexOf('github.io') !== -1;

if (!isGitHubPages) {
  // Environnement Vite standard (AI Studio Dev & Build)
  import('./main.tsx');
} else {
  // Environnement GitHub Pages (servi directement depuis la branche main / root sans build préalable)
  (async function mountOnGitHubPages() {
    try {
      // Silence l'avertissement de développement du CDN Tailwind dans la console
      const originalWarn = console.warn;
      console.warn = function (...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].indexOf('cdn.tailwindcss.com') !== -1) {
          return;
        }
        return originalWarn.apply(console, args);
      };

      // 1. Chargement de Tailwind CSS
      await new Promise((resolve) => {
        const twScript = document.createElement('script');
        twScript.src = 'https://cdn.tailwindcss.com';
        twScript.onload = resolve;
        twScript.onerror = resolve;
        document.head.appendChild(twScript);
      });

      // 2. Chargement de Babel Standalone pour compiler App.tsx à la volée
      await new Promise((resolve, reject) => {
        const babelScript = document.createElement('script');
        babelScript.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
        babelScript.onload = resolve;
        babelScript.onerror = reject;
        document.head.appendChild(babelScript);
      });

      // 3. Récupération et transpilation de ./src/App.tsx
      const response = await fetch('./src/App.tsx');
      const tsxCode = await response.text();

      const compiled = window.Babel.transform(tsxCode, {
        filename: 'App.tsx',
        presets: [
          'typescript',
          ['react', { runtime: 'classic' }]
        ]
      }).code;

      // Résolution des imports ESM vers esm.sh avec instance React unique
      const resolvedCode = compiled
        .replace(/from\s+['"]react['"]/g, 'from "https://esm.sh/react@19.0.1"')
        .replace(/from\s+['"]lucide-react['"]/g, 'from "https://esm.sh/lucide-react@0.546.0?deps=react@19.0.1"')
        .replace(/from\s+['"]recharts['"]/g, 'from "https://esm.sh/recharts@2.15.1?deps=react@19.0.1"');

      const blob = new Blob([resolvedCode], { type: 'text/javascript' });
      const moduleUrl = URL.createObjectURL(blob);

      const ReactMod = await import(/* @vite-ignore */ 'https://esm.sh/react@19.0.1');
      const ReactDOMMod = await import(/* @vite-ignore */ 'https://esm.sh/react-dom@19.0.1/client?deps=react@19.0.1');
      const AppMod = await import(/* @vite-ignore */ moduleUrl);

      const React = ReactMod.default || ReactMod;
      const createRoot = ReactDOMMod.createRoot || (ReactDOMMod.default && ReactDOMMod.default.createRoot);

      const rootEl = document.getElementById('root');
      if (rootEl && AppMod.default && createRoot) {
        createRoot(rootEl).render(
          React.createElement(AppMod.default)
        );
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation :', err);
    }
  })();
}
