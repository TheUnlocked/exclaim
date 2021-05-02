import minimist from 'minimist';
import fs from 'fs';
import { CompilerError } from '../CompilerError';
import { ASTGenerator } from '../parser/ASTGenerator';
import { SemanticInfo } from '../semantic/SemanticInfo';
import { BindingsGenerator } from '../semantic/BindingsGenerator';
import { CodeGenerator } from '../codegen/CodeGenerator';
import { generateParseTreeFromFile, printErrors } from './util';

const args = minimist(process.argv.slice(2), {
    alias: {
        file: ['f'],
        out: ['o']
    },
    boolean: ['ignore-errors'],
    string: ['entry', 'out']
});

const inFile = args['file'] as string;
const outFile = args['out'] as string;
const ignoreErrors = args['ignore-errors'];

const errors = [] as CompilerError[];

const parseTree = generateParseTreeFromFile(inFile, errors);

const ast = parseTree.accept(new ASTGenerator({
    pushError: e => errors.push(e),
    sourceFile: inFile,
    sortDeclarations: true,
    importFile: filename => generateParseTreeFromFile(filename, errors)
}));

const semanticInfo = {
    symbolTables: {},
    events: {}
} as SemanticInfo;

ast.walk(new BindingsGenerator({
    semanticInfo,
    globalFields: [],
    pushError: e => errors.push(e)
}));

const outputCode = ast.accept(new CodeGenerator({
    semanticInfo,
    fileImport: 'no-emit',
    pushError: e => errors.push(e)
}));

if (errors.length > 0 && !ignoreErrors) {
    printErrors(errors);
    process.exit(1);
}

if (args['out']) {
    if (errors.length > 0) {
        printErrors(errors);
    }
    fs.writeFileSync(outFile, outputCode, { encoding: 'utf-8' });
}
else {
    process.stdout.write(outputCode, 'utf-8');
}
