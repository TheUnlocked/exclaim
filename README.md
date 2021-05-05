# Exclaim! Language

Exclaim! is a domain-specific langauge for the purpose of rapid and easy development of bots for chat services such as Discord. This repository includes a compiler for Exclaim! as well as a Discord runtime target.

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

TODO

### Running compiled code

To run compiled code, run `node programname.mjs` in the same directory as a bundled `Runtime.js` file. Make sure that the file extension of your compiled program is `.mjs`, or it WILL NOT WORK. This is a limitation of Node rather than a limitation of the runtime.

The first time you run your program, it will automatically generate a `config.json` file and prompt you to input your bot token. Place your bot token into the `token` field in `config.json` and re-run the program.

## Samples

A variety of samples are included in the samples directory.
 
