import {
  buildReactTrees,
  createElement,
} from "../react-scratch/src/react/core";

const Component = ({ x }: { x: number }) => {
  return createElement(
    "div",
    null,
    ...[
      createElement(TitleComponent, null),
      createElement(TitleComponent, null),
      createElement(ButtonComponent, null),
    ]
  );
};

const TitleComponent = () => {
  return createElement("h1", { innerText: "Welcome to My Website" });
};

const ButtonComponent = () => {
  return createElement("button", { innerText: "Click Me!" });
};

const { reactViewTree, reactRenderTree } = buildReactTrees(
  createElement(Component, null)
);
