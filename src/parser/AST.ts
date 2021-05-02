import { DiscriminateUnion } from '../util';
import { SourceInfo } from './SourceInfo';

export enum ASTNodeType {
    Program,

    FileImport,
    ModuleImport,
    DeclareVariable,

    GroupDefinition,
    CommandDefinition,
    FunctionDefinition,
    EventListenerDefinition,

    ForEach,
    While,
    If,
    Send,
    React,
    Fail,
    Set,

    Pick,
    Parse,
    ExprStatement,

    IsExpression,
    RelationalExpression,
    BinaryOpExpression,
    UnaryOpExpression,
    InvokeExpression,

    OfExpression,
    Identifier,
    JavascriptExpression,

    RawStringLiteral,
    TemplateStringLiteral,
    NumberLiteral,
    BooleanLiteral,
    ListLiteral,
    DictLiteral
}

const reverseASTNodeType = ASTNodeType as unknown as { [Type in ASTNodeType]: keyof typeof ASTNodeType };

interface _ASTNode_Base extends __ASTNode_Prototype {
    id: number;
    type: ASTNodeType;
    source: SourceInfo;
    // children: ASTNode[];
}

export interface Program extends _ASTNode_Base {
    type: ASTNodeType.Program;
    declarations: Declaration[];
}

export interface FileImport extends _ASTNode_Base {
    type: ASTNodeType.FileImport;
    filename: string;
}

export interface ModuleImport extends _ASTNode_Base {
    type: ASTNodeType.ModuleImport;
    filename: string;
    members: Identifier[];
}

export interface DeclareVariable extends _ASTNode_Base {
    type: ASTNodeType.DeclareVariable;
    variant: 'data' | 'temp';
    name: Identifier;
    value: LiteralExpression;
}

interface _GroupableDefinition extends _ASTNode_Base {
    group?: GroupDefinition;
}

export interface GroupDefinition extends _GroupableDefinition {
    type: ASTNodeType.GroupDefinition;
    name: Identifier;
    members: GroupableDefinition[];
}

interface HasAction {
    statements: Statement[];
}

export interface EventListenerDefinition extends _GroupableDefinition, HasAction {
    type: ASTNodeType.EventListenerDefinition;
    event: string;
}

interface _FunctionLikeDefinition extends _GroupableDefinition, HasAction {
    name: Identifier;
    parameters: Identifier[];
    restParamVariant: 'none' | 'string' | 'list';
    restParam: Identifier | undefined;
}

export interface CommandDefinition extends _FunctionLikeDefinition {
    type: ASTNodeType.CommandDefinition;
}

export interface FunctionDefinition extends _FunctionLikeDefinition {
    type: ASTNodeType.FunctionDefinition;
    restParamVariant: 'none' | 'list';
}

export type ActionDefinition = EventListenerDefinition | CommandDefinition | FunctionDefinition;

export function isActionDefinition(node: ASTNode): node is ActionDefinition {
    switch (node.type) {
        case ASTNodeType.EventListenerDefinition: case ASTNodeType.CommandDefinition: case ASTNodeType.FunctionDefinition:
            return true;
        default:
            return false;
    }
}

export type GroupableDefinition = GroupDefinition | ActionDefinition;

export function isGroupableDefinition(node: ASTNode): node is GroupableDefinition {
    return node.type === ASTNodeType.GroupDefinition || isActionDefinition(node);
}

export type Declaration = FileImport | ModuleImport | DeclareVariable | GroupableDefinition;

export function isDeclaration(node: ASTNode): node is Declaration {
    switch (node.type) {
        case ASTNodeType.FileImport: case ASTNodeType.ModuleImport: case ASTNodeType.DeclareVariable:
            return true;
        default:
            return isGroupableDefinition(node);
    }
}

export interface ForEach extends _ASTNode_Base, HasAction {
    type: ASTNodeType.ForEach;
    loopVariable: Identifier;
    collection: Expression;
}

interface _CheckStatement extends _ASTNode_Base {
    checkExpression: Expression;
}

export interface While extends _CheckStatement, HasAction {
    type: ASTNodeType.While;
}

export interface If extends _CheckStatement {
    type: ASTNodeType.If;
    thenStatements: Statement[];
    elseStatements: Statement[] | undefined;
}

export type CheckStatement = While | If;

export function isCheckStatement(node: ASTNode): node is CheckStatement {
    switch (node.type) {
        case ASTNodeType.While: case ASTNodeType.If:
            return true;
        default:
            return false;
    }
}

