export default function debounce<TArgs extends [], TResult>(fn: (...args: TArgs) => Promise<TResult>, timeout: number) {
    let pendingPromises = [] as [(result: TResult) => void, (error: any) => void][];
    let pendingCall: TArgs | undefined;
    let currentTimer: NodeJS.Timeout | undefined;

    function debounced(...args: TArgs) {
        return new Promise<TResult>((resolve, reject) => {
            pendingPromises.push([resolve, reject]);
            pendingCall = args;
            if (currentTimer) {
                clearTimeout(currentTimer);
            }
            currentTimer = setTimeout(() => {
                flush();
            }, timeout);
        });
    }

    async function flush() {
        if (pendingCall) {
            try {
                const val = await fn(...pendingCall);
                await resolve(val);
                return val;
            }
            catch (e) {
                await reject(e);
                throw e;
            }
        }
    }

    function clear() {
        pendingPromises = [];
        pendingCall = undefined;
        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = undefined;
        }
    }

    /**
     * Clear the debounce with the provided value.
     */
    async function resolve(val: TResult) {
        await Promise.all(pendingPromises.map(promise => promise[0](val)));
        clear();
    }

    /**
     * Fail the debounce with the provided value.
     */
    async function reject(val: TResult) {
        await Promise.all(pendingPromises.map(promise => promise[1](val)));
        clear();
    }

    debounced.resolve = resolve;
    debounced.reject = reject;
    debounced.flush = flush;

    return debounced;
}
