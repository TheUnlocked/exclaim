import { ExclaimVisitor } from "./generated/ExclaimVisitor";
import { Assert, Assign, ASTNode, ASTNodeType, CommandDefinition, Declaration, DeclareVariable, EventListenerDefinition, Expression, FileImport, ForEach, FunctionDefinition, GroupableDefinition, GroupDefinition, Identifier, If, LiteralExpression, ModuleImport, ObjectKey, OfExpression, React, Send, Set, Statement, StringLiteral, ValueStatement, While, Pick, Parse, Carry, IsExpression, RelationalExpression, BinaryOpExpression, UnaryOpExpression, InvokeExpression, ListLiteral, DictLiteral, NumberLiteral, TemplateStringFragment, BooleanLiteral } from "./AST";
import { ErrorNode } from "antlr4ts/tree/ErrorNode";
import { ParseTree } from "antlr4ts/tree/ParseTree";
import { RuleNode } from "antlr4ts/tree/RuleNode";
import { TerminalNode } from "antlr4ts/tree/TerminalNode";
import { PickStatementContext, ParseStatementContext, SendStatementContext, ReactStatementContext, ReactToStatementContext, ExprStatementContext, ExclaimImportDeclarationContext, JavascriptImportDeclarationContext, DataDeclarationContext, TempDeclarationContext, BoolLiteralContext, GroupDeclarationContext, CommandDeclarationContext, FunctionDeclarationContext, EventDeclarationContext, AssignStatementContext, SetStatementContext, ForEachStatementContext, WhileStatementContext, AssertStatementContext, IfStatementContext, InvokeExprContext, CheckIsExprContext, CheckCompareExprContext, MultiplyExprContext, AddExprContext, PrefixAddExprContext, ProgramContext, FunctionBlockContext, ListContext, DictContext, IdentifierContext, StringContext, PrefixNotExprContext, OfExpressionContext, NumberContext } from "./generated/Exclaim";
import { Program } from "./AST";
import { ParserRuleContext } from "antlr4ts";
import { SourceInfo } from "../SourceInfo";
import { CompilerError, ErrorType } from "../CompilerError";

export class ASTGenerator implements ExclaimVisitor<ASTNode> {
    sourceFile: string = "";

    errors = [] as CompilerError[];

    constructor() {

    }

    private getSourceInfo(ctx: ParserRuleContext) {
        return {
            ctx,
            file: this.sourceFile
        } as SourceInfo;
    }

    private getStatements(ctx: {functionBlock: () => FunctionBlockContext}): Statement[];
    private getStatements(ctx: {functionBlock: () => FunctionBlockContext | undefined}): Statement[] | undefined;
    private getStatements(ctx: FunctionBlockContext): Statement[];
    private getStatements(ctx: FunctionBlockContext | undefined): Statement[] | undefined;
    private getStatements(ctx: FunctionBlockContext | undefined | {functionBlock: () => FunctionBlockContext | undefined}) {
        if (ctx) {
            const functionBlock = ctx instanceof FunctionBlockContext ? ctx : ctx.functionBlock();
            return functionBlock?.statement().map(x => x.accept(this) as Statement);
        }
    }

    visitProgram(ctx: ProgramContext): Program {
        return {
            type: ASTNodeType.Program,
            source: this.getSourceInfo(ctx),
            declarations: ctx.topLevelDeclaration().map(x => x.accept(this) as Declaration)
        };
    }

    getImportFilename(ctx: StringContext) {
        const str = ctx.accept(this) as StringLiteral;
        if (str.type === ASTNodeType.TemplateStringLiteral) {
            this.errors.push({
                type: ErrorType.NoImportTemplateString,
                source: this.getSourceInfo(ctx),
                message: "Import declarations cannot use template strings"
            });
            return str.fragments.filter(x => x.type === 'text').join('');
        }
        else {
            return str.value;
        }
    }

