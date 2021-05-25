import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST } from './util';

export default () => describe('visit(StringContext)', () => {
    it('should parse normal strings', () => {
        const ast = generateAST('"Hello, World!"', 'expr');
        assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
        assert.equal(ast.value, 'Hello, World!');
    });
    it('should parse simple templated strings', () => {
        const ast = generateAST('"You got {x} points!"', 'expr');
        assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
        assert.equal(ast.fragments[0].type, 'text' as const);
        assert.equal(ast.fragments[0].contents, 'You got ');
        assert.equal(ast.fragments[1].type, 'template' as const);
        assert.equal(ast.fragments[1].contents.type, ASTNodeType.Identifier as const);
        assert.equal(ast.fragments[1].contents.name, 'x');
        assert.equal(ast.fragments[2].type, 'text' as const);
        assert.equal(ast.fragments[2].contents, ' points!');
    });
    it('should parse strings with extra closing braces as raw strings', () => {
        const ast = generateAST('"Hello}World}!"', 'expr');
        assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
        assert.equal(ast.value, 'Hello}World}!');
    });
    it('should parse escaped template strings as raw strings', () => {
        const ast = generateAST('"\\{Foo}"', 'expr');
        assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
        assert.equal(ast.value, '{Foo}');
    });
    it('should fail to parse extra opening braces', () => {
        assert.throws(() => generateAST('"{{foo}"', 'expr'));
    });
    it('should parse strings with javascript functions in templates', () => {
        const ast = generateAST('"{{(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()}}"', 'expr');
        assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
        assert.equal(ast.fragments.length, 1);
        const fragment = ast.fragments[0];
        assert.equal(fragment.type, 'template' as const);
        assert.equal(fragment.contents.type, ASTNodeType.JavascriptExpression as const);
        assert.equal(fragment.contents.code, '(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()');
    });
    it('should parse strings with template strings in templates', () => {
        assert.doesNotThrow(() => generateAST('"Hello, {"Mr. {getName()}"}!"', 'expr'));
    });
    it('should remove clearly unwanted whitespace', () => {
        const ast = generateAST(`            "
        \\{
            \\"score\\": 14
        \\}
        "`, 'expr');
        assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
        assert.equal(ast.value, '\n{\n    "score": 14\n}\n');
    });
});
