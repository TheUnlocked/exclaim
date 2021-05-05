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