    visitExclaimImportDeclaration(ctx: ExclaimImportDeclarationContext): FileImport {
        return {
            type: ASTNodeType.FileImport,
            source: this.getSourceInfo(ctx),
            filename: this.getImportFilename(ctx.string())
        };
    }

    visitJavascriptImportDeclaration(ctx: JavascriptImportDeclarationContext): ModuleImport {
        return {
            type: ASTNodeType.ModuleImport,
            source: this.getSourceInfo(ctx),
            filename: this.getImportFilename(ctx.string()),
            members: ctx.identifier().map(x => x.accept(this) as Identifier)
        };
    }

    visitDataDeclaration(ctx: DataDeclarationContext): DeclareVariable {
        return {
            type: ASTNodeType.DeclareVariable,
            source: this.getSourceInfo(ctx),
            variant: "data",
            name: ctx.identifier().accept(this) as Identifier,
            value: ctx.literal().accept(this) as LiteralExpression
        };
    }

    visitTempDeclaration(ctx: TempDeclarationContext): DeclareVariable {
        return {
            type: ASTNodeType.DeclareVariable,
            source: this.getSourceInfo(ctx),
            variant: "temp",
            name: ctx.identifier().accept(this) as Identifier,
            value: ctx.literal().accept(this) as LiteralExpression
        };
    }

    visitGroupDeclaration(ctx: GroupDeclarationContext): GroupDefinition {
        return {
            type: ASTNodeType.GroupDefinition,
            source: this.getSourceInfo(ctx),
            name: ctx.identifier().accept(this) as Identifier,
            members: ctx.groupBlock().blockDeclaration().map(x => x.accept(this) as GroupableDefinition)
        };
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

        return {
            type: ASTNodeType.CommandDefinition,
            source: this.getSourceInfo(ctx),
            name: ctx.identifier().accept(this) as Identifier,
            parameters: ctx.commandParams().param().map(x => x.accept(this) as Identifier),
            restParam,
            restParamVariant,
            statements: this.getStatements(ctx)
        };
    }

    visitFunctionDeclaration(ctx: FunctionDeclarationContext): FunctionDefinition {
        let restParam: CommandDefinition['restParam'];
        let restParamVariant: CommandDefinition['restParamVariant'] = 'none';

        if (ctx.functionParams().restListParam()) {
            restParamVariant = 'list';
            restParam = ctx.functionParams().restListParam()!.accept(this) as Identifier;
        }

        return {
            type: ASTNodeType.FunctionDefinition,
            source: this.getSourceInfo(ctx),
            name: ctx.identifier().accept(this) as Identifier,
            parameters: ctx.functionParams().param().map(x => x.accept(this) as Identifier),
            restParam,
            restParamVariant,
            statements: this.getStatements(ctx)
        };
    }

    visitEventDeclaration(ctx: EventDeclarationContext): EventListenerDefinition {
        return {
            type: ASTNodeType.EventListenerDefinition,
            source: this.getSourceInfo(ctx),
            event: ctx.identifier().text,
            statements: this.getStatements(ctx)
        };
    }

    visitForEachStatement(ctx: ForEachStatementContext): ForEach {
        return {
            type: ASTNodeType.ForEach,
            source: this.getSourceInfo(ctx),
            loopVariable: ctx.identifier().accept(this) as Identifier,
            collection: ctx.expr().accept(this) as Expression,
            statements: this.getStatements(ctx)
        };
    }

    visitWhileStatement(ctx: WhileStatementContext): While {
        return {
            type: ASTNodeType.While,
            source: this.getSourceInfo(ctx),
            checkExpression: ctx.expr().accept(this) as Expression,
            statements: this.getStatements(ctx)
        };
    }

    visitAssertStatement(ctx: AssertStatementContext): Assert {
        return {
            type: ASTNodeType.Assert,
            source: this.getSourceInfo(ctx),
            checkExpression: ctx.expr().accept(this) as Expression,
            elseStatements: this.getStatements(ctx)
        };
    }

