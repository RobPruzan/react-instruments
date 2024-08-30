import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { readFileSync, writeFileSync } from "fs";

const visitedSymbol = Symbol("visited");
const inputFilePath = "demo-script.ts";
const code = readFileSync(inputFilePath, "utf-8");

const ast = parse(code, {
  sourceType: "module",
  plugins: ["typescript"],
});

const trackImport = t.importDeclaration(
  [
    t.importSpecifier(t.identifier("trackHook"), t.identifier("trackHook")),
    t.importSpecifier(
      t.identifier("trackCreateElement"),
      t.identifier("trackCreateElement")
    ),
  ],
  t.stringLiteral("@/track")
);

ast.program.body.unshift(trackImport);

const createASTMetadata = (path: NodePath<t.CallExpression>) => {
  const { loc } = path.node;
  if (!loc) return t.stringLiteral("{}");

  const metadata = {
    loc: {
      start: { line: loc.start.line, column: loc.start.column },
      end: { line: loc.end.line, column: loc.end.column },
    },
  };

  return t.stringLiteral(JSON.stringify(metadata));
};

const modifyFunctionDeclaration = (
  funcPath: NodePath<
    t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression
  >
) => {
  if ((funcPath.node as any)[visitedSymbol]) {
    return;
  }

  (funcPath.node as any)[visitedSymbol] = true;

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
  // @ts-expect-error
  funcPath.node.body.body.unshift(
    t.variableDeclaration("const", [
      t.variableDeclarator(
        startId,
        t.callExpression(t.identifier("onStart"), [])
      ),
    ])
  );

  funcPath.traverse({
    ReturnStatement(returnPath: NodePath<t.ReturnStatement>) {
      if (!(returnPath.node as any)[visitedSymbol]) {
        returnPath.replaceWith(
          t.returnStatement(
            t.callExpression(t.identifier("onEnd"), [
              returnPath.node.argument || t.identifier("undefined"),
              startId,
            ])
          )
        );
        (returnPath.node as any)[visitedSymbol] = true;
      }
    },
  });

  funcPath.stop();
};

traverse(ast, {
  CallExpression(path: NodePath<t.CallExpression>) {
    if (
      t.isIdentifier(path.node.callee) &&
      [
        "useState",
        "useEffect",
        "useContext",
        "useMemo",
        "useCallback",
        "useRef",
      ].includes(path.node.callee.name)
    ) {
      const hookName = path.node.callee.name;
      const astMetadata = createASTMetadata(path);
      const hookFunction = path.node.callee;
      const hookArgs = path.node.arguments;

      const newCall = t.callExpression(t.identifier("trackHook"), [
        t.stringLiteral(hookName),
        astMetadata,
        hookFunction,
        // @ts-expect-error
        t.arrayExpression(hookArgs),
      ]);

      path.replaceWith(newCall);

      if (path.node.loc) {
        console.log(
          `Transformed ${hookName} to trackHook at line ${path.node.loc.start.line}`
        );
      }
    }
  },
});

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
            // @ts-expect-error
            modifyFunctionDeclaration(initPath);
          }
        }
      }
    }
  },
});

traverse(ast, {
  CallExpression(path: NodePath<t.CallExpression>) {
    if (t.isIdentifier(path.node.callee, { name: "createElement" })) {
      const firstArg = path.node.arguments[0];

      if (t.isIdentifier(firstArg)) {
        const firstArg = path.node.arguments[0];

        let props = path.node.arguments[1];
        if (!props || t.isNullLiteral(props)) {
          props = t.objectExpression([]);
        }

        const children = path.node.arguments.slice(2);

        const astMetadata = createASTMetadata(path);
        const newArgs: t.Expression[] = [
          astMetadata,
          // @ts-expect-error
          firstArg,
          // @ts-expect-error
          props,
          // @ts-expect-error
          ...children,
        ];

        path.replaceWith(
          t.callExpression(t.identifier("trackCreateElement"), newArgs)
        );
      }
    }
  },
});

const output = generate(ast, {}, code);

const outputFilePath = "demo-script-transformed.ts";
writeFileSync(outputFilePath, output.code);

console.log(`Transformed code written to ${outputFilePath}`);
