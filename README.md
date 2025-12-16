# Annotate Studio

A modern PDF annotation and drawing application built with Next.js, React, and Tauri.

## Prerequisites

- Node.js 18+
- Rust (install from https://rustup.rs)
- Tauri CLI

## Installation

```bash
cd src
npm install
```

## Development

### Run as Desktop App (with Tauri)

```bash
cargo tauri dev
```

### Run Frontend Only (Browser)

```bash
cd src
npm run dev
```

## Build

```bash
cargo tauri build
```

Output will be in `src-tauri/target/release/`

## Features

- Open and view PDF files
- Draw with pen and highlighter
- Add shapes (rectangle, circle, triangle, line, arrow, star, diamond, heart)
- Add text and math symbols
- Undo/Redo support
- Zoom and pan
- Dark/Light theme
- Multi-page support
