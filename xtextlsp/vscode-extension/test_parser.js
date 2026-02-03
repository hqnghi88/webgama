// Test script to verify regex parsing logic for GAMA headless validation
const testOutput = `Found 1 compilation error(s):
  - Syntax errors: XtextSyntaxDiagnostic: null:15 Symbol 'species' seems to be incomplete or misplaced`;

const regex = /:\s*(\d+)\s+Symbol\s+(.*)/g;
let match;
const diagnostics = [];

console.log('Testing regex parsing logic...');
console.log('Input:', testOutput);
console.log('---');

while ((match = regex.exec(testOutput)) !== null) {
    const lineNumber = parseInt(match[1]) - 1; // Convert to 0-based
    const message = match[2];
    
    diagnostics.push({
        line: lineNumber,
        message: message
    });
}

console.log('Parsed diagnostics:');
diagnostics.forEach((diag, index) => {
    console.log(`${index + 1}. Line ${diag.line}: ${diag.message}`);
});

console.log('---');
console.log(`Total diagnostics found: ${diagnostics.length}`);