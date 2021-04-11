/* eslint-disable no-template-curly-in-string */

import { describe } from 'mocha';
import { strict as assert } from 'assert';
import { ASTNodeType, TemplateStringFragment } from '../src/parser/AST';
import { generateAST } from './util';

describe('class ASTGenerator', () => {
    describe('visit(StringContext)', () => {
        it('should parse normal strings', () => {
            const ast = generateAST('"Hello, World!"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, 'Hello, World!');
        });
        it('should parse simple templated strings', () => {
            const ast = generateAST('"You got {x} points!"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
            assert.deepStrictEqual(ast.fragments, [
                { type: 'text', contents: 'You got ' },
                { type: 'javascript', contents: 'x' },
                { type: 'text', contents: ' points!' }
            ] as TemplateStringFragment[]);
        });
        it('should parse deeply nested templated strings', () => {
            const ast = generateAST('"abc{`{{}{${"def"}`}ghi{"jkl"}"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
            assert.deepStrictEqual(ast.fragments, [
                { type: 'text', contents: 'abc' },
                { type: 'javascript', contents: '`{{}{${"def"}`' },
                { type: 'text', contents: 'ghi' },
                { type: 'javascript', contents: '"jkl"' }
            ] as TemplateStringFragment[]);
        });
        it('should parse strings with extra closing braces as raw strings', () => {
            const ast = generateAST('"Hello}World}!"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, 'Hello}World}!');
        });
        it('should parse escaped template strings as raw strings', () => {
            const ast = generateAST('"\\{Foo}"', 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, '{Foo}');
        });
        it('should fail to parse extra opening braces', () => {
            assert.throws(() => generateAST('"{{foo}"', 'string'));
        });
        it('should parse strings with functions in templates', () => {
            const ast = generateAST('"{(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()}"', 'string');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
            assert.deepStrictEqual(ast.fragments, [
                { type: 'javascript', contents: '(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()' }
            ] as TemplateStringFragment[]);
        });
        it('should remove clearly unwanted whitespace', () => {
            const ast = generateAST(`            "
            \\{
                \\"score\\": 14
            \\}
            "`, 'string');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, '\n{\n    "score": 14\n}\n');
        });
    });
    describe('visit(NumberContext)', () => {
        it('should parse integers', () => {
            let ast = generateAST('1827180', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1827180);
            ast = generateAST('-00323', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -323);
            ast = generateAST('10_234_567', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 10_234_567);
        });
        it('should parse floats', () => {
            let ast = generateAST('827.221', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 827.221);
            ast = generateAST('-283.2', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -283.2);
            ast = generateAST('1_000.000_100_1', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1_000.000_100_1);
        });
        it('should parse numbers with base 10 powers', () => {
            let ast = generateAST('2e5', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 2e5);
            ast = generateAST('1.5e2', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1.5e2);
            ast = generateAST('1_000e-4', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1_000e-4);
            ast = generateAST('0.00002e1_1', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 0.00002e1_1);
        });
        it('should parse integers with a trailing decimal point', () => {
            let ast = generateAST('12.', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 12);
            ast = generateAST('-12.', 'number');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -12);
        });
        it('should fail to parse numbers with decimal power', () => {
            assert.throws(() => generateAST('1e0.2', 'number'));
        });
        it('should fail to parse numbers with invalid numeric seperators', () => {
            assert.throws(() => generateAST('1000_', 'number'), 'Parsed trailing seperator');
            assert.throws(() => generateAST('1000_.01', 'number'), 'Parsed separator before decimal point');
            assert.throws(() => generateAST('1000._01', 'number'), 'Parsed separator after decimal point');
            assert.throws(() => generateAST('1000.01_e4', 'number'), 'Parsed separator before e');
            assert.throws(() => generateAST('1000.01e_4', 'number'), 'Parsed seperator after e');
            assert.throws(() => generateAST('1000.01e-_4', 'number'), 'Parsed seperator after e-');
            assert.throws(() => generateAST('1000.01e4_', 'number'), 'Parsed trailing separator after e clause');
        });
    });
});
