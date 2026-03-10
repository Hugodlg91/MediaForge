# MediaForge — Journal de développement

## Règle absolue
Avant de commencer TOUTE tâche, lire ce fichier en entier.
Après TOUTE tâche, mettre ce fichier à jour immédiatement.

---

## Stack technique
- Framework : Tauri v2
- Frontend : React + TypeScript + Vite
- Styles : Tailwind CSS v4 (plugin @tailwindcss/vite, sans config externe)
- i18n : i18next + react-i18next (5 langues : fr, en, es, de, pt)
- Conversion vidéo/audio : FFmpeg (sidecar Tauri)
- Conversion images : crate Rust `image` 0.25 (PNG, JPG, WEBP, BMP, TIFF)
- Packaging : Tauri bundler (.msi, .dmg, .AppImage)

---

## Étapes de développement

### ✅ Étape 1 — Setup (TERMINÉE)
- Tauri v2 + React + TypeScript scaffoldé via create-tauri-app
- Tailwind CSS v4 configuré (plugin @tailwindcss/vite, pas de tailwind.config.js)
- i18next configuré avec auto-détection langue système (localStorage + navigator)
- 5 fichiers de traduction : fr.json, en.json, es.json, de.json, pt.json
- Structure : components/, locales/, hooks/, utils/
- Layout : Sidebar.tsx + routing Image/Vidéo/Audio/Historique/Paramètres
- Build propre, 0 erreur

### ✅ Étape 2 — Intégration FFmpeg sidecar (TERMINÉE)
- [x] Dépendances Rust : tauri-plugin-shell, tauri-plugin-dialog
- [x] Packages npm : @tauri-apps/plugin-shell, @tauri-apps/plugin-dialog
- [x] tauri.conf.json : externalBin (ffmpeg + ffprobe), productName "MediaForge", taille fenêtre 1000×680
- [x] capabilities/default.json : permissions shell + dialog ajoutées
- [x] Commandes Rust : convert_video, convert_audio, get_media_info, cancel_conversion
- [x] Événement Tauri : "conversion_progress" { percentage, current_time, speed }
- [x] Hook React : useConversion.ts (convertVideo, convertAudio, getMediaInfo, cancel, reset)
- [x] Utilitaires : utils/path.ts (buildOutputPath, formatFileSize, formatDuration)
- [x] Composants : VideoConverter.tsx, AudioConverter.tsx, ProgressBar.tsx
- [x] Clés i18n ajoutées dans les 5 fichiers locales (selectFile, advancedOptions, cancel, done, error, convert_another, sampleRate)
- [x] src-tauri/binaries/ créé avec README.md d'instructions
- [x] Placeholders ffmpeg/ffprobe pour cargo check
- [x] cargo check : 0 erreur — npm run build : 0 erreur

### ✅ Étape 3 — Conversion images (TERMINÉE)
- [x] Crate Rust `image` 0.25 (default-features=false, features=[png,jpeg,webp,bmp,tiff])
- [x] Formats supportés : PNG, JPG, WEBP, BMP, TIFF (AVIF écarté — dépendances système)
- [x] Commandes Rust : convert_image, convert_images_batch, get_image_info
- [x] Progression : événement Tauri "image_progress" { percentage, current_file }
- [x] Resize : Lanczos3, ratio conservable, préréglages (50%, 25%, 720p, 1080p)
- [x] Qualité : slider 0-100 (appliqué uniquement pour JPG et WEBP)
- [x] Hook React : useImageConversion.ts
- [x] Composant : ImageConverter.tsx (mode single + batch, aperçu convertFileSrc)
- [x] Section "image" ajoutée dans les 5 fichiers locales
- [x] cargo check : 0 erreur — npm run build : 0 erreur

### ✅ Étape 4 — Drag & drop natif + UX (TERMINÉE)
- [x] Commande Rust `open_folder` : ouvre le dossier parent via `tauri_plugin_opener::OpenerExt::open_path`
- [x] Hook `useDragDrop.ts` : `onDragDropEvent` de `@tauri-apps/api/window`, filtre extensions via ref mutable, expose `isDragging`, `droppedFiles`, `bind`, `reset`
- [x] Composant `src/components/ui/DropZone.tsx` : drag & drop + clic-pour-parcourir, prop `className` pour layout personnalisé, feedback visuel en survol
- [x] Composant `src/components/ui/ConversionResult.tsx` : bouton "Ouvrir dossier" (invoke open_folder) + bouton "Nouvelle conversion", animation fade-in
- [x] `ProgressBar.tsx` : prop `onCancel?` (bouton annuler intégré), prop `currentFile?` (affichage batch)
- [x] VideoConverter, AudioConverter, ImageConverter refactorisés : DropZone remplace les zones inline, ConversionResult remplace la section done
- [x] ImageConverter batch : DropZone avec `multiple=true`, bouton "Ouvrir dossier" sur le premier fichier converti
- [x] Clés i18n : `dropzone.*` (label, or, browse, fileLoaded) + `result.*` (success, openFolder, newConversion) dans les 5 locales
- [x] Animation CSS `@keyframes fade-in` + `.animate-fade-in` dans `index.css`
- [x] cargo check : 0 erreur — npm run build : 0 erreur (88 modules, 306 kB JS)