export interface Fail extends _ASTNode_Base {
    type: ASTNodeType.Fail;
}

export interface Send extends _ASTNode_Base {
    type: ASTNodeType.Send;
    message: Expression;
}

export interface React extends _ASTNode_Base {
    type: ASTNodeType.React;
    targetMessage: Expression | undefined;
    reaction: Expression;
}

export interface Set extends _ASTNode_Base {
    type: ASTNodeType.Set;
    variable: OfExpression | Identifier;
    expression: Expression;
}

interface _ValueStatement extends _ASTNode_Base {
    assignTo: Identifier;
}

export interface Pick extends _ValueStatement {
    type: ASTNodeType.Pick;
    distribution: string;
    collection: Expression;
}

export interface Parse extends _ValueStatement {
    type: ASTNodeType.Parse;
    parser: string;
    expression: Expression;
    elseStatements: Statement[] | undefined;
}

export interface ExprStatement extends _ValueStatement {
    type: ASTNodeType.ExprStatement;
    expression: Expression;
}

export type ValueStatement = Pick | Parse | ExprStatement;

export function isValueStatement(node: ASTNode): node is ValueStatement {
    switch (node.type) {
        case ASTNodeType.Pick: case ASTNodeType.Parse: case ASTNodeType.ExprStatement:
            return true;
        default:
            return false;
    }
}

export type Statement =
    Set   | ForEach | While | Fail |
    If    | Pick    | Parse | Send |
    React | ExprStatement;

export function isStatement(node: ASTNode): node is Statement {
    switch (node.type) {
        case ASTNodeType.Set:  case ASTNodeType.ForEach: case ASTNodeType.While:
        case ASTNodeType.Fail: case ASTNodeType.If:      case ASTNodeType.Pick:    case ASTNodeType.Parse:
        case ASTNodeType.Send: case ASTNodeType.React:   case ASTNodeType.ExprStatement:
            return true;
        default:
            return false;
    }
}

export interface IsExpression extends _ASTNode_Base {
    type: ASTNodeType.IsExpression;
    isNot: boolean;
    expression: Expression;
    targetType: string;
}

export interface RelationalExpression extends _ASTNode_Base {
    type: ASTNodeType.RelationalExpression;
    operators: ('==' | '!=' | '<' | '<=' | '>' | '>=')[];
    expressions: Expression[];
}

// export type CheckExpression = IsExpression | RelationalExpression;

// export function isCheckExpression(node: ASTNode): node is CheckExpression {
//     switch (node.type) {
//         case ASTNodeType.IsExpression: case ASTNodeType.RelationalExpression:
//             return true;
//         default:
//             return false;
//     }
// }

export interface BinaryOpExpression extends _ASTNode_Base {
    type: ASTNodeType.BinaryOpExpression;
    operator: '+' | '-' | '*' | '/' | 'and' | 'or';
    lhs: Expression;
    rhs: Expression;
}

export interface UnaryOpExpression extends _ASTNode_Base {
    type: ASTNodeType.UnaryOpExpression;
    operator: '+' | '-' | 'not';
    expression: Expression;
}

export interface InvokeExpression extends _ASTNode_Base {
    type: ASTNodeType.InvokeExpression;
    function: Identifier;
    arguments: Expression[];
}

export interface JavascriptExpression extends _ASTNode_Base {
    type: ASTNodeType.JavascriptExpression;
    code: string;
}

export interface OfExpression extends _ASTNode_Base {
    type: ASTNodeType.OfExpression;
    root: Expression;
    /** Dereferenced left to right, as in javascript, like `a.b.c.d` (code would look like `d of c of b of a`) */
    referenceChain: ObjectKey[];
}

export interface Identifier extends _ASTNode_Base {
    type: ASTNodeType.Identifier;
    name: string;
    /** Was this identifier defined in the program text? */
    implicit: boolean;
}

export interface RawStringLiteral extends _ASTNode_Base {
    type: ASTNodeType.RawStringLiteral;
    value: string;
}

export interface TemplateStringFragment {
    type: 'javascript' | 'text';
    contents: string;
}

export interface TemplateStringLiteral extends _ASTNode_Base {
    type: ASTNodeType.TemplateStringLiteral;
    fragments: TemplateStringFragment[];
}

export type StringLiteral = RawStringLiteral | TemplateStringLiteral;