    visitIfStatement(ctx: IfStatementContext): If {
        return {
            type: ASTNodeType.If,
            source: this.getSourceInfo(ctx),
            checkExpression: ctx.expr().accept(this) as Expression,
            thenStatements: this.getStatements(ctx.functionBlock(0)),
            elseStatements: this.getStatements(ctx.functionBlock(1))
        };
    }

    visitSendStatement(ctx: SendStatementContext): Send {
        return {
            type: ASTNodeType.Send,
            source: this.getSourceInfo(ctx),
            message: ctx.expr().accept(this) as Expression
        };
    }

    visitReactStatement(ctx: ReactStatementContext): React {
        return {
            type: ASTNodeType.React,
            source: this.getSourceInfo(ctx),
            targetMessage: undefined,
            reaction: ctx.expr().accept(this) as Expression
        };
    }

    visitReactToStatement(ctx: ReactToStatementContext): React {
        return {
            type: ASTNodeType.React,
            source: this.getSourceInfo(ctx),
            targetMessage: ctx.expr(0).accept(this) as Expression,
            reaction: ctx.expr(1).accept(this) as Expression
        };
    }

    visitSetStatement(ctx: SetStatementContext): Set {
        return {
            type: ASTNodeType.Set,
            source: this.getSourceInfo(ctx),
            variable: ctx.lvalue().accept(this) as Identifier | OfExpression,
            expression: ctx.expr().accept(this) as Expression
        };
    }

    visitAssignStatement(ctx: AssignStatementContext): Assign {
        return {
            type: ASTNodeType.Assign,
            source: this.getSourceInfo(ctx),
            variable: ctx.identifier().accept(this) as Identifier,
            value: ctx.valueStatement().accept(this) as ValueStatement
        };
    }

    visitPickStatement(ctx: PickStatementContext): Pick {
        return {
            type: ASTNodeType.Pick,
            source: this.getSourceInfo(ctx),
            distribution: ctx.identifier().text,
            collection: ctx.expr().accept(this) as Expression
        };
    }

    visitParseStatement(ctx: ParseStatementContext): Parse {
        return {
            type: ASTNodeType.Parse,
            source: this.getSourceInfo(ctx),
            serialized: ctx.expr().accept(this) as Expression,
            parser: ctx.identifier().text
        };
    }

    visitExprStatement(ctx: ExprStatementContext): Carry {
        return {
            type: ASTNodeType.Carry,
            source: this.getSourceInfo(ctx),
            expression: ctx.expr().accept(this) as Expression
        };
    }

    visitCheckIsExpr(ctx: CheckIsExprContext): IsExpression {
        return {
            type: ASTNodeType.IsExpression,
            source: this.getSourceInfo(ctx),
            expression: ctx.term().accept(this) as Expression,
            isNot: ctx.NOT() ? true : false,
            targetType: ctx.identifier().text
        };
    }

    visitCheckCompareExpr(ctx: CheckCompareExprContext): RelationalExpression {
        return {
            type: ASTNodeType.RelationalExpression,
            source: this.getSourceInfo(ctx),
            operators: ctx.relationalOperator().map(x => x.text as "==" | "!=" | "<" | "<=" | ">" | ">="),
            expressions: ctx.mathExpr().map(x => x.accept(this) as Expression)
        };
    }

    visitMultiplyExpr(ctx: MultiplyExprContext): BinaryOpExpression {
        return {
            type: ASTNodeType.BinaryOpExpression,
            source: this.getSourceInfo(ctx),
            operator: ctx._op.text as '*' | '/',
            lhs: ctx.mathExpr(0).accept(this) as Expression,
            rhs: ctx.mathExpr(1).accept(this) as Expression
        };
    }

    visitAddExpr(ctx: AddExprContext): BinaryOpExpression {
        return {
            type: ASTNodeType.BinaryOpExpression,
            source: this.getSourceInfo(ctx),
            operator: ctx._op.text as '+' | '-',
            lhs: ctx.mathExpr(0).accept(this) as Expression,
            rhs: ctx.mathExpr(1).accept(this) as Expression
        };
    }

