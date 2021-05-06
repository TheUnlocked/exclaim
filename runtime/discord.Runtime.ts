import { Channel, Client, DMChannel, EmojiResolvable, Message, NewsChannel, TextChannel } from 'discord.js';
import { Command, CommandTree, Events, IRuntime, Persistence } from './common';

class Runtime implements IRuntime<Message, Channel, EmojiResolvable> {
    readonly platform = 'discord';

    private tokenVarName = 'token';
    private prefixVarName = 'prefix';

    private prefix = '!';
    private token: string = '';

    private client!: Client;

    persistent: Persistence = new Persistence();
    commands: CommandTree<Message> = new CommandTree();
    events: Events = new Events();

    async start() {
        process.on('exit', () => {
            this.persistent.commitNowSync(true);
        });

        this.client = new Client();
        this.loadEvents();

        if (!this.token) {
            await this.persistent.declare(this.tokenVarName, '', x => this.notifySet(this.tokenVarName, x));
        }

        if (!this.token) {
            console.error('Provide a bot token in config.json.');
            process.exit();
        }
        await this.client.login(this.token);
        console.log(`Started at ${new Date()}`);
    }

    /** This must be called whenever a temp or data variable is set */
    notifySet(varName: string, newValue: any) {
        switch (varName) {
            case this.tokenVarName: this.token = `${newValue}`; break;
            case this.prefixVarName: this.prefix = `${newValue}`; break;
        }
    }

    private loadEvents() {
        this.client.on('message', async msg => {
            const prefix = this.prefix;

            if (!msg.author.bot && msg.content.startsWith(prefix)) {
                let rest = msg.content.slice(prefix.length);
                let tree = this.commands;
                const viableCommands = [] as [command: Command, rest: string][];
                while (true) {
                    let index = rest.indexOf(' ');
                    index = index < 0 ? rest.length : index;
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
                        // eslint-disable-next-line no-await-in-loop
                        if (await command(msg, rest) !== 'failed-args') {
                            break;
                        }
                    }
                    catch (e) {
                        if (e !== 'handled' && !e.message.startsWith('Intentionally failed')) {
                            console.error(`Command unexpectedly failed on message id ${msg.id}:\n`, e);
                        }
                        break;
                    }
                }
            }
        });
    }

    runDistribution(distribution: string, value: any[]) {
        throw new Error(`${distribution} is not a valid distribution.`);
    }

    runParser(parser: string, value: any) {
        throw new Error(`${parser} is not a valid parser.`);
    }

    getChannelFromMessage(message: Message) {
        return message.channel;
    }

    async sendMessage(channel: Channel | string, message: any) {
        if (typeof channel === 'string') {
            channel = await this.client.channels.fetch(channel);
        }
        if (channel instanceof TextChannel || channel instanceof DMChannel) {
            return channel.send(`${message}`);
        }
        throw new Error(`Failed to send message to channel ${channel.id}.`);
    }

    async reactToMessage(channelIfNeeded: Channel, message: Message | string, emote: EmojiResolvable) {
        if (typeof message === 'string') {
            message = await (channelIfNeeded as TextChannel | DMChannel | NewsChannel).messages.fetch(message);
        }
        const emoji = this.client.emojis.resolve(emote);
        if (emoji) {
            await message.react(emoji);
        }
        else {
            throw new Error(`Failed to find emoji ${emote}.`);
        }
    }
}

export default new Runtime();