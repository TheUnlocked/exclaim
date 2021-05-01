import { CharStreams, CommonTokenStream, ConsoleErrorListener, ParserRuleContext } from "antlr4ts";
import { CompilerError, ErrorType } from "../CompilerError";
import { Exclaim } from "../parser/generated/Exclaim";
import { ExclaimLexer } from "../parser/generated/ExclaimLexer";
import fs from "fs";

export function printErrors(errors: CompilerError[]) {
    for (const error of errors) {
        if (error.source.ctx instanceof ParserRuleContext) {
            console.error(`EXCLM(${error.type}) Pos ${error.source.ctx.start.line}:${error.source.ctx.start.charPositionInLine} @ ${error.source.file}: ${error.message}.`);
        }
        else {
            console.error(`EXCLM(${error.type}) Pos ${error.source.ctx?.line}:${error.source.ctx?.column} @ ${error.source.file}: ${error.message}.`);
        }
    }
}

export function generateParseTreeFromFile(filename: string, errors: CompilerError[]) {
    const lexer = new ExclaimLexer(CharStreams.fromString(fs.readFileSync(filename, { encoding: 'utf-8' })));
    lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);
    lexer.addErrorListener({ syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
        errors.push(new CompilerError(ErrorType.LexError, {ctx: { line, column: charPositionInLine }, file: filename}, msg));
    } });

    if (errors.length > 0) {
        printErrors(errors);
        process.exit(1);
    }

    const tokenStream = new CommonTokenStream(lexer);
    const parser = new Exclaim(tokenStream);
    parser.removeErrorListener(ConsoleErrorListener.INSTANCE);
    parser.addErrorListener({ syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
        errors.push(new CompilerError(ErrorType.LexError, {ctx: { line, column: charPositionInLine }, file: filename}, msg));
    } });

    const parseTree = parser.program();

    if (errors.length > 0) {
        printErrors(errors);
        process.exit(1);
    }

    return parseTree;
}