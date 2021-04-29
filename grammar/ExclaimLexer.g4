lexer grammar ExclaimLexer;

IMPORT: 'import';
FROM: 'from';
DATA: 'data';
TEMP: 'temp';
GROUP: 'group';
COMMAND: 'command';
FUNCTION: 'function';
ON: 'on';
SET: 'set';
TO: 'to';
FOR: 'for';
EACH: 'each';
IN: 'in';
WHILE: 'while';
IF: 'if';
ELSE: 'else';
FAIL: 'fail';
PICK: 'pick';
PARSE: 'parse';
AS: 'as';
SEND: 'send';
REACT: 'react';
WITH: 'with';
IS: 'is';
NOT: 'not';
OF: 'of';
TRUE: 'true';
FALSE: 'false';
AND: 'and';
OR: 'or';

fragment INTEGER: [0-9]+ ('_'+ [0-9]+)*;
NUMBER: '-'? INTEGER '.'? INTEGER? ('e' '-'? INTEGER)?;
ILLEGAL_NUMBER: '-'? INTEGER? ('_'? '.' '_'?)? INTEGER ('_'? 'e' '_'? ('-' '_'?)? INTEGER '.'? INTEGER?)? '_'?;

L_BRACKET: '[';
R_BRACKET: ']';
L_PAREN: '(';
R_PAREN: ')';

L_ARROW: '<-';
COMMA: ',';
COLON: ':';

EQ: '==';
NEQ: '!=';
LT: '<';
LE: '<=';
GT: '>';
GE: '>=';
MULT: '*';
DIV: '/';
PLUS: '+';
MINUS: '-';

REST_STRING_SIGIL: '$$';
REST_LIST_SIGIL: '$...';
PARAM_SIGIL: '$';

ID: [\p{L}] [\p{L}0-9_]*;

OPEN_STRING: '"' -> pushMode(stringMode);
OPEN_JS: '{' -> pushMode(javascriptMode);

NL: '\n'+;
WS: [ \t\r]+ -> skip;

mode stringMode;
fragment LETTER: ~["\\{];
fragment HEX: [0-9a-fA-F];
ESCAPE_SEQUENCE: '\\' . | '\\x' HEX HEX;
STRING_CONTENTS: LETTER+;
STR_OPEN_JS: '{' -> type(OPEN_JS), pushMode(javascriptMode);
CLOSE_STRING: '"' -> popMode;

COMMENT: '--' .*? '\n' -> skip;

// Welcome to language embedding hell
mode javascriptMode;
JS_OPEN_JS: '{' -> type(OPEN_JS), pushMode(javascriptMode);
CLOSE_JS: '}' -> popMode;
JS_STRING
    : '\'' ('\\\'' | ~'\'')* '\''
    | '"' ('\\"' | ~'"')* '"'
    ;
JS_OPEN_TEMPLATE_STRING: '`' -> pushMode(javascriptTemplateStringMode);
JS_LINE_COMMENT: '//' .*? '\n' -> skip;
JS_COMMENT: '/*' .*? '*/' -> skip;
JS_CONTENTS: ~['"`{}]+;

mode javascriptTemplateStringMode;
JS_ESCAPE_OPEN_TEMPLATE: '\\${' -> type(JS_CONTENTS);
JS_OPEN_TEMPLATE: '${' -> type(OPEN_JS), pushMode(javascriptMode);
JS_TEMPLATE_STRING_CONTENTS: (~'`' | '\\`')+ -> type(JS_CONTENTS);
JS_CLOSE_TEMPLATE_STRING: '`' -> popMode;
