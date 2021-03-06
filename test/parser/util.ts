import { CharStreams, CommonTokenStream, ConsoleErrorListener, RuleContext } from 'antlr4ts';
import { CompilerError, ErrorType } from '../../src/CompilerError';
import { ASTGenerator, ASTGeneratorOptions } from '../../src/parser/ASTGenerator';
import { Exclaim } from '../../src/parser/generated/Exclaim';
import { ExclaimLexer } from '../../src/parser/generated/ExclaimLexer';

type RuleNames = { [RuleName in keyof Exclaim]: Exclaim[RuleName] extends () => RuleContext ? RuleName : never }[keyof Exclaim];

export function generateAST(input: string, type: RuleNames) {
    const lexer = new ExclaimLexer(CharStreams.fromString(input));
    lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);
    lexer.addErrorListener({ syntaxError(a, b, c, d, msg) {
        throw new CompilerError(ErrorType.LexError, null!, msg);
    } });
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new Exclaim(tokenStream);
    parser.removeErrorListener(ConsoleErrorListener.INSTANCE);
    parser.addErrorListener({ syntaxError(a, b, c, d, msg) {
        throw new CompilerError(ErrorType.ParseError, null!, msg);
    } });
    const parseTree = parser[type]();

    const errors = [] as CompilerError[];
    const astGenOptions = {
        pushError: e => errors.push(e),
        sourceFile: '',
        importFile: () => true
    } as ASTGeneratorOptions;
    const astGenerator = new ASTGenerator(astGenOptions);
    const ast = astGenerator.visit(parseTree);
    if (errors.length > 0) {
        throw errors[0];
    }
    return ast;
}

export const KEYWORDS = [
    'import', 'from', 'data', 'temp', 'group', 'command',
    'function', 'on', 'set', 'to', 'for', 'each', 'in', 'while',
    'assert', 'if', 'then', 'else', 'pick', 'parse', 'as',
    'send', 'react', 'with', 'is', 'not', 'of', 'true', 'false',
    'add', 'remove'
];
