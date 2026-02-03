'use strict';

import { Trace } from 'vscode-jsonrpc';
import { window, workspace, commands, ExtensionContext, Uri, Diagnostic, DiagnosticSeverity, languages, TextDocument, Position, Range } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export function activate(context: ExtensionContext) {
    console.log('GAML extension activated');
    
    // Basic GAML syntax checker
    const diagnosticCollection = languages.createDiagnosticCollection('gaml');
    
    // Register document listeners for validation
    const changeDocDisposable = workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'gaml') {
            validateGamlFileHeadless(event.document);
        }
    });
    
    const openDocDisposable = workspace.onDidOpenTextDocument(document => {
        if (document.languageId === 'gaml') {
            validateGamlFileHeadless(document);
        }
    });
    
    const saveDocDisposable = workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'gaml') {
            validateGamlFileHeadless(document);
        }
    });
    

    
    // Headless validation function
    function validateGamlFileHeadless(document: TextDocument) {
        const arch = require('os').arch() === 'arm64' ? 'aarch64' : 'x86_64';
        const headlessPath = `/Users/hqnghi/git/xtext-languageserver-example/gamalsp/gama.product/target/products/gama.ui.application.product/macosx/cocoa/${arch}/Gama.app/Contents/headless/gama-headless.sh`;
        const filePath = document.uri.fsPath;
        
        console.log('Running GAMA headless validation for:', filePath);
        console.log('Using headless path:', headlessPath);
        
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
            console.log('Full output:', fullOutput);
            
            const diagnostics: Diagnostic[] = [];
            
            // Parse error messages using regex
            const regex = /:\s*(\d+)\s+Symbol\s+(.*)/g;
            let match;
            
            while ((match = regex.exec(fullOutput)) !== null) {
                const lineNumber = parseInt(match[1]) - 1; // Convert to 0-based
                const message = match[2];
                
                console.log('Found error - Line:', lineNumber + 1, 'Message:', message);
                
                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: new Range(new Position(lineNumber, 0), new Position(lineNumber, 0)),
                    message: message,
                    source: 'gama-headless'
                });
            }
            
            console.log('Setting diagnostics:', diagnostics.length, 'errors found');
            // Update diagnostics collection
            diagnosticCollection.set(document.uri, diagnostics);
        });
        
        child.on('error', (error) => {
            console.log('GAMA process error:', error);
        });
    }
    
    // Initial validation for all open GAML documents
    workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'gaml') {
            validateGamlFileHeadless(doc);
        }
    });
    
    context.subscriptions.push(changeDocDisposable, openDocDisposable, saveDocDisposable, diagnosticCollection);
}

export function deactivate() {
    console.log('GAML extension deactivated');
}