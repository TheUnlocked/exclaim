import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { PickStatementContext, ParseStatementContext, SendStatementContext, ReactStatementContext, ReactToStatementContext, ExprStatementContext, ExclaimImportDeclarationContext, JavascriptImportDeclarationContext, DataDeclarationContext, TempDeclarationContext, BoolLiteralContext, GroupDeclarationContext, CommandDeclarationContext, FunctionDeclarationContext, EventDeclarationContext, AssignStatementContext, SetStatementContext, ForEachStatementContext, WhileStatementContext, IfStatementContext, InvokeExprContext, CheckIsExprContext, CheckCompareExprContext, MultiplyExprContext, AddExprContext, PrefixAddExprContext, ProgramContext, FunctionBlockContext, ListContext, DictContext, IdentifierContext, StringContext, PrefixNotExprContext, OfExpressionContext, NumberContext, JsExprContext, AndOrExprContext, FailStatementContext } from './generated/Exclaim';
import { Fail, ASTNode, ASTNodeType, CommandDefinition, Declaration, DeclareVariable, EventListenerDefinition, Expression, FileImport, ForEach, FunctionDefinition, GroupableDefinition, GroupDefinition, Identifier, If, LiteralExpression, ModuleImport, ObjectKey, OfExpression, React, Send, Set, Statement, StringLiteral, ValueStatement, While, Pick, Parse, ExprStatement, IsExpression, RelationalExpression, BinaryOpExpression, UnaryOpExpression, InvokeExpression, ListLiteral, DictLiteral, NumberLiteral, TemplateStringFragment, BooleanLiteral, JavascriptExpression } from './AST';
import { ExclaimVisitor } from './generated/ExclaimVisitor';
import { SourceInfo } from './SourceInfo';
import { CompilerError, ErrorType } from '../CompilerError';

export class ASTGenerator implements ExclaimVisitor<ASTNode> {
    sourceFile: string = '';

    errors = [] as CompilerError[];

    constructor() {
    }

    private getSourceInfo(ctx: ParseTree) {
        return {
            ctx,
            file: this.sourceFile
        } as SourceInfo;
    }

    private getStatements(ctx: { functionBlock: () => FunctionBlockContext }): Statement[];
    private getStatements(ctx: { functionBlock: () => FunctionBlockContext | undefined }): Statement[] | undefined;
    private getStatements(ctx: FunctionBlockContext): Statement[];
    private getStatements(ctx: FunctionBlockContext | undefined): Statement[] | undefined;
    private getStatements(ctx: FunctionBlockContext | undefined | { functionBlock: () => FunctionBlockContext | undefined }) {
        if (ctx) {
            const functionBlock = ctx instanceof FunctionBlockContext ? ctx : ctx.functionBlock();
            return functionBlock?.statement().map(x => x.accept(this) as Statement);
        }
        return undefined;
    }

    visitProgram(ctx: ProgramContext) {
        return new ASTNode(ASTNodeType.Program, this.getSourceInfo(ctx), {
            declarations: ctx.topLevelDeclaration().map(x => x.accept(this) as Declaration)
        });
    }

    getImportFilename(ctx: StringContext) {
        const str = ctx.accept(this) as StringLiteral;
        if (str.type === ASTNodeType.TemplateStringLiteral) {
            this.errors.push(new CompilerError(
                ErrorType.NoImportTemplateString,
                this.getSourceInfo(ctx),
                'Import declarations cannot use template strings'
            ));
            return str.fragments.filter(x => x.type === 'text').join('');
        }

        return str.value;
    }

    visitExclaimImportDeclaration(ctx: ExclaimImportDeclarationContext): FileImport {
        return new ASTNode(ASTNodeType.FileImport, this.getSourceInfo(ctx), {
            filename: this.getImportFilename(ctx.string())
        });
    }

    visitJavascriptImportDeclaration(ctx: JavascriptImportDeclarationContext): ModuleImport {
        return new ASTNode(ASTNodeType.ModuleImport, this.getSourceInfo(ctx), {
            filename: this.getImportFilename(ctx.string()),
            members: ctx.identifier().map(x => x.accept(this) as Identifier)
        });
    }

    visitDataDeclaration(ctx: DataDeclarationContext): DeclareVariable {
        return new ASTNode(ASTNodeType.DeclareVariable, this.getSourceInfo(ctx), {
            variant: 'data',
            name: ctx.identifier().accept(this) as Identifier,
            value: ctx.literal().accept(this) as LiteralExpression
        });
    }

    visitTempDeclaration(ctx: TempDeclarationContext): DeclareVariable {
        return new ASTNode(ASTNodeType.DeclareVariable, this.getSourceInfo(ctx), {
            variant: 'temp',
            name: ctx.identifier().accept(this) as Identifier,
            value: ctx.literal().accept(this) as LiteralExpression
        });
    }

