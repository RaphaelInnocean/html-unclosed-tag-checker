const vscode = require('vscode');

function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('html-validator');
    context.subscriptions.push(diagnosticCollection);

    // Register listener for document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'html') {
            validateAndUpdateDiagnostics(event.document, diagnosticCollection);
        }
    });

    // Register listener for opening documents
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'html') {
            validateAndUpdateDiagnostics(document, diagnosticCollection);
        }
    });

    // Perform validation on activation
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === 'html') {
            validateAndUpdateDiagnostics(document, diagnosticCollection);
        }
    });
}

function validateAndUpdateDiagnostics(document, diagnosticCollection) {
    const diagnostics = validateHTML(document.getText());
    diagnosticCollection.set(document.uri, diagnostics);
}

function validateHTML(content) {
    const diagnostics = [];
    const stack = [];
    const lines = content.split('\n');

    const selfClosingTags = new Set([
        'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 
        'col', 'embed', 'param', 'source', 'track', 'wbr'
    ]);

    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        let match;
        const line = lines[lineNum];

        while ((match = tagPattern.exec(line)) !== null) {
            const [fullTag, tagName] = match;
            const lowercaseTagName = tagName.toLowerCase();

            const isClosingTag = fullTag.startsWith('</');
            const isSelfClosing = selfClosingTags.has(lowercaseTagName) || fullTag.endsWith('/>');

            if (!isClosingTag && !isSelfClosing) {
                stack.push({ tagName: lowercaseTagName, line: lineNum, column: match.index, fullTag });
            } else if (isClosingTag) {
                let found = false;
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i].tagName === lowercaseTagName) {
                        stack.splice(i, 1);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    diagnostics.push(createDiagnostic(lineNum, match.index, fullTag.length, `Unexpected closing tag ${fullTag}`));
                }
            }
        }
    }

    for (const tag of stack) {
        diagnostics.push(createDiagnostic(tag.line, tag.column, tag.fullTag.length, `Unclosed tag ${tag.fullTag}`));
    }

    return diagnostics;
}

function createDiagnostic(line, column, length, message) {
    const range = new vscode.Range(
        new vscode.Position(line, column),
        new vscode.Position(line, column + length)
    );

    return new vscode.Diagnostic(
        range,
        message,
        vscode.DiagnosticSeverity.Error
    );
}

module.exports = {
    activate
};
