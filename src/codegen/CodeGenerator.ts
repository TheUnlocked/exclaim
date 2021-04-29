import { CompilerError } from '../CompilerError';
import { BaseASTVisitor, ASTVisitor, DictLiteral, ASTNodeType, RawStringLiteral, TemplateStringLiteral, ListLiteral, BooleanLiteral, NumberLiteral, JavascriptExpression, Identifier, OfExpression, InvokeExpression, UnaryOpExpression, BinaryOpExpression, RelationalExpression, IsExpression, ExprStatement, Parse, Pick, ValueStatement, Set, React, Fail, Send, If, While, ForEach, Statement, EventListenerDefinition, FunctionDefinition, CommandDefinition, GroupDefinition, DeclareVariable, ModuleImport, FileImport, Program, isValueStatement, ASTNode } from '../parser/AST';
import { SemanticInfo } from '../semantic/SemanticInfo';
import { SymbolTable } from '../semantic/SymbolTable';
import { isValidVariableName, zip } from '../util';

export interface CodeGeneratorOptions {
    semanticInfo: SemanticInfo;
    pushError(error: CompilerError): void;
    fileImport: 'no-emit' | 'require' | ((file: string) => string);
}

export class CodeGenerator extends BaseASTVisitor<string> implements ASTVisitor<string> {

    semanticInfo: SemanticInfo;
    pushError: (error: CompilerError) => void;
    fileImport: 'no-emit' | 'require' | ((file: string) => string);

    private initializationPromises: string[] = [];
    private dataDeclarations: [name: string, default_: string, callback: string][] = [];

    constructor(options: CodeGeneratorOptions) {
        super();
        this.semanticInfo = options.semanticInfo;
        this.pushError = options.pushError;
        this.fileImport = options.fileImport;
        this.currentSymbolTable = this.semanticInfo.rootSymbolTable;
    }

    currentSymbolTable: SymbolTable;

    beforeVisit(ast: ASTNode) {
        this.currentSymbolTable = this.semanticInfo.symbolTables[ast.id] ?? this.currentSymbolTable;
    }

    visitProgram(ast: Program): string {

        this.initializationPromises.push(`$runtime.persistent.declareAll([${
            this.dataDeclarations
                .map(([name, default_, cb]) => `['${name}',${default_},${cb}]`)
                .join(',')
        }])`);

        const imports = 'import{$runtime}from"./Runtime";';
        const vars = '';
        const functions = '';
        const commandsAndEvents = '';
        const behavior = `Promise.all([${this.initializationPromises.join(',')}]).then(()=>{${commandsAndEvents}})`;

        return `${imports}${vars}${functions}${behavior}`;
    }

    visitFileImport(ast: FileImport): string {
        if (typeof this.fileImport === 'function') {
            return this.fileImport(ast.filename);
        }
        else if (this.fileImport === 'require') {
            return `require(${ast.filename});`;
        }
        return '';
    }

    visitModuleImport(ast: ModuleImport): string {
        return `import {${ast.members.map(x => x.accept(this)).join(',')}} from ${JSON.stringify(ast.filename)};`;
    }

    visitDeclareVariable(ast: DeclareVariable): string {
        const name = ast.name.accept(this);
        if (ast.variant === 'temp') {
            return `let ${name}=${ast.value.accept(this)};`;
        }
        this.dataDeclarations.push([name, ast.value.accept(this), `x=>${name}=x`]);
        return `let ${name};`;
    }

    visitGroupDefinition(ast: GroupDefinition): string {
        // Surround in block so that functions are local to the group
        return `{${ast.children.map(x => x.accept(this)).join('')}}`;
    }

    private statements(ast: { statements: Statement[] }): string;
    private statements(statements: Statement[]): string;
    private statements(x: Statement[] | { statements: Statement[] }) {
        if (x instanceof Array) {
            return x.map(x => x.accept(this)).join('');
        }
        return x.statements.map(x => x.accept(this)).join('');
    }

    getGroupChain(group: GroupDefinition | undefined): string[] {
        const chain = [] as string[];
        while (group) {
            chain.push(group.name.name);
            group = group.group;
        }
        return chain.reverse();
    }

