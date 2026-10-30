// Chargeur universel FAAB ACTOR — Compatible Vite (AI Studio) & GitHub Pages (branche main / root)
const isGitHubPages =
  typeof window !== 'undefined' && window.location.hostname.indexOf('github.io') !== -1;

if (!isGitHubPages) {
  import('./main.tsx');
} else {
  (async function mountFaabActorOnGitHubPages() {
    const rootEl = document.getElementById('root');
    if (rootEl && !rootEl.innerHTML.trim()) {
      rootEl.innerHTML =
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:\'Plus Jakarta Sans\',system-ui,sans-serif;gap:14px;">' +
        '<img src="./logo.png?v=7" alt="FAAB ACTOR" style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(225,29,72,0.55));" />' +
        '<div style="font-size:15px;font-weight:800;letter-spacing:0.08em;color:#fda4af;">FAAB ACTOR</div>' +
        '<div style="font-size:12px;color:#94a3b8;">Chargement de l\'espace de gouvernance...</div>' +
        '</div>';
    }

    try {
      // 1. Masquer l'avertissement de console du CDN Tailwind
      const origWarn = console.warn;
      console.warn = function (...args) {
        if (
          args[0] &&
          typeof args[0] === 'string' &&
          args[0].indexOf('cdn.tailwindcss.com') !== -1
        ) {
          return;
        }
        return origWarn.apply(console, args);
      };

      // 2. Injection des styles personnalisés de src/index.css + Tailwind CSS
      const cssPromise = fetch('./src/index.css')
        .then(r => (r.ok ? r.text() : ''))
        .then(cssText => {
          if (!cssText) return;
          const cleanedCss = cssText
            .replace(/@import\s+["']tailwindcss["'];?/g, '')
            .replace(/@custom-variant\s+[^\n;]+;?/g, '')
            .replace(/@layer\s+base\s*\{([\s\S]*?)\n\}/m, '$1');
          const styleEl = document.createElement('style');
          styleEl.setAttribute('data-faab-custom-css', 'true');
          styleEl.textContent = cleanedCss;
          document.head.appendChild(styleEl);
        })
        .catch(() => {});

      const tailwindPromise = new Promise(resolve => {
        window.tailwind = { config: { darkMode: 'class' } };
        const twScript = document.createElement('script');
        twScript.src = 'https://cdn.tailwindcss.com';
        twScript.onload = resolve;
        twScript.onerror = resolve;
        document.head.appendChild(twScript);
      });

      const babelPromise = new Promise((resolve, reject) => {
        if (window.Babel) return resolve();
        const babelScript = document.createElement('script');
        babelScript.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
        babelScript.onload = resolve;
        babelScript.onerror = reject;
        document.head.appendChild(babelScript);
      });

      // 3. Liste ordonnée de tous les fichiers sources présents dans /src sur GitHub
      const sourceFiles = [
        'src/types.ts',
        'src/securityUtils.ts',
        'src/i18n.ts',
        'src/pertUtils.ts',
        'src/db.ts',
        'src/qrAndBarcodeUtils.ts',
        'src/firebase.ts',
        'src/services/superAdminService.ts',
        'src/services/exportStorage.ts',
        'src/docMatrices.ts',
        'src/docTemplates.ts',
        'src/slidePresentations.ts',
        'src/pdfExport.ts',
        'src/components/AppLogo.tsx',
        'src/components/QrAndBarcodeSvg.tsx',
        'src/components/QrBarcodeScannerModal.tsx',
        'src/components/InternalActorProfileModal.tsx',
        'src/components/CategoriesActorsView.tsx',
        'src/components/StakeholderGovernanceTabs.tsx',
        'src/components/SlideDeckWorkspace.tsx',
        'src/components/DocumentGeneratorView.tsx',
        'src/components/FicheTechniquePages.tsx',
        'src/components/FicheTechniqueView.tsx',
        'src/components/GanttAndTreeView.tsx',
        'src/components/GanttWbsView.tsx',
        'src/components/OperationalMatrices.tsx',
        'src/components/LandingPage.tsx',
        'src/components/UserProfileAndDossiersView.tsx',
        'src/components/FirebaseAuthHelpModal.tsx',
        'src/components/AuthStatusButton.tsx',
        'src/components/SuperAdminAuthModal.tsx',
        'src/components/SuperAdminDashboardView.tsx',
        'src/App.tsx'
      ];

      // 4. Chargement parallèle des dépendances NPM via esm.sh et des fichiers sources
      const [
        ,
        ,
        ,
        ReactMod,
        ReactDOMClientMod,
        LucideMod,
        RechartsMod,
        JsPdfMod,
        AutoTableMod,
        JSZipMod,
        FirebaseAppMod,
        FirebaseAuthMod,
        FirebaseFirestoreMod,
        fetchedSources
      ] = await Promise.all([
        cssPromise,
        tailwindPromise,
        babelPromise,
        import(/* @vite-ignore */ 'https://esm.sh/react@19.0.1'),
        import(/* @vite-ignore */ 'https://esm.sh/react-dom@19.0.1/client?deps=react@19.0.1'),
        import(/* @vite-ignore */ 'https://esm.sh/lucide-react@0.546.0?deps=react@19.0.1'),
        import(/* @vite-ignore */ 'https://esm.sh/recharts@2.15.1?deps=react@19.0.1,react-dom@19.0.1'),
        import(/* @vite-ignore */ 'https://esm.sh/jspdf@2.5.2'),
        import(/* @vite-ignore */ 'https://esm.sh/jspdf-autotable@3.8.4?deps=jspdf@2.5.2'),
        import(/* @vite-ignore */ 'https://esm.sh/jszip@3.10.1'),
        import(/* @vite-ignore */ 'https://esm.sh/firebase@11.3.1/app'),
        import(/* @vite-ignore */ 'https://esm.sh/firebase@11.3.1/auth'),
        import(/* @vite-ignore */ 'https://esm.sh/firebase@11.3.1/firestore'),
        Promise.all(
          sourceFiles.map(async filePath => {
            const res = await fetch('./' + filePath);
            if (!res.ok) {
              throw new Error('Impossible de charger ' + filePath + ' (' + res.status + ')');
            }
            return [filePath, await res.text()];
          })
        )
      ]);

      function wrapEsm(mod, defaultExport) {
        const out = Object.assign({ __esModule: true }, mod);
        if (mod && mod.default && typeof mod.default === 'object') {
          Object.assign(out, mod.default);
        }
        out.default =
          defaultExport !== undefined ? defaultExport : (mod && (mod.default || mod));
        return out;
      }

      const ReactInstance = ReactMod.default || ReactMod;
      window.React = ReactInstance;

      const externalMap = {
        react: wrapEsm(ReactMod, ReactInstance),
        'react-dom/client': wrapEsm(
          ReactDOMClientMod,
          ReactDOMClientMod.default || ReactDOMClientMod
        ),
        'lucide-react': wrapEsm(LucideMod, LucideMod),
        recharts: wrapEsm(RechartsMod, RechartsMod),
        jspdf: wrapEsm(JsPdfMod, JsPdfMod.jsPDF || JsPdfMod.default || JsPdfMod),
        'jspdf-autotable': wrapEsm(AutoTableMod, AutoTableMod.default || AutoTableMod),
        jszip: wrapEsm(JSZipMod, JSZipMod.default || JSZipMod),
        'firebase/app': wrapEsm(FirebaseAppMod, FirebaseAppMod),
        'firebase/auth': wrapEsm(FirebaseAuthMod, FirebaseAuthMod),
        'firebase/firestore': wrapEsm(FirebaseFirestoreMod, FirebaseFirestoreMod),
        './index.css': { __esModule: true, default: {} }
      };

      const fileSet = new Set(sourceFiles);
      const factories = {};

      for (const [filePath, rawCode] of fetchedSources) {
        const rewrittenCode = rawCode.replace(
          /\bimport\s*\(\s*(["'][^"']+["'])\s*\)/g,
          'Promise.resolve(require($1))'
        );
        const transpiled = window.Babel.transform(rewrittenCode, {
          filename: filePath,
          presets: ['typescript', ['react', { runtime: 'classic' }]],
          plugins: ['transform-modules-commonjs']
        }).code;
        factories[filePath] = new Function('exports', 'require', 'module', 'React', transpiled);
      }

      function resolveLocalPath(fromFile, spec) {
        if (externalMap[spec]) return spec;
        const dir = fromFile.split('/').slice(0, -1);
        for (const part of spec.split('/')) {
          if (part === '.' || part === '') continue;
          if (part === '..') dir.pop();
          else dir.push(part);
        }
        const candidateBase = dir.join('/');
        const extensions = ['', '.ts', '.tsx'];
        for (const ext of extensions) {
          if (fileSet.has(candidateBase + ext)) {
            return candidateBase + ext;
          }
        }
        throw new Error('Module introuvable : ' + spec + ' depuis ' + fromFile);
      }

      const moduleCache = {};
      function requireModule(fromFile, spec) {
        if (externalMap[spec]) return externalMap[spec];
        const target = resolveLocalPath(fromFile, spec);
        if (moduleCache[target]) return moduleCache[target].exports;
        const mod = { exports: {} };
        moduleCache[target] = mod;
        factories[target](
          mod.exports,
          childSpec => requireModule(target, childSpec),
          mod,
          ReactInstance
        );
        return mod.exports;
      }

      const appExports = requireModule('src/main.tsx', './App.tsx');
      const AppComponent = appExports.default || appExports.App || appExports;
      const createRoot =
        ReactDOMClientMod.createRoot ||
        (ReactDOMClientMod.default && ReactDOMClientMod.default.createRoot);

      if (rootEl && AppComponent && createRoot) {
        rootEl.innerHTML = '';
        createRoot(rootEl).render(
          ReactInstance.createElement(
            ReactInstance.StrictMode,
            null,
            ReactInstance.createElement(AppComponent)
          )
        );
      }
    } catch (err) {
      console.error('Erreur lors du démarrage de FAAB ACTOR sur GitHub Pages :', err);
    }
  })();
}