export function isStringLiteral(node: ASTNode): node is LiteralExpression {
    switch (node.type) {
        case ASTNodeType.RawStringLiteral:  case ASTNodeType.TemplateStringLiteral:
            return true;
        default:
            return false;
    }
}

export interface NumberLiteral extends _ASTNode_Base {
    type: ASTNodeType.NumberLiteral;
    value: number;
}

export interface BooleanLiteral extends _ASTNode_Base {
    type: ASTNodeType.BooleanLiteral;
    value: boolean;
}

export interface ListLiteral extends _ASTNode_Base {
    type: ASTNodeType.ListLiteral;
    values: Expression[];
}

export interface DictLiteral extends _ASTNode_Base {
    type: ASTNodeType.DictLiteral;
    keys: ObjectKey[];
    values: Expression[];
}

export type ObjectKey = Identifier | StringLiteral | NumberLiteral;

export type LiteralExpression =
    StringLiteral  | TemplateStringLiteral | NumberLiteral |
    BooleanLiteral | ListLiteral           | DictLiteral;

export function isLiteralExpression(node: ASTNode): node is LiteralExpression {
    switch (node.type) {
        case ASTNodeType.RawStringLiteral:  case ASTNodeType.TemplateStringLiteral: case ASTNodeType.NumberLiteral:
        case ASTNodeType.BooleanLiteral: case ASTNodeType.ListLiteral:           case ASTNodeType.DictLiteral:
            return true;
        default:
            return false;
    }
}

export type Expression =
    IsExpression      | RelationalExpression  | BinaryOpExpression |
    UnaryOpExpression | OfExpression          | Identifier |
    StringLiteral     | TemplateStringLiteral | NumberLiteral |
    BooleanLiteral    | ListLiteral           | DictLiteral |
    InvokeExpression  | JavascriptExpression;

export function isExpression(node: ASTNode): node is Expression {
    switch (node.type) {
        case ASTNodeType.IsExpression:      case ASTNodeType.RelationalExpression:  case ASTNodeType.BinaryOpExpression:
        case ASTNodeType.UnaryOpExpression: case ASTNodeType.OfExpression:          case ASTNodeType.Identifier:
        case ASTNodeType.RawStringLiteral:  case ASTNodeType.TemplateStringLiteral: case ASTNodeType.NumberLiteral:
        case ASTNodeType.BooleanLiteral:    case ASTNodeType.ListLiteral:           case ASTNodeType.DictLiteral:
        case ASTNodeType.InvokeExpression:  case ASTNodeType.JavascriptExpression:
            return true;
        default:
            return false;
    }
}

let __astNodeIdIterator = 0;

function createASTNode<
    Type extends ASTNodeType,
    Node extends ASTNode & { type: Type }
>(
    this: ASTNode,
    type: Type,
    source: SourceInfo,
    node: Omit<Node, 'id' | 'type' | 'source' | keyof __ASTNode_Prototype>
) {
    this.id = ++__astNodeIdIterator;
    this.type = type;
    this.source = source;
    Object.assign(this, node);
}

export const ASTNode = createASTNode as unknown as {
    new <
        Type extends ASTNodeType,
        Node extends ASTNode & { type: Type }
    > (
        type: Type,
        source: SourceInfo,
        node: Omit<Node, 'id' | 'type' | 'source' | keyof __ASTNode_Prototype>
    ): Node & __ASTNode_Prototype;
};

export type ASTNode =
    Program            | FileImport            | ModuleImport       | DeclareVariable |
    GroupDefinition    | CommandDefinition     | FunctionDefinition | EventListenerDefinition |
    Set                | ForEach               | While |
    Fail               | If                    | Pick               | Parse |
    Send               | React                 | IsExpression       | RelationalExpression |
    BinaryOpExpression | UnaryOpExpression     | OfExpression       | Identifier |
    RawStringLiteral   | TemplateStringLiteral | NumberLiteral      | BooleanLiteral |
    ListLiteral        | DictLiteral           | ExprStatement      | InvokeExpression |
    JavascriptExpression;

