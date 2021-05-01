import { ParserRuleContext } from 'antlr4ts';

export interface SourceInfo {
    file: string;
    // Usually `undefined` is preferred to `null`.
    // However, using `null` turns omission of the ctx field into an explicit choice and avoids accidental omission. 
    ctx: ParserRuleContext | { line: number, column: number } | null;
}
