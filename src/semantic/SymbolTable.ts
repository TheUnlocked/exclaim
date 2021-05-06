import { Identifier } from '../parser/AST';

export type SymbolType = 'local' | 'temp' | 'data' | 'const';
export interface SymbolInfo {
    type: SymbolType;
    identifier: Identifier;
}

export class SymbolTable {
    parent: SymbolTable | undefined;
    private fields: { [varName: string]: SymbolInfo } = {};

    constructor(parent?: SymbolTable, providedFields?: SymbolInfo[]) {
        this.parent = parent;
        // Provided fields are forced to be added to the ST, even if a parent local ST contains a field with the same name.
        providedFields?.forEach(x => this.fields[x.identifier.name] = x);
    }

    /** Adding a field to a local ST will shadow fields in inherited global STs */
    addField(symbol: SymbolInfo): boolean {
        // If the field already exists in this or a higher local scope.
        if (this.getField(symbol.identifier)?.type === 'local') {
            return false;
        }
        this.fields[symbol.identifier.name] = symbol;
        return true;
    }

    /** Invariant: the identifier returned will be the FIRST identifier with the same name added to this symbol table */
    getField(ident: Identifier): SymbolInfo | undefined {
        if (ident.name in this.fields) {
            const mySymbol = this.fields[ident.name];
            // Has this variable been declared yet?
            // If it's not local, the answer must be yes.
            if (mySymbol.type !== 'local' || mySymbol.identifier.id <= ident.id) {
                return mySymbol;
            }
            // Note that we can fall past this if a local is defined in the same scope AFTER the reference,
            // thus avoiding hoisting locals and accidentally shadowing globals.
        }
        return this.parent?.getField(ident);
    }
}
