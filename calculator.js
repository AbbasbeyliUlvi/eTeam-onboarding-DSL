(function calculatorExampleCst() {
    "use strict";
    /**
     * An Example of implementing a Calculator with separated grammar and semantics (actions).
     * This separation makes it easier to maintain the grammar and reuse it in different use cases.
     *
     * This is accomplished by using the automatic CST (Concrete Syntax Tree) output capabilities
     * of chevrotain.
     *
     * See farther details here:
     * https://chevrotain.io/docs/guide/concrete_syntax_tree.html
     */
    const createToken = chevrotain.createToken;
    const tokenMatcher = chevrotain.tokenMatcher;
    const Lexer = chevrotain.Lexer;
    const CstParser = chevrotain.CstParser;
  
    // using the NA pattern marks this Token class as 'irrelevant' for the Lexer.
    // AdditionOperator defines a Tokens hierarchy but only the leafs in this hierarchy define
    // actual Tokens that can appear in the text
    const AdditionOperator = createToken({name: "AdditionOperator", pattern: Lexer.NA});
    const Plus = createToken({name: "Plus", pattern: /plus/, categories: AdditionOperator}); 
   
    const NumberLiteral = createToken({name: "NumberLiteral", pattern: Lexer.NA});
    const One = createToken({ name: "One", pattern: /one/, categories: NumberLiteral });
    const Two = createToken({ name: "Two", pattern: /two/, categories: NumberLiteral });
    const Three = createToken({ name: "Three", pattern: /three/, categories: NumberLiteral });
    const Four = createToken({ name: "Four", pattern: /four/, categories: NumberLiteral });
  
    // marking WhiteSpace as 'SKIPPED' makes the lexer skip it.
    const WhiteSpace = createToken({
      name: "WhiteSpace",
      pattern: /\s+/,
      group: Lexer.SKIPPED
    });
    
    const values = { one:1, two:2, three:3, four:4 }
  
    const allTokens = [
      WhiteSpace, // whitespace is normally very common so it should be placed first to speed up the lexer's performance
      Plus,  
      One,
      Two,
      Three,
      Four,
      NumberLiteral,
      AdditionOperator 
    ];
    
    const CalculatorLexer = new Lexer(allTokens);
  
    // ----------------- parser -----------------
    // Note that this is a Pure grammar, it only describes the grammar
    // Not any actions (semantics) to perform during parsing.
    class CalculatorPure extends CstParser {
      constructor() {
        super(allTokens);
  
        const $ = this;
  
        $.RULE("expression", () => {
          $.SUBRULE($.additionExpression)
        });
  
        //  lowest precedence thus it is first in the rule chain
        // The precedence of binary expressions is determined by how far down the Parse Tree
        // The binary expression appears.
        $.RULE("additionExpression", () => {
          $.SUBRULE($.atomicExpression, {LABEL: "lhs"});
          $.MANY(() => {
            // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
            $.CONSUME(AdditionOperator);
            //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
            $.SUBRULE2($.atomicExpression, {LABEL: "rhs"});
          });
        }); 
  
        $.RULE("atomicExpression", () => $.CONSUME(NumberLiteral)); 
  
        // very important to call this after all the rules have been defined.
        // otherwise the parser may not work correctly as it will lack information
        // derived during the self analysis phase.
        this.performSelfAnalysis();
      }
    }
  
    // wrapping it all together
    // reuse the same parser instance.
    const parser = new CalculatorPure([]);
  
  
    // ----------------- Interpreter -----------------
    const BaseCstVisitor = parser.getBaseCstVisitorConstructor()
  
    class CalculatorInterpreter extends BaseCstVisitor {
  
      constructor() {
        super()
        // This helper will detect any missing or redundant methods on this visitor
        this.validateVisitor()
      }
  
      expression(ctx) {
        return this.visit(ctx.additionExpression)
      }
  
      additionExpression(ctx) {
        let result = this.visit(ctx.lhs)
  
        // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
        if (ctx.rhs) {
          ctx.rhs.forEach((rhsOperand, idx) => {
            // there will be one operator for each rhs operand
            let rhsValue = this.visit(rhsOperand)
            let operator = ctx.AdditionOperator[idx]
  
            if (tokenMatcher(operator, Plus)) {
              result += rhsValue
            } 
            
          })
        }
  
        return result
      } 
  
      atomicExpression(ctx) { 
        if (ctx.NumberLiteral) {
          // If a key exists on the ctx, at least one element is guaranteed
          return values[ctx.NumberLiteral[0].image]
        } 
      } 
    }
  
    // for the playground to work the returned object must contain these fields
    return {
      lexer: CalculatorLexer,
      parser: CalculatorPure,
      visitor: CalculatorInterpreter,
      defaultRule: "expression"
    };
  }())