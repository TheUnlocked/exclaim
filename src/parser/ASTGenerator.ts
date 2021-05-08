import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { PickStatementContext, ParseStatementContext, SendStatementContext, ReactStatementContext, ReactToStatementContext, ExprStatementContext, ExclaimImportDeclarationContext, JavascriptImportDeclarationContext, DataDeclarationContext, TempDeclarationContext, BoolLiteralContext, GroupDeclarationContext, CommandDeclarationContext, FunctionDeclarationContext, EventDeclarationContext, AssignStatementContext, SetStatementContext, ForEachStatementContext, WhileStatementContext, IfStatementContext, InvokeExprContext, CheckIsExprContext, CheckCompareExprContext, MultiplyExprContext, AddExprContext, PrefixAddExprContext, ProgramContext, FunctionBlockContext, ListContext, DictContext, IdentifierContext, StringContext, PrefixNotExprContext, OfExpressionContext, NumberContext, JsExprContext, AndOrExprContext, FailStatementContext, ParamContext, RestListParamContext, RestStringParamContext, AddToStatementContext, RemoveFromStatementContext, EmbeddedJSContext } from './generated/Exclaim';
import { Fail, ASTNode, ASTNodeType, CommandDefinition, Declaration, DeclareVariable, EventListenerDefinition, Expression, FileImport, ForEach, FunctionDefinition, GroupableDefinition, GroupDefinition, Identifier, If, LiteralExpression, ModuleImport, ObjectKey, OfExpression, React, Send, Set, Statement, StringLiteral, ValueStatement, While, CollectionAccess, Parse, ExprStatement, IsExpression, RelationalExpression, BinaryOpExpression, UnaryOpExpression, InvokeExpression, ListLiteral, DictLiteral, NumberLiteral, TemplateStringFragment, BooleanLiteral, JavascriptExpression, Program, PickFromCollection, AddToCollection, RemoveFromCollection } from './AST';
import { ExclaimVisitor } from './generated/ExclaimVisitor';
import { SourceInfo } from './SourceInfo';
import { CompilerError, ErrorType } from '../CompilerError';

export type ASTGeneratorOptions = {
    sourceFile: string;
    pushError(error: CompilerError): void;
    /**
     * If a file should not be imported (e.g. because the file has already been imported), `importFile` should return false.
     * If the import should emit a `FileImport` AST node, `importFile` should return true.
     * If a file contents should be included in the AST, parse it and return its `ProgramContext`.
     */
    importFile: (fileImport: FileImport) => ProgramContext | boolean;
    /**
     * Whether or not to sort declarations by putting imports at the top,
     * then temp/data, then functions, then groups/commands/event listeners.
     *
     * This applies to both top-level declarations and group contents.
     *
     * Default: true
     */
    sortDeclarations?: boolean;
};

const sortingTable = {
    [ASTNodeType.FileImport]: 0,
    [ASTNodeType.ModuleImport]: 0,
    [ASTNodeType.DeclareVariable]: 1,
    [ASTNodeType.FunctionDefinition]: 2,
    [ASTNodeType.GroupDefinition]: 3,
    [ASTNodeType.CommandDefinition]: 3,
    [ASTNodeType.EventListenerDefinition]: 3

};
function declarationSorter(a: Declaration, b: Declaration) {
    return sortingTable[a.type] - sortingTable[b.type];
}

export class ASTGenerator implements ExclaimVisitor<ASTNode> {
    sourceFile: string;
    pushError: (error: CompilerError) => void;
    importFile: (fileImport: FileImport) => ProgramContext | boolean;
    sortDeclarations: boolean;

    constructor(options: ASTGeneratorOptions) {
        this.sourceFile = options.sourceFile;
        this.pushError = options.pushError;
        this.importFile = options.importFile;
        this.sortDeclarations = options.sortDeclarations ?? true;
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
        const declarations = [] as Declaration[];
        for (const declCtx of ctx.topLevelDeclaration()) {
            const decl = declCtx.accept(this) as Declaration;

            if (decl.type === ASTNodeType.FileImport) {
                const importInfo = this.importFile(decl);
                if (importInfo instanceof ProgramContext) {
                    const astGen = new ASTGenerator({ ...this, sourceFile: decl.filename });
                    declarations.push(...(importInfo.accept(astGen) as Program).declarations);
                }
                else if (importInfo) {
                    declarations.push(decl);
                }
            }
            else {
                declarations.push(declCtx.accept(this) as Declaration);
            }
        }
        if (this.sortDeclarations) {
            declarations.sort(declarationSorter);
        }
        return new ASTNode(ASTNodeType.Program, this.getSourceInfo(ctx), {
            declarations
        });
    }

