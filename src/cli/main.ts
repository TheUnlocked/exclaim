import minimist from 'minimist';
import fs from 'fs';
import { CompilerError, defaultErrorSeverities, ErrorSeverity } from '../CompilerError';
import { ASTGenerator } from '../parser/ASTGenerator';
import { CompilerInfo } from '../CompilerInfo';
import { BindingsGenerator } from '../semantic/BindingsGenerator';
import { CodeGenerator } from '../codegen/CodeGenerator';
import { generateParseTreeFromFile, printErrors } from './util';

const args = minimist(process.argv.slice(2), {
    alias: {
        file: ['f'],
        out: ['o'],
        help: ['h', '?'],
        'warn-is-error': ['w']
    },
    boolean: ['fail-on-warn', 'ignore-errors', 'gcc'],
    string: ['file', 'out', 'verbosity']
});

const inFile = args.file ?? args._[0] as string;
const outFile = args.out as string;
const ignoreErrors = args['ignore-errors'];

if (args.help || !inFile) {
    console.log(`Usage: node exclaim [options] <[-f|--file] entry-file>

Options:
    -f, --file              The source file to compile.
    -o, --out               The file to write the compiled output to.
                            If omitted, the output will be written to stdout.
    -w, --warn-is-error     Treat warnings as errors. (default: false)
    --ignore-errors         Prevent compiler errors from stopping compilation when possible. (default: false)
                            Errors will still be printed according to the verbosity level if -o is provided.
    -v, --verbosity <info|warn|error>
                            Sets the verbosity level. (default: warn)
                            Any output will halt compilation if -o is not provided.
    -h, -?, --help          Prints this help screen and exits.`);
    process.exit(0);
}

const verbosity = {
    info: ErrorSeverity.Info,
    warn: ErrorSeverity.Warning,
    error: ErrorSeverity.Error
}[args.verbosity as string] ?? ErrorSeverity.Warning;

const errors = [] as CompilerError[];

const parseTree = generateParseTreeFromFile(inFile, errors);

const ast = parseTree.accept(new ASTGenerator({
    pushError: e => errors.push(e),
    sourceFile: inFile,
    sortDeclarations: true,
    importFile: filename => generateParseTreeFromFile(filename, errors)
}));

const compilerInfo = new CompilerInfo();

ast.walk(new BindingsGenerator({
    compilerInfo,
    globalFields: [],
    pushError: e => errors.push(e)
}));

const outputCode = ast.accept(new CodeGenerator({
    compilerInfo,
    fileImport: 'no-emit',
    pushError: e => errors.push(e)
}));

const writeToFile = Boolean(args.out);
const applicableErrors = errors.filter(x => defaultErrorSeverities[x.type] >= verbosity);

if (applicableErrors.length > 0) {
    if (writeToFile || !ignoreErrors) {
        printErrors(applicableErrors);
    }
    if (!ignoreErrors && applicableErrors.some(x => defaultErrorSeverities[x.type] === ErrorSeverity.Error)) {
        process.exit(1);
    }
}

if (writeToFile) {
    fs.writeFileSync(outFile, outputCode, { encoding: 'utf-8' });
}
else {
    process.stdout.write(outputCode, 'utf-8');
}
