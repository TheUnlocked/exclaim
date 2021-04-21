import { ASTListener, ASTNode, ASTNodeType, EventListenerDefinition, ForEach, Identifier, isValueStatement } from '../parser/AST';
import { SemanticInfo } from './SemanticInfo';
import { SymbolTable } from './SymbolTable';

// This cache will always obey the ASTNode id invariant since
// semantically builtins are always created at the start of a block,
// never in the middle of a block.
const builtinIdentifierCache = {} as { [name: string]: Identifier };

function builtin(name: string) {
    if (name in builtinIdentifierCache) {
        return builtinIdentifierCache[name];
    }
    const ident = new ASTNode(ASTNodeType.Identifier, { ctx: null, file: '#builtin' }, { name });
    builtinIdentifierCache[name] = ident;
    return ident;
}

function builtins(names: string[]) {
    return names.map(x => builtin(x));
}

export class BindingsGenerator implements ASTListener {
    currentST: SymbolTable;
    info: SemanticInfo;

    constructor(info: SemanticInfo, globalFields: string[]) {
        this.info = info;
        this.currentST = new SymbolTable(undefined, builtins(globalFields), 'global');
    }

    popST() {
        this.currentST = this.currentST.parent!;
    }

    enterCommandDefinition() {
        this.currentST = new SymbolTable(this.currentST, builtins(['message', 'author']));
    }

    enterFunctionDefinition() {
        this.currentST = new SymbolTable(this.currentST);
    }

    enterEventListenerDefinition(ast: EventListenerDefinition) {
        let fields = [] as string[];
        switch (ast.event) {

        }
        this.currentST = new SymbolTable(this.currentST, builtins(fields));
    }

    enterForEach(ast: ForEach) {
        this.currentST = new SymbolTable(this.currentST, [ast.loopVariable]);
    }

    enterWhile() {
        this.currentST = new SymbolTable(this.currentST);
    }

    enterIf() {
        this.currentST = new SymbolTable(this.currentST);
    }

    enterNode(ast: ASTNode) {
        if (isValueStatement(ast)) {
            if (ast.assignTo) {
                this.currentST.addField(ast.assignTo);
            }
            else {
                this.currentST.addField(builtin('it'));
            }
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