    visitGroupDeclaration(ctx: GroupDeclarationContext): GroupDefinition {
        return new ASTNode(ASTNodeType.GroupDefinition, this.getSourceInfo(ctx), {
            name: ctx.identifier().accept(this) as Identifier,
            members: ctx.groupBlock().blockDeclaration().map(x => x.accept(this) as GroupableDefinition)
        });
    }

    visitCommandDeclaration(ctx: CommandDeclarationContext): CommandDefinition {
        let restParamVariant: CommandDefinition['restParamVariant'] = 'none';
        let restParam: CommandDefinition['restParam'];

        if (ctx.commandParams().restListParam()) {
            restParamVariant = 'list';
            restParam = ctx.commandParams().restListParam()!.accept(this) as Identifier;
        }
        else if (ctx.commandParams().restStringParam()) {
            restParamVariant = 'string';
            restParam = ctx.commandParams().restStringParam()!.accept(this) as Identifier;
        }

        return new ASTNode(ASTNodeType.CommandDefinition, this.getSourceInfo(ctx), {
            name: ctx.identifier().accept(this) as Identifier,
            parameters: ctx.commandParams().param().map(x => x.accept(this) as Identifier),
            restParam,
            restParamVariant,
            statements: this.getStatements(ctx)
        });
    }

    visitFunctionDeclaration(ctx: FunctionDeclarationContext): FunctionDefinition {
        let restParam: CommandDefinition['restParam'];
        let restParamVariant: CommandDefinition['restParamVariant'] = 'none';

        if (ctx.functionParams().restListParam()) {
            restParamVariant = 'list';
            restParam = ctx.functionParams().restListParam()!.accept(this) as Identifier;
        }

        return new ASTNode(ASTNodeType.FunctionDefinition, this.getSourceInfo(ctx), {
            name: ctx.identifier().accept(this) as Identifier,
            parameters: ctx.functionParams().param().map(x => x.accept(this) as Identifier),
            restParam,
            restParamVariant,
            statements: this.getStatements(ctx)
        });
    }

    visitEventDeclaration(ctx: EventDeclarationContext): EventListenerDefinition {
        return new ASTNode(ASTNodeType.EventListenerDefinition, this.getSourceInfo(ctx), {
            event: ctx.identifier().text,
            statements: this.getStatements(ctx)
        });
    }

    visitForEachStatement(ctx: ForEachStatementContext): ForEach {
        return new ASTNode(ASTNodeType.ForEach, this.getSourceInfo(ctx), {
            loopVariable: ctx.identifier().accept(this) as Identifier,
            collection: ctx.expr().accept(this) as Expression,
            statements: this.getStatements(ctx)
        });
    }

    visitWhileStatement(ctx: WhileStatementContext): While {
        return new ASTNode(ASTNodeType.While, this.getSourceInfo(ctx), {
            checkExpression: ctx.expr().accept(this) as Expression,
            statements: this.getStatements(ctx)
        });
    }

    visitIfStatement(ctx: IfStatementContext): If {
        return new ASTNode(ASTNodeType.If, this.getSourceInfo(ctx), {
            checkExpression: ctx.expr().accept(this) as Expression,
            thenStatements: this.getStatements(ctx.functionBlock(0)),
            elseStatements: this.getStatements(ctx.functionBlock(1))
        });
    }

    visitFailStatement(ctx: FailStatementContext): Fail {
        return new ASTNode(ASTNodeType.Fail, this.getSourceInfo(ctx), {});
    }

    visitSendStatement(ctx: SendStatementContext): Send {
        return new ASTNode(ASTNodeType.Send, this.getSourceInfo(ctx), {
            message: ctx.expr().accept(this) as Expression
        });
    }

    visitReactStatement(ctx: ReactStatementContext): React {
        return new ASTNode(ASTNodeType.React, this.getSourceInfo(ctx), {
            targetMessage: undefined,
            reaction: ctx.expr().accept(this) as Expression
        });
    }

    visitReactToStatement(ctx: ReactToStatementContext): React {
        return new ASTNode(ASTNodeType.React, this.getSourceInfo(ctx), {
            targetMessage: ctx.expr(0).accept(this) as Expression,
            reaction: ctx.expr(1).accept(this) as Expression
        });
    }

    visitSetStatement(ctx: SetStatementContext): Set {
        return new ASTNode(ASTNodeType.Set, this.getSourceInfo(ctx), {
            variable: ctx.lvalue().accept(this) as Identifier | OfExpression,
            expression: ctx.expr().accept(this) as Expression
        });
    }

