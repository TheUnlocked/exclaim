import { SourceInfo } from "./SourceInfo";

export enum ErrorType {
    NoImportTemplateString,
    ExpressionCannotProduceBoolean
}

export interface CompilerError {
    type: ErrorType;
    source: SourceInfo;
    message: string;
}