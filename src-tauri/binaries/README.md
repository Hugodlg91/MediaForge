# Binaires FFmpeg requis

Tauri emballe ces binaires avec l'application via `externalBin` dans `tauri.conf.json`.

## Convention de nommage Tauri

Le binaire doit être nommé avec le **triple de la cible** :

| Plateforme | Fichier ffmpeg | Fichier ffprobe |
|---|---|---|
| Windows x64 | `ffmpeg-x86_64-pc-windows-msvc.exe` | `ffprobe-x86_64-pc-windows-msvc.exe` |
| macOS Intel | `ffmpeg-x86_64-apple-darwin` | `ffprobe-x86_64-apple-darwin` |
| macOS Apple Silicon | `ffmpeg-aarch64-apple-darwin` | `ffprobe-aarch64-apple-darwin` |
| Linux x64 | `ffmpeg-x86_64-unknown-linux-gnu` | `ffprobe-x86_64-unknown-linux-gnu` |

## Téléchargement des binaires statiques

### Windows
Télécharger depuis **https://www.gyan.dev/ffmpeg/builds/** (ffmpeg-release-essentials.zip)
ou **BtbN builds** : https://github.com/BtbN/FFmpeg-Builds/releases
- Choisir `ffmpeg-n7.x-latest-win64-lgpl-shared.zip` (ou essentials)
- Extraire `ffmpeg.exe` et `ffprobe.exe` depuis le dossier `bin/`
- Renommer selon la convention ci-dessus

### macOS
```bash
brew install ffmpeg
# Trouver le chemin :
which ffmpeg  # ex: /opt/homebrew/bin/ffmpeg
# Copier et renommer :
cp /opt/homebrew/bin/ffmpeg src-tauri/binaries/ffmpeg-aarch64-apple-darwin
cp /opt/homebrew/bin/ffprobe src-tauri/binaries/ffprobe-aarch64-apple-darwin
chmod +x src-tauri/binaries/ffmpeg-* src-tauri/binaries/ffprobe-*
```

### Linux
```bash
# Depuis les builds statiques de John Van Sickle :
# https://johnvansickle.com/ffmpeg/
# Télécharger ffmpeg-release-amd64-static.tar.xz
# Extraire ffmpeg et ffprobe, renommer selon la convention
chmod +x src-tauri/binaries/ffmpeg-* src-tauri/binaries/ffprobe-*
```

## Vérification

```bash
# Le triple actuel de la machine :
rustc -vV | grep host
```

> **Important** : Les binaires ne sont **pas** commités dans git (ajoutés au .gitignore).
> Chaque développeur/CI doit les placer manuellement avant de builder.
