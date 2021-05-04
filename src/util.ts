import STree from '@jayrbolton/suffix-tree';

// https://stackoverflow.com/a/50125960/4937286
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> = T extends Record<K, V> ? T : never;

export type SemiPartial<T, K extends keyof T> = T & { [Key in K]?: T[Key] };
export type SemiRequired<T, K extends keyof T> = T & { [Key in K]-?: T[Key] };

export function zip<T, U, V = [T, U]>(arr1: T[], arr2: U[], zipper?: (a: T, b: U) => V): V[] {
    const arr = new Array(Math.min(arr1.length, arr2.length));
    if (zipper === undefined) {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = { first: arr1[i], second: arr2[i] };
        }
    }
    else {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = zipper(arr1[i], arr2[i]);
        }
    }
    return arr;
}

export function optionToList<T>(...args: T[]): NonNullable<T>[] {
    return args.filter((x): x is NonNullable<T> => x != null);
}

export function partitionArray<T>(arr: T[], callback: (value: T, index: number, arr: T[]) => boolean): [T[], T[]] {
    const matches = [] as T[];
    const second = [] as T[];

    for (let i = 0; i < arr.length; i++) {
        if (callback(arr[i], i, arr)) {
            matches.push(arr[i]);
        }
        else {
            second.push(arr[i]);
        }
    }

    return [matches, second];
}

/** While this function should be safe, because of the use of `new Function()`,
 * is it discouraged to use this function with unsanitized user input. */
export function isValidVariableName(str: string) {
    // Avoid code injection (just in case)
    if (!/^[\p{L}\p{Nl}_$][\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}_$]*$/u.test(str)) {
        return false;
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(`let ${str}`)();
        return !(str in globalThis);
    }
    catch (e) {
        return false;
    }
}

const validFirstChars = '$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('');
const validChars = validFirstChars.concat('0123456789'.split(''));
export function* uniqueNamesIterator(str: string): Generator<string, string> {
    // Uses the algorithm described here: https://cs.stackexchange.com/a/39700

    const tree = STree.create(str);

    const queue = [] as { path: string, node?: STree.SNode }[];

    for (const char of validFirstChars) {
        if (tree.root.children[char]) {
            queue.push({ path: char, node: tree.root.children[char] });
        }
        else {
            yield char;
            queue.push({ path: char });
        }
    }

    while (true) {
        const next = queue.shift()!;
        const { path, node } = next;
        for (const char of validChars) {
            if (node?.children[char]) {
                queue.push({ path: path + char, node: node.children[char] });
            }
            else {
                yield path + char;
                queue.push({ path: path + char });
            }
        }
    }
}
export function uniqueNames(str: string, count: number) {
    const gen = uniqueNamesIterator(str);
    const arr = new Array(count) as string[];
    for (let i = 0; i < count; i++) {
        arr[i] = gen.next().value;
    }
    return arr;
}
