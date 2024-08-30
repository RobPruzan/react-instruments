import {
  buildReactTrees,
  createElement,
  useEffect,
  useState,
  render,
} from "../react-scratch/src/react/core";

const Component = () => {
  const [x, setX] = useState(0);

  useEffect(() => {
    for (let i = 0; i < 100000000; i++) {
      Math.cos(100);
    }
  }, [x]);
  return createElement(
    "div",
    null,
    ...[
      createElement(TitleComponent, null),
      createElement(TitleComponent, null),
      createElement(ButtonComponent, null),
      createElement("button", {
        onclick: () => {
          setX(x + 1);
        },
        innerText: "Counter (that triggers an expensive effect): " + x,
      }),
    ]
  );
};

const TitleComponent = () => {
  return createElement("h1", { innerText: "Some random text" });
};

const ButtonComponent = () => {
  return createElement("button", { innerText: "A random button" });
};

window.onload = () => {
  render(createElement(Component, null), document.getElementById("root")!);
};
