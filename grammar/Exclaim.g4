parser grammar Exclaim;
options { tokenVocab=ExclaimLexer; }

program: (topLevelDeclaration NL)*;

topLevelDeclaration
    : IMPORT string #exclaimImportDeclaration
    | IMPORT identifier* FROM string #javascriptImportDeclaration
    | DATA identifier literal #dataDeclaration
    | TEMP identifier literal #tempDeclaration
    | blockDeclaration #baseDeclaration
    ;

blockDeclaration
    : GROUP identifier groupBlock #groupDeclaration
    | COMMAND identifier commandParams functionBlock #commandDeclaration
    | FUNCTION identifier functionParams functionBlock #functionDeclaration
    | ON identifier functionBlock #eventDeclaration
    ;

commandParams: param* (restListParam | restStringParam)?;
functionParams: param+ restListParam?;

param: PARAM_SIGIL identifier?;
restListParam: REST_LIST_SIGIL identifier?;
restStringParam: REST_STRING_SIGIL identifier?;

groupBlock: openBlock (blockDeclaration NL)* closeBlock;
functionBlock: openBlock (statement NL)+ closeBlock;

statement
    : FOR EACH identifier IN expr functionBlock #forEachStatement
    | WHILE expr functionBlock #whileStatement
    | ASSERT expr (ELSE functionBlock)? #assertStatement
    | IF expr THEN functionBlock (ELSE functionBlock)? #ifStatement
    | SEND expr #sendStatement
    | REACT WITH expr #reactStatement
    | REACT TO expr WITH expr #reactToStatement
    | SET lvalue TO expr #setStatement
    | identifier L_ARROW valueStatement #assignStatement
    | valueStatement #pipeStatement
    ;

valueStatement
    : PICK identifier FROM expr #pickStatement
    | PARSE expr AS identifier #parseStatement
    | expr #exprStatement
    ;

openBlock: L_BRACKET NL?;
closeBlock: R_BRACKET NL?;

expr: checkExpr;

checkExpr
    : term IS NOT? identifier #checkIsExpr
    | mathExpr (relationalOperator mathExpr)+ #checkCompareExpr
    | mathExpr #checkPassthrough
    ;

relationalOperator: EQ | NEQ | LT | LE | GT | GE;

mathExpr
    : mathExpr op=(MULT | DIV) mathExpr #multiplyExpr
    | mathExpr op=(PLUS | MINUS) mathExpr #addExpr
    | op=(PLUS | MINUS) term #prefixAddExpr
    | logicalExpr #mathPassthrough
    ;

logicalExpr
    : NOT term #prefixNotExpr
    | term #logicalPassthrough
    ;

term
    : L_PAREN expr R_PAREN #containedExpr
    | identifier L_PAREN ((expr COMMA)* expr)? R_PAREN #invokeExpr
    | literal #literalExpr // literal before lvalue so we capture true/false as literals rather than variables when applicable
    | lvalue #lvalueExpr
    ;

lvalue
    : (objectKey OF)+ term #ofExpression
    | identifier #identifierExpr
    ;

objectKey
    : identifier
    | string
    | number
    ;

literal
    : list #listLiteral
    | dict #dictLiteral
    | number #numberLiteral
    | string #stringLiteral
    | (TRUE | FALSE) #boolLiteral
    ;

list: openBlock ((expr COMMA NL?)* expr)? closeBlock;

dict: openBlock ((objectKey COLON expr COMMA NL?)* expr)? closeBlock;

number: NUMBER;

identifier
    : IMPORT | FROM    | DATA     | TEMP
    | GROUP  | COMMAND | FUNCTION | ON
    | SET    | TO
    | FOR    | EACH    | IN       | WHILE
    | ASSERT | IF      | THEN     | ELSE
    | PICK   | PARSE   | AS
    | SEND   | REACT   | WITH
    | IS     | NOT     | OF
    | TRUE   | FALSE
    | ID // ID at the end
    ;

string: OPEN_STRING stringContent* CLOSE_STRING;
stringContent: STRING_CONTENTS | embeddedJS;

embeddedJS: OPEN_JS (JS_CONTENTS | JS_STRING | jsTemplateString)* CLOSE_JS;
jsTemplateString: JS_OPEN_TEMPLATE_STRING (JS_CONTENTS | embeddedJS)* JS_CLOSE_TEMPLATE_STRING;
