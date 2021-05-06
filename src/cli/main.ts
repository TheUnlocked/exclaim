import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { CompilerError, defaultErrorSeverities, ErrorSeverities, ErrorSeverity, ErrorType } from '../CompilerError';
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
    boolean: ['fail-on-warn', 'bypass-errors'],
    string: ['file', 'out', 'verbosity']
});

const inFile = args.file ?? args._[0] as string;
const outFile = args.out as string;
const bypassErrors = args['bypass-errors'];

if (args.help || !inFile) {
    console.log(`Usage: node exclaim [options] <[-f|--file] entry-file>

Options:
    -f, --file              The source file to compile.
    -o, --out               The file to write the compiled output to.
                            It is recommended to make the file extension .mjs so that node will run it properly.
                            If omitted, the output will be written to stdout.
    -w, --warn-is-error     Treat warnings as errors. (default: false)
    --bypass-errors         Prevent compiler errors from stopping compilation when possible. (default: false)
                            Errors will still be printed according to the verbosity level if -o is provided.
    -v, --verbosity <info|warn|error>
                            Sets the verbosity level. (default: warn)
                            Any output will halt compilation if -o is not provided.
    -h, -?, --help          Prints this help screen and exits.`);
    process.exit(0);
}

if (!fs.existsSync(inFile)) {
    console.error(`Could not find file '${inFile}'.`);
    process.exit(1);
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
    importFile: ast => {
        switch (path.extname(ast.filename)) {
            // In the case of no file extension we'll just fall back to Node's normal rules.
            case '.js': case '.mjs': case '.cjs': case '':
                return true;
            case '.exclm':
                return generateParseTreeFromFile(ast.filename, errors);
            default:
                errors.push(new CompilerError(
                    ErrorType.UnknownImportFileType,
                    ast.source,
                    `Unknown file extension for file ${ast.filename}.`
                ));
                return false;
        }
    }
}));

const compilerInfo = new CompilerInfo();

ast.walk(new BindingsGenerator({
    compilerInfo,
    globalFields: [],
    pushError: e => errors.push(e)
}));

const outputCode = ast.accept(new CodeGenerator({
    compilerInfo,
    fileImport: 'import',
    pushError: e => errors.push(e)
}));

const severities = Object.fromEntries(Object.entries(defaultErrorSeverities).map(([key, val]) => [key, val === ErrorSeverity.Warning ? ErrorSeverity.Error : val])) as ErrorSeverities;
const writeToFile = Boolean(args.out);
const applicableErrors = errors.filter(x => severities[x.type] >= verbosity);

if (applicableErrors.length > 0) {
    if (writeToFile || !bypassErrors) {
        printErrors(applicableErrors, severities);
    }
    if (!bypassErrors && applicableErrors.some(x => severities[x.type] === ErrorSeverity.Error)) {
        process.exit(1);
    }
}

if (writeToFile) {
    fs.writeFileSync(outFile, outputCode, { encoding: 'utf-8' });
}
else {
    process.stdout.write(outputCode, 'utf-8');
}
