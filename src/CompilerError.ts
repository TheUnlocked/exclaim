import { SourceInfo } from './SourceInfo';

export enum ErrorType {
    LexError,
    ParseError,
    NoImportTemplateString,
    ExpressionCannotProduceBoolean,
    InvalidEscapeSequence,
    InvalidNumber
}

export class CompilerError extends Error {
    type: ErrorType;
    source: SourceInfo;
    message: string;

    constructor(type: ErrorType, source: SourceInfo, message: string) {
        super(message);
        this.type = type;
        this.source = source;
        this.message = message;
    }
}
