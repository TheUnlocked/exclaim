import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST } from './util';

export default () => describe('visit(NumberContext)', () => {
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
