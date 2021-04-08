import { describe } from "mocha";
import { strict as assert } from "assert";
import { ASTNodeType, RawStringLiteral, TemplateStringFragment, TemplateStringLiteral } from "../../src/parser/AST";
import { generateAST } from "./util";

describe('Parser', () => {
    describe('String', () => {
        it('should parse normal strings', () => {
            const ast = generateAST('"Hello, World!"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral);
            assert.equal((ast as RawStringLiteral).value, "Hello, World!");
        });
        it('should parse simple templated strings', () => {
            const ast = generateAST('"You got {x} points!"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral);
            assert.deepStrictEqual((ast as TemplateStringLiteral).fragments, [
                {type: "text", contents: "You got "},
                {type: "javascript", contents: "x"},
                {type: "text", contents: " points!"}
            ] as TemplateStringFragment[]);
        });
        it('should parse deeply nested templated strings', () => {
            const ast = generateAST('"abc{`{{}{${"def"}`}ghi{"jkl"}"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral);
            assert.deepStrictEqual((ast as TemplateStringLiteral).fragments, [
                {type: "text", contents: "abc"},
                {type: "javascript", contents: '`{{}{${"def"}`'},
                {type: "text", contents: "ghi"},
                {type: "javascript", contents: '"jkl"'}
            ] as TemplateStringFragment[]);
        });
        it('should parse strings with extra closing braces as raw strings', () => {
            const ast = generateAST('"Hello}World}!"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral);
            assert.equal((ast as RawStringLiteral).value, "Hello}World}!");
        });
        it('should parse escaped template strings as raw strings', () => {
            let ast = generateAST('"\\{Foo}"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral);
            assert.equal((ast as RawStringLiteral).value, "{Foo}");
        });
        it('should fail to parse extra opening braces', () => {
            assert.throws(() => generateAST('"{{foo}"', 'string'));
        });
        it('should parse strings with functions in templates', () => {
            const ast = generateAST('"{(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()}"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral);
            assert.deepStrictEqual((ast as TemplateStringLiteral).fragments, [
                {type: "javascript", contents: '(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()'},
            ] as TemplateStringFragment[]);
        });
    });
});