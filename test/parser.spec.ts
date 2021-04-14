/* eslint-disable no-template-curly-in-string */

import { describe } from 'mocha';
import { strict as assert } from 'assert';
import { ASTNodeType, Expression, TemplateStringFragment } from '../src/parser/AST';
import { generateAST, KEYWORDS } from './util';

describe('class ASTGenerator', () => {
    describe('visit(StringContext)', () => {
        it('should parse normal strings', () => {
            const ast = generateAST('"Hello, World!"', 'expr');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, 'Hello, World!');
        });
        it('should parse simple templated strings', () => {
            const ast = generateAST('"You got {x} points!"', 'expr');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
            assert.deepStrictEqual(ast.fragments, [
                { type: 'text', contents: 'You got ' },
                { type: 'javascript', contents: 'x' },
                { type: 'text', contents: ' points!' }
            ] as TemplateStringFragment[]);
        });
        it('should parse deeply nested templated strings', () => {
            const ast = generateAST('"abc{`{{}{${"def"}`}ghi{"jkl"}"', 'expr');
            assert.equal(ast.type, ASTNodeType.TemplateStringLiteral as const);
            assert.deepStrictEqual(ast.fragments, [
                { type: 'text', contents: 'abc' },
                { type: 'javascript', contents: '`{{}{${"def"}`' },
                { type: 'text', contents: 'ghi' },
                { type: 'javascript', contents: '"jkl"' }
            ] as TemplateStringFragment[]);
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
        it('should parse strings with functions in templates', () => {
            const ast = generateAST('"{(() => { if (x > 2) { console.log("{{" + x + \'}\'); } })()}"', 'expr');
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
            "`, 'expr');
            assert.equal(ast.type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.value, '\n{\n    "score": 14\n}\n');
        });
    });
    describe('visit(NumberContext)', () => {
        it('should parse integers', () => {
            let ast = generateAST('1827180', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1827180);
            ast = generateAST('-00323', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -323);
            ast = generateAST('10_234_567', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 10_234_567);
        });
        it('should parse floats', () => {
            let ast = generateAST('827.221', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 827.221);
            ast = generateAST('-283.2', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -283.2);
            ast = generateAST('1_000.000_100_1', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1_000.000_100_1);
        });
        it('should parse numbers with base 10 powers', () => {
            let ast = generateAST('2e5', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 2e5);
            ast = generateAST('1.5e2', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1.5e2);
            ast = generateAST('1_000e-4', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 1_000e-4);
            ast = generateAST('0.00002e1_1', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 0.00002e1_1);
        });
        it('should parse integers with a trailing decimal point', () => {
            let ast = generateAST('12.', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, 12);
            ast = generateAST('-12.', 'expr');
            assert.equal(ast.type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.value, -12);
        });
        it('should fail to parse numbers with decimal power', () => {
            assert.throws(() => generateAST('1e0.2', 'expr'));
        });
        it('should fail to parse numbers with invalid numeric seperators', () => {
            assert.throws(() => generateAST('1000_', 'expr'), 'Parsed trailing seperator');
            assert.throws(() => generateAST('1000_.01', 'expr'), 'Parsed separator before decimal point');
            assert.throws(() => generateAST('1000._01', 'expr'), 'Parsed separator after decimal point');
            assert.throws(() => generateAST('1000.01_e4', 'expr'), 'Parsed separator before e');
            assert.throws(() => generateAST('1000.01e_4', 'expr'), 'Parsed seperator after e');
            assert.throws(() => generateAST('1000.01e-_4', 'expr'), 'Parsed seperator after e-');
            assert.throws(() => generateAST('1000.01e4_', 'expr'), 'Parsed trailing separator after e clause');
        });
    });
    describe('visit(ListContext)', () => {
        it('should parse the empty list', () => {
            const ast = generateAST('[]', 'expr');
            assert.equal(ast.type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values.length, 0);
        });
        it('should parse a list with one member', () => {
            const ast = generateAST('[item]', 'expr');
            assert.equal(ast.type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values.length, 1);
            assert.equal(ast.values[0].type, ASTNodeType.Identifier as const);
            assert.equal(ast.values[0].name, 'item');
        });
        it('should parse a list of numbers', () => {
            const ast = generateAST('[1, 2, 3, 4]', 'expr');
            assert.equal(ast.type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values.length, 4);
            for (let i = 0; i < 4; i++) {
                const val: Expression = ast.values[i];
                assert.equal(val.type, ASTNodeType.NumberLiteral as const);
                assert.equal(val.value, i + 1);
            }
        });
        it('should parse a list of lists', () => {
            const ast = generateAST('[[a], []]', 'expr');
            assert.equal(ast.type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values.length, 2);
            assert.equal(ast.values[0].type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values[0].values.length, 1);
            assert.equal(ast.values[1].type, ASTNodeType.ListLiteral as const);
            assert.equal(ast.values[1].values.length, 0);
        });
    });
    describe('visit(DictContext)', () => {
        it('should parse the empty dict', () => {
            const ast = generateAST('[:]', 'expr');
            assert.equal(ast.type, ASTNodeType.DictLiteral as const);
            assert.equal(ast.keys.length, 0);
        });
        it('should parse a one-element dict', () => {
            const ast = generateAST('[a: 2]', 'expr');
            assert.equal(ast.type, ASTNodeType.DictLiteral as const);
            assert.equal(ast.keys.length, 1);
            assert.equal(ast.keys[0].type, ASTNodeType.Identifier as const);
            assert.equal(ast.keys[0].name, 'a');
            assert.equal(ast.values.length, 1);
            assert.equal(ast.values[0].type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.values[0].value, 2);
        });
        it('should parse dictionaries with keyword keys', () => {
            for (const keyword of KEYWORDS) {
                const ast = generateAST(`[${keyword}: 0]`, 'expr');
                assert.equal(ast.type, ASTNodeType.DictLiteral as const);
                assert.equal(ast.keys.length, 1);
                assert.equal(ast.keys[0].type, ASTNodeType.Identifier as const);
                assert.equal(ast.keys[0].name, keyword);
            }
        });
        it('should parse dictionaries with numeric keys', () => {
            const ast = generateAST('[-16: "abcd"]', 'expr');
            assert.equal(ast.type, ASTNodeType.DictLiteral as const);
            assert.equal(ast.keys.length, 1);
            assert.equal(ast.keys[0].type, ASTNodeType.NumberLiteral as const);
            assert.equal(ast.keys[0].value, -16);
        });
        it('should parse dictionaries with raw string keys', () => {
            const ast = generateAST('["this is a key": "a"]', 'expr');
            assert.equal(ast.type, ASTNodeType.DictLiteral as const);
            assert.equal(ast.keys.length, 1);
            assert.equal(ast.keys[0].type, ASTNodeType.RawStringLiteral as const);
            assert.equal(ast.keys[0].value, 'this is a key');
        });
        it('should parse dictionaries with template string keys', () => {
            const ast = generateAST('["this is a {key}": "a"]', 'expr');
            assert.equal(ast.type, ASTNodeType.DictLiteral as const);
            assert.equal(ast.keys.length, 1);
            assert.equal(ast.keys[0].type, ASTNodeType.TemplateStringLiteral as const);
            assert.equal(ast.keys[0].fragments[0].type, 'text');
            assert.equal(ast.keys[0].fragments[0].contents, 'this is a ');
            assert.equal(ast.keys[0].fragments[1].type, 'javascript');
            assert.equal(ast.keys[0].fragments[1].contents, 'key');
        });
        it('should fail to parse dictionaries with invalid keys', () => {
            assert.throws(() => generateAST('[[]: 1]', 'expr'), 'Empty list key');
            assert.throws(() => generateAST('[[1]: 1]', 'expr'), 'Non-empty list key');
            assert.throws(() => generateAST('[1/2: 1]', 'expr'), 'Math expression key');
            assert.throws(() => generateAST('[a of b: 1]', 'expr'), 'Of expression key');
            assert.throws(() => generateAST('[(a): 1]', 'expr'), 'Contained expression key');
            assert.throws(() => generateAST('[[a: 1]: 1]', 'expr'), 'Dictionary key');
            assert.throws(() => generateAST('[[:]: 1]', 'expr'), 'Empty dictionary key');
            assert.throws(() => generateAST('[: 1]', 'expr'), 'No key');
            assert.throws(() => generateAST('[not a: 1]', 'expr'), 'Not expression key');
            // This one may change vvv
            assert.throws(() => generateAST('[{foo}: 1', 'expr'), 'Javascript expression key');
        });
    });
    describe('visit(BoolLiteralContext)', () => {
        it('should parse true and false as booleans', () => {
            let ast = generateAST('true', 'expr');
            assert.equal(ast.type, ASTNodeType.BooleanLiteral as const);
            assert.equal(ast.value, true);
            ast = generateAST('false', 'expr');
            assert.equal(ast.type, ASTNodeType.BooleanLiteral as const);
            assert.equal(ast.value, false);
        });
    });
});
