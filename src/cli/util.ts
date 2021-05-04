import { CharStreams, CommonTokenStream, ConsoleErrorListener } from 'antlr4ts';
import fs from 'fs';
import { CompilerError, defaultErrorSeverities, ErrorType, severityToString } from '../CompilerError';
import { Exclaim } from '../parser/generated/Exclaim';
import { ExclaimLexer } from '../parser/generated/ExclaimLexer';
import { sourceInfoToString } from '../parser/SourceInfo';

export function printErrors(errors: CompilerError[]) {
    for (const error of errors) {
        console.error(`${severityToString(defaultErrorSeverities[error.type])} EXCLM(${error.type}) Pos ${sourceInfoToString(error.source)}: ${error.message}.`);
    }
}

export function generateParseTreeFromFile(filename: string, errors: CompilerError[]) {
    const lexer = new ExclaimLexer(CharStreams.fromString(fs.readFileSync(filename, { encoding: 'utf-8' })));
    lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);
    lexer.addErrorListener({ syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
        errors.push(new CompilerError(ErrorType.LexError, { ctx: { line, column: charPositionInLine }, file: filename }, msg));
    } });

    if (errors.length > 0) {
        printErrors(errors);
        process.exit(1);
    }

    const tokenStream = new CommonTokenStream(lexer);
    const parser = new Exclaim(tokenStream);
    parser.removeErrorListener(ConsoleErrorListener.INSTANCE);
    parser.addErrorListener({ syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
        errors.push(new CompilerError(ErrorType.LexError, { ctx: { line, column: charPositionInLine }, file: filename }, msg));
    } });

    const parseTree = parser.program();

    if (errors.length > 0) {
        printErrors(errors);
        process.exit(1);
    }

    return parseTree;
}