    visitAssignStatement(ctx: AssignStatementContext): ValueStatement {
        const statement = ctx.valueStatement().accept(this) as ValueStatement;
        statement.source = this.getSourceInfo(ctx);
        statement.assignTo = ctx.identifier().accept(this) as Identifier;
        return statement;
    }

    visitPickStatement(ctx: PickStatementContext): Pick {
        return new ASTNode(ASTNodeType.Pick, this.getSourceInfo(ctx), {
            distribution: ctx.identifier().text,
            collection: ctx.expr().accept(this) as Expression
        });
    }

    visitParseStatement(ctx: ParseStatementContext): Parse {
        return new ASTNode(ASTNodeType.Parse, this.getSourceInfo(ctx), {
            expression: ctx.expr().accept(this) as Expression,
            parser: ctx.identifier().text,
            elseStatements: this.getStatements(ctx)
        });
    }

    visitExprStatement(ctx: ExprStatementContext): ExprStatement {
        return new ASTNode(ASTNodeType.ExprStatement, this.getSourceInfo(ctx), {
            expression: ctx.expr().accept(this) as Expression
        });
    }

    visitAndOrExpr(ctx: AndOrExprContext): BinaryOpExpression {
        return new ASTNode(ASTNodeType.BinaryOpExpression, this.getSourceInfo(ctx), {
            lhs: ctx.checkExpr(0).accept(this) as Expression,
            operator: ctx._op.text as 'and' | 'or',
            rhs: ctx.checkExpr(1).accept(this) as Expression
        });
    }

    visitCheckIsExpr(ctx: CheckIsExprContext): IsExpression {
        return new ASTNode(ASTNodeType.IsExpression, this.getSourceInfo(ctx), {
            expression: ctx.term().accept(this) as Expression,
            isNot: !!ctx.NOT(),
            targetType: ctx.identifier().text
        });
    }

    visitCheckCompareExpr(ctx: CheckCompareExprContext): RelationalExpression {
        return new ASTNode(ASTNodeType.RelationalExpression, this.getSourceInfo(ctx), {
            operators: ctx.relationalOperator().map(x => x.text as '==' | '!=' | '<' | '<=' | '>' | '>='),
            expressions: ctx.mathExpr().map(x => x.accept(this) as Expression)
        });
    }

    visitMultiplyExpr(ctx: MultiplyExprContext): BinaryOpExpression {
        return new ASTNode(ASTNodeType.BinaryOpExpression, this.getSourceInfo(ctx), {
            operator: ctx._op.text as '*' | '/',
            lhs: ctx.mathExpr(0).accept(this) as Expression,
            rhs: ctx.mathExpr(1).accept(this) as Expression
        });
    }

    visitAddExpr(ctx: AddExprContext): BinaryOpExpression {
        return new ASTNode(ASTNodeType.BinaryOpExpression, this.getSourceInfo(ctx), {
            operator: ctx._op.text as '+' | '-',
            lhs: ctx.mathExpr(0).accept(this) as Expression,
            rhs: ctx.mathExpr(1).accept(this) as Expression
        });
    }

    visitPrefixAdd(ctx: PrefixAddExprContext): UnaryOpExpression {
        return new ASTNode(ASTNodeType.UnaryOpExpression, this.getSourceInfo(ctx), {
            operator: ctx._op.text as '+' | '-',
            expression: ctx.term().accept(this) as Expression
        });
    }

    visitPrefixNot(ctx: PrefixNotExprContext): UnaryOpExpression {
        return new ASTNode(ASTNodeType.UnaryOpExpression, this.getSourceInfo(ctx), {
            operator: 'not',
            expression: ctx.term().accept(this) as Expression
        });
    }

    visitInvokeExpr(ctx: InvokeExprContext): InvokeExpression {
        return new ASTNode(ASTNodeType.InvokeExpression, this.getSourceInfo(ctx), {
            function: ctx.identifier().accept(this) as Identifier,
            arguments: ctx.expr().map(x => x.accept(this) as Expression)
        });
    }

    visitOfExpression(ctx: OfExpressionContext): OfExpression {
        const referenceChain = ctx.objectKey().map(x => x.accept(this) as ObjectKey);
        return new ASTNode(ASTNodeType.OfExpression, this.getSourceInfo(ctx), {
            root: ctx.term().accept(this) as Expression,
            referenceChain
        });
    }

