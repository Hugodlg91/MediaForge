<div align="center">

# MediaForge

**Local, fast, and private media converter**

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1?style=flat-square)](https://github.com/Hugodlg91/MediaForge/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-lightgrey?style=flat-square)](https://github.com/Hugodlg91/MediaForge/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%20v2-24c8db?style=flat-square)](https://tauri.app)

</div>

---

## What is MediaForge?

MediaForge is a desktop application that converts images, videos, and audio files **entirely on your machine** — no upload, no internet connection required, no account to create, no ads.

It is designed for anyone who needs reliable, fast media conversion without sacrificing privacy or having to deal with bloated web tools or watermarks.

---

## Features

### 🖼️ Images
- Formats: **PNG, JPG, WEBP, BMP, TIFF**
- Resize with aspect-ratio lock (custom dimensions or presets: 50%, 25%, 720p, 1080p)
- Adjustable quality for JPG and WEBP (0–100)
- Single file or batch conversion

### 🎬 Video
- Formats: **MP4, MKV, AVI, MOV, WEBM**
- Options: resolution, video codec, bitrate
- Single file or batch conversion
- Real-time progress with cancel support

### 🎵 Audio
- Formats: **MP3, FLAC, WAV, OGG, AAC, M4A**
- Options: bitrate, sample rate, audio normalization
- Single file or batch conversion
- Real-time progress with cancel support

### ✨ General
- **Native drag & drop** — drop files directly onto the converter
- **Conversion history** — browse and re-open past conversions
- **Light / dark theme** — no system-wide dependency, persisted locally
- **5 languages** — French, English, Spanish, German, Portuguese (auto-detected from system)
- **100% offline** — no telemetry, no network requests, no data leaves your machine

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri v2](https://tauri.app) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (Vite plugin) |
| i18n | i18next + react-i18next |
| Video & audio conversion | FFmpeg (bundled sidecar) |
| Image conversion | Rust `image` crate v0.25 |
| Settings & history | `tauri-plugin-store` |
| Tests | Vitest + Rust `#[cfg(test)]` |

---

## Getting Started (Development)

### Prerequisites

- **Node.js** ≥ 20
- **Rust** (stable toolchain) — [rustup.rs](https://rustup.rs)
- **FFmpeg & FFprobe binaries** placed in `src-tauri/binaries/`
  → See [`src-tauri/binaries/README.md`](src-tauri/binaries/README.md) for naming conventions and download instructions

### Setup

```bash
# Install frontend dependencies
npm install

# Start the dev server (hot-reload)
npm run tauri dev

# Run unit tests (Vitest + Rust)
npm test
cd src-tauri && cargo test
```

### Production Build

```bash
npm run tauri build
```

Generates native installers in `src-tauri/target/release/bundle/`:

| Platform | Output |
|---|---|
| Windows | `MediaForge_1.0.0_x64-setup.exe` (NSIS) + `MediaForge_1.0.0_x64_en-US.msi` |
| macOS | `MediaForge_1.0.0_x64.dmg` |
| Linux | `MediaForge_1.0.0_amd64.AppImage` + `MediaForge_1.0.0_amd64.deb` |

> **Note:** Each platform can only build its own native installer. Use a CI/CD pipeline (e.g. GitHub Actions) to build all three simultaneously.

---

## Project Structure

See [`arbo.md`](arbo.md) for the full annotated file tree.

---

## License

All rights reserved — © 2026 MediaForge.  
This software is proprietary. Redistribution or modification without explicit written permission is not permitted.
