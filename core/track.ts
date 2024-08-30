import * as React from "../react-scratch/src/react/core";

export type Event =
  | {
      kind: "render-start";
      startId: string;
      astMetadata: any;
      reactMetadata: any;
      time: number;
    }
  | {
      kind: "render-end";
      startId: string;
      astMetadata: any;
      reactMetadata: any;
      time: number;
    };
export const eventQueue: { current: Array<Event> } = { current: [] };

setInterval(() => {
  if (eventQueue.current.length > 0) {
    console.log("track", eventQueue);
    fetch("http://localhost:8080/dispatch", {
      body: JSON.stringify(eventQueue.current),
      method: "POST",
    }).catch(console.error);
  }
  eventQueue.current = [];
}, 1000);

export const start = (onStart: (startId: string) => void) => {
  const startId = crypto.randomUUID();
  onStart(startId);
  return startId;
};

export const end = <T>(
  expression: T,
  startId: string,
  onEnd: (startId: string) => void
): T => {
  onEnd(startId);
  return expression;
};

export const _onStart = (metadata: any) => {
  console.log("my meta", metadata);
  const startId = crypto.randomUUID();
  eventQueue.current.push({
    kind: "render-start",
    astMetadata: metadata.ast,
    reactMetadata: metadata.react,
    time: performance.now(),
    startId,
  });
  return startId;
};

export const _onEnd = (startId: string, metadata: any) => {
  eventQueue.current.push({
    kind: "render-end",
    astMetadata: metadata.ast,
    reactMetadata: metadata.react,
    time: performance.now(),
    startId,
  });
};

export const trackCreateElement = (
  metadata: any,
  component: (props: Record<string, unknown> | null) => any,
  props: Record<string, unknown> | null,
  ...children: Array<any>
) => {
  console.log("tracking", metadata);
  const reactMeta = {
    componentName: component.name,
    props: props,
    numChildren: children.length,
  };
  const curriedOnStart = () => _onStart({ ast: metadata, react: reactMeta });
  const curriedOnEnd = (expression: any, startId: string) => {
    _onEnd(startId, {
      ast: metadata,
      react: reactMeta,
    });
    return expression;
  };
  const extraProps = { onStart: curriedOnStart, onEnd: curriedOnEnd };
  console.log(children);
  return React.createElement(
    component,
    props === null ? extraProps : { ...props, ...extraProps }
    // []
  );
};
