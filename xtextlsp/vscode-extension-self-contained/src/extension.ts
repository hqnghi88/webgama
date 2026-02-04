'use strict';

import { window, workspace, ExtensionContext, Uri, Diagnostic, DiagnosticSeverity, languages, TextDocument, Position, Range } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export function activate(context: ExtensionContext) {
    console.log('GAML extension activated');

    const diagnosticCollection = languages.createDiagnosticCollection('gaml');

    const changeDocDisposable = workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'gaml') {
            validateWithGamaHeadless(event.document, diagnosticCollection);
        }
    });

    const openDocDisposable = workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'gaml') {
            validateWithGamaHeadless(document, diagnosticCollection);
        }
    });

    const saveDocDisposable = workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'gaml') {
            validateWithGamaHeadless(document, diagnosticCollection);
        }
    });

    function validateWithGamaHeadless(document: TextDocument, diagnosticCollection: any) {
        let bundledServerPath = context.asAbsolutePath(path.join('server'));
        let headlessPath: string;

        if (fs.existsSync(bundledServerPath)) {
            let arch = os.arch() === 'arm64' ? 'aarch64' : 'x86_64';
            let potentialPath = path.join(bundledServerPath, 'Gama.app', 'Contents', 'headless', 'gama-headless.sh');
            if (fs.existsSync(potentialPath)) {
                headlessPath = potentialPath;
            } else {
                console.log('Bundled GAMA headless not found at:', potentialPath);
                diagnosticCollection.set(document.uri, [{
                    severity: DiagnosticSeverity.Error,
                    range: new Range(new Position(0, 0), new Position(0, 0)),
                    message: 'GAMA server not found in extension',
                    source: 'GAMA'
                }]);
                return;
            }
        } else {
            console.log('Bundled server directory not found');
            diagnosticCollection.set(document.uri, [{
                severity: DiagnosticSeverity.Error,
                range: new Range(new Position(0, 0), new Position(0, 0)),
                message: 'GAMA server not bundled. Please install the self-contained extension.',
                source: 'GAMA'
            }]);
            return;
        }

        const filePath = document.uri.fsPath;
        console.log('=== GAMA VALIDATION START ===');
        console.log('File:', filePath);
        console.log('GAMA Path:', headlessPath);

        try {
            fs.chmodSync(headlessPath, '755');
        } catch (e) {
        }

        const child = cp.spawn('sh', [headlessPath, '-validate-gaml', filePath], {
            cwd: path.dirname(filePath)
        });

        let fullOutput = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            fullOutput += output;
            console.log('GAMA stdout:', output);
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            fullOutput += output;
            console.log('GAMA stderr:', output);
        });

        child.on('close', (code) => {
            console.log('GAMA process exited with code:', code);

            const diagnostics: Diagnostic[] = [];

            try {
                const jsonMatch = fullOutput.match(/\{"file":[\s\S]*?\]\}/);
                if (jsonMatch) {
                    const jsonString = jsonMatch[0];
                    const gamaOutput = JSON.parse(jsonString);

                    if (gamaOutput.diagnostics && Array.isArray(gamaOutput.diagnostics)) {
                        for (const diag of gamaOutput.diagnostics) {
                            const lineNumber = Math.max(0, (diag.line || 1) - 1);
                            let severity = DiagnosticSeverity.Error;
                            if (diag.severity === 'info') {
                                severity = DiagnosticSeverity.Information;
                            } else if (diag.severity === 'warning') {
                                severity = DiagnosticSeverity.Warning;
                            }

                            diagnostics.push({
                                severity: severity,
                                range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)),
                                message: diag.message || 'Unknown error',
                                source: 'GAMA'
                            });
                        }
                    }
                }
            } catch (jsonError) {
                console.log('JSON parse error:', (jsonError as Error).message);
            }

            if (diagnostics.length === 0 && code !== 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: new Range(new Position(0, 0), new Position(0, 100)),
                    message: 'GAMA validation failed. Check output for details.',
                    source: 'GAMA'
                });
            }

            console.log(`Found ${diagnostics.length} diagnostics`);
            diagnosticCollection.set(document.uri, diagnostics);
            console.log('=== GAMA VALIDATION END ===');
        });

        child.on('error', (error) => {
            console.log('GAMA process error:', error);
            diagnosticCollection.set(document.uri, [{
                severity: DiagnosticSeverity.Error,
                range: new Range(new Position(0, 0), new Position(0, 0)),
                message: `Failed to start GAMA validator: ${error.message}`,
                source: 'GAMA'
            }]);
        });
    }

    workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'gaml') {
            validateWithGamaHeadless(doc, diagnosticCollection);
        }
    });

    context.subscriptions.push(changeDocDisposable, openDocDisposable, saveDocDisposable, diagnosticCollection);
}

export function deactivate() {
    console.log('GAML extension deactivated');
}
