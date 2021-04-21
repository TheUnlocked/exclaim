import { ParseTree } from 'antlr4ts/tree/ParseTree';

export interface SourceInfo {
    file: string;
    // Usually `undefined` is preferred to `null`.
    // However, using `null` turns omission of the ctx field into an explicit choice and avoids accidental omission. 
    ctx: ParseTree | null;
}