    visitCommandDefinition(ast: CommandDefinition): string {
        let paramList = '';
        let paramStructure = '';
        switch (ast.restParamVariant) {
            case 'list':
                paramStructure = `[${ast.parameters.map(x => x.accept(this)).join(',')},...${ast.restParam!.accept(this)}]`;
                paramList = `$$rest.split(' ').filter(x=>x)`;
                break;
            case 'string':
                paramStructure = `[${ast.parameters.map(x => x.accept(this)).join(',')},${ast.restParam!.accept(this)}]`;
                paramList = `/^${ast.parameters.map(() => '(.+?) +').join('')}(.+)$/.exec($$rest).slice(1)`;
                break;
            case 'none':
                paramStructure = `[${ast.parameters.map(x => x.accept(this)).join(',')}]`;
                paramList = `$$rest.split(' ').filter(x=>x)`;
        }
        const header = `$runtime.commands.add(${JSON.stringify(ast.name.name)},[${this.getGroupChain(ast.group).map(x => JSON.stringify(x)).join(',')}],(message,$$rest)=>{`;
        const paramDeclarations = `let ${[...ast.parameters, ...[ast.restParam] ?? []].map(x => `${x?.accept(this)}`).join(',')};`;
        const restDecomposition = `const $$paramList=${paramList};`;
        const paramCheck = `if($$paramList.length<${ast.parameters.length})return'failed-args';`;
        const paramAssigment = `${paramStructure}=$$paramList;`;
        const footer = '});';
        return `${header}${paramDeclarations}{${restDecomposition}${paramCheck}${paramAssigment}}${this.statements(ast.statements)}${footer}`;
    }

    visitFunctionDefinition(ast: FunctionDefinition): string {
        const returnStatement = ast.statements[ast.statements.length - 1];
        const returnStatementCode = isValueStatement(returnStatement) && !returnStatement.assignTo ? 'return it;' : '';
        const paramsCode = ast.parameters.map(x => x.name === '' ? 'it' : x.accept(this)).join(',');
        const restParamCode = ast.restParamVariant === 'list' ? `,...${ast.restParam?.accept(this) ?? 'it'}` : '';
        return `async function ${ast.name.accept(this)}(${paramsCode}${restParamCode}){${this.statements(ast.statements)}${returnStatementCode}}`;
    }

    visitEventListenerDefinition(ast: EventListenerDefinition): string {
        // TODO: specify mechanism for which this generation can be done in a general way
        throw new Error('Method not implemented');
    }

    visitForEach(ast: ForEach): string {
        return `for(let ${ast.loopVariable.accept(this)} of ${ast.collection.accept(this)}){${this.statements(ast)}}`;
    }

    visitWhile(ast: While): string {
        return `while(${ast.checkExpression.accept(this)}){${this.statements(ast)}}`;
    }

    visitIf(ast: If): string {
        const ifPart = `if(${ast.checkExpression.accept(this)}){${this.statements(ast.thenStatements)}}`;
        if (ast.elseStatements) {
            return ifPart + `else{${this.statements(ast.elseStatements)}}`;
        }
        return ifPart;
    }

    visitSend(ast: Send): string {
        throw new Error('Method not implemented');
    }

    visitReact(ast: React): string {
        throw new Error('Method not implemented');
    }

    visitFail(ast: Fail): string {
        return 'throw new Error();';
    }

    private assignment(ast: ValueStatement | string, exprCode: string): string {
        return `${typeof ast === 'string' ? ast : ast.assignTo ?? 'it'}=${exprCode};`;
    }

    visitSet(ast: Set): string {
        const root = ast.variable.type === ASTNodeType.OfExpression ? ast.variable.root : ast.variable;
        if (root.type === ASTNodeType.Identifier) {
            const found = this.currentSymbolTable.getField(root);
            if (found?.type === 'data') {
                const val = ast.expression.accept(this);
                if (ast.variable.type === ASTNodeType.OfExpression) {
                    const refChain = ast.variable.referenceChain.map(x => x.type === ASTNodeType.Identifier ? `'${x.accept(this)}'` : x.accept(this));
                    return `$runtime.persistent.setNested('${found.identifier.accept(this)}',[${refChain.join(',')}],${val});`;
                }
                return `$runtime.persistent.set('${found.identifier.accept(this)}',${val});`;
            }
        }
        return this.assignment(ast.variable.accept(this), ast.expression.accept(this));
    }

