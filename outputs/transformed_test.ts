import { buildReactTrees, createElement } from "../react-scratch/src/react/core";
const Component = ({
  x,
  onStart: onStart,
  onEnd: onEnd
}: {
  x: number;
}) => {
  const _startId = onStart();
  return onEnd(createElement("div", null, ...[trackCreateElement("{\"loc\":{\"start\":{\"line\":11,\"column\":6},\"end\":{\"line\":11,\"column\":41}}}", TitleComponent, {}), trackCreateElement("{\"loc\":{\"start\":{\"line\":12,\"column\":6},\"end\":{\"line\":12,\"column\":41}}}", TitleComponent, {}), trackCreateElement("{\"loc\":{\"start\":{\"line\":13,\"column\":6},\"end\":{\"line\":13,\"column\":42}}}", ButtonComponent, {})]), _startId);
};
const TitleComponent = ({
  onStart: onStart,
  onEnd: onEnd
}) => {
  const _startId = onStart();
  return onEnd(createElement("h1", {
    innerText: "Welcome to My Website"
  }), _startId);
};
const ButtonComponent = ({
  onStart: onStart,
  onEnd: onEnd
}) => {
  const _startId = onStart();
  return onEnd(createElement("button", {
    innerText: "Click Me!"
  }), _startId);
};
const {
  reactViewTree,
  reactRenderTree
} = buildReactTrees(trackCreateElement("{\"loc\":{\"start\":{\"line\":27,\"column\":2},\"end\":{\"line\":27,\"column\":32}}}", Component, {}));