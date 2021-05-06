export class Events {
    private eventListeners: { [eventName: string]: ((...args: any[]) => void)[] } = {};

    register(eventName: string, listener: (...args: any[]) => void) {
        if (eventName in this.eventListeners) {
            this.eventListeners[eventName].push(listener);
        }
        else {
            this.eventListeners[eventName] = [listener];
        }
    }

    deregister(eventName: string, listener: (...args: any[]) => void) {
        if (eventName in this.eventListeners) {
            const index = this.eventListeners[eventName].indexOf(listener);
            if (index >= 0) {
                this.eventListeners[eventName].splice(index, 1);
                return true;
            }
        }
        return false;
    }

    dispatch(eventName: string, ...args: any[]) {
        if (eventName in this.eventListeners) {
            for (const listener of this.eventListeners[eventName]) {
                listener(...args);
            }
        }
    }
}
