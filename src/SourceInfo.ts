import { ParserRuleContext } from "antlr4ts";

export interface SourceInfo {
    file: string;
    ctx: ParserRuleContext;
}