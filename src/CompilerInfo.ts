import { SymbolTable } from './semantic/SymbolTable';
import { uniqueName } from './util';

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
    last: x => `(x=>x[x.length-1])(${x})`,
    random: x => `(x=>x[Math.floor(Math.random()*x.length)])(${x})`
};

export const defaultParsers: ParsersMap = {
    json: x => `JSON.parse(${x})`,
    number: x => `(x=>{if(isNaN(x))throw new Error('Not a number!');return x;})(Number(${x}))`,
    integer: x => `(x=>{if(Math.floor(x)!==x)throw new Error('Not an integer!');return x;})(Number(${x}))`,
    boolean: x => `Boolean(${x})`,
    string: x => `String(${x})`
};
