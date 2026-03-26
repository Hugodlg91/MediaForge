# MediaForge — Arborescence du projet

> Générée le 26 mars 2026. Seuls les fichiers versionnés (git ls-files) sont listés.  
> Les dossiers `node_modules/`, `src-tauri/target/`, `dist/` et les binaires FFmpeg sont exclus par `.gitignore`.

```
MediaForge/
│
├── .gitignore                          # Règles d'exclusion git
├── .vscode/
│   └── extensions.json                 # Extensions VS Code recommandées
│
├── index.html                          # Point d'entrée HTML (Vite)
├── vite.config.ts                      # Config Vite + Vitest
├── tsconfig.json                       # Config TypeScript (app)
├── tsconfig.node.json                  # Config TypeScript (build tools)
├── package.json                        # Dépendances npm + scripts
├── package-lock.json                   # Lockfile npm
│
├── DEVLOG.md                           # Journal de développement (toutes étapes)
├── README.md                           # Documentation générale du projet
│
├── resource/
│   └── app-icon.png                    # Source 1024×1024 de l'icône de l'app
│
├── public/
│   ├── tauri.svg
│   └── vite.svg
│
├── scripts/                            # Scripts de refactoring UI ponctuels
│   ├── ui-refactor.mjs
│   ├── ui-refactor2.mjs
│   ├── ui-refactor3.mjs
│   └── ui-refactor4.mjs
│
├── src/                                # Frontend React + TypeScript
│   ├── main.tsx                        # Point d'entrée React (GlobalErrorBoundary)
│   ├── App.tsx                         # Routage principal (TitleBar + Sidebar + pages)
│   ├── i18n.ts                         # Configuration i18next (5 langues)
│   ├── index.css                       # Design system global (tokens CSS, utilitaires)
│   ├── setupTests.ts                   # Setup Vitest (jest-dom)
│   ├── vite-env.d.ts                   # Types Vite
│   │
│   ├── __tests__/                      # Tests unitaires Vitest
│   │   ├── path.test.ts                # Tests buildOutputPath / formatFileSize / formatDuration
│   │   └── useDragDrop.test.ts         # Tests filtrage extensions drag & drop
│   │
│   ├── assets/
│   │   └── react.svg
│   │
│   ├── components/
│   │   ├── GlobalErrorBoundary.tsx     # Error boundary global (récupération crash React)
│   │   │
│   │   ├── Converter/
│   │   │   ├── ConverterPage.tsx       # Page wrapper des convertisseurs
│   │   │   ├── VideoConverter.tsx      # Convertisseur vidéo (single + batch)
│   │   │   ├── AudioConverter.tsx      # Convertisseur audio (single + batch)
│   │   │   ├── ImageConverter.tsx      # Convertisseur image (single + batch + resize)
│   │   │   └── ProgressBar.tsx         # Barre de progression + bouton annuler
│   │   │
│   │   ├── History/
│   │   │   ├── HistoryPage.tsx         # Page Historique (wrapper)
│   │   │   └── History.tsx             # Liste des conversions passées
│   │   │
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx             # Navigation latérale principale
│   │   │   └── TitleBar.tsx            # Barre de titre (thème, langue, macOS dots)
│   │   │
│   │   ├── Settings/
│   │   │   └── SettingsPage.tsx        # Page Paramètres (thème, langue, formats...)
│   │   │
│   │   └── ui/                         # Composants réutilisables
│   │       ├── Icons.tsx               # Icônes SVG (Image, Video, Audio, Upload…)
│   │       ├── DropZone.tsx            # Zone drag & drop fichiers
│   │       └── ConversionResult.tsx    # Affichage résultat post-conversion
│   │
│   ├── context/
│   │   └── SettingsContext.tsx         # Context React pour les paramètres globaux
│   │
│   ├── hooks/
│   │   ├── useConversion.ts            # Conversion vidéo & audio (single + batch)
│   │   ├── useImageConversion.ts       # Conversion images (single + batch + resize)
│   │   ├── useHistory.ts               # Chargement / vidage de l'historique
│   │   ├── useSettings.ts              # Chargement / sauvegarde des paramètres
│   │   └── useDragDrop.ts              # Drag & drop natif Tauri (filtre extensions)
│   │
│   ├── locales/                        # Fichiers de traduction i18n
│   │   ├── fr.json                     # Français (langue par défaut)
│   │   ├── en.json                     # Anglais
│   │   ├── es.json                     # Espagnol
│   │   ├── de.json                     # Allemand
│   │   └── pt.json                     # Portugais
│   │
│   └── utils/
│       └── path.ts                     # buildOutputPath, formatFileSize, formatDuration
│
└── src-tauri/                          # Backend Rust (Tauri v2)
    ├── .gitignore                      # Exclut target/ localement
    ├── Cargo.toml                      # Dépendances Rust
    ├── Cargo.lock                      # Lockfile Cargo
    ├── build.rs                        # Script de build Tauri
    ├── tauri.conf.json                 # Configuration Tauri (bundle, icônes, fenêtre…)
    │
    ├── src/
    │   ├── main.rs                     # Point d'entrée Rust
    │   └── lib.rs                      # Toutes les commandes Tauri + tests unitaires
    │
    ├── capabilities/
    │   └── default.json                # Permissions Tauri (shell, dialog, opener, store)
    │
    ├── binaries/                       # Sidecars FFmpeg (non versionnés, à placer manuellement)
    │   └── README.md                   # Instructions de téléchargement FFmpeg
    │
    └── icons/                          # Icônes générées via `npm run tauri icon`
        ├── icon.ico                    # Windows
        ├── icon.icns                   # macOS
        ├── icon.png                    # Linux
        ├── 32x32.png
        ├── 64x64.png
        ├── 128x128.png
        ├── 128x128@2x.png
        ├── Square*Logo.png             # Windows Store / UWP (13 tailles)
        ├── StoreLogo.png
        ├── android/                    # Icônes Android (mipmap hdpi/mdpi/xhdpi/xxhdpi/xxxhdpi)
        └── ios/                        # Icônes iOS (AppIcon multiples résolutions)
```

---

## Fichiers et dossiers exclus du repo (`.gitignore`)

| Chemin | Raison |
|---|---|
| `node_modules/` | Dépendances npm (recréer avec `npm install`) |
| `dist/` | Build frontend Vite (`npm run build`) |
| `src-tauri/target/` | Compilation Rust (`cargo build`) |
| `src-tauri/WixTools/` | Téléchargé automatiquement par `tauri build` |
| `src-tauri/binaries/ffmpeg-*.exe` | Binaires FFmpeg (>100 Mo, télécharger depuis gyan.dev) |
| `src-tauri/binaries/ffprobe-*.exe` | Idem |
| `*.log` | Logs de build |
| `.env`, `.env.local` | Variables d'environnement sensibles |
| `*.key`, `*.pem` | Clés de signature (ne jamais commiter !) |
| `Thumbs.db`, `.DS_Store` | Fichiers système OS |
