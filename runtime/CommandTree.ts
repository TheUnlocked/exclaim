export type Command<TMessage = any> = (message: TMessage, rest: string) => Promise<'failed-args' | undefined>;

export class CommandTree<TMessage = any> {
    private branches: { [name: string]: CommandTree<TMessage> | undefined } = {};
    command: Command<TMessage> | undefined;

    add(commandName: string, groupChain: string[], command: Command<TMessage>) {
        if (groupChain.length === 0) {
            const existing = this.branches[commandName];
            if (existing instanceof CommandTree) {
                existing.command = command;
            }
            else {
                const newTree = new CommandTree<TMessage>();
                newTree.command = command;
                this.branches[commandName] = newTree;
            }
        }
        else {
            const existing = this.branches[groupChain[0]];
            if (existing === undefined) {
                const newTree = new CommandTree<TMessage>();
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