    visitPrefixAdd(ctx: PrefixAddExprContext): UnaryOpExpression {
        return {
            type: ASTNodeType.UnaryOpExpression,
            source: this.getSourceInfo(ctx),
            operator: ctx._op.text as '+' | '-',
            expression: ctx.term().accept(this) as Expression
        };
    }

    visitPrefixNot(ctx: PrefixNotExprContext): UnaryOpExpression {
        return {
            type: ASTNodeType.UnaryOpExpression,
            source: this.getSourceInfo(ctx),
            operator: 'not',
            expression: ctx.term().accept(this) as Expression
        };
    }

    visitInvokeExpr(ctx: InvokeExprContext): InvokeExpression {
        return {
            type: ASTNodeType.InvokeExpression,
            source: this.getSourceInfo(ctx),
            function: ctx.identifier().accept(this) as Identifier,
            arguments: ctx.expr().map(x => x.accept(this) as Expression)
        };
    }

    visitOfExpression(ctx: OfExpressionContext): OfExpression {
        const referenceChain = ctx.objectKey().map(x => x.accept(this) as ObjectKey);
        return {
            type: ASTNodeType.OfExpression,
            source: this.getSourceInfo(ctx),
            root: ctx.term().accept(this) as Expression,
            referenceChain
        };
    }

    visitIdentifier(ctx: IdentifierContext): Identifier {
        return {
            type: ASTNodeType.Identifier,
            source: this.getSourceInfo(ctx),
            name: ctx.text
        };
    }

    visitList(ctx: ListContext): ListLiteral {
        return {
            type: ASTNodeType.ListLiteral,
            source: this.getSourceInfo(ctx),
            values: ctx.expr().map(x => x.accept(this) as Expression)
        };
    }

    visitDict(ctx: DictContext): DictLiteral {
        return {
            type: ASTNodeType.DictLiteral,
            source: this.getSourceInfo(ctx),
            keys: ctx.objectKey().map(x => x.accept(this) as ObjectKey),
            values: ctx.expr().map(x => x.accept(this) as Expression)
        };
    }

    visitNumber(ctx: NumberContext): NumberLiteral {
        return {
            type: ASTNodeType.NumberLiteral,
            source: this.getSourceInfo(ctx),
            value: Number(ctx.NUMBER().text.replace(/_/g, ''))
        };
    }

    visitString(ctx: StringContext): StringLiteral {
        const fragments = ctx.stringContent().map<TemplateStringFragment>(x => {
            const embedded = x.embeddedJS();
            if (embedded) {
                return {
                    type: 'javascript',
                    contents: embedded.text.slice(1, embedded.text.length - 1)
                };
            }
            return {
                type: 'text',
                contents: x.STRING_CONTENTS()!.text
            };
        });

        if (fragments.some(x => x.type === 'javascript')) {
            return {
                type: ASTNodeType.TemplateStringLiteral,
                source: this.getSourceInfo(ctx),
                fragments
            };
        }
        return {
            type: ASTNodeType.RawStringLiteral,
            source: this.getSourceInfo(ctx),
            value: fragments.reduce((a, b) => a + b.contents, "")
        };
    }

    visitBoolLiteral(ctx: BoolLiteralContext): BooleanLiteral {
        return {
            type: ASTNodeType.BooleanLiteral,
            source: this.getSourceInfo(ctx),
            value: ctx.TRUE() ? true : false
        }
    }

    visit(tree: ParseTree): ASTNode {
        return tree.accept(this);
    }

    visitChildren(node: RuleNode): ASTNode {
        const firstChildIndex = new Array(node.childCount).fill(undefined).find((_, i) => node.getChild(i) instanceof RuleNode);
        return node.getChild(firstChildIndex).accept(this);
    }

    visitTerminal(node: TerminalNode): ASTNode {
        throw new Error("Method not implemented.");
    }
    visitErrorNode(node: ErrorNode): ASTNode {
        throw new Error("Method not implemented.");
    }
}