    getImportFilename(ctx: StringContext) {
        const str = ctx.accept(this) as StringLiteral;
        if (str.type === ASTNodeType.TemplateStringLiteral) {
            this.pushError(new CompilerError(
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

    currentGroup?: GroupDefinition;
    pushGroup(groupDef: GroupDefinition) {
        this.currentGroup = groupDef;
    }
    popGroup() {
        this.currentGroup = this.currentGroup?.group;
    }

    visitGroupDeclaration(ctx: GroupDeclarationContext): GroupDefinition {
        const group = new ASTNode(ASTNodeType.GroupDefinition, this.getSourceInfo(ctx), {
            name: ctx.identifier().accept(this) as Identifier,
            group: this.currentGroup,
            members: []
        });
        this.pushGroup(group);
        group.members = ctx.groupBlock().blockDeclaration().map(x => x.accept(this) as GroupableDefinition);
        if (this.sortDeclarations) {
            group.members.sort(declarationSorter);
        }
        this.popGroup();
        return group;
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
            group: this.currentGroup,
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
            group: this.currentGroup,
            name: ctx.identifier().accept(this) as Identifier,
            parameters: ctx.functionParams().param().map(x => x.accept(this) as Identifier),
            restParam,
            restParamVariant,
            statements: this.getStatements(ctx)
        });
    }

    visitEventDeclaration(ctx: EventDeclarationContext): EventListenerDefinition {
        return new ASTNode(ASTNodeType.EventListenerDefinition, this.getSourceInfo(ctx), {
            group: this.currentGroup,
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
        const [ifStatements, elseStatements_] = ctx.functionBlock();
        const elseIf = ctx.ifStatement();
        let elseStatements: Statement[] | undefined;
        if (elseStatements_) {
            elseStatements = this.getStatements(elseStatements_);
        }
        else if (elseIf) {
            elseStatements = [elseIf.accept(this) as If];
        }
        return new ASTNode(ASTNodeType.If, this.getSourceInfo(ctx), {
            checkExpression: ctx.expr().accept(this) as Expression,
            thenStatements: this.getStatements(ifStatements),
            elseStatements
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

    visitSetStatement(ctx: SetStatementContext): Set {
        return new ASTNode(ASTNodeType.Set, this.getSourceInfo(ctx), {
            variable: ctx.lvalue().accept(this) as Identifier | OfExpression,
            expression: ctx.expr().accept(this) as Expression
        });
    }

    visitAddToStatement(ctx: AddToStatementContext): AddToCollection {
        return new ASTNode(ASTNodeType.CollectionAccess, this.getSourceInfo(ctx), {
            variant: 'add',
            expression: ctx.expr(0).accept(this) as Expression,
            collection: ctx.expr(1).accept(this) as Expression
        });
    }

    visitRemoveFromStatement(ctx: RemoveFromStatementContext): RemoveFromCollection {
        return new ASTNode(ASTNodeType.CollectionAccess, this.getSourceInfo(ctx), {
            variant: 'remove',
            expression: ctx.distribution().accept(this) as Identifier | NumberLiteral | JavascriptExpression,
            collection: ctx.expr().accept(this) as Expression
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

    visitAssignStatement(ctx: AssignStatementContext): ValueStatement {
        const statement = ctx.valueStatement().accept(this) as ValueStatement;
        statement.source = this.getSourceInfo(ctx);
        statement.assignTo = ctx.identifier().accept(this) as Identifier;
        return statement;
    }

    visitPickStatement(ctx: PickStatementContext): PickFromCollection {
        return new ASTNode(ASTNodeType.CollectionAccess, this.getSourceInfo(ctx), {
            variant: 'pick',
            expression: ctx.distribution().accept(this) as Identifier | NumberLiteral | JavascriptExpression,
            collection: ctx.expr().accept(this) as Expression,
            assignTo: new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
                name: 'it',
                implicit: true
            })
        });
    }

    visitParseStatement(ctx: ParseStatementContext): Parse {
        return new ASTNode(ASTNodeType.Parse, this.getSourceInfo(ctx), {
            expression: ctx.expr().accept(this) as Expression,
            parser: ctx.identifier().text,
            elseStatements: this.getStatements(ctx),
            assignTo: new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
                name: 'it',
                implicit: true
            })
        });
    }

    visitExprStatement(ctx: ExprStatementContext): ExprStatement {
        return new ASTNode(ASTNodeType.ExprStatement, this.getSourceInfo(ctx), {
            expression: ctx.expr().accept(this) as Expression,
            assignTo: new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
                name: 'it',
                implicit: true
            })
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

    visitParam(ctx: ParamContext | RestListParamContext | RestStringParamContext): Identifier {
        if (ctx.identifier()) {
            return new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
                name: ctx.identifier()!.text,
                implicit: false
            });
        }
        return new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
            name: 'it',
            implicit: true
        });
    }

    visitRestListParam = this.visitParam;
    visitRestStringParam = this.visitParam;

    visitIdentifier(ctx: IdentifierContext): Identifier {
        return new ASTNode(ASTNodeType.Identifier, this.getSourceInfo(ctx), {
            name: ctx.text,
            implicit: false
        });
    }

    visitEmbeddedJS(ctx: EmbeddedJSContext): JavascriptExpression {
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
            this.pushError(new CompilerError(
                ErrorType.InvalidNumberSyntax,
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
        const dedentOffset = getDedentOffset(ctx.start.charPositionInLine + 1, rawContents.slice(1, rawContents.length - 1));

        let fragments = ctx.stringContent().map<TemplateStringFragment & { _fromEscapeSequence?: boolean }>(x => {
            const embedded = x.stringTemplate();
            if (embedded) {
                return {
                    type: 'template',
                    contents: embedded.accept(this) as Expression
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
                            contents: ESCAPE_TABLE[escape] ?? escape,
                            _fromEscapeSequence: true
                        };
                    case 3:
                        // hex
                        // TODO
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
            // We don't want to prune whitespace generated from escape sequences.
            if (x.type === 'text' && !x._fromEscapeSequence) {
                // eslint-disable-next-line no-param-reassign
                x.contents = x.contents.replace(/\r\n/g, '\n').split('\n').map((x, i) => i > 0 ? x.slice(dedentOffset) : x).join('\n');
            }
            return x;
        }).filter(x => x.type === 'template' || x.contents.length > 0);

        if (fragments.some(x => x.type === 'template')) {
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
