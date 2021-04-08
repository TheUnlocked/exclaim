import { CharStreams, CommonTokenStream, ConsoleErrorListener, RuleContext } from "antlr4ts";
import { ASTGenerator } from "../../src/parser/ASTGenerator";
import { Exclaim } from "../../src/parser/generated/Exclaim";
import { ExclaimLexer } from "../../src/parser/generated/ExclaimLexer";

type RuleNames = { [RuleName in keyof Exclaim]: Exclaim[RuleName] extends () => RuleContext ? RuleName : never }[keyof Exclaim]

export function generateAST(input: string, type: RuleNames) {
    const lexer = new ExclaimLexer(CharStreams.fromString(input));
    lexer.removeErrorListener(ConsoleErrorListener.INSTANCE);
    lexer.addErrorListener({syntaxError(a, b, c, d, msg) { throw msg; }});
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new Exclaim(tokenStream);
    parser.removeErrorListener(ConsoleErrorListener.INSTANCE);
    parser.addErrorListener({syntaxError(a, b, c, d, msg) { throw msg; }});
    const parseTree = parser[type]();
    const astGenerator = new ASTGenerator();
    const ast = astGenerator.visit(parseTree)
    if (astGenerator.errors.length > 0) {
        throw astGenerator.errors;
    }
    return ast;
}