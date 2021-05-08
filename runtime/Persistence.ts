import fs from 'fs/promises';
import writeFile from 'write-file-atomic';
import path from 'path';
import debounce from './debounce';
import { updateObject } from './util';

export type PersistenceEntry = {
    data: any,
    default: any,
    /**
     * `updateCallback` may be called arbitrarily, even when no change occurs and no method is invoked.
     * If change verification is required, it should be performed by the listener.
     */
    updateCallback: (newVal: any) => void
};

export class Persistence {
    // Won't try to reload from file if it already checked
    // file modification time in the last 5 seconds
    private readonly POLLING_RATE = 5000;
    private readonly CONFIG_PATH = './config.json';

    private lastPolled: number = -1;
    private lastEdited: number = -1;
    private data: { [name: string]: PersistenceEntry } = {};

    get configPath() {
        return path.resolve(__dirname, this.CONFIG_PATH);
    }

    private processSavedData(data: any, except?: string) {
        // eslint-disable-next-line guard-for-in
        for (const varName in this.data) {
            if (varName === except) continue;
            const entry = this.data[varName];
            if (varName in data) {
                const originalVal = entry.data;
                const newVal = data[varName];
                if (typeof originalVal !== typeof newVal) {
                    entry.data = newVal;
                    entry.updateCallback(entry.data);
                }
                else if (newVal instanceof Array) {
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
    async refresh(except?: string) {
        try {
            this.processSavedData(JSON.parse(await fs.readFile(this.configPath, { encoding: 'utf-8' })), except);
            this.lastEdited = Date.now();
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                await this.commitNow();
            }
            else {
                console.error(`${this.CONFIG_PATH} is corrupted or otherwise unreadable. Fix it or delete it.`);
            }
        }
    }

    async refreshIfNeeded(except?: string) {
        if (this.lastPolled + this.POLLING_RATE < Date.now()) {
            try {
                const stats = await fs.stat(this.configPath);

                // 2ms error window. Abs because we still want to capture edits made in the future.
                if (Math.abs(stats.mtime.getTime() - this.lastEdited) > 2) {
                    // avoid races by immediately updating it
                    this.lastEdited = stats.mtime.getTime();
                    this.refresh(except);
                }
                this.lastPolled = Date.now();
            }
            catch (e) {
                await this.commitNow();
            }
        }
    }

    debouncedCommit = debounce(async () => {
        const data = Object.fromEntries(Object.entries(this.data).map(([name, v]) => [name, v.data]));
        try {
            await writeFile(this.configPath, JSON.stringify(data, null, 4), { encoding: 'utf-8' });
            this.lastEdited = Date.now();
        }
        catch (e) {
            console.error(`${this.CONFIG_PATH} cannot be written to.`);
        }
    }, 1000);

    /**
     * This should only be run when saving persistent data is urgent and must be synchronous, such as following an exit event.
     *
     * @param urgent If true, skip resolving promises. This should only be used if the program is about to exit, as it could result in breaking control flow otherwise.
     */
    commitNowSync(urgent = false) {
        const data = Object.fromEntries(Object.entries(this.data).map(([name, v]) => [name, v.data]));
        try {
            writeFile.sync(this.configPath, JSON.stringify(data, null, 4), { encoding: 'utf-8' });
            this.lastEdited = Date.now();
        }
        catch (e) {
            console.error(`${this.CONFIG_PATH} cannot be written to.`);
        }
        if (!urgent) {
            this.debouncedCommit.resolve();
        }
    }

    async commitNow() {
        this.debouncedCommit();
        await this.debouncedCommit.flush();
    }

    /**
     * Because commits may be debounced, awaiting is discouraged if the following code requires any degree of urgency.
     * If awaited, control flow will only resume once the debounced call has completed.
     */
    commit() {
        return this.debouncedCommit();
    }

    async declare(varName: string, value: any, onUpdate: (newVal: any) => void) {
        this.data[varName] = {
            data: value,
            default: value,
            updateCallback: onUpdate
        };
        onUpdate(value);
        await this.refresh();
    }

    async declareAll(vars: [varName: string, value: any, onUpdate: (newVal: any) => void][]) {
        for (const [varName, value, onUpdate] of vars) {
            this.data[varName] = {
                data: value,
                default: value,
                updateCallback: onUpdate
            };
            onUpdate(value);
        }
        await this.refresh();
    }

    /** Issues callback synchronously, saves asynchronously */
    async set(varName: string, value: any) {
        this.data[varName].updateCallback(value);
        this.data[varName].data = value;
        await this.refreshIfNeeded(varName);
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
        return this.data[varName]?.data;
    }

    async has(varName: string) {
        await this.refreshIfNeeded();
        return varName in this.data;
    }
}
