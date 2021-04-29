import { CompilerError, ErrorType } from '../CompilerError';
import { ASTListener, ASTNode, ASTNodeType, CommandDefinition, DeclareVariable, EventListenerDefinition, ForEach, FunctionDefinition, Identifier, If, isValueStatement, While } from '../parser/AST';
import { optionToList } from '../util';
import { SemanticInfo } from './SemanticInfo';
import { SymbolInfo, SymbolTable, SymbolType } from './SymbolTable';

// This cache will always obey the ASTNode id invariant since
// semantically builtins are always created at the start of a block,
// never in the middle of a block. i.e. an access can never be before a definition
const builtinIdentifierCache = {} as { [name: string]: Identifier };

function builtin(name: string) {
    if (name in builtinIdentifierCache) {
        return builtinIdentifierCache[name];
    }
    const ident = new ASTNode(ASTNodeType.Identifier, { ctx: null, file: '#builtin' }, { name, implicit: true });
    builtinIdentifierCache[name] = ident;
    return ident;
}

function builtins(names: string[]) {
    return names.map(x => builtin(x));
}

function toSymbol(type: SymbolType, identifier: Identifier) {
    return { type, identifier };
}

function toSymbols(type: SymbolType, identifiers: Identifier[] | undefined) {
    return identifiers?.map(x => toSymbol(type, x));
}

export interface BindingsGeneratorOptions {
    semanticInfo: SemanticInfo;
    pushError(error: CompilerError): void;
    globalFields: string[];
}

export class BindingsGenerator implements ASTListener {
    info: SemanticInfo;
    pushError: (error: CompilerError) => void;

    currentST: SymbolTable;

    constructor(options: BindingsGeneratorOptions) {
        this.info = options.semanticInfo;
        this.pushError = options.pushError;
        this.currentST = new SymbolTable(undefined, toSymbols('const', builtins(options.globalFields)));
        this.info.rootSymbolTable = this.currentST;
    }

    /**
     * 
     * @param ast The `ASTNode` associated with the new symbol table
     * @param fields 
     */
    pushST(ast: ASTNode, fields?: Identifier[], type: SymbolType = 'local') {
        this.currentST = new SymbolTable(this.currentST, toSymbols(type, fields));
        this.info.symbolTables[ast.id] = this.currentST;
    }

    popST() {
        this.currentST = this.currentST.parent!;
    }

    enterDeclareVariable(ast: DeclareVariable) {
        this.currentST.addField({ type: ast.variant, identifier: ast.name });
    }

    private getParams(ast: CommandDefinition | FunctionDefinition) {
        const params = [...ast.parameters, ...optionToList(ast.restParam)];

        const paramNames = params.map(x => x.name);
        const functionOrCommand = ast.type === ASTNodeType.CommandDefinition ? 'command' : 'function';
        params.forEach((param, i) => {
            if (paramNames.slice(0, i).includes(param.name)) {
                if (param.name === '') {
                    this.pushError(new CompilerError(
                        ErrorType.MultipleImplicitParameters,
                        param.source,
                        `A ${functionOrCommand} cannot have multiple implicit parameters (parameters without a name)`
                    ));
                }
                else {
                    this.pushError(new CompilerError(
                        ErrorType.DuplicateParameterName,
                        param.source,
                        `Multiple parameters in the same ${functionOrCommand} cannot have the same name`
                    ));
                }
            }
        });

        return params;
    }

    enterCommandDefinition(ast: CommandDefinition) {
        const magicParams = ['message'];
        const params = this.getParams(ast);
        for (const param of params) {
            if (magicParams.includes(param.name)) {
                this.pushError(new CompilerError(
                    ErrorType.ShadowingMagicParameter,
                    param.source,
                    `This parameter shadows the magic parameter ${param.name}`
                ));
            }
        }
        this.pushST(ast, [...builtins(magicParams), ...params]);
    }

    enterFunctionDefinition(ast: FunctionDefinition) {
        this.pushST(ast, this.getParams(ast));
    }

    enterEventListenerDefinition(ast: EventListenerDefinition) {
        this.pushST(ast, builtins(this.info.events[ast.event]));
    }

    enterForEach(ast: ForEach) {
        if (this.currentST.getField(ast.loopVariable)) {
            this.pushError(new CompilerError(
                ErrorType.ShadowingLocal,
                ast.loopVariable.source,
                `The loop variable ${ast.loopVariable.name} shadows an existing local variable with the same name`
            ));
        }
        this.pushST(ast, [ast.loopVariable]);
    }

    enterWhile(ast: While) {
        this.pushST(ast);
    }

    enterIf(ast: If) {
        this.pushST(ast);
    }

    enterNode(ast: ASTNode) {
        if (isValueStatement(ast)) {
            this.currentST.addField(toSymbol('local', ast.assignTo));
        }
    }

    exitNode(ast: ASTNode) {
        switch (ast.type) {
            case ASTNodeType.CommandDefinition: case ASTNodeType.FunctionDefinition: case ASTNodeType.EventListenerDefinition:
            case ASTNodeType.ForEach:           case ASTNodeType.While:              case ASTNodeType.If:
                this.popST();
        }
    }
}
