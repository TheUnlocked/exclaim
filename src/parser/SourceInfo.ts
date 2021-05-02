import { ParserRuleContext } from 'antlr4ts';

export interface SourceInfo {
    file: string;
    // Usually `undefined` is preferred to `null`.
    // However, using `null` turns omission of the ctx field into an explicit choice and avoids accidental omission.
    ctx: ParserRuleContext | { line: number, column: number } | null;
}

export function sourceInfoToString(info: SourceInfo) {
    if (info.ctx instanceof ParserRuleContext) {
        return `${info.ctx.start.line}:${info.ctx.start.charPositionInLine} in ${info.file}`;
    }
    return `${info.ctx?.line}:${info.ctx?.column} in ${info.file}`;
}
