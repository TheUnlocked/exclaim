import { CompilerError, ErrorType } from '../CompilerError';
import { BaseASTVisitor, ASTVisitor, DictLiteral, ASTNodeType, RawStringLiteral, TemplateStringLiteral, ListLiteral, BooleanLiteral, NumberLiteral, JavascriptExpression, Identifier, OfExpression, InvokeExpression, UnaryOpExpression, BinaryOpExpression, RelationalExpression, IsExpression, ExprStatement, Parse, Pick, ValueStatement, Set, React, Fail, Send, If, While, ForEach, Statement, EventListenerDefinition, FunctionDefinition, CommandDefinition, GroupDefinition, DeclareVariable, ModuleImport, FileImport, Program, isValueStatement, ASTNode } from '../parser/AST';
import { sourceInfoToString } from '../parser/SourceInfo';
import { CompilerInfo } from '../CompilerInfo';
import { SymbolTable } from '../semantic/SymbolTable';
import { isValidVariableName, optionToList, uniqueName, zip } from '../util';

function produceValidVariableName(varName: string) {
    if (isValidVariableName(varName)) {
        return varName;
    }
    return `$${varName}`;
}

type FileImportOption = 'no-emit' | 'require' | 'import' | ((file: string) => string);

export interface CodeGeneratorOptions {
    compilerInfo: CompilerInfo;
    pushError(error: CompilerError): void;
    fileImport: FileImportOption;
}

const defaultContext = {
    message: undefined
};

export class CodeGenerator extends BaseASTVisitor<string> implements ASTVisitor<string> {
    compilerInfo: CompilerInfo;
    pushError: (error: CompilerError) => void;
    fileImport: FileImportOption;

    private initializationPromises: string[] = [];
    private dataDeclarations: [name: string, default_: string, callback: string][] = [];

    constructor(options: CodeGeneratorOptions) {
        super();
        this.compilerInfo = options.compilerInfo;
        this.pushError = options.pushError;
        this.fileImport = options.fileImport;
        this.currentSymbolTable = this.compilerInfo.rootSymbolTable!;
    }

    currentSymbolTable: SymbolTable;

    beforeVisit(ast: ASTNode) {
        this.currentSymbolTable = this.compilerInfo.symbolTables[ast.id] ?? this.currentSymbolTable;
    }

    visitProgram(ast: Program): string {
        const runtimeImport = 'import $runtime from"./Runtime.js";';
        const contextDeclaration = `const $context=${JSON.stringify(defaultContext)};`;

        const importDeclarations = [] as ASTNode[];
        const varDeclarations = [] as ASTNode[];
        const functionDeclarations = [] as ASTNode[];
        const commandsEventsGroupsDeclarations = [] as ASTNode[];

        for (const declaration of ast.declarations) {
            switch (declaration.type) {
                case ASTNodeType.FileImport: case ASTNodeType.ModuleImport:
                    importDeclarations.push(declaration); break;
                case ASTNodeType.DeclareVariable:
                    varDeclarations.push(declaration); break;
                case ASTNodeType.FunctionDefinition:
                    functionDeclarations.push(declaration); break;
                case ASTNodeType.CommandDefinition: case ASTNodeType.EventListenerDefinition: case ASTNodeType.GroupDefinition:
                    commandsEventsGroupsDeclarations.push(declaration); break;
            }
        }

        const imports = `${runtimeImport}${importDeclarations.map(x => x.accept(this)).join('')}`;
        const vars = `${contextDeclaration}${varDeclarations.map(x => x.accept(this)).join('')}`;
        const functions = functionDeclarations.map(x => x.accept(this)).join('');
        const commandsEventsGroups = commandsEventsGroupsDeclarations.map(x => x.accept(this)).join('');

        this.initializationPromises.push(`$runtime.persistent.declareAll([${
            this.dataDeclarations
                .map(([name, default_, cb]) => `['${name}',${default_},${cb}]`)
                .join(',')
        }])`);

        const behavior = `Promise.all([${this.initializationPromises.join(',')}]).then(()=>{${commandsEventsGroups}$runtime.start();});`;

        return `${imports}${vars}${functions}${behavior}`;
    }

    visitFileImport(ast: FileImport): string {
        if (typeof this.fileImport === 'function') {
            return this.fileImport(ast.filename);
        }
        if (this.fileImport === 'require') {
            return `require(${JSON.stringify(ast.filename)});`;
        }
        if (this.fileImport === 'import') {
            return `import ${JSON.stringify(ast.filename)};`;
        }
        return '';
    }

    visitModuleImport(ast: ModuleImport): string {
        return `import {${ast.members.map(x => x.accept(this)).join(',')}} from ${JSON.stringify(ast.filename)};`;
    }

    private notifySet(ident: Identifier) {
        return `$runtime.notifySet('${ident.name}',${ident.accept(this)});`;
    }

