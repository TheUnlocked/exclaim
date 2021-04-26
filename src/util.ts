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

/** While this function should be safe, because of the use of `eval`, is it discouraged to use this function with unsanitized user input. */
export function isValidVariableName(str: string) {
    // Avoid code injection (just in case)
    if (!/^[\p{L}\p{Nl}_$][\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}_$]*$/u.test(str)) {
        return false;
    }
    try {
        eval(`let ${str};`);
        return !(str in globalThis);
    }
    catch (e) {
        return false;
    }
}