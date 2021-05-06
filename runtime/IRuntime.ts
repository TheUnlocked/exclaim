import { Persistence } from './Persistence';
import { CommandTree } from './CommandTree';
import { Events } from './Events';

export interface IRuntime<TMessage = any, TChannel = any, TEmoji = any> {
    readonly platform: string;

    persistent: Persistence;
    commands: CommandTree<TMessage>;
    events: Events;

    start(): Promise<void>;
    notifySet(varName: string, newValue: any): void;
    sendMessage(channel: TChannel, message: any): Promise<TMessage>;
    reactToMessage(message: TMessage, emote: TEmoji): Promise<void>;

    runDistribution(distribution: string, value: any[]): any;
    /** Throw on failure */
    runParser(parser: string, value: any): any;
}
