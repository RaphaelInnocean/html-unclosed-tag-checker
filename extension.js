const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.languages.registerCodeLensProvider('html', {
        provideCodeLenses(document) {
            const diagnostics = validateHTML(document.getText());
            const collection = vscode.languages.createDiagnosticCollection('html-validator');
            
            if (diagnostics.length > 0) {
                collection.set(document.uri, diagnostics);
            } else {
                collection.clear();
            }
            
            return [];
        }
    });

    context.subscriptions.push(disposable);
}

function validateHTML(content) {
    const diagnostics = [];
    const stack = [];

    // Define self-closing tags
    const selfClosingTags = new Set([
        'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 
        'col', 'embed', 'param', 'source', 'track', 'wbr'
    ]);

    // Clean up content
    content = content.replace(/<!--\[if[\s\S]*?\]>[\s\S]*?<!\[endif\]-->/g, ''); // Conditional comments
    content = content.replace(/<!--[\s\S]*?-->/g, ''); // Regular comments

    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
        const [fullTag, tagName] = match;
        const lowercaseTagName = tagName.toLowerCase();

        const isClosingTag = fullTag.startsWith('</');
        const isSelfClosing = selfClosingTags.has(lowercaseTagName) || fullTag.endsWith('/>');

        if (!isClosingTag && !isSelfClosing) {
            // Push to stack
            stack.push({ tagName: lowercaseTagName, index: match.index, fullTag });
        } else if (isClosingTag) {
            // Match against stack
            let found = false;
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].tagName === lowercaseTagName) {
                    stack.splice(i, 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // No match found
                diagnostics.push(createDiagnostic(match.index, fullTag.length, `Unexpected closing tag ${fullTag}`));
            }
        }
    }

    // Unclosed tags
    for (const tag of stack) {
        diagnostics.push(createDiagnostic(tag.index, tag.fullTag.length, `Unclosed tag ${tag.fullTag}`));
    }

    return diagnostics;
}


function createDiagnostic(line, character, length, message) {
    const range = new vscode.Range(
        new vscode.Position(line, character),
        new vscode.Position(line, character + length)
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