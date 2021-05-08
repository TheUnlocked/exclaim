import { SymbolTable } from './semantic/SymbolTable';

export type EventsMap = { [event: string]: string[] };
/**
 * Mappings from collection expressions to indexes
 */
export type DistributionsMap = { [distribution: string]: (collectionExpr: string) => string };

type ParserMapEntry = { test?: (expr: string) => string, parse?(expr: string): string } | { test: 'try-parse', parse(expr: string): string };
export type ParserMap = { [type: string]: ParserMapEntry };

export interface CompilerOptions {
    events?: EventsMap;
    distributions?: DistributionsMap;
    parsers?: ParserMap;
}

export class CompilerInfo {
    rootSymbolTable?: SymbolTable;
    symbolTables: { [blockASTNodeId: number]: SymbolTable } = {};

    events: EventsMap;
    distributions: DistributionsMap;
    parsers: ParserMap;

    constructor(options?: CompilerOptions) {
        this.events = options?.events ?? defaultEvents;
        this.distributions = options?.distributions ?? defaultDistributions;
        this.parsers = options?.parsers ?? defaultParsers;
    }
}

export const defaultEvents: EventsMap = {};

export const defaultDistributions: DistributionsMap = {
    first: () => '0',
    last: x => `${x}.length-1`,
    random: x => `Math.floor(Math.random()*${x}.length)`
};

export const defaultParsers: ParserMap = {
    json: {
        test: 'try-parse',
        parse: x => `JSON.parse(${x})`
    },
    number: {
        test: x => `(typeof ${x}==='number')`,
        parse: x => `(x=>{if(isNaN(x))throw new Error('Not a number!');return x;})(Number(${x}))`
    },
    integer: {
        test: x => `(x=>Math.floor(x)!==x)(${x})`,
        parse: x => `(x=>{if(Math.floor(x)!==x)throw new Error('Not an integer!');return x;})(Number(${x}))`
    },
    boolean: {
        test: x => `(typeof ${x}==='boolean')`,
        parse: x => `Boolean(${x})`
    },
    string: {
        test: x => `(typeof ${x}==='string')`,
        parse: x => `String(${x})`
    },
    function: {
        test: x => `(typeof ${x}==='function')`
    },
    symbol: {
        test: x => `(typeof ${x}==='symbol')`
    },
    null: {
        test: x => `(${x}===null)`
    },
    undefined: {
        test: x => `(${x}===undefined)`
    },
    bigint: {
        test: x => `(typeof ${x}==='bigint')`,
        parse: x => `BigInt(${x})`
    }
};