### ✅ Étape 5 — Mode batch vidéo & audio (TERMINÉE)
- [x] Commandes Rust : `convert_video_batch` + `convert_audio_batch` (traitement séquentiel)
- [x] Type Rust `BatchMediaItem` (input_path + output_path) distinct de `BatchImageItem`
- [x] Événement Tauri `"batch_progress"` : `{ index, total, current_file, percentage }`
- [x] Hook `useConversion.ts` : `convertVideoBatch`, `convertAudioBatch`, état batch (`results`, `batchIndex`, `batchTotal`, `currentFile`), `isBatchRef` pour isoler les events `conversion_progress` pendant un batch
- [x] `VideoConverter.tsx` : toggle Single / Batch, `MediaBatchFileList`, panneau options partagé, label progression `"Fichier X/Y — nom"`, vue done batch
- [x] `AudioConverter.tsx` : même pattern adapté pour audio
- [x] Clés i18n `batch.*` ajoutées dans les 5 locales (toggle, single, fileCount, progress, removeFile, results, successCount, errorCount)
- [x] Fix Rust : `result.as_deref() == Err("cancelled")` → `matches!(result, Err(ref e) if e == "cancelled")` (types incompatibles sinon)
- [x] cargo check : 0 erreur (1 warning dépréciation image::io::Reader, non bloquant) — npm run build : 0 erreur (88 modules, 315 kB JS)

### ✅ Étape 6 — Paramètres complets (TERMINÉE)
- [x] Dépendance Rust : `tauri-plugin-store = "2"` (v2.4.2)
- [x] Struct Rust `Settings` (language, theme, output_dir, default_video/audio/image_format) avec `Default` impl
- [x] Commandes Rust : `get_settings` (lit le store), `save_settings` (écrit + sauvegarde)
- [x] Plugin enregistré : `.plugin(tauri_plugin_store::Builder::default().build())`
- [x] Flash-prevention : script inline dans `index.html` lit `localStorage["mf-theme"]` et applique `.dark` avant le premier render React
- [x] Thème CSS : `html.dark { color-scheme: dark }` + `html:not(.dark) { override gray palette + color-scheme: light }` — tous les composants s'adaptent via les CSS variables Tailwind v4
- [x] Hook `useSettings.ts` : charge les settings au montage, expose `updateSettings` (merge + invoke + localStorage mirror), applique thème et langue immédiatement
- [x] Context `SettingsContext.tsx` + `useSettingsContext()` hook
- [x] `App.tsx` : `<SettingsProvider>` autour du layout + spinner de chargement pendant le chargement initial
- [x] `SettingsPage.tsx` : sections Apparence (thème + langue), Conversion (output_dir + formats par défaut), À propos (version via `getVersion()`)
- [x] Dossier de sortie : `open({ directory: true })` depuis `@tauri-apps/plugin-dialog` (JS-side), bouton Réinitialiser
- [x] `VideoConverter`, `AudioConverter`, `ImageConverter` : lisent `settings.default_*_format` comme état initial + passent `settings.output_dir` à `buildOutputPath`
- [x] Clés i18n `settings.*` remplacées dans les 5 locales (themeDark, themeLight, outputDir, outputDirDefault, chooseFolder, reset, defaultFormats, defaultVideo/Audio/Image, about, version, localOnly)
- [x] cargo check : 0 erreur — npm run build : 0 erreur (91 modules, 322 kB JS)

