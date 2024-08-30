import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { readFileSync, writeFileSync } from "fs";

const inputFilePath = "inputs/test.ts";
const code = readFileSync(inputFilePath, "utf-8");

const ast = parse(code, {
  sourceType: "module",
  plugins: ["typescript"],
});

// traverse(ast, {
//   CallExpression(path: NodePath<t.CallExpression>) {
//     if (t.isIdentifier(path.node.callee, { name: "createElement" })) {
//       const firstArg = path.node.arguments[0];
//       if (t.isIdentifier(firstArg)) {
//         const binding = path.scope.getBinding(firstArg.name);
//         if (binding && binding.path.isFunctionDeclaration()) {
//           modifyFunctionDeclaration(binding.path);
//         } else if (binding && binding.path.isVariableDeclarator()) {
//           const initPath = binding.path.get("init");
//           if (
//             initPath &&
//             (t.isFunctionExpression(initPath.node) ||
//               t.isArrowFunctionExpression(initPath.node))
//           ) {
//             modifyFunctionDeclaration(initPath);
//           }
//         }
//       }
//     }
//   },
// });

traverse(ast, {
  CallExpression(path: NodePath<t.CallExpression>) {
    if (t.isIdentifier(path.node.callee, { name: "createElement" })) {
      const firstArg = path.node.arguments[0];
      if (t.isIdentifier(firstArg)) {
        const binding = path.scope.getBinding(firstArg.name);
        if (binding && binding.path.isFunctionDeclaration()) {
          modifyFunctionDeclaration(binding.path);
        } else if (binding && binding.path.isVariableDeclarator()) {
          const initPath = binding.path.get("init");
          if (
            initPath &&
            (t.isFunctionExpression(initPath.node) ||
              t.isArrowFunctionExpression(initPath.node))
          ) {
            modifyFunctionDeclaration(initPath);
          }
        }
      }
    }
  },
});

function isAlreadyEnhanced(
  funcPath: NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
  >
): boolean {
  const params = funcPath.node.params[0];

  const hasOnStart =
    t.isObjectPattern(params) &&
    params.properties.some((prop) =>
      t.isIdentifier((prop as t.ObjectProperty).key, { name: "onStart" })
    );
  const hasOnEnd =
    t.isObjectPattern(params) &&
    params.properties.some((prop) =>
      t.isIdentifier((prop as t.ObjectProperty).key, { name: "onEnd" })
    );

  if (!hasOnStart || !hasOnEnd) return false;

  let hasStartCall = false;
  let hasUseEffect = false;
  funcPath.traverse({
    VariableDeclarator(path) {
      if (t.isIdentifier(path.node.id, { name: "_startId" })) {
        hasStartCall = true;
      }
    },
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "useEffect" })) {
        hasUseEffect = true;
      }
    },
  });

  return hasOnStart && hasOnEnd && hasStartCall && hasUseEffect;
}

function modifyFunctionDeclaration(
  funcPath: NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
  >
): void {
  if (isAlreadyEnhanced(funcPath)) {
    console.log(
      `Skipping already enhanced function: ${
        funcPath.node.id ? funcPath.node.id.name : "anonymous"
      }`
    );
    return;
  }

  console.log(
    `Modifying function: ${
      funcPath.node.id ? funcPath.node.id.name : "anonymous"
    }`
  );

  if (funcPath.node.params.length === 0) {
    funcPath.node.params = [
      t.objectPattern([
        t.objectProperty(t.identifier("onStart"), t.identifier("onStart")),
        t.objectProperty(t.identifier("onEnd"), t.identifier("onEnd")),
      ]),
    ];
  } else {
    const paramPattern = funcPath.node.params[0];
    if (t.isObjectPattern(paramPattern)) {
      paramPattern.properties.push(
        t.objectProperty(t.identifier("onStart"), t.identifier("onStart")),
        t.objectProperty(t.identifier("onEnd"), t.identifier("onEnd"))
      );
    } else if (
      t.isIdentifier(paramPattern) ||
      t.isAssignmentPattern(paramPattern)
    ) {
      funcPath.node.params = [
        t.objectPattern([
          t.objectProperty(
            paramPattern as t.Identifier,
            paramPattern as t.Identifier
          ),
          t.objectProperty(t.identifier("onStart"), t.identifier("onStart")),
          t.objectProperty(t.identifier("onEnd"), t.identifier("onEnd")),
        ]),
      ];
    }
  }

  const startId = t.identifier("_startId");
  funcPath.node.body.body.unshift(
    t.variableDeclaration("const", [
      t.variableDeclarator(
        startId,
        t.callExpression(t.identifier("onStart"), [])
      ),
    ])
  );

  funcPath.node.body.body.splice(
    1,
    0,
    t.expressionStatement(
      t.callExpression(t.identifier("useEffect"), [
        t.arrowFunctionExpression(
          [],
          t.callExpression(t.identifier("onEnd"), [startId])
        ),
      ])
    )
  );

  funcPath.stop();
}

traverse(ast, {
  CallExpression(path: NodePath<t.CallExpression>) {
    if (t.isIdentifier(path.node.callee, { name: "createElement" })) {
      const firstArg = path.node.arguments[0];

      if (t.isIdentifier(firstArg)) {
        handleCreateElementTransformation(path);
      }
    }
  },
});

function handleCreateElementTransformation(
  path: NodePath<t.CallExpression>
): void {
  const firstArg = path.node.arguments[0];

  let props = path.node.arguments[1];
  if (!props || t.isNullLiteral(props)) {
    props = t.objectExpression([]);
  }

  const children = path.node.arguments.slice(2);

  const astMetadata = createASTMetadata(path);
  const newArgs: t.Expression[] = [astMetadata, firstArg, props, ...children];

  path.replaceWith(
    t.callExpression(t.identifier("trackCreateElement"), newArgs)
  );

  if (path.node.loc) {
    console.log(
      `Transformed createElement to trackCreateElement at line ${path.node.loc.start.line}`
    );
  }
}

function createASTMetadata(path: NodePath<t.CallExpression>): t.StringLiteral {
  const { loc } = path.node;
  if (!loc) return t.stringLiteral("{}");

  const metadata = {
    loc: {
      start: { line: loc.start.line, column: loc.start.column },
      end: { line: loc.end.line, column: loc.end.column },
    },
  };

  return t.stringLiteral(JSON.stringify(metadata));
}

const output = generate(ast, {}, code);

const outputFilePath = "outputs/transformed_test.ts";
writeFileSync(outputFilePath, output.code);

console.log(`Transformed code written to ${outputFilePath}`);
