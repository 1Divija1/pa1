import { Stmt, Expr, BinaryOp } from "./ast";
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

type CompileResult = {
  wasmSource: string,
};

export function compile(source: string) : CompileResult {
  const ast = parse(source);
  const definedVars = new Set();
  ast.forEach(s => {
    switch(s.tag) {
      case "define":
        definedVars.add(s.name);
        break;
    }
  }); 
  const scratchVar : string = `(local $$last i32)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })
  
  const commandGroups = ast.map((stmt) => codeGen(stmt));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
  };
}

function codeGen(stmt: Stmt) : Array<string> {
  switch(stmt.tag) {
    case "define":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}

function codeGenExpr(expr : Expr) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg);
      return argStmts.concat([`(call $${expr.name})`]);
    case "builtin2":
      const argStmts1 = codeGenExpr(expr.arg1);
      const argStmts2 = codeGenExpr(expr.arg2);
      return [...argStmts1, ...argStmts2, `(call $${expr.name})`];  
    case "num":
      return ["(i32.const " + expr.value + ")"];
    case "id":
      return [`(local.get $${expr.name})`];
    case "binaryexp":
      const leftStatements = codeGenExpr(expr.left);
      const rightStatements = codeGenExpr(expr.right);
      const operatorStatements = codeGenBinOp(expr.op);
      return [...leftStatements, ...rightStatements, operatorStatements]
  }
}

function codeGenBinOp(op : BinaryOp) : string {
  switch(op) {
    case BinaryOp.Plus:
      return "(i32.add)"
    case BinaryOp.Minus:
      return "(i32.sub)"
    case BinaryOp.Mul:
      return "(i32.mul)"
  }

}



// ... is representing in list form