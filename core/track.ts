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
    }
  | {
      kind: "hook-start";
      hookName: string;
      args: Array<any>;
      astMetadata: string;
      time: number;
      hookCallId: string;
    }
  | {
      kind: "hook-end";
      time: number;
      hookCallId: string;
    }
  | {
      kind: "hook-cb-start";
      args: Array<any>;
      hookCallId: string;
      time: number;
      cbId: string;
    }
  | {
      kind: "hook-cb-end";
      cbId: string;
      time: number;
    };

export const eventQueue: { current: Array<Event> } = { current: [] };

setInterval(() => {
  if (eventQueue.current.length > 0) {
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
  );
};

export const trackHook = <T>(
  hookName: string,
  locJson: string,
  fn: (...args: Array<any>) => T,
  args: Array<any>
) => {
  const hookCallId = crypto.randomUUID();

  if (["useCallback", "useMemo", "useEffect"].includes(hookName)) {
    const fn = args[0];
    args[0] = (...args: Array<any>) => {
      const cbId = crypto.randomUUID();
      eventQueue.current.push({
        kind: "hook-cb-start",
        args,
        hookCallId,
        time: performance.now(),
        cbId,
      });
      const result = fn(...args);
      eventQueue.current.push({
        kind: "hook-cb-end",
        time: performance.now(),
        cbId,
      });

      return result;
    };
  }
  eventQueue.current.push({
    kind: "hook-start",
    args,
    hookName,
    astMetadata: locJson,
    time: performance.now(),
    hookCallId,
  });
  const result = fn(...args);
  eventQueue.current.push({
    kind: "hook-end",
    time: performance.now(),
    hookCallId,
  });

  return result;
};
