import { SourceInfo } from '../SourceInfo';

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
    Assert,
    If,
    Send,
    React,
    Set,
    Assign,

    Pick,
    Parse,
    Carry,

    IsExpression,
    RelationalExpression,
    BinaryOpExpression,
    UnaryOpExpression,
    InvokeExpression,

    OfExpression,
    Identifier,

    RawStringLiteral,
    TemplateStringLiteral,
    NumberLiteral,
    BooleanLiteral,
    ListLiteral,
    DictLiteral,
}

interface _ASTNode_Base extends __ASTNode_Prototype {
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

export interface GroupDefinition extends _ASTNode_Base {
    type: ASTNodeType.GroupDefinition;
    name: Identifier;
    members: GroupableDefinition[];
}

interface HasAction {
    statements: Statement[];
}

export interface EventListenerDefinition extends _ASTNode_Base, HasAction {
    type: ASTNodeType.EventListenerDefinition;
    event: string;
}

interface _FunctionLikeDefinition extends _ASTNode_Base, HasAction {
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

export interface Assert extends _CheckStatement {
    type: ASTNodeType.Assert;
    elseStatements: Statement[] | undefined;
}

export interface If extends _CheckStatement {
    type: ASTNodeType.If;
    thenStatements: Statement[];
    elseStatements: Statement[] | undefined;
}

export type CheckStatement = While | Assert | If;

export function isCheckStatement(node: ASTNode): node is CheckStatement {
    switch (node.type) {
        case ASTNodeType.While: case ASTNodeType.Assert: case ASTNodeType.If:
            return true;
        default:
            return false;
    }
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

export interface Assign extends _ASTNode_Base {
    type: ASTNodeType.Assign;
    variable: Identifier;
    value: ValueStatement;
}

export interface Pick extends _ASTNode_Base {
    type: ASTNodeType.Pick;
    distribution: string;
    collection: Expression;
}

export interface Parse extends _ASTNode_Base {
    type: ASTNodeType.Parse;
    parser: string;
    serialized: Expression;
}

export interface Carry extends _ASTNode_Base {
    type: ASTNodeType.Carry;
    expression: Expression;
}

export type ValueStatement = Pick | Parse | Carry;

export function isValueStatement(node: ASTNode): node is ValueStatement {
    switch (node.type) {
        case ASTNodeType.Pick: case ASTNodeType.Parse: case ASTNodeType.Carry:
            return true;
        default:
            return false;
    }
}

export type Statement =
    Assign | Set   | ForEach | While |
    Assert | If    | Pick    | Parse |
    Send   | React | Carry;

export function isStatement(node: ASTNode): node is Statement {
    switch (node.type) {
        case ASTNodeType.Assign: case ASTNodeType.Set:   case ASTNodeType.ForEach: case ASTNodeType.While:
        case ASTNodeType.Assert: case ASTNodeType.If:    case ASTNodeType.Pick:    case ASTNodeType.Parse:
        case ASTNodeType.Send:   case ASTNodeType.React: case ASTNodeType.Carry:
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
    operator: '+' | '-' | '*' | '/';
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

export interface OfExpression extends _ASTNode_Base {
    type: ASTNodeType.OfExpression;
    root: Expression;
    /** Dereferenced left to right, as in javascript, like `a.b.c.d` (code would look like `d of c of b of a`) */
    referenceChain: ObjectKey[];
}

export interface Identifier extends _ASTNode_Base {
    type: ASTNodeType.Identifier;
    name: string;
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
    InvokeExpression;

export function isExpression(node: ASTNode): node is Expression {
    switch (node.type) {
        case ASTNodeType.IsExpression:      case ASTNodeType.RelationalExpression:  case ASTNodeType.BinaryOpExpression:
        case ASTNodeType.UnaryOpExpression: case ASTNodeType.OfExpression:          case ASTNodeType.Identifier:
        case ASTNodeType.RawStringLiteral:  case ASTNodeType.TemplateStringLiteral: case ASTNodeType.NumberLiteral:
        case ASTNodeType.BooleanLiteral:    case ASTNodeType.ListLiteral:           case ASTNodeType.DictLiteral:
        case ASTNodeType.InvokeExpression:
            return true;
        default:
            return false;
    }
}

function createASTNode<
    Type extends ASTNodeType,
    Node extends ASTNode & { type: Type }
>(
    this: typeof __ASTNode_prototype,
    type: Type,
    source: SourceInfo,
    node: Omit<Node, 'type' | 'source' | keyof __ASTNode_Prototype>
) {
    return {
        type,
        source,
        ...node,
    };
}

interface __ASTNode_Prototype {
    readonly children: readonly ASTNode[];
    walk(walkerFn: (node: ASTNode) => void): void;
}

const __ASTNode_prototype = {
    get children() {
        return getChildren(this);
    },
    walk(walkerFn: (node: ASTNode) => void) {
        walkerFn(this);
        for (const child of this.children) {
            child.walk(walkerFn);
        }
    }
} as ASTNode;

export const ASTNode = createASTNode as unknown as {
    new <
        Type extends ASTNodeType,
        Node extends ASTNode & { type: Type }
    > (
        type: Type,
        source: SourceInfo,
        node: Omit<Node, 'type' | 'source' | keyof __ASTNode_Prototype>
    ): Node & typeof __ASTNode_prototype;
    prototype: typeof __ASTNode_prototype;
};
Object.assign(ASTNode.prototype, __ASTNode_prototype);

export type ASTNode =
    Program            | FileImport            | ModuleImport       | DeclareVariable |
    GroupDefinition    | CommandDefinition     | FunctionDefinition | EventListenerDefinition |
    Assign             | Set                   | ForEach            | While |
    Assert             | If                    | Pick               | Parse |
    Send               | React                 | IsExpression       | RelationalExpression |
    BinaryOpExpression | UnaryOpExpression     | OfExpression       | Identifier |
    RawStringLiteral   | TemplateStringLiteral | NumberLiteral      | BooleanLiteral |
    ListLiteral        | DictLiteral           | Carry              | InvokeExpression;

function getChildren(node: ASTNode): readonly ASTNode[] {
    switch (node.type) {
        case ASTNodeType.Program: return node.declarations;
        // case ASTNodeType.FileImport: return [];
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
        case ASTNodeType.Assert: return [node.checkExpression, ...(node.elseStatements ?? [])];
        case ASTNodeType.If: return [node.checkExpression, ...node.thenStatements, ...(node.elseStatements ?? [])];
        case ASTNodeType.Pick: return [node.collection];
        case ASTNodeType.Parse: return [node.serialized];
        case ASTNodeType.Carry: return [node.expression];
        case ASTNodeType.Send: return [node.message];
        case ASTNodeType.React: return [...(node.targetMessage ? [node.targetMessage] : []), node.reaction];
        case ASTNodeType.IsExpression: return [node.expression];
        case ASTNodeType.RelationalExpression: return node.expressions;
        case ASTNodeType.BinaryOpExpression: return [node.lhs, node.rhs];
        case ASTNodeType.UnaryOpExpression: return [node.expression];
        case ASTNodeType.OfExpression: return [...node.referenceChain, node.root];
        case ASTNodeType.InvokeExpression: return [node.function, ...node.arguments];
        // case ASTNodeType.Identifier: return [];
        // case ASTNodeType.RawStringLiteral: return [];
        // case ASTNodeType.TemplateStringLiteral: return [];
        // case ASTNodeType.NumberLiteral: return [];
        // case ASTNodeType.BooleanLiteral: return [];
        case ASTNodeType.ListLiteral: return node.values;
        case ASTNodeType.DictLiteral: return node.keys.reduce((a, b, i) => a.concat(b, node.values[i]), [] as ASTNode[]);
        default: return [];
    }
}
