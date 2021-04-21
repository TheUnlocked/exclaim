import { SymbolTable } from './SymbolTable';

export interface SemanticInfo {
    rootSymbolTable: SymbolTable;
    symbolTables: { [blockASTNodeId: number]: SymbolTable };
}
