import { partitionArray } from '../src/util';

export function updateObject(original: any, updated: any): boolean {
    let didUpdate = false;

    const originalProps = Object.getOwnPropertyNames(original);
    const updatedProps = Object.getOwnPropertyNames(updated);
    const [maybeModified, added] = partitionArray(updatedProps, x => x in original);
    const deleted = originalProps.filter(x => !(x in updated));

    for (const prop of added) {
        original[prop] = updated[prop];
        didUpdate = true;
    }
    for (const prop of deleted) {
        delete original[prop];
        didUpdate = true;
    }
    for (const prop of maybeModified) {
        const originalVal = original[prop];
        const newVal = updated[prop];
        if (typeof originalVal !== typeof newVal) {
            original[prop] = newVal;
            didUpdate = true;
        }
        else if (typeof newVal === 'object') {
            didUpdate ||= updateObject(originalVal, newVal);
        }
        else if (originalVal !== newVal) {
            original[prop] = newVal;
            didUpdate = true;
        }
    }

    return didUpdate;
}
