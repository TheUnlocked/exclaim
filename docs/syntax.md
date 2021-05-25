# Syntax Overview

(subject to change)

## Expressions

### Operators

#### Math operators

```
a + b
a - b
a * b
a / b
+x
-x
```

#### Relational operators

```
a > b
a >= b
a < b
a <= b
a == b -- behaves like JavaScript ===
a != b -- behaves like JavaScript !==
a <= x < b -- Can chain any relational operator (including == and !=)
```

#### Logical operators

```
a and b
a or b
not x
```

#### Is operator

`is` behaves like JavaScript's `instanceof` in most cases, but there are some notable exceptions.

```
a is Type -- behaves like JavaScript a instanceof Type
a is string -- behaves like JavaScript typeof a === "string"
a is integer -- checks if a is an integer
a is not Type -- Can also negate is
```

#### Of operator

`of` is used for property access:

```
a of b -- behaves like JavaScript b.a
"Hello, World!" of x -- behaves like JavaScript x["Hello, World!"]
3 of x -- behaves like JavaScript x[3]
```

And you can of course use template strings in property accesses:

```
"Hello, {name}!" of x -- behaves like JavaScript x[`Hello, ${name}`]
```

### Literals

#### Numbers

```
1
-1
32.3
3.14e2
9.99e-4
1_000_000 -- supports numeric seperators
```

#### Strings

Strings use double quotes and can contain curly brace templates:

```
"Hello, World!"
"Hello, {name}!"
```

It also supports the standard escapes like `\n`, `\t`, `\"`, etc., and you can escape curly braces to avoid templating:

```
"flag\{this_is_a_flag\}"
```

Strings can also span multiple lines and will trim whitespace in a sensible way:

```
       "Every
        Word
        Is
        On
        A
        New
        Line"

-- Is equivilent to

"Every\nWord\nIs\nOn\nA\nNew\nLine"
```

#### Booleans

```
true
false
```

#### Lists

```
[1, 2, 3]
[] -- empty list
[1, 2,] -- trailing commas allowed
```

#### Dictionaries

```
[a: 1, b: 2, c: 3]
[:] -- empty dict
[a: 1, b: 2,] -- trailing commas allowed
```

#### Identifiers

Most legal JavaScript identifiers are also legal in Exclaim!. A notable exception is that `$` is not permitted in Exclaim! identifiers.

### Misc

#### Parentheses

```
(a + b) * c
```

#### Function invocation

```
foo()
foo(a, b, c)
```

#### Embedded JavaScript

Embed JavaScript code with curly braces:

```
{console.log("Hit point 1")}
"You rolled a {{Math.floor(Math.random() * n) + 1}}!"
```

## Statements

### Value Statements

Value statements are ones which produce a value that can be assigned to a variable. All expressions are also value statements. For example:

```
n <- 1 + 1
-- n is declared with value 2 here
```

If a value statement is not assigned to anything, it is implicitly assigned to `it`:

```
1 + 1
-- equivalent to
it <- 1 + 1
```

#### Pick

_Pick is highly subject to change_


### Contextual Value statements

Contextual value statements are statements which behave as value statements when assigned to a variable, but behave differently if they are not.

#### Send

`send` sends a message in the current channel.

```
send "Hello, World!"
```

If assigned to a variable, it will wait for the message to send and then assign to that variable an object representing the message that was sent. Otherwise, it will not wait for the message to send and an object representing the sent message will not be assigned to `it`.

```
msg <- send "Hello, World!"
-- msg is assigned with the sent message here

send "Goodbye!"
-- it is NOT assigned with the sent message here
```

