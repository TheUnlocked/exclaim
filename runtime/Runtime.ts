import fs from 'fs/promises';

class Runtime {
    persistent: Persistence = new Persistence();

    commands: CommandTrie = new CommandTrie();

    start() {

    }
}

function partitionArray<T>(arr: T[], callback: (value: T, index: number, arr: T[]) => boolean): [T[], T[]] {
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

function updateObject(original: any, updated: any): boolean {
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

type PersistenceEntry = {
    data: any,
    default: any,
    /**
     * `updateCallback` may be called arbitrarily, even when no change occurs and no method is invoked.
     * If change verification is required, it should be performed by the listener.
     */
    updateCallback: (newVal: any) => void
};

class Persistence {
    // 5 seconds
    private readonly POLLING_RATE = 5000;
    private readonly CONFIG_PATH = './config.json';

    private lastPolled: number = -1;
    private lastEdited: number = -1;
    private data: { [name: string]: PersistenceEntry } = {};
    
    private processSavedData(data: any) {
        for (const varName in this.data) {
            const entry = this.data[varName];
            if (varName in data) {
                const originalVal = entry.data;
                const newVal = data[varName];
                if (typeof originalVal !== typeof newVal) {
                    entry.data = newVal;
                    entry.updateCallback(entry.data);
                }
                else if (typeof newVal === 'object') {
                    if (updateObject(originalVal, newVal)) {
                        entry.updateCallback(entry.data);
                    }
                }
                else if (originalVal !== newVal) {
                    entry.data = newVal;
                    entry.updateCallback(entry.data);
                }
            }
            else {
                entry.data = entry.default;
                entry.updateCallback(entry.data);
            }
        }
    }

    async refresh() {
        this.processSavedData(JSON.parse(await fs.readFile(this.CONFIG_PATH, {encoding: 'ascii'})));
        this.lastEdited = Date.now();
    }

    async refreshIfNeeded() {
        if (this.lastPolled + this.POLLING_RATE < Date.now()) {
            const stats = await fs.stat(this.CONFIG_PATH);
            
            // 2ms error window. We still want to capture edits made in the past.
            if (Math.abs(stats.mtime.getTime() - this.lastEdited) > 2) {
                // avoid races by immediately updating it
                this.lastEdited = stats.mtime.getTime();
                this.refresh();
            }
            this.lastPolled = Date.now();
        }
    }

    async commit() {
        const data = Object.fromEntries(Object.entries(this.data).map(([name, v]) => [name, v.data]));
        await fs.writeFile(this.CONFIG_PATH, JSON.stringify(data));
        this.lastEdited = Date.now();
    }

    async declare(varName: string, value: any, onUpdate: (newVal: any) => void, pushChanges = true) {
        this.data[varName] = {
            data: undefined,
            default: value,
            updateCallback: onUpdate
        };
        if (pushChanges) {
            await this.refreshIfNeeded();
        }
    }

    async declareAll(vars: [varName: string, value: any, onUpdate: (newVal: any) => void][]) {
        for (const varDecl of vars) {
            await this.declare(...varDecl, false);
        }
        await this.refreshIfNeeded();
    }

    /** Issues callback synchronously, saves asynchronously */
    async set(varName: string, value: any) {
        this.data[varName].updateCallback(value);
        await this.refreshIfNeeded();
        this.data[varName].data = value;
        await this.commit();
    }

    /**
     * Issues callback synchronously, saves asynchronously
     * 
     * Other fields may be temporarily out of date from config on disk
    */
    async setNested(varName: string, referenceChain: (string | number)[], value: any) {
        let target = this.data[varName].data;
        for (let i = 0; i < referenceChain.length - 2; i++) {
            target = target[referenceChain[i]];
        }
        target[referenceChain[referenceChain.length - 1]] = value;
        this.data[varName].updateCallback(this.data[varName].data);

        await this.refreshIfNeeded();
        target = this.data[varName].data;
        for (let i = 0; i < referenceChain.length - 2; i++) {
            target = target[referenceChain[i]];
        }
        target[referenceChain[referenceChain.length - 1]] = value;
        this.data[varName].updateCallback(this.data[varName].data);

        await this.commit();
    }
}

type Command = () => void;
class CommandTrie {
    private commandTable: { [name: string]: Command | CommandTrie | undefined } = {};
    
    add(commandName: string, groupChain: string[], command: Command) {
        if (groupChain.length === 0) {
            const existing = this.commandTable[commandName];
            if (existing instanceof CommandTrie) {
                existing.add('', [], command);
            }
            else {
                this.commandTable[commandName] = command;
            }
        }
        else {
            const existing = this.commandTable[groupChain[0]];
            if (existing instanceof CommandTrie) {
                existing.add(commandName, groupChain.slice(1), command);
            }
            else if (existing === undefined) {
                const newTrie = new CommandTrie();
                newTrie.add(commandName, groupChain.slice(1), command);
                this.commandTable[groupChain[0]] = newTrie;
            }
            else {
                const newTrie = new CommandTrie();
                newTrie.add(groupChain[0], [], existing);
                newTrie.add(commandName, groupChain.slice(1), command);
                this.commandTable[groupChain[0]] = newTrie;
            }
        }
    }

    find(name: string) {
        return this.commandTable[name];
    }

    findCommand(commandName: string, groupChain: string[]): Command | undefined {
        if (groupChain.length === 0) {
            const found = this.find(commandName);
            return found instanceof CommandTrie ? found.find('') as Command | undefined : found;
        }
        const found = this.find(groupChain[0]);
        if (found instanceof CommandTrie) {
            return found?.findCommand(commandName, groupChain.slice(1));
        }
        return undefined;
    }
}

export const $runtime = new Runtime();