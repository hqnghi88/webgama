'use strict';

import { Trace } from 'vscode-jsonrpc';
import { window, workspace, commands, ExtensionContext, Uri, Diagnostic, DiagnosticSeverity, languages, TextDocument, Position, Range } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: ExtensionContext) {
    console.log('GAML extension activated');

    // GAML validation diagnostics collection
    const diagnosticCollection = languages.createDiagnosticCollection('gaml');

    // Register document listeners for validation
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

    // Validate GAML file using GAMA headless validator
    function validateWithGamaHeadless(document: TextDocument, diagnosticCollection: any) {
        const arch = require('os').arch() === 'arm64' ? 'aarch64' : 'x86_64';
        const baseGamaPath = `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/${arch}/Gama.app/Contents/headless/gama-headless.sh`;

        // Check if primary path exists, if not try to find any available headless script
        const fs = require('fs');
        let headlessPath = baseGamaPath;

        if (!fs.existsSync(headlessPath)) {
            console.log('Primary GAMA path not found, searching for alternatives...');
            const searchPaths = [
                `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/x86_64/Gama.app/Contents/headless/gama-headless.sh`,
                `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/configuration/extraresources/headless/unix/gama-headless.sh`
            ];

            for (const searchPath of searchPaths) {
                if (fs.existsSync(searchPath)) {
                    headlessPath = searchPath;
                    console.log('Found alternative GAMA path:', searchPath);
                    break;
                }
            }
        }

        const filePath = document.uri.fsPath;
        console.log('=== GAMA VALIDATION START ===');
        console.log('File:', filePath);
        console.log('GAMA Path:', headlessPath);

        // Run GAMA headless validator
        const child = cp.spawn('sh', [headlessPath, '-validate-gaml', filePath], {
            cwd: path.dirname(filePath)
        });

        let fullOutput = '';
        let errorOutput = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            fullOutput += output;
            console.log('GAMA stdout:', output);
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            errorOutput += output;
            fullOutput += output;
            console.log('GAMA stderr:', output);
        });

        child.on('close', (code) => {
            console.log('GAMA process exited with code:', code);
            console.log('=== GAMA VALIDATION OUTPUT START ===');
            console.log(fullOutput);
            console.log('=== GAMA VALIDATION OUTPUT END ===');

            // Parse GAMA validation output - extract error messages
            const diagnostics: Diagnostic[] = [];

            // Look for GAMA JSON output - it's a JSON object starting with {"file":
            try {
                // Use regex to find the JSON object more robustly
                const jsonMatch = fullOutput.match(/\{"file":[\s\S]*?\]\}/);
                console.log('Regex match found:', !!jsonMatch);
                if (jsonMatch) {
                    const jsonString = jsonMatch[0];
                    console.log('Found GAMA JSON output, length:', jsonString.length);

                    // Parse the JSON directly
                    const gamaOutput = JSON.parse(jsonString);
                    console.log('Parsed GAMA output diagnostics count:', gamaOutput.diagnostics?.length);

                    // Extract diagnostics
                    if (gamaOutput.diagnostics && Array.isArray(gamaOutput.diagnostics)) {
                        for (const diag of gamaOutput.diagnostics) {
                            const lineNumber = Math.max(0, (diag.line || 1) - 1);
                            const message = diag.message || 'Unknown error';

                            // Convert GAMA severity to VS Code severity
                            let severity = DiagnosticSeverity.Error;
                            if (diag.severity === 'info') {
                                severity = DiagnosticSeverity.Information;
                            } else if (diag.severity === 'warning') {
                                severity = DiagnosticSeverity.Warning;
                            }

                            diagnostics.push({
                                severity: severity,
                                range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)), // Give it some width
                                message: message,
                                source: 'GAMA'
                            });
                        }
                    }
                } else {
                    console.log('No GAMA JSON object found in output using regex');
                    // Fallback to simpler search
                    const jsonStartIndex = fullOutput.lastIndexOf('{"file":');
                    if (jsonStartIndex !== -1) {
                        try {
                            const potentialJson = fullOutput.substring(jsonStartIndex).trim();
                            const gamaOutput = JSON.parse(potentialJson);
                            if (gamaOutput.diagnostics && Array.isArray(gamaOutput.diagnostics)) {
                                for (const diag of gamaOutput.diagnostics) {
                                    const lineNumber = Math.max(0, (diag.line || 1) - 1);
                                    diagnostics.push({
                                        severity: diag.severity === 'warning' ? DiagnosticSeverity.Warning : (diag.severity === 'info' ? DiagnosticSeverity.Information : DiagnosticSeverity.Error),
                                        range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)),
                                        message: diag.message || 'Unknown error',
                                        source: 'GAMA'
                                    });
                                }
                            }
                        } catch (e) {
                            console.log('Fallback JSON parse failed:', e.message);
                        }
                    }
                }
            } catch (jsonError) {
                console.log('JSON parse error:', jsonError.message);
            }

            // If JSON parsing didn't find diagnostics, try traditional line-by-line parsing
            if (diagnostics.length === 0) {
                console.log('Falling back to line-by-line parsing');
                const lines = fullOutput.split(/\r?\n/);
                for (const line of lines) {
                    // Pattern: "Symbol" errors (traditional format)
                    const symbolMatch = line.match(/^.*?(\d+).*?Symbol\s+(.+)/);
                    if (symbolMatch) {
                        const lineNumber = Math.max(0, parseInt(symbolMatch[1]) - 1);
                        const message = symbolMatch[2].trim();
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)),
                            message: message,
                            source: 'GAMA'
                        });
                        continue;
                    }

                    // Pattern: "error" with line number
                    const errorMatch = line.match(/^.*?(\d+).*?error\s*:.+(.+)/);
                    if (errorMatch) {
                        const lineNumber = Math.max(0, parseInt(errorMatch[1]) - 1);
                        const message = errorMatch[2].trim();
                        diagnostics.push({
                            severity: DiagnosticSeverity.Error,
                            range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)),
                            message: message,
                            source: 'GAMA'
                        });
                        continue;
                    }
                }
            }

            // If still no diagnostics and process failed, add a generic error
            if (diagnostics.length === 0 && code !== 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: new Range(new Position(0, 0), new Position(0, 100)),
                    message: 'GAMA validation failed. See output for details.',
                    source: 'GAMA'
                });
            }

            console.log(`Found ${diagnostics.length} GAMA DIAGNOSTICS-V3`);
            diagnosticCollection.set(document.uri, diagnostics);
            console.log('=== GAMA VALIDATION END ===');
        });


        child.on('error', (error) => {
            console.log('GAMA process error:', error);
            const errorDiagnostics: Diagnostic[] = [{
                severity: DiagnosticSeverity.Error,
                range: new Range(new Position(0, 0), new Position(0, 0)),
                message: `Failed to start GAMA validator: ${error.message}`,
                source: 'GAMA'
            }];
            diagnosticCollection.set(document.uri, errorDiagnostics);
        });
    }

    // Initial validation for all open GAML documents
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