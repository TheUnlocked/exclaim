import { SourceInfo } from './parser/SourceInfo';

export enum ErrorType {
    InternalError = -1,
    LexError,
    ParseError,
    NoImportTemplateString,
    ExpressionCannotProduceBoolean,
    // InvalidEscapeSequence,
    InvalidNumberSyntax,
    FileImportNotSupported,
    MultipleImplicitParameters,
    DuplicateParameterName,
    ShadowingMagicParameter,
    ShadowingLocal,
    AssignToConst,
    GetsDataTemp,
    SetToLocal,
    UndefinedVariable,
    UndefinedDistribution,
    UndefinedParser,
    UnknownImportFileType,
    AsyncInFunctionName
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

export enum ErrorSeverity {
    Info = 0,
    Warning = 1,
    Error = 2
}

export function severityToString(severity: ErrorSeverity) {
    switch (severity) {
        case ErrorSeverity.Error:
            return 'ERROR';
        case ErrorSeverity.Warning:
            return 'WARN';
        case ErrorSeverity.Info:
            return 'INFO';
    }
    // eslint wants this
    return 'ERROR';
}

export type ErrorSeverities = { [Type in ErrorType]: ErrorSeverity };

export const defaultErrorSeverities: ErrorSeverities = {
    [ErrorType.InternalError]: ErrorSeverity.Error,
    [ErrorType.LexError]: ErrorSeverity.Error,
    [ErrorType.ParseError]: ErrorSeverity.Error,
    [ErrorType.NoImportTemplateString]: ErrorSeverity.Error,
    [ErrorType.ExpressionCannotProduceBoolean]: ErrorSeverity.Error,
    // [ErrorType.InvalidEscapeSequence]: ErrorSeverity.Error,
    [ErrorType.InvalidNumberSyntax]: ErrorSeverity.Error,
    [ErrorType.FileImportNotSupported]: ErrorSeverity.Error,
    [ErrorType.MultipleImplicitParameters]: ErrorSeverity.Error,
    [ErrorType.DuplicateParameterName]: ErrorSeverity.Error,
    [ErrorType.ShadowingMagicParameter]: ErrorSeverity.Warning,
    [ErrorType.ShadowingLocal]: ErrorSeverity.Warning,
    [ErrorType.AssignToConst]: ErrorSeverity.Error,
    [ErrorType.GetsDataTemp]: ErrorSeverity.Error,
    [ErrorType.SetToLocal]: ErrorSeverity.Error,
    [ErrorType.UndefinedVariable]: ErrorSeverity.Error,
    [ErrorType.UndefinedDistribution]: ErrorSeverity.Warning,
    [ErrorType.UndefinedParser]: ErrorSeverity.Warning,
    [ErrorType.UnknownImportFileType]: ErrorSeverity.Error,
    [ErrorType.AsyncInFunctionName]: ErrorSeverity.Error
};
