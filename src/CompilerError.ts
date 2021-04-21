import { SourceInfo } from './parser/SourceInfo';

export enum ErrorType {
    InternalError = -1,
    LexError,
    ParseError,
    NoImportTemplateString,
    ExpressionCannotProduceBoolean,
    InvalidEscapeSequence,
    InvalidNumber,
    FileImportNotSupported,
    MultipleImplicitParameters,
    DuplicateParameterName,
    ShadowingMagicParameter,
    ShadowingLocal
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
