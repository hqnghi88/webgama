# Goal
- Package the self-contained version of the VS Code extension for deployment to the store.
- ensuring it includes the necessary Language Server (GAMA headless) and can run standalone.

# Constraints/Assumptions
- The extension currently depends on an external LS or expects one to be available.
- "Self-contained" means bundling the LS JAR within the extension vsce package.
- The user is on macOS.

# Key Decisions
- Will identify the correct JAR to bundle.
- Will modify `extension.ts` to execute the bundled JAR if in self-contained mode (or as default).
- Will use `vsce package` to create the `.vsix`.

# State
- Done: Initial analysis of `package.json` and `extension.ts`.
- Now: Verifying LS JAR location and execution logic.
- Next: Modify code and package.

# Open Questions
- Where is the GAMA headless JAR located?
- Does the JAR require a specific Java version (assuming Java 17 or 21 based on previous GAMA knowledge)?