### ✅ Étape 7 — Historique des conversions (TERMINÉE)
- [x] Struct Rust `HistoryItem` (id, file_name, media_type, source_format, target_format, output_path, timestamp, status, file_size)
- [x] Commandes Rust : `get_history` (tri décroissant timestamp), `add_history_item` (max 50 items, nouveaux en tête), `clear_history` (reset store), `open_file` (ouvre fichier avec app OS via `opener`)
- [x] Store Rust : `history.json` (distinct de `settings.json`) — même plugin `tauri-plugin-store`
- [x] Hook `useHistory.ts` : charge, vide, et rafraîchit l'historique via `invoke`
- [x] `useConversion.ts` : enregistre un item après succès de `convertVideo`, `convertAudio`, `convertVideoBatch`, `convertAudioBatch` (fire-and-forget via `recordHistory`)
- [x] `useImageConversion.ts` : enregistre un item après succès de `convertImage` et `convertImagesBatch`
- [x] Composant `History.tsx` : liste avec icône média (🎬/🎵/🖼️), nom tronqué, format source→cible, date relative (Aujourd'hui/Hier/date), boutons hover (↗ ouvrir fichier + 📂 ouvrir dossier)
- [x] Bouton "Vider" : double-tap de confirmation (tourne rouge 3s avant de vider)
- [x] `HistoryPage.tsx` : wrap minimal de `<History />`
- [x] Clés i18n `history.*` mises à jour dans les 5 locales (title, empty, clear, clearConfirm, openFile, openFolder, mediaType.*, dateFormat.*)
- [x] cargo check : 0 erreur — npm run build : 0 erreur TypeScript (93 modules, 96 kB JS)

### ✅ Étape 8 — Tests automatisés, Hardening & QA (TERMINÉE)
- [x] **Rust — Tests unitaires** : module `#[cfg(test)]` dans `lib.rs`, 11 tests couvrant :
  - `time_str_to_secs` : formats valides, mixtes, et invalides
  - `parse_duration_line` : ligne FFmpeg trouvée / absente
  - `format_secs` : 0s, minutes, heures
  - `HistoryItem` serde round-trip + champ `file_size` null
  - `Settings::default()` : valeurs par défaut correctes
- [x] **Rust — Anti-zombie** : `impl Drop for AppState` — tue automatiquement le processus FFmpeg enfant lorsque Tauri libère l'état managé à la fermeture de l'application
- [x] **Vitest** : ajout devDependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`)
- [x] Script `"test": "vitest run"` dans `package.json`
- [x] Configuration Vitest dans `vite.config.ts` : `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/setupTests.ts"]`
- [x] `src/setupTests.ts` : import `@testing-library/jest-dom`
- [x] **Tests frontend** `src/__tests__/path.test.ts` : 16 tests couvrant `buildOutputPath` (slash/backslash, destFolder, multi-dots), `formatFileSize` (B/KB/MB/GB), `formatDuration` (0s/minutes/heures)
- [x] **Tests frontend** `src/__tests__/useDragDrop.test.ts` : 7 tests sur le prédicat de filtrage par extension (liste vide, insensible à la casse, extensions multiples, fichiers sans extension, chemins Windows)
- [x] **GlobalErrorBoundary** : `src/components/GlobalErrorBoundary.tsx` — classe React qui intercepte les erreurs de rendu et affiche une UI propre avec bouton "Relancer l'application"
- [x] `src/main.tsx` : `<GlobalErrorBoundary>` encapsule `<App />`
- [x] Clés i18n `errorBoundary.*` (title, description, reload, report) dans les 5 locales
- [x] `cargo test` : **11/11 tests Rust passent** — `npm test` : **23/23 tests TypeScript passent** — `npm run build` : **0 erreur** (94 modules, 330 kB JS)

### ✅ Étape 9 — Packaging final (TERMINÉE)
- [x] Configuration `tauri.conf.json` : `version: "1.0.0"`, `copyright`, `category`, `description`
- [x] Configuration des bundles cibles : `windows: { nsis: { installMode: "currentUser" } }`, `macOS` (dmg), `linux` (appimage, deb)
- [x] Icônes de l'application générées : `npm run tauri icon resource/app-icon.png` (a remplacé les placeholders par les vrais formats `.ico`, `.icns`, `.png`)
- [x] Vérification de la configuration : `cargo check` (0 erreur), `npm run build` (0 erreur)

> **Instructions pour l'utilisateur** : 
> Avant de lancer `npm run tauri build` pour générer votre installeur :
> 1. Téléchargez les vrais exécutables de FFmpeg et FFprobe.
> 2. Remplacez les stubs vides dans `src-tauri/binaries/` en gardant exactement le suffixe de votre plateforme (ex: `ffmpeg-x86_64-pc-windows-msvc.exe`).
> 3. Exécutez `npm run tauri build` pour générer l'installeur dans `src-tauri/target/release/bundle/`.

---

## Décisions techniques prises
- Tailwind v4 : pas de fichier tailwind.config.js, tout passe par le plugin Vite
- FFmpeg : sidecar Tauri, binaires nommés avec le triple Rust (ex: ffmpeg-x86_64-pc-windows-msvc.exe)
- Progression FFmpeg : `-progress pipe:1 -nostats` → parsing stdout key=value → événement Tauri
- Annulation : `Arc<Mutex<Option<CommandChild>>>` dans AppState, kill() propre
- Output path : fichier source + suffixe `_converted` + nouvelle extension (utils/path.ts)
- Police : Inter via stack système (offline, pas de Google Fonts CDN)
- Couleur principale : indigo (#6366f1), dark mode par défaut
- Tout fonctionne 100% hors ligne, aucune télémétrie
- Images : crate `image` 0.25 sans AVIF (évite dépendances système dav1d/NASM). AVIF à ajouter si nécessaire via `avif-encoder` feature (encoding only, pure Rust ravif)
- `img.dimensions()` nécessite `use image::GenericImageView` — utiliser `img.width()` / `img.height()` à la place
- `tauri::async_runtime::spawn_blocking` pour les opérations image (CPU-bound)
- Drag & drop : `onDragDropEvent` de `@tauri-apps/api/window` (Tauri v2). Un seul listener global par fenêtre, filtre par extension via `useRef` (évite les stale closures sans recréer le listener)
- `DropZone` : prop `className` pour surcharger le layout interne (ImageConverter utilise `flex gap-5 p-5` au lieu du centrage par défaut)
- `open_folder` : commande Rust côté backend → pas de permission frontend requise au-delà de `core:default`
- Batch vidéo/audio : `isBatchRef` dans `useConversion` filtre les events `conversion_progress` émis par `run_ffmpeg` pendant un batch (évite d'écraser la progression globale)
- Annulation batch : `run_ffmpeg` retourne `Err("cancelled")`, détecté via `matches!(result, Err(ref e) if e == "cancelled")`, propagé avec `return Err("cancelled")` pour stopper la boucle proprement
- Output paths batch : calculés côté client avec `buildOutputPath(p, outputFormat)` avant d'envoyer la commande Rust
- Historique : stocké dans `history.json` (séparé de `settings.json`) via le même plugin `tauri-plugin-store`. Clé unique `"items"` → tableau JSON de `HistoryItem`.
- Historique : insertion en tête + troncature à 50 côté Rust (atomic read-modify-write via `store.get` / `store.set` / `store.save`)
- `open_file` vs `open_folder` : même plugin opener, chemin direct vs `path.parent()` — deux commandes distinctes pour éviter la confusion côté UI
- `TFunction` de `i18next` utilisé comme type du prop `t` dans `HistoryRow` pour éviter l'incompatibilité avec `$Dictionary` de i18next
- Anti-zombie : `impl Drop for AppState` plutôt qu'un handler `on_window_event` — les handlers Tauri v2 ne permettent pas d'accéder à `AppState` sans erreurs de durée de vie (E0597), alors que `Drop` est appelé automatiquement au teardown et a accès direct aux champs
- `GlobalErrorBoundary` : composant classe React (seul moyen d'implémenter `getDerivedStateFromError` + `componentDidCatch`), avec styles inline pour résister à un échec de chargement du bundle CSS
- Tests `useDragDrop` : la logique de filtrage par extension est une fonction pure extraite du hook — testable sans simuler l'API Tauri

---

## Problèmes rencontrés et solutions

### Étape 2
- **`tauri::Manager` vs `tauri::Emitter`** : En Tauri v2, `app.emit()` nécessite `use tauri::Emitter` (pas `Manager`). Utiliser `Manager` causait E0599 "method not found". **Fix** : remplacer l'import.
- **InvokeArgs TypeScript** : `invoke<T>(cmd, params)` attend `Record<string, unknown>` mais nos interfaces typées ne le satisfont pas. **Fix** : cast `params as unknown as Record<string, unknown>`.
- **Placeholders binaires** : `cargo check` échoue si les fichiers `externalBin` n'existent pas. **Fix** : créer des fichiers vides au bon nom dans `src-tauri/binaries/`. Les remplacer par les vrais binaires FFmpeg avant de builder l'app.
- **FFmpeg non installé sur la machine de dev (Windows)** : l'app ne peut pas être testée sans les vrais binaires. Source recommandée : https://www.gyan.dev/ffmpeg/builds/ (Windows).

### Étape 3
- **`img.dimensions()` introuvable** : méthode du trait `GenericImageView` non importé. **Fix** : utiliser `img.width()` et `img.height()` (méthodes directes de `DynamicImage`).
- **AVIF écarté** : la feature `avif` de la crate `image` tire `libdav1d` qui nécessite NASM sur Windows. Contournement : utiliser uniquement PNG/JPG/WEBP/BMP/TIFF. AVIF peut être ajouté plus tard via `avif-encoder` (pure Rust, encoding uniquement).

### Étape 10
- **`missing required key inputPath`** : Les commandes Tauri v2 attendent les arguments en `camelCase` par défaut (ex: `inputPath`), mais notre typage JS passait les objets en `snake_case` (`input_path`). **Fix** : Ajout de l'attribut `#[tauri::command(rename_all = "snake_case")]` sur l'ensemble des commandes Rust dans `lib.rs`.
- **Nouveau Build** : L'installeur a été régénéré avec succès pour inclure la refonte graphique (palette violette #7c6aff, typographies DM Mono / Syne, etc).
