import fs from 'fs/promises';
import { debounce } from 'debounce';
import { Client, Message, User } from 'discord.js';

type Command = (message: Message, rest: string) => Promise<'failed-args' | undefined>;

class Runtime {
    tokenVarName = 'token';
    prefixVarName = 'prefix';
    prefix = '!';

    client = new Client();

    persistent: Persistence = new Persistence();
    commands: CommandTree = new CommandTree();

    async start() {
        this.client.login(await this.persistent.get(this.tokenVarName));
        this.prefix = await this.persistent.get(this.prefixVarName);

        this.client.on('message', async msg => {
            if (msg.content.startsWith(this.prefix)) {
                let rest = msg.content.slice(this.prefix.length);
                let tree = this.commands;
                const viableCommands = [] as [command: Command, rest: string][];
                while (true) {
                    let index = rest.indexOf(' ');
                    const command = rest.slice(0, index);

                    while (rest[++index] === ' ');
                    rest = rest.slice(index);
                    
                    const nextTree = tree.find(command);
                    if (nextTree) {
                        tree = nextTree;
                        if (tree.command) {
                            viableCommands.push([tree.command, rest]);
                        }
                    }
                    else {
                        break;
                    }
                }
                // Attempt commands in order of greatest specificity
                for (const [command, rest] of viableCommands.reverse()) {
                    try {
                        // It's the command's responsibility to do argument handling
                        if (await command(msg, rest) !== 'failed-args') {
                            break;
                        }
                    }
                    catch (e) {
                        console.error(`Command failed on message id ${msg.id}`, e);
                        break;
                    }
                }
            }
        });
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
    // Won't try to reload from file if it already checked
    // file modification time in the last 5 seconds
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

    /** Avoid using this function and use `refreshIfNeeded` instead. */
    async refresh() {
        this.processSavedData(JSON.parse(await fs.readFile(this.CONFIG_PATH, {encoding: 'ascii'})));
        this.lastEdited = Date.now();
    }

    async refreshIfNeeded() {
        if (this.lastPolled + this.POLLING_RATE < Date.now()) {
            const stats = await fs.stat(this.CONFIG_PATH);
            
            // 2ms error window. Abs because we still want to capture edits made in the future.
            if (Math.abs(stats.mtime.getTime() - this.lastEdited) > 2) {
                // avoid races by immediately updating it
                this.lastEdited = stats.mtime.getTime();
                this.refresh();
            }
            this.lastPolled = Date.now();
        }
    }

    private debouncedCommit?: () => Promise<void>;
    /** Commits may be debounced and not guaranteed to run shortly after invocation */
    async commit() {
        this.debouncedCommit ??= debounce(async () => {
            const data = Object.fromEntries(Object.entries(this.data).map(([name, v]) => [name, v.data]));
            await fs.writeFile(this.CONFIG_PATH, JSON.stringify(data));
            this.lastEdited = Date.now();
        }, 1000, false);
        await this.debouncedCommit();
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

    async get(varName: string) {
        await this.refreshIfNeeded();
        return this.data[varName].data;
    }
}

class CommandTree {
    private branches: { [name: string]: CommandTree | undefined } = {};
    command: Command | undefined;

    add(commandName: string, groupChain: string[], command: Command) {
        if (groupChain.length === 0) {
            const existing = this.branches[commandName];
            if (existing instanceof CommandTree) {
                existing.command = command;
            }
            else {
                const newTree = new CommandTree();
                newTree.command = command;
                this.branches[commandName] = newTree;
            }
        }
        else {
            const existing = this.branches[groupChain[0]];
            if (existing === undefined) {
                const newTree = new CommandTree();
                newTree.add(commandName, groupChain.slice(1), command);
                this.branches[groupChain[0]] = newTree;
            }
            else {
                existing.add(commandName, groupChain.slice(1), command);
            }
        }
    }

    find(name: string) {
        return this.branches[name];
    }
}

export const $runtime = new Runtime();