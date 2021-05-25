/* eslint-disable no-template-curly-in-string */

import { strict as assert } from 'assert';
import { ASTNodeType } from '../../src/parser/AST';
import { generateAST } from './util';
import stringsSpec from './strings.spec';
import numbersSpec from './numbers.spec';
import listsSpec from './lists.spec';
import dictsSpec from './dicts.spec';
import boolsSpec from './bools.spec';
import embeddedJsSpec from './embeddedJs.spec';

describe('class ASTGenerator', () => {
    stringsSpec();
    numbersSpec();
    listsSpec();
    dictsSpec();
    boolsSpec();
    embeddedJsSpec();
});
