import { SymbolTable } from './semantic/SymbolTable';
import { uniqueNames } from './util';

export type EventsMap = { [event: string]: string[] };
export type DistributionsMap = { [distribution: string]: (collectionExpr: string) => string };
export type ParsersMap = { [type: string]: (expr: string) => string };

export interface CompilerOptions {
    events?: EventsMap;
    distributions?: DistributionsMap;
    parsers?: ParsersMap;
}

export class CompilerInfo {
    rootSymbolTable?: SymbolTable;
    symbolTables: { [blockASTNodeId: number]: SymbolTable } = {};

    events: EventsMap;
    distributions: DistributionsMap;
    parsers: ParsersMap;

    constructor(options?: CompilerOptions) {
        this.events = options?.events ?? defaultEvents;
        this.distributions = options?.distributions ?? defaultDistributions;
        this.parsers = options?.parsers ?? defaultParsers;
    }
}

export const defaultEvents: EventsMap = {};

export const defaultDistributions: DistributionsMap = {
    first: x => `${x}[0]`,
    last: x => (([name]) => `(${name}=>${name}[${name}.length-1])(${x})`)(uniqueNames(x, 1)),
    random: x => (([name]) => `(${name}=>${name}[Math.floor(Math.random()*${name}.length)])(${x})`)(uniqueNames(x, 1))
};

export const defaultParsers: ParsersMap = {
    json: x => `JSON.parse(${x})`,
    number: x => `Number(${x})`,
    boolean: x => `Boolean(${x})`,
    string: x => `String(${x})`
};
