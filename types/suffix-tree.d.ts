declare module '@jayrbolton/suffix-tree' {
    interface STree {
        activeNode: SNode;
        root: SNode;
        left: number;
        right: number;
        idx: number;
        lastID: number;
        strings: { [id: number]: string };
        skip: number;
        text: string[];
        _tag: 'STree';
    }
    interface SNode {
        start: number;
        children: { [char: string]: SNode };
        id: number;
        parent: SNode;
    }

    function create(str?: string): STree;

    function add(str: string, tree: STree): STree;
    function addSingle(char: number | string, tree: STree): STree;

    function format(tree: STree): string;

    function getStringByIndex(idx: number, tree: STree): string;
    function findSuffix(suffix: string, tree: STree): number[];
    function allSuffixes(tree: STree): string[];
}
