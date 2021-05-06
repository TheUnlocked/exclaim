# Exclaim! Language

Exclaim! is a domain-specific langauge for the purpose of rapid and easy development of text bots that demand a common but constrained set of behaviors for chat services such as Discord. This repository includes a compiler for Exclaim! as well as a Discord runtime.

## Why Exclaim!?

### Major Features

* Reduced boilerplate
    * There is a large amount of boilerplate involved with writing a bot to perform even the most basic tasks, most of which has been offloaded to the runtime and does not need to be written by the developer.
* Low-effort commands
    * Prefix-style commands can be declared with a simple syntax that allows accepting arguments to commands, and command groups allow for multi-word commands which can overload shorter commands that take arguments. Implementing this by hand can be tricky, but Exclaim! handles it automatically.
* Low-effort persistent data
    * Persistent data can be declared with zero configuration using the `data` keyword, and changes will be written to and read from file routinely to ensure data consistency.
* Low-effort asynchronicity
    * Exclaim! is fully asynchronous and won't get blocked waiting for IO or networking to complete (note that this requires runtime compliance, but runtimes are supposed to avoid blocking and the provided Discord runtime obeys this).
* In-line JavaScript embedding
    * While Exclaim! provides langauge mechanisms for computing simple expressions, often this will not be enough. Rather than attempting to give Exclaim! the full expressiveness of a general purpose language, Exclaim! instead allows the user to embed JavaScript directly in-line.
* JavaScript importing
    * For more complex behavior, Exclaim! allows for importing functions and objects from JavaScript files.
* Multiple target platforms
    * While only a Discord runtime has been implemented so far, in theory, the same Exclaim! code can be used for any number of runtimes running bots on any number of different target platforms as long as the code doesn't depend on runtime-specific features.

### Why not Exclaim!?

Exclaim! is not suited for all projects. Due to the ability to embed arbitrary JavaScript, it is theoretically possible to write bots that perform any behavior you want, but it is not necessarily ergonomic to do so in all cases. When Exclaim! does not fit the set of behaviors your bot requires, you SHOULD NOT use Exclaim!. In a similar vein, if you are beginning to write more Exclaim! code to perform a task than you would if you were implementing the bot from scratch in a general purpose language, you SHOULD NOT use Exclaim!.

### Use alongside JavaScript

Because of the ability of Exclaim! to import JavaScript modules, it may make sense in some cases to use Exclaim! to implement simpler features while implementing more complex and specialized features by hand in JavaScript.

It is also possible to integrate with Exclaim! runtimes without using the Exclaim! language. Some developers may find this preferable to using the language and to writing boilerplate by hand. However, keep in mind that some parts of the Exclaim! runtime API are designed under the assumption that the runner will handle certain tasks on its own (e.g. command argument parsing) and that certain features will notify the runtime when they are invoked (e.g. setting a `temp` or `data` variable). Before considering this approach, developers should first familiarize themselves with how the Exclaim! language and runtime communicate normally.

## How to use

### Things you need before you start

