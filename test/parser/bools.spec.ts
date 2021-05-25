import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST } from './util';

export default () => describe('visit(BoolLiteralContext)', () => {
    it('should parse true and false as booleans', () => {
        let ast = generateAST('true', 'expr');
        assert.equal(ast.type, ASTNodeType.BooleanLiteral as const);
        assert.equal(ast.value, true);
        ast = generateAST('false', 'expr');
        assert.equal(ast.type, ASTNodeType.BooleanLiteral as const);
        assert.equal(ast.value, false);
    });
});