function getChildren(node: ASTNode): readonly ASTNode[] {
    switch (node.type) {
        case ASTNodeType.Program: return node.declarations;
        case ASTNodeType.ModuleImport: return node.members;
        case ASTNodeType.DeclareVariable: return [node.name, node.value];
        case ASTNodeType.GroupDefinition: return [node.name, ...node.members];
        case ASTNodeType.CommandDefinition:
            return [
                node.name, ...node.parameters,
                ...(node.restParam ? [node.restParam] : []),
                ...node.statements
            ];
        case ASTNodeType.FunctionDefinition:
            return [
                node.name, ...node.parameters,
                ...(node.restParam ? [node.restParam] : []),
                ...node.statements
            ];
        case ASTNodeType.EventListenerDefinition: return node.statements;
        case ASTNodeType.If: return [node.checkExpression, ...node.thenStatements, ...(node.elseStatements ?? [])];
        case ASTNodeType.Pick: return [node.collection];
        case ASTNodeType.Parse: return [node.expression];
        case ASTNodeType.ExprStatement: return [node.expression];
        case ASTNodeType.Send: return [node.message];
        case ASTNodeType.React: return [...(node.targetMessage ? [node.targetMessage] : []), node.reaction];
        case ASTNodeType.IsExpression: return [node.expression];
        case ASTNodeType.RelationalExpression: return node.expressions;
        case ASTNodeType.BinaryOpExpression: return [node.lhs, node.rhs];
        case ASTNodeType.UnaryOpExpression: return [node.expression];
        case ASTNodeType.OfExpression: return [...node.referenceChain, node.root];
        case ASTNodeType.InvokeExpression: return [node.function, ...node.arguments];
        case ASTNodeType.ListLiteral: return node.values;
        case ASTNodeType.DictLiteral: return node.keys.reduce((a, b, i) => a.concat(b, node.values[i]), [] as ASTNode[]);
        default: return [];
    }
}

type ASTListener_EnterExitFunctions = {
    [Type in keyof typeof ASTNodeType as `enter${Type}` | `exit${Type}`]?: (node: ASTNodeFromType<typeof ASTNodeType[Type]>) => void;
};

export interface ASTListener extends ASTListener_EnterExitFunctions {
    /** `enterNode` will be called before the specific enter node handler */
    enterNode?(node: ASTNode): void;
    /** `exitNode` will be called before the specific exit node handler */
    exitNode?(node: ASTNode): void;
}

function walk(this: ASTNode, listener: ASTListener) {
    listener.enterNode?.(this);
    // @ts-ignore
    listener[`enter${reverseASTNodeType[this.type]}`]?.(this);

    for (const child of this.children) {
        child.walk(listener);
    }
    listener.exitNode?.(this);
    // @ts-ignore
    listener[`exit${reverseASTNodeType[this.type]}`]?.(this);
}

type ASTNodeFromType<T extends ASTNodeType> = DiscriminateUnion<ASTNode, 'type', T>;

type ASTVisitor_VisitFunctions<T> = {
    [Type in keyof typeof ASTNodeType as `visit${Type}`]?: (node: ASTNodeFromType<typeof ASTNodeType[Type]>) => T;
};

export interface ASTVisitor<T> extends ASTVisitor_VisitFunctions<T> {
    visit(node: ASTNode): T;
    visitChildren(children: readonly ASTNode[]): T;
    beforeVisit?: (node: ASTNode) => void;
    afterVisit?: (node: ASTNode) => void;
}

export abstract class BaseASTVisitor<T> implements ASTVisitor<T> {
    visit(node: ASTNode): T {
        return node.accept(this);
    }
    visitChildren(children: readonly ASTNode[]): T {
        if (children.length === 0) {
            throw new Error('Method not implemented.');
        }
        return children.map(x => x.accept(this))[0]!;
    }
}

function accept<T>(this: ASTNode, visitor: ASTVisitor<T>) {
    visitor.beforeVisit?.(this);

    let result: T;
    // @ts-ignore
    const visitorFn: ((node: ASTNode) => T) | undefined = visitor[`visit${reverseASTNodeType[this.type]}`];
    if (visitorFn) {
        result = visitorFn.apply(visitor, [this]);
    }
    else {
        result = visitor.visitChildren(this.children);
    }

    visitor.afterVisit?.(this);
    return result;
}

interface __ASTNode_Prototype {
    /**
     * Invariant: if a.id < b.id, and a and b are in separate statements in the same block, a comes before b.
     * There is no guarantee that ids will be linearly increasing.
     */
    readonly children: readonly ASTNode[];
    walk: typeof walk;
    accept: typeof accept;
}

Object.defineProperties(ASTNode.prototype, {
    children: {
        get() {
            return getChildren(this);
        }
    }
});
ASTNode.prototype.walk = walk;
ASTNode.prototype.accept = accept;