* [NodeJS](https://nodejs.org/en/)
    * NodeJS 14 may work, but I would recommend installing version 16+ instead.

#### If you want to build the compiler

* Java Runtime Environment (JRE) 1.8+. JDK 1.8+ includes this.

### Building

If you are using a pre-bundled distribution of the compiler and runtime, you can skip this step.

1. Clone (or download and unzip) the git repository.
2. Navigate to the root directory of the git repository.
3. Run `npm install`.

<details>
  <summary>I want to build both the runtime and the compiler</summary>
  
  4. Run `npm run install:runtime`.
  5. Run `npm run bundle:full`.
  6. The bundled compiler and runtime should be located in the `bundle` directory with the names `exclaim.js` and `Runtime.js` respectively.

</details>

<details>
  <summary>I just want to build the compiler</summary>
  
  **I want to bundle the compiler (Recommended)**
  
  4. Run `npm run pre-build`.
  5. Run `npm run bundle:cli`.
  6. The CLI tool should be located at `bundle/exclaim.js`.
  
  **I want to build the compiler to loose files (Developer)**
  
  4. Run `npm run build:full`.
  5. The CLI tool entry point should be located at `build/cli/main.js`.

</details>

<details>
  <summary>I just want to build the runtime</summary>

  4. Run `npm run install:runtime`.
  5. Run `npm run bundle:runtime`.
  6. The runtime should be located at `bundle/Runtime.js`.

</details>

### Running the compiler

Run `node exclaim.js` with various command line arguments.

```
Usage: node exclaim [options] <[-f|--file] entry-file>

Options:
    -f, --file              The source file to compile.
    -o, --out               The file to write the compiled output to.
                            It is recommended to make the file extension .mjs so that node will run it properly.
                            If omitted, the output will be written to stdout.
    -w, --warn-is-error     Treat warnings as errors. (default: false)
    --bypass-errors         Prevent compiler errors from stopping compilation when possible. (default: false)
                            Errors will still be printed according to the verbosity level if -o is provided.
    -v, --verbosity <info|warn|error>
                            Sets the verbosity level. (default: warn)
                            Any output will halt compilation if -o is not provided.
    -h, -?, --help          Prints this help screen and exits.
```

### Setting up a discord bot

This site has a great tutorial on creating a bot account: [https://discordpy.readthedocs.io/en/stable/discord.html]()

However, if you'd prefer to stay on this readme, here are the instructions:

1. Create a Discord account at [https://discord.com]() if you do not have one already.
2. Navigate to [https://discord.com/developers/applications]().
3. Click "New Application" and give your bot a name.
4. Navigate to the "Bot" tab on the left.
5. Click "Add Bot" and confirm. Once you have done this, you may wish to disable "public bot" for testing.

Notice the "Copy" button under "Token". You will use this button to retrieve your token when running the bot. **Do not share this token with anyone.**

6. Navigate to the "OAuth2" tab on the left.
7. Under "OAuth2 URL Generator", tick the "bot" checkbox.
8. Under "Bot Permissions", tick checkboxes for whichever permissions you need your bot to have access to. "Send Messages" is an important one, and "Add Reactions" may be useful as well.
9. Copy and paste the URL into your browser. This will let you add a bot to a server you have the "Manage Server" permissions for. If you don't have any such servers, you can always create a new server in the Discord client under "Add a Server" on the left and then "Create My Own".
10. Once you have selected the server, press "Continue" and then press "Authorize".

### Running compiled code

To run compiled code, run `node my_compiled_program.mjs` in the same directory as a bundled `Runtime.js` file. Make sure that the file extension of your compiled program is `.mjs`, or it WILL NOT WORK. This is a limitation of Node rather than a limitation of the runtime.

The first time you run your program, it will automatically generate a `config.json` file and prompt you to input your bot token. Place your bot token into the `token` field in `config.json` and re-run the program.

## Samples

A variety of samples are included in the samples directory.
 

## Todo

### Requires implementation

* None right now!

### Requires design

* `... in ...` syntax to perform an action in a specific channel (e.g. `send ... in ...`).
* Command permissions syntax, including restricting channels.
* A variety of other actions, particularly surrounding moderation (and how many of these fall within the scope of Exclaim!?).
    * find message, channel, user, etc.
    * edit message
    * delete message, reaction, etc.
    * create channel, roles, invite, etc.
    * assign roles
    * ban/kick
    * nick
    * etc.
* Automatic sanitization (e.g. to avoid @everyone injection)
* Some try-catch mechanism ("else anywhere"?)
* Mechanism to await asynchronous actions, e.g. send (`wait for ...`?)
    * Note that `send` already has a mechanism for doing this, but it requires sending it to a variable.
* Mechanism for determining whether the runtime supports a particular feature (e.g. not all platforms have channels, allow reacting, etc.).
* Serialization and deserialization for special types stored in `data` variables.

### Design issues/questions

* Weird that channel information needs to be passed to runtime for some APIs when some platforms may not have a concept of channels.
    * Send `$context` object instead and let the runtime figure it out?
* Some requirements are opaque to users, but matter to platforms, e.g. the idea that you need a channel to locate a message in Discord.
    * According to [Discord's developer documentation](https://discord.com/developers/docs/reference#snowflakes) snowflakes (or IDs) "are guaranteed to be unique across all of Discord." Despite this, Discord doesn't offer an API to find a message by ID in general, so you need to know the channel that a message is located in in order to fetch it. In theory, the Discord runtime could query every channel it knows about, but that sounds like a recipe for getting rate limited.
* Make sure that `discord.js` has a mechanism for automatically avoiding rate limits/temporary cloudflare bans. If not, implement such a mechanism to avoid people screwing themselves with `while true [ <forbidden action> ]` code.

### Evergreen

* Write more tests.
* Implement runtimes for other target platforms.
