import { CompilerError } from '../CompilerError';
import { BaseASTVisitor, ASTVisitor, DictLiteral, ASTNodeType, RawStringLiteral, TemplateStringLiteral, ListLiteral, BooleanLiteral, NumberLiteral, JavascriptExpression, Identifier, OfExpression, InvokeExpression, UnaryOpExpression, BinaryOpExpression, RelationalExpression, IsExpression, ExprStatement, Parse, Pick, ValueStatement, Set, React, Fail, Send, If, While, ForEach, Statement, EventListenerDefinition, FunctionDefinition, CommandDefinition, GroupDefinition, DeclareVariable, ModuleImport, FileImport, Program } from '../parser/AST';
import { zip } from '../util';

export class CodeGenerator extends BaseASTVisitor<string> implements ASTVisitor<string> {
    errors = [] as CompilerError[];

    visitProgram(ast: Program): string {
        throw new Error('Method not implemented');
    }

    visitFileImport(ast: FileImport): string {
        // We don't do anything with this node here, an earlier processing stage should've handled it.
        // Alternatively it could make sense to emit require(filename)... maybe a configuration?
        return '';
    }

    visitModuleImport(ast: ModuleImport): string {
        return `import {${ast.members.map(x => x.accept(this)).join(',')}} from ${JSON.stringify(ast.filename)};`;
    }

    visitDeclareVariable(ast: DeclareVariable): string {
        if (ast.variant === 'temp') {
            return `let ${ast.name.accept(this)}=${ast.value.accept(this)};`;
        }
        throw new Error('Method not implemented');
    }

    visitGroupDefinition(ast: GroupDefinition): string {
        throw new Error('Method not implemented');
    }

    private statements(ast: { statements: Statement[] }): string;
    private statements(statements: Statement[]): string;
    private statements(x: Statement[] | { statements: Statement[] }) {
        if (x instanceof Array) {
            return x.map(x => x.accept(this)).join('');
        }
        return x.statements.map(x => x.accept(this)).join('');
    }

    visitCommandDefinition(ast: CommandDefinition): string {
        throw new Error('Method not implemented');
    }

    visitFunctionDefinition(ast: FunctionDefinition): string {
        throw new Error('Method not implemented');
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
        throw new Error('Method not implemented');
    }

    private assignment(ast: ValueStatement | string, exprCode: string): string {
        return `${typeof ast === 'string' ? ast : ast.assignTo ?? 'it'}=${exprCode};`;
    }

    visitSet(ast: Set): string {
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
        throw new Error('Method not implemented');
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
        return `${ast.function.accept(this)}(${ast.arguments.map(x => x.accept(this)).join(',')})`;
    }

    visitOfExpression(ast: OfExpression): string {
        return `${ast.root.accept(this)}${ast.referenceChain.map(x => x.type === ASTNodeType.Identifier ? `["${x.name}"]` : `[${x.accept(this)}]`).join('')}`;
    }

    visitIdentifier(ast: Identifier): string {
        // TODO: escape javascript keywords
        return ast.name;
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
