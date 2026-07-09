'use strict';

import { Trace } from 'vscode-jsonrpc';
import { window, workspace, commands, ExtensionContext, Uri, Diagnostic, DiagnosticSeverity, languages, TextDocument, Position, Range } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as readline from 'readline';

let gamaProcess: cp.ChildProcess | null = null;
let pendingResolve: ((value: string) => void) | null = null;
let isRequestPending = false;
let debounceTimer: NodeJS.Timeout | null = null;

export function activate(context: ExtensionContext) {
    console.log('GAML extension activated');

    const diagnosticCollection = languages.createDiagnosticCollection('gaml');

    startGamaServer();

    const changeDocDisposable = workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'gaml') {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                validateWithGamaHeadless(event.document, diagnosticCollection);
            }, 300);
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

    function startGamaServer() {
        const arch = require('os').arch() === 'arm64' ? 'aarch64' : 'x86_64';
        const baseGamaPath = `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/${arch}/Gama.app/Contents/headless/gama-headless.sh`;

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

        if (!fs.existsSync(headlessPath)) {
            console.log('GAMA headless not found, will use one-shot validation');
            return;
        }

        console.log('Starting persistent GAMA validation server...');

        gamaProcess = cp.spawn('sh', [headlessPath, '-validate-server'], {
            cwd: context.asAbsolutePath('.'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const rl = readline.createInterface({ input: gamaProcess.stdout });
        rl.on('line', (line) => {
            console.log('GAMA server stdout:', line);
            if (pendingResolve) {
                const resolve = pendingResolve;
                pendingResolve = null;
                resolve(line);
            }
        });

        gamaProcess.stderr?.on('data', (data) => {
            console.log('GAMA server stderr:', data.toString());
        });

        gamaProcess.on('error', (error) => {
            console.log('GAMA server error:', error);
            gamaProcess = null;
        });

        gamaProcess.on('close', (code) => {
            console.log('GAMA server exited with code:', code);
            gamaProcess = null;
        });
    }

    function getTempFileForDocument(document: TextDocument): string {
        const dir = path.dirname(document.uri.fsPath);
        const basename = path.basename(document.uri.fsPath);
        const tempFile = path.join(dir, `.gama_validate_${basename}`);
        fs.writeFileSync(tempFile, document.getText());
        return tempFile;
    }

    function validateWithGamaHeadless(document: TextDocument, diagnosticCollection: any) {
        const filePath = document.uri.fsPath;

        if (!gamaProcess || !gamaProcess.stdin) {
            console.log('GAMA server not running, falling back to one-shot validation');
            validateOneShot(document, diagnosticCollection);
            return;
        }

        // Write in-memory content to temp file so the server sees the latest edits
        const tempFile = getTempFileForDocument(document);
        sendValidateRequest(tempFile).then(jsonString => {
            const diagnostics: Diagnostic[] = [];
            try {
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
            } catch (jsonError) {
                console.log('JSON parse error:', (jsonError as Error).message);
            }

            console.log(`Found ${diagnostics.length} GAMA DIAGNOSTICS-v3`);
            diagnosticCollection.set(document.uri, diagnostics);
            try { fs.unlinkSync(tempFile); } catch (_) {}
        }).catch(error => {
            try { fs.unlinkSync(tempFile); } catch (_) {}
            if (error.message !== 'Request already pending') {
                console.log('Validation request failed:', error);
            }
        });
    }

    function sendValidateRequest(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!gamaProcess || !gamaProcess.stdin) {
                reject(new Error('GAMA server not running'));
                return;
            }

            if (isRequestPending) {
                reject(new Error('Request already pending'));
                return;
            }

            isRequestPending = true;
            pendingResolve = (result: string) => {
                isRequestPending = false;
                resolve(result);
            };
            gamaProcess.stdin.write(filePath + '\n');

            setTimeout(() => {
                if (isRequestPending) {
                    isRequestPending = false;
                    const p = pendingResolve;
                    pendingResolve = null;
                    p('');
                }
            }, 30000);
        });
    }

    function validateOneShot(document: TextDocument, diagnosticCollection: any) {
        const arch = require('os').arch() === 'arm64' ? 'aarch64' : 'x86_64';
        const baseGamaPath = `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/${arch}/Gama.app/Contents/headless/gama-headless.sh`;

        const fs = require('fs');
        let headlessPath = baseGamaPath;

        if (!fs.existsSync(headlessPath)) {
            const searchPaths = [
                `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/x86_64/Gama.app/Contents/headless/gama-headless.sh`,
                `/Users/hqnghi/git/webgama/xtextlsp/gamalsp/gama.product/target/configuration/extraresources/headless/unix/gama-headless.sh`
            ];

            for (const searchPath of searchPaths) {
                if (fs.existsSync(searchPath)) {
                    headlessPath = searchPath;
                    break;
                }
            }
        }

        // Write in-memory content to temp file so the server sees the latest edits
        const tempFile = getTempFileForDocument(document);
        const child = cp.spawn('sh', [headlessPath, '-validate-gaml', tempFile], {
            cwd: path.dirname(tempFile)
        });

        let fullOutput = '';
        let errorOutput = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            fullOutput += output;
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            errorOutput += output;
            fullOutput += output;
        });

        child.on('close', (code) => {
            const diagnostics: Diagnostic[] = [];

            try {
                const jsonMatch = fullOutput.match(/\{"file":[\s\S]*?\]\}/);
                if (jsonMatch) {
                    const jsonString = jsonMatch[0];
                    const gamaOutput = JSON.parse(jsonString);
                    if (gamaOutput.diagnostics && Array.isArray(gamaOutput.diagnostics)) {
                        for (const diag of gamaOutput.diagnostics) {
                            const lineNumber = Math.max(0, (diag.line || 1) - 1);
                            const message = diag.message || 'Unknown error';
                            let severity = DiagnosticSeverity.Error;
                            if (diag.severity === 'info') {
                                severity = DiagnosticSeverity.Information;
                            } else if (diag.severity === 'warning') {
                                severity = DiagnosticSeverity.Warning;
                            }
                            diagnostics.push({
                                severity: severity,
                                range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 100)),
                                message: message,
                                source: 'GAMA'
                            });
                        }
                    }
                }
            } catch (jsonError) {
                console.log('JSON parse error:', jsonError.message);
            }

            if (diagnostics.length === 0 && code !== 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: new Range(new Position(0, 0), new Position(0, 100)),
                    message: 'GAMA validation failed. See output for details.',
                    source: 'GAMA'
                });
            }

            console.log(`Found ${diagnostics.length} GAMA DIAGNOSTICS-v3`);
            diagnosticCollection.set(document.uri, diagnostics);
            try { fs.unlinkSync(tempFile); } catch (_) {}
        });

        child.on('error', (error) => {
            try { fs.unlinkSync(tempFile); } catch (_) {}
            const errorDiagnostics: Diagnostic[] = [{
                severity: DiagnosticSeverity.Error,
                range: new Range(new Position(0, 0), new Position(0, 0)),
                message: `Failed to start GAMA validator: ${error.message}`,
                source: 'GAMA'
            }];
            diagnosticCollection.set(document.uri, errorDiagnostics);
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
    if (debounceTimer) clearTimeout(debounceTimer);
    if (gamaProcess && gamaProcess.stdin) {
        gamaProcess.stdin.write('exit\n');
        gamaProcess.stdin.end();
    }
    if (gamaProcess) {
        setTimeout(() => {
            if (gamaProcess) {
                gamaProcess.kill();
                gamaProcess = null;
            }
        }, 3000);
    }
}
