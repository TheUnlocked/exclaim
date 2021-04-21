import { Identifier } from '../parser/AST';

type SymbolType = 'local' | 'global';

export class SymbolTable {
    type: SymbolType;

    parent: SymbolTable | undefined;
    private fields: { [varName: string]: Identifier } = {};

    constructor(parent?: SymbolTable, providedFields?: Identifier[], type: SymbolType = 'local') {
        this.parent = parent;
        this.type = type;
        providedFields?.forEach(x => this.fields[x.name] = x);
    }

    /** Adding a field to a local ST will shadow fields in inherited global STs */
    addField(ident: Identifier): boolean {
        // If the field already exists in this or a higher local scope. 
        if (this.getField(ident)?.type === 'local') {
            return false;
        }
        this.fields[ident.name] = ident;
        return true;
    }

    /** Invariant: the identifier returned will be the FIRST identifier with the same name added to this symbol table */
    getField(ident: Identifier): { type: SymbolType, identifier: Identifier } | undefined {
        if (ident.name in this.fields) {
            const myIdent = this.fields[ident.name];
            // Has this variable been declared yet?
            // If it's global, the answer must be yes.
            if (this.type === 'global' || myIdent.id < ident.id) {
                return { type: this.type, identifier: myIdent };
            }
            // Note that we can fall past this if a local is defined in the same scope AFTER the reference,
            // thus avoiding hoisting locals and accidentally shadowing globals. 
        }
        return this.parent?.getField(ident);
    }
}