    visitDeclareVariable(ast: DeclareVariable): string {
        const name = ast.name.accept(this);
        if (ast.variant === 'temp') {
            return `let ${name}=${ast.value.accept(this)};${this.notifySet(ast.name)}`;
        }
        const notify = this.notifySet(ast.name);
        this.dataDeclarations.push([name, ast.value.accept(this), (temp => `${temp}=>{${name}=${temp};${notify}}`)(uniqueName(notify))]);
        return `let ${name};`;
    }

    visitGroupDefinition(ast: GroupDefinition): string {
        // Surround in block so that functions are local to the group
        return `{${ast.members.map(x => x.accept(this)).join('')}}`;
    }

    private statements(ast: { statements: Statement[] }): string;
    private statements(ast: { statements: Statement[] } | undefined): string | undefined;
    private statements(statements: Statement[]): string;
    private statements(statements: Statement[] | undefined): string | undefined;
    private statements(x: Statement[] | { statements: Statement[] } | undefined) {
        if (x === undefined) {
            return undefined;
        }
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
                paramList = "$rest.split(' ').filter(x=>x)";
                break;
            case 'string':
                paramStructure = `[${ast.parameters.map(x => x.accept(this)).join(',')},${ast.restParam!.accept(this)}]`;
                paramList = `/^${ast.parameters.map(() => '(.+?) +').join('')}(.+)$/.exec($rest).slice(1)`;
                break;
            case 'none':
                paramStructure = `[${ast.parameters.map(x => x.accept(this)).join(',')}]`;
                paramList = "$rest.split(' ').filter(x=>x)";
        }
        const header = `$runtime.commands.add(${JSON.stringify(ast.name.name)},[${this.getGroupChain(ast.group).map(x => JSON.stringify(x)).join(',')}],async(message,$rest)=>{$context.message=message;`;
        const paramDeclarations = `let ${[...ast.parameters, ...optionToList(ast.restParam)].map(x => `${x?.accept(this)}`).join(',')};`;
        const restDecomposition = `const $paramList=${paramList};`;
        const paramCheck = `if($paramList.length<${ast.parameters.length})return'failed-args';`;
        const paramAssigment = `${paramStructure}=$paramList;`;
        const parameterHandling = ast.parameters.length > 0 || ast.restParamVariant !== 'none' ? `${paramDeclarations}{${restDecomposition}${paramCheck}${paramAssigment}}` : '';
        const footer = '$context.message=undefined;});';
        return `${header}${parameterHandling}${this.statements(ast.statements)}${footer}`;
    }

    private statementsWithReturn(statements: Statement[]): string;
    private statementsWithReturn(statements: Statement[] | undefined): string | undefined;
    private statementsWithReturn(statements: Statement[] | undefined) {
        if (statements === undefined) {
            return undefined;
        }
        const returnStatement = statements[statements.length - 1];
        const returnStatementCode = isValueStatement(returnStatement) ? 'return it;' : '';
        return `${this.statements(statements)}${returnStatementCode}`;
    }

    visitFunctionDefinition(ast: FunctionDefinition): string {
        const paramsCode = ast.parameters.map(x => x.name === '' ? 'it' : x.accept(this)).join(',');
        const restParamCode = ast.restParamVariant === 'list' ? `,...${ast.restParam?.accept(this) ?? 'it'}` : '';
        return `async function ${ast.name.accept(this)}(${paramsCode}${restParamCode}){${this.statementsWithReturn(ast.statements)}}`;
    }

    visitEventListenerDefinition(ast: EventListenerDefinition): string {
        const statements = this.statements(ast.statements);
        if (ast.event in this.compilerInfo.events) {
            const params = this.compilerInfo.events[ast.event].map(produceValidVariableName).join(',');
            return `$runtime.events.register(${JSON.stringify(ast.event)},async(${params})=>{${statements}});`;
        }
        return `$runtime.events.register(${JSON.stringify(ast.event)},async(...arguments)=>{${statements}});`;
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

    visitReact(ast: React): string {
        return `$runtime.reactToMessage($runtime.getChannelFromMessage($context.message),${ast.targetMessage?.accept(this) ?? '$context.message'},${ast.reaction.accept(this)});`;
    }

    visitFail(ast: Fail): string {
        return `throw new Error('Intentionally failed at ${sourceInfoToString(ast.source)}.');`;
    }

    visitSet(ast: Set): string {
        const root = ast.variable.type === ASTNodeType.OfExpression ? ast.variable.root : ast.variable;
        if (root.type === ASTNodeType.Identifier) {
            const found = this.currentSymbolTable.getField(root);
            switch (found?.type) {
                case 'data': {
                    const val = ast.expression.accept(this);
                    if (ast.variable.type === ASTNodeType.OfExpression) {
                        const refChain = ast.variable.referenceChain.map(x => x.type === ASTNodeType.Identifier ? `'${x.accept(this)}'` : x.accept(this));
                        return `$runtime.persistent.setNested('${found.identifier.accept(this)}',[${refChain.join(',')}],${val});${this.notifySet(found.identifier)}`;
                    }
                    return `$runtime.persistent.set('${found.identifier.accept(this)}',${val});${this.notifySet(found.identifier)}`;
                }
                case 'temp':
                    return `${ast.variable.accept(this)}=${ast.expression.accept(this)};${this.notifySet(found.identifier)}`;
                case 'const':
                    this.pushError(new CompilerError(ErrorType.AssignToConst, ast.variable.source, 'Cannot assign to a built-in variable'));
                    break;
                default:
                    this.pushError(new CompilerError(ErrorType.SetToLocal, ast.variable.source, 'set ... to ... should not be used for local variables. Use <- instead'));
                    break;
            }
        }
        return `${ast.variable.accept(this)}=${ast.expression.accept(this)};`;
    }

    private assignment(ast: ValueStatement, exprCode: string, orElse?: string): string {
        const found = this.currentSymbolTable.getField(ast.assignTo);
        switch (found?.type) {
            case 'const':
                this.pushError(new CompilerError(ErrorType.AssignToConst, ast.assignTo.source, 'Cannot assign to a built-in variable'));
                break;
            case 'data':
            case 'temp':
                this.pushError(new CompilerError(ErrorType.GetsDataTemp, ast.assignTo.source, '<- should not be used for data or temp variables. Use set ... to ... instead'));
                break;
        }

        const shouldDeclare = ast.assignTo.id === this.currentSymbolTable.getField(ast.assignTo)?.identifier.id;
        const varName = ast.assignTo.accept(this);
        if (orElse) {
            return `${shouldDeclare ? `let ${varName};` : ''}try{${varName}=${exprCode};}catch{${orElse}}`;
        }
        return `${shouldDeclare ? 'let ' : ''}${varName}=${exprCode};`;
    }

    visitSend(ast: Send): string {
        if (ast.assignTo) {
            return this.assignment(ast as ValueStatement, `await $runtime.sendMessage($context.message.channel,${ast.message.accept(this)})`);
        }
        return `$runtime.sendMessage($context.message.channel,${ast.message.accept(this)});`;
    }

    visitPick(ast: Pick): string {
        if (ast.distribution in this.compilerInfo.distributions) {
            return this.assignment(ast, this.compilerInfo.distributions[ast.distribution](ast.collection.accept(this)));
        }
        this.pushError(new CompilerError(
            ErrorType.UndefinedDistribution,
            ast.source,
            `The distribution type ${ast.distribution} is not known to the compiler. A runtime distribution will be used instead.`
        ));
        return this.assignment(ast, `$runtime.runDistribution('${ast.distribution}', ${ast.collection.accept(this)})`);
    }

    visitParse(ast: Parse): string {
        const elseCode = `${this.statements(ast.elseStatements)}throw'handled';`;
        if (ast.parser in this.compilerInfo.parsers) {
            return this.assignment(ast, this.compilerInfo.parsers[ast.parser](ast.expression.accept(this)), elseCode);
        }
        this.pushError(new CompilerError(
            ErrorType.UndefinedDistribution,
            ast.source,
            `The parser type ${ast.parser} is not known to the compiler. A runtime parser will be used instead.`
        ));
        return this.assignment(ast, `$runtime.runParser('${ast.parser}', ${ast.expression.accept(this)})`, elseCode);
    }

    visitExprStatement(ast: ExprStatement): string {
        return this.assignment(ast, ast.expression.accept(this));
    }

    visitIsExpression(ast: IsExpression): string {
        // TODO: specify mechanism for which this generation can be done in a general way
        let validationCode = 'false';
        if (['placeholder'].includes(ast.targetType)) {
            // todo
        }
        else {
            validationCode = `${ast.expression.accept(this)} instanceof ${ast.targetType}`;
        }
        return `(${ast.isNot ? `!${validationCode}` : validationCode})`;
    }

    visitRelationalExpression(ast: RelationalExpression): string {
        const segments = [] as string[];
        for (let i = 0; i < ast.operators.length; i++) {
            const op = ast.operators[i] as string;
            segments.push(`(${ast.expressions[i].accept(this)})${op}(${ast.expressions[i + 1].accept(this)})`);
        }
        return `(${segments.join('&&')})`;
    }

    visitBinaryOpExpression(ast: BinaryOpExpression): string {
        let op = ast.operator as string;
        switch (op) {
            case 'and': op = '&&'; break;
            case 'or': op = '||'; break;
        }
        return `(${ast.lhs.accept(this)}${ast.operator}${ast.rhs.accept(this)})`;
    }

    visitUnaryOpExpression(ast: UnaryOpExpression): string {
        let op = ast.operator as string;
        switch (op) {
            case 'not': op = '!'; break;
        }
        return `(${op}${ast.expression.accept(this)})`;
    }

    visitInvokeExpression(ast: InvokeExpression): string {
        return `(await ${ast.function.accept(this)}(${ast.arguments.map(x => x.accept(this)).join(',')}))`;
    }

    visitOfExpression(ast: OfExpression): string {
        return `${ast.root.accept(this)}${ast.referenceChain.map(x => x.type === ASTNodeType.Identifier ? `["${x.name}"]` : `[${x.accept(this)}]`).join('')}`;
    }

    visitIdentifier(ast: Identifier): string {
        return produceValidVariableName(ast.name);
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