    visitPick(ast: Pick): string {
        // TODO: specify mechanism for which this generation can be done in a general way
        throw new Error('Method not implemented');
    }

    visitParse(ast: Parse): string {
        // TODO: specify mechanism for which this generation can be done in a general way
        throw new Error('Method not implemented');
    }

    visitExprStatement(ast: ExprStatement): string {
        return this.assignment(ast, ast.expression.accept(this));
    }

    visitIsExpression(ast: IsExpression): string {
        // TODO: specify mechanism for which this generation can be done in a general way
        let validationCode = 'false';
        if (['placeholder'].includes(ast.targetType)) {

        }
        else {
            validationCode = `${ast.expression.accept(this)} instanceof ${ast.targetType}`;
        }
        return ast.isNot ? `!(${validationCode})` : validationCode;
    }

    visitRelationalExpression(ast: RelationalExpression): string {
        const segments = [] as string[];
        for (let i = 0; ast.operators.length; i++) {
            const op = ast.operators[i] as string;
            segments.push(`(${ast.expressions[i].accept(this)})${op}(${ast.expressions[i + 1].accept(this)})`);
        }
        return `(${segments.join(')&&(')})`;
    }

    visitBinaryOpExpression(ast: BinaryOpExpression): string {
        let op = ast.operator as string;
        switch (op) {
            case 'and': op = '&&'; break;
            case 'or': op = '||'; break;
        }
        return `(${ast.lhs.accept(this)})${ast.operator}(${ast.rhs.accept(this)})`;
    }

    visitUnaryOpExpression(ast: UnaryOpExpression): string {
        let op = ast.operator as string;
        switch (op) {
            case 'not': op = '!'; break;
        }
        return `${op}(${ast.expression.accept(this)})`;
    }

    visitInvokeExpression(ast: InvokeExpression): string {
        return `await ${ast.function.accept(this)}(${ast.arguments.map(x => x.accept(this)).join(',')})`;
    }

    visitOfExpression(ast: OfExpression): string {
        return `${ast.root.accept(this)}${ast.referenceChain.map(x => x.type === ASTNodeType.Identifier ? `["${x.name}"]` : `[${x.accept(this)}]`).join('')}`;
    }

    visitIdentifier(ast: Identifier): string {
        if (isValidVariableName(ast.name)) {
            return ast.name;
        }
        return `$${ast.name}`;
    }

    visitJavascriptExpression(ast: JavascriptExpression): string {
        return ast.code;
    }

    visitRawStringLiteral(ast: RawStringLiteral): string {
        return JSON.stringify(ast.value);
    }

    visitTemplateStringLiteral(ast: TemplateStringLiteral): string {
        return `\`${ast.fragments.map(({ type, contents }) => {
            if (type === 'text') {
                const source = JSON.stringify(contents);
                if (source.startsWith('`')) {
                    return source;
                }
                return source.slice(1, source.length - 1).replace(/`/g, '\\`');
            }
            return `\${${contents}}`;
        }).join('')}\``;
    }

    visitNumberLiteral(ast: NumberLiteral): string {
        return ast.value.toString();
    }

    visitBooleanLiteral(ast: BooleanLiteral): string {
        return ast.value ? 'true' : 'false';
    }

    visitListLiteral(ast: ListLiteral): string {
        return `[${ast.values.map(x => x.accept(this)).join(',')}]`;
    }

    visitDictLiteral(ast: DictLiteral): string {
        return `{${zip(ast.keys, ast.values, (key, value) => {
            let keyString = '';
            switch (key.type) {
                case ASTNodeType.Identifier:
                    keyString = key.name;
                    break;
                case ASTNodeType.NumberLiteral:
                    keyString = key.value.toString();
                    break;
                case ASTNodeType.RawStringLiteral:
                    keyString = key.accept(this);
                    break;
                case ASTNodeType.TemplateStringLiteral:
                    keyString = `[${key.accept(this)}]`;
                    break;
            }
            return `${keyString}:${value.accept(this)}`;
        }).join(',')}}`;
    }
}
