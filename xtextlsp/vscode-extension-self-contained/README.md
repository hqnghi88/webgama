# GAML Language Support for VS Code

GAML (GAMA Modeling Language) language support for Visual Studio Code with a bundled GAMA headless validation server.

## Features

- **Syntax Highlighting** — Full syntax highlighting for `.gaml` files
- **Validation** — Real-time GAML model validation via the GAMA headless server
- **Error Diagnostics** — Inline error and warning markers as you type

## Requirements

- **Java 21+** — Required to run the GAMA validation server

## Extension Settings

This extension contributes the following settings:

* `gaml.languageServer.enabled`: Enable/disable the GAMA language server

## Known Issues

- The GAMA full application (~280 MB) is bundled per-platform for validation
- Initial validation may be slow while the server starts up

## Release Notes

### 0.0.33

- Cross-platform support: macOS (arm64, x64), Linux (x64), Windows (x64)
- Persistent GAMA LSP validation server
- Inline error diagnostics with correct line numbers
- One-shot validation fallback when server is unavailable
