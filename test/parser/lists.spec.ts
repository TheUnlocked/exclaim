import { strict as assert } from 'assert';
import { ASTNodeType, Expression } from '../../src/parser/AST';
import { generateAST } from './util';

export default () => describe('visit(ListContext)', () => {
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
