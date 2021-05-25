import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST, KEYWORDS } from './util';

export default () => describe('visit(DictContext)', () => {
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
        assert.equal(ast.keys[0].fragments[1].type, 'template' as const);
        assert.equal(ast.keys[0].fragments[1].contents.type, ASTNodeType.Identifier);
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
