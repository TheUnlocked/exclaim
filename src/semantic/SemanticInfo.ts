import { SymbolTable } from './SymbolTable';

export interface SemanticInfo {
    symbolTables: { [blockASTNodeId: number]: SymbolTable };
}