    visitIdentifier(ctx: IdentifierContext): Identifier {
        return new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
            name: ctx.text
        });
    }

    visitJsExpr(ctx: JsExprContext): JavascriptExpression {
        const fullText = ctx.text;
        return new ASTNode(ASTNodeType.JavascriptExpression, this.getSourceInfo(ctx), {
            code: fullText.slice(1, fullText.length - 1)
        });
    }

    visitList(ctx: ListContext): ListLiteral {
        return new ASTNode(ASTNodeType.ListLiteral, this.getSourceInfo(ctx), {
            values: ctx.expr().map(x => x.accept(this) as Expression)
        });
    }

    visitDict(ctx: DictContext): DictLiteral {
        return new ASTNode(ASTNodeType.DictLiteral, this.getSourceInfo(ctx), {
            keys: ctx.objectKey().map(x => x.accept(this) as ObjectKey),
            values: ctx.expr().map(x => x.accept(this) as Expression)
        });
    }

    visitNumber(ctx: NumberContext): NumberLiteral {
        if (ctx.ILLEGAL_NUMBER()) {
            this.errors.push(new CompilerError(
                ErrorType.InvalidNumber,
                this.getSourceInfo(ctx),
                'Invalid number syntax; this may be because of invalid numeric seperators (underscores) or a decimal point in an exponentiation term'
            ));
            return new ASTNode(ASTNodeType.NumberLiteral, this.getSourceInfo(ctx), {
                value: Number(ctx.ILLEGAL_NUMBER()!.text.replace(/_/g, ''))
            });
        }
        return new ASTNode(ASTNodeType.NumberLiteral, this.getSourceInfo(ctx), {
            value: Number(ctx.NUMBER()!.text.replace(/_/g, ''))
        });
    }

    visitString(ctx: StringContext): StringLiteral {
        function getDedentOffset(firstCharacterIndent: number, str: string) {
            const [firstLine, ...otherLines] = str.split('\n');

            if (otherLines.length === 0) {
                return 0;
            }

            const offsets = [firstCharacterIndent, ...otherLines.map(x => x.search(/[^ ]/)).filter(x => x !== -1)];
            if (otherLines[otherLines.length - 1].search(/[^ ]/) === -1) {
                offsets.push(otherLines[otherLines.length - 1].length);
            }

            return Math.min(...offsets);
        }

        const rawContents = ctx.text;
        const dedentOffset = getDedentOffset(ctx.start.charPositionInLine, rawContents.slice(1, rawContents.length - 1));

        let fragments = ctx.stringContent().map<TemplateStringFragment & { _fromEscapeSequence?: string }>(x => {
            const embedded = x.embeddedJS();
            if (embedded) {
                return {
                    type: 'javascript',
                    contents: embedded.text.slice(1, embedded.text.length - 1)
                };
            }

            const escape = x.ESCAPE_SEQUENCE()?.text.slice(1);
            if (escape) {
                const ESCAPE_TABLE = {
                    n: '\n',
                    t: '\t',
                    r: '\r'
                } as { [seq: string]: string };

                switch (escape.length) {
                    case 1:
                        // Single character
                        return {
                            type: 'text',
                            contents: ESCAPE_TABLE[escape] ?? escape
                        };
                    case 3:
                        // hex
                        break;
                    default:
                }
            }

            return {
                type: 'text',
                contents: x.STRING_CONTENTS()!.text
            };
        });

        // Dedent
        fragments = fragments.map(x => {
            if (x.type === 'text' && !x._fromEscapeSequence) {
                // eslint-disable-next-line no-param-reassign
                x.contents = x.contents.split('\n').map((x, i) => i > 0 ? x.slice(dedentOffset) : x).join('\n');
            }
            return x;
        }).filter(x => x.contents.length > 0);

        if (fragments.some(x => x.type === 'javascript')) {
            return new ASTNode(ASTNodeType.TemplateStringLiteral, this.getSourceInfo(ctx), {
                fragments
            });
        }
        return new ASTNode(ASTNodeType.RawStringLiteral, this.getSourceInfo(ctx), {
            value: fragments.reduce((a, b) => a + b.contents, '')
        });
    }

    visitBoolLiteral(ctx: BoolLiteralContext): BooleanLiteral {
        return new ASTNode(ASTNodeType.BooleanLiteral, this.getSourceInfo(ctx), {
            value: !!ctx.TRUE()
        });
    }

    visit(tree: ParseTree): ASTNode {
        return tree.accept(this);
    }

    visitChildren(node: RuleNode): ASTNode {
        const firstChildIndex = new Array(node.childCount).fill(undefined).findIndex((_, i) => node.getChild(i) instanceof RuleNode);
        return node.getChild(firstChildIndex).accept(this);
    }

    visitTerminal(node: TerminalNode): ASTNode {
        throw new Error('Method not implemented.');
    }

    visitErrorNode(node: ErrorNode): ASTNode {
        throw new Error('Method not implemented.');
    }
}
