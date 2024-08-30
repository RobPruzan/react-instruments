import { trackCreateElement } from "../core/track";
import {
  buildReactTrees,
  createElement,
  useEffect,
} from "../react-scratch/src/react/core";
const Component = ({ x, onStart: onStart, onEnd: onEnd }: { x: number }) => {
  const _startId = onStart();
  useEffect(() => onEnd(_startId));
  return createElement(
    "div",
    null,
    ...[
      trackCreateElement(
        '{"loc":{"start":{"line":11,"column":6},"end":{"line":11,"column":41}}}',
        TitleComponent,
        {}
      ),
      trackCreateElement(
        '{"loc":{"start":{"line":12,"column":6},"end":{"line":12,"column":42}}}',
        ButtonComponent,
        {}
      ),
    ]
  );
};
const TitleComponent = ({ onStart: onStart, onEnd: onEnd }) => {
  const _startId = onStart();
  useEffect(() => onEnd(_startId));
  return createElement("h1", {
    innerText: "Welcome to My Website",
  });
};
const ButtonComponent = ({ onStart: onStart, onEnd: onEnd }) => {
  const _startId = onStart();
  useEffect(() => onEnd(_startId));
  return createElement("button", {
    innerText: "Click Me!",
  });
};
const { reactViewTree, reactRenderTree } = buildReactTrees(
  trackCreateElement(
    '{"loc":{"start":{"line":26,"column":2},"end":{"line":26,"column":32}}}',
    Component,
    {}
  )
);
