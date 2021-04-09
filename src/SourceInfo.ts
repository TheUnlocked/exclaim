import { ParseTree } from 'antlr4ts/tree/ParseTree';

export interface SourceInfo {
    file: string;
    ctx: ParseTree;
}
