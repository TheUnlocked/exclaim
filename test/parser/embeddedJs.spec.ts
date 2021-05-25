/* eslint-disable no-template-curly-in-string */
import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST } from './util';

export default () => describe('visit(EmbeddedJSContext)', () => {
    it('should parse deeply nested templated javascript strings', () => {
        const ast = generateAST('{abc{`{{}{${"def"}`}ghi{"jkl"}}', 'expr');
        assert.equal(ast.type, ASTNodeType.JavascriptExpression as const);
        assert.equal(ast.code, 'abc{`{{}{${"def"}`}ghi{"jkl"}');
    });
});
