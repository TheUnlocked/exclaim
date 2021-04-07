import { ParserRuleContext } from "antlr4ts";
import { SourceInfo } from "../SourceInfo";

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

interface _ASTNode {
    type: ASTNodeType;
    source: SourceInfo;
    // children: ASTNode[];
}

export interface Program extends _ASTNode {
    type: ASTNodeType.Program;
    declarations: Declaration[];
}

export interface FileImport extends _ASTNode {
    type: ASTNodeType.FileImport;
    filename: string;
}

export interface ModuleImport extends _ASTNode {
    type: ASTNodeType.ModuleImport;
    filename: string;
    members: Identifier[];
}

export interface DeclareVariable extends _ASTNode {
    type: ASTNodeType.DeclareVariable;
    variant: 'data' | 'temp';
    name: Identifier;
    value: LiteralExpression;
}

export interface GroupDefinition extends _ASTNode {
    type: ASTNodeType.GroupDefinition;
    name: Identifier;
    members: GroupableDefinition[];
}

interface HasAction {
    statements: Statement[];
}

export interface EventListenerDefinition extends _ASTNode, HasAction {
    type: ASTNodeType.EventListenerDefinition;
    event: string;
}

interface _FunctionLikeDefinition extends _ASTNode, HasAction {
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
    switch(node.type) {
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
    switch(node.type) {
        case ASTNodeType.FileImport: case ASTNodeType.ModuleImport: case ASTNodeType.DeclareVariable:
            return true;
        default:
            return isGroupableDefinition(node);
    }
}

export interface ForEach extends _ASTNode, HasAction {
    type: ASTNodeType.ForEach;
    loopVariable: Identifier;
    collection: Expression;
}

interface _CheckStatement extends _ASTNode {
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

export interface Send extends _ASTNode {
    type: ASTNodeType.Send;
    message: Expression;
}

export interface React extends _ASTNode {
    type: ASTNodeType.React;
    targetMessage: Expression | undefined;
    reaction: Expression;
}

export interface Set extends _ASTNode {
    type: ASTNodeType.Set;
    variable: OfExpression | Identifier;
    expression: Expression;
}

export interface Assign extends _ASTNode {
    type: ASTNodeType.Assign;
    variable: Identifier;
    value: ValueStatement;
}

export interface Pick extends _ASTNode {
    type: ASTNodeType.Pick;
    distribution: string;
    collection: Expression;
}

export interface Parse extends _ASTNode {
    type: ASTNodeType.Parse;
    parser: string;
    serialized: Expression;
}

export interface Carry extends _ASTNode {
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

export interface IsExpression extends _ASTNode {
    type: ASTNodeType.IsExpression;
    isNot: boolean;
    expression: Expression;
    targetType: string;
}

export interface RelationalExpression extends _ASTNode {
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

export interface BinaryOpExpression extends _ASTNode {
    type: ASTNodeType.BinaryOpExpression;
    operator: '+' | '-' | '*' | '/';
    lhs: Expression;
    rhs: Expression;
}

export interface UnaryOpExpression extends _ASTNode {
    type: ASTNodeType.UnaryOpExpression;
    operator: '+' | '-' | 'not';
    expression: Expression;
}

export interface InvokeExpression extends _ASTNode {
    type: ASTNodeType.InvokeExpression;
    function: Identifier;
    arguments: Expression[];
}

export interface OfExpression extends _ASTNode {
    type: ASTNodeType.OfExpression;
    root: Expression;
    /** Dereferenced left to right, as in javascript, like `a.b.c.d` (code would look like `d of c of b of a`) */
    referenceChain: ObjectKey[];
}

export interface Identifier extends _ASTNode {
    type: ASTNodeType.Identifier;
    name: string;
}

export interface RawStringLiteral extends _ASTNode {
    type: ASTNodeType.RawStringLiteral;
    value: string;
}

export interface TemplateStringFragment {
    type: 'javascript' | 'text';
    contents: string;
}

export interface TemplateStringLiteral extends _ASTNode {
    type: ASTNodeType.TemplateStringLiteral;
    fragments: TemplateStringFragment[];
}

export type StringLiteral = RawStringLiteral | TemplateStringLiteral;

export function isStringLiteral(node: ASTNode): node is LiteralExpression {
    switch(node.type) {
        case ASTNodeType.RawStringLiteral:  case ASTNodeType.TemplateStringLiteral:
            return true;
        default:
            return false;
    }
}

export interface NumberLiteral extends _ASTNode {
    type: ASTNodeType.NumberLiteral;
    value: number;
}

export interface BooleanLiteral extends _ASTNode {
    type: ASTNodeType.BooleanLiteral;
    value: boolean;
}

export interface ListLiteral extends _ASTNode {
    type: ASTNodeType.ListLiteral;
    values: Expression[];
}

export interface DictLiteral extends _ASTNode {
    type: ASTNodeType.DictLiteral;
    keys: ObjectKey[];
    values: Expression[];
}

export type ObjectKey = Identifier | StringLiteral | NumberLiteral;

export type LiteralExpression =
    StringLiteral  | TemplateStringLiteral | NumberLiteral |
    BooleanLiteral | ListLiteral           | DictLiteral;

export function isLiteralExpression(node: ASTNode): node is LiteralExpression {
    switch(node.type) {
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
    switch(node.type) {
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

export type ASTNode =
    Program            | FileImport            | ModuleImport       | DeclareVariable |
    GroupDefinition    | CommandDefinition     | FunctionDefinition | EventListenerDefinition |
    Assign             | Set                   | ForEach            | While |
    Assert             | If                    | Pick               | Parse |
    Send               | React                 | IsExpression       | RelationalExpression |
    BinaryOpExpression | UnaryOpExpression     | OfExpression       | Identifier |
    StringLiteral      | TemplateStringLiteral | NumberLiteral      | BooleanLiteral |
    ListLiteral        | DictLiteral           | Carry              | InvokeExpression;