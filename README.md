# Running the project

install bun if not already installed https://bun.sh/docs/installation

Build the demo website
`bun run build`

> This transforms the react code to an intermediate representation that allows us to track program information. Then this transformed code is transpiled to JS which will be directly requested in the demo website

Run the demo server
`bun run dev`

The website will be available at http://locahost:8080

> This server is responsible for serving the demo website, and receiving + aggregating program events. The server will be logging website stats to stdout when available

## Demo

https://github.com/user-attachments/assets/4643b949-22c7-4765-84ba-3dbe175b94ec


# Dynamic profiler

Problem statement for the following writeup is as follows:

A live profiler that runs against a custom react implementation without modifying user code.

This can happen 2 ways:

- inside the custom react implementation, we track certain events and timings to derive useful insights
- we transform user code to use our program trackers, where our trackers will accumulate data that we can use to service useful insights, de-coupling us from the framework

The goal for this take home is the former, while using babel.

I’ve never specifically used babel, but do have experience with programming language theory (AST’s, parsers, PL semantics). So the first goal was to translate my theoretical knowledge into functional by getting a quick example of the library up and running.

[This article](https://dev.to/tanhauhau/step-by-step-guide-for-writing-a-custom-babel-transformation-257g) was one of the first that popped up on google, which had the following code example which was enough to get started:

```tsx
const babel = require("@babel/core");
const code = `
function greet(name) {
  return 'Hello ' + name;
}
console.log(greet('tanhauhau')); // Hello tanhauhau
`;
const output = babel.transformSync(code, {
  plugins: [
    function myCustomPlugin() {
      return {
        visitor: {
          StringLiteral(path) {
            const concat = path.node.value
              .split("")
              .map((c) => babel.types.stringLiteral(c))
              .reduce((prev, curr) => {
                return babel.types.binaryExpression("+", prev, curr);
              });
            path.replaceWith(concat);
            path.skip();
          },
          Identifier(path) {
            if (
              !(
                path.parentPath.isMemberExpression() &&
                path.parentPath
                  .get("object")
                  .isIdentifier({ name: "console" }) &&
                path.parentPath.get("property").isIdentifier({ name: "log" })
              )
            ) {
              path.node.name = path.node.name.split("").reverse().join("");
            }
          },
        },
      };
    },
  ],
});
console.log(output.code);
```

The API is pretty simple, and to get a simple example running was pretty easy.

The next step is thinking about what a react program needs to be injected into it to generate useful events.

The most obvious (and expected as a result) is component render timing, so this will be the main goal for now.

The first problem with tracking render timing is we have no hooks into the framework (well of course because my custom implementation provides none!). And render functions are called by the framework. We can’t pull a simple:

```tsx
const start = perf.now();
renderFn();
const time = perf.now() - start;
```

The language also doesn’t provide anything clever like [the Swift defer keyword](https://www.hackingwithswift.com/new-syntax-swift-2-defer). But, we have the freedom to transform the program in any way we want. So my goal was just to simulate a defer statement (run some code after the function is done executing), which would allow me to confirm a function body has completed.

This is pretty easy with knowledge of javascript expression precedence. If you call fn(expr), expr must evaluate before fn can be called because, of course, the argument needs to be evaluated before it’s used in a function.

We can apply this to every return statement in a function, using babel, to run some code after a function is done running:

```tsx
const fn = () => {
	...

	return end(expr)

}
```

where end must return the evaluated expression back.

Assuming we can write the code for this in a babel transform, getting a component timing is trivial:

```tsx
const fn = () => {
  const start = performance.now();

  return getTotalTime(expr, start);
};
```

Next, I’ll address the assumption that we can do this in a babel transform. We can’t blindly insert performance calls to every function in a users code base. We only want the function calls in react components. Luckily, a react component is well defined; it’s the first argument to React.createElement. So we need to perform a babel-equivalent of a jump-to-definition on these components and then perform the transform.

All that’s needed for this is some boring code applied to babel AST path’s:

- is the callee createElement
- is the first argument a function
- if so, apply some transform on the first arguments AST path
  - the transform itself does require some work, but going to omit the details in this writeup

But, getting the performance information is only half the battle. How do we know what component instance this data refers to? We can’t hook into the internals, and inside the function body every call looks like the same.

In my React internals, you can determine which component instance is running inside a component body by internally tracking which component is being called. But, we do not have access to these internals.

Another clever way the custom framework tracks components is by observing them between renders. If they end up in the same position in an internal data structure, they are considered the same. While I don’t plan to re-implement reconciliation, my goal was to do something similar to position based equality.

The closest thing to positioning we can use for equality is the position in the source files the component was instantiated. We already know where the createElement calls happen (just wrote transform code leveraging createElement). So all that’s needed is to find the same AST node previously used to “jump-to-definition” that allowed us to find the functional component. That node will expose the position the function was called in the source code.

Then, we can inject this source code location into the component's function arguments without the user’s code having any idea! The injection would happen statically at compile time, meaning a transform is needed that looks similar to:

`createElement(Component, props, …children)` → `applyCreateElement(sourceCodeInformation, Component, props, ….children)`

Where applyCreateElement simply calls createElement with the provided arguments, but updating the props to hold the source code information.

Now, when tracking the timing of render functions, we can associate it with the installation location, which can uniquely identify the component instance (just not its life cycle).

## Aggregating the data

Since we are starting to collect _some_ information that can be considered useful, my next goal is to get this data off the client. While this wasn’t explicitly stated in the take-home, I wanted to get closer to millions impl by having a dedicated server listening for profiling events.

Meaning that we need to make some network requests to dispatch program information to a remote server.

One concern with this is if we naively dispatch to a server too frequently, we can be adding meaningful overhead to user code or bog down our remote server.

The first thing we can do to resolve this is instead of immediately dispatching to a server; we only dispatch when the browser is idle, using `requestIdleCallback` . This would solve problem #1 of adding too much overhead to the user’s code, but can still result in a large amount of events being dispatched serially if many requests were queued while the browser was performing work.

Instead of implicitly asking the browser to queue the requests, my goal was to queue the requests explicitly and then batch dispatch the pending requests to the remote server. And of course javascript provides a build in queue that we can use for this, an array (push, unshift).

The high level of the solution was:

- accumulate a global array of events (for example, timing information for a component)
- on an interval of n seconds, POST the events to a remote server, and clear the events

At this point we only need a remote server impl to complete the workflow. My go-to for quick web servers is a default `Bun` setup with `Bun.serve`.

This server won’t do much; it will just listen for events, aggregate them, and provide statistics on them. If we push enough useful events to this remote server, the aggregation + analysis logic can start doing more work, for example, providing recommendations for improvement.

At this point, all the groundwork is needed to:

- transform user code for tracking
- ability to associate the tracking code back to source code information
- a way to dispatch the data back to a remote server
- a remote server that can process events

So it’s a good time to introduce some more events. The most obvious one would be hook calls. Things that would be useful are:

- how long did a hook take to run
- when is a hook callback being run (useful for useEffect, useMemo, useCallback)

And this is pretty simple with a babel transform. We just need to look for some set of functions, and when we find them, update the form of `fn(...args)` → `track(sourceCodeInformation, fn, ...args)`

Inside `track` we can do the basics like track how long the hook itself took to run. More advanced things can be done since we have omniscient knowledge of the type of arguments being passed to these hooks. `useEffect` , `useMemo` , and `useCallback` all take a callback as their first argument and will be run conditionally between renders. We can mutate this argument so when it is called, an event is sent to our remote server.

All that’s left is to actually process the events. This is not super worth writing about- just some loops to aggregate the collected events into something useful.

## Example transformation:

### Input

```typescript
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
```

### Output

```typescript
import { trackHook, trackCreateElement } from "@/track";
import {
  buildReactTrees,
  createElement,
  useEffect,
  useState,
  render,
} from "../react-scratch/src/react/core";
const Component = ({ onStart: onStart, onEnd: onEnd }) => {
  const _startId = onStart();
  const [x, setX] = trackHook(
    "useState",
    '{"loc":{"start":{"line":10,"column":20},"end":{"line":10,"column":31}}}',
    useState,
    [0]
  );
  trackHook(
    "useEffect",
    '{"loc":{"start":{"line":12,"column":2},"end":{"line":16,"column":9}}}',
    useEffect,
    [
      () => {
        for (let i = 0; i < 100000000; i++) {
          Math.cos(100);
        }
      },
      [x],
    ]
  );
  return onEnd(
    createElement(
      "div",
      null,
      ...[
        trackCreateElement(
          '{"loc":{"start":{"line":21,"column":6},"end":{"line":21,"column":41}}}',
          TitleComponent,
          {}
        ),
        trackCreateElement(
          '{"loc":{"start":{"line":22,"column":6},"end":{"line":22,"column":41}}}',
          TitleComponent,
          {}
        ),
        trackCreateElement(
          '{"loc":{"start":{"line":23,"column":6},"end":{"line":23,"column":42}}}',
          ButtonComponent,
          {}
        ),
        createElement("button", {
          onclick: () => {
            setX(x + 1);
          },
          innerText: "Counter (that triggers an expensive effect): " + x,
        }),
      ]
    ),
    _startId
  );
};
const TitleComponent = ({ onStart: onStart, onEnd: onEnd }) => {
  const _startId = onStart();
  return onEnd(
    createElement("h1", {
      innerText: "Some random text",
    }),
    _startId
  );
};
const ButtonComponent = ({ onStart: onStart, onEnd: onEnd }) => {
  const _startId = onStart();
  return onEnd(
    createElement("button", {
      innerText: "A random button",
    }),
    _startId
  );
};
window.onload = () => {
  render(
    trackCreateElement(
      '{"loc":{"start":{"line":43,"column":9},"end":{"line":43,"column":39}}}',
      Component,
      {}
    ),
    document.getElementById("root")!
  );
};
```

### Known limitations

I took a few shortcuts for the sake of time, to acknowledge a few of them:

- Not all transforms would not pass the typescript type checker without errors, but all are runnable, so I just stripped types using the bun transpiler
- No attempt to avoid naming collisions
- custom hooks don’t track
  - I didn’t attempt to follow all the reference's custom hooks. Only primitive hooks called directly in the component body are supported
