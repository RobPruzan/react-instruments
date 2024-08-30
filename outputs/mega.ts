// import * as React from "../react-scratch/src/react/core";
import {
  createContext,
  createElement,
  useState,
  useEffect,
  useMemo,
  useRef,
  buildReactTrees,
  deepTraverseAndModify,
  render,
  useContext,
} from "../react-scratch/src/react/core";
export const Bar = () => {
  const [isRenderingSpan, setIsRenderingSpan] = useState(false);
  const [x, setX] = useState(2);
  return createElement(
    "area",
    {},
    createElement(Foo, null),
    createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    createElement("button", {
      innerText: `Count: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    }),
    isRenderingSpan &&
      createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};
export const ConditionalRender = () => {
  const [isRenderingSpan, setIsRenderingSpan] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", {
      innerText: "conditional render",
      onclick: () => {
        setIsRenderingSpan(!isRenderingSpan);
      },
    }),
    isRenderingSpan &&
      createElement("span", {
        style:
          "display:flex; height:50px; width:50px; background-color: white;",
      })
  );
};
export const Foo = () => {
  const [x, setX] = useState(2);
  const foo = createElement(
    "div",
    {},
    createElement("article", null),
    createElement("button", {
      innerText: `another counter, a little deeper: ${x}`,
      onclick: () => {
        setX(x + 1);
      },
    })
  );
  return foo;
};
export const PropsTest = (props: any) => {
  const [update, setUpdate] = useState(false);
  return createElement(
    "div",
    {
      innerText: "hi",
    },
    createElement("button", {
      innerText: "trigger update",
      onclick: () => {
        // console.log('el', );

        setUpdate(!update);
      },
    }),
    ...props.children
  );
};
export const IsAChild = () => {
  return createElement("div", {
    innerText: "im a child!",
  });
};
export const Component = (props: any) => {
  const [x, setX] = useState(2);
  return createElement(
    "div",
    {
      lol: "ok",
    },
    createElement("button", {
      innerText: "so many counters me",
      onclick: () => {
        setX(x + 1);
      },
    }),
    createElement("div", {
      innerText: `look at this count?: ${x}`,
      style: "color:white;",
    }),
    createElement(Bar, null),
    createElement("span", {
      innerText: "im a span!",
    })
  );
};
export const SimpleParent = (props: any) => {
  const [x, setX] = useState(2);
  return createElement(
    "div",
    null,
    createElement("button", {
      onclick: () => {
        // setTimeout(() => {
        //   console.log("doing it!!");
        //   document.getElementById("nest-this")!.id = "test";
        // }, 1500);
        setX(x + 1);
      },
      innerText: "trigger update",
    }),
    createElement("div", {
      innerText: "parent of the simple parent",
    }),
    ...props.children
  );
};
export const NestThis = () => {
  const [x, setX] = useState(2);
  return createElement(
    "div",
    {
      id: "nest-this",
    },
    createElement(SimpleChild, null),
    createElement(SimpleParent, null, createElement(SimpleChild, null)),
    // createElement("div", {
    //   innerText: "part of the simple child",
    // }),
    // this breaks current reconciliation, it obviously can't correctly map
    createElement(Increment, null),
    createElement(Increment, null),
    createElement(Component, null),
    createElement(
      "div",
      {
        style: "color:blue",
      },
      createElement("button", {
        innerText: "RERENDER IT ALLL" + x,
        onclick: () => {
          setX(x + 1);
        },
        style: "color: orange",
      })
    )
  );
};
export const AnotherLevel = () => {
  return createElement(
    "div",
    null,
    createElement(Increment, null),
    createElement(Increment, null)
  );
};
export const Increment = () => {
  const [x, setX] = useState(2);
  console.log("re-running and reading", x);
  return createElement(
    "div",
    {
      style: "color:blue",
    },
    createElement("button", {
      innerText: "so many counters me:" + x,
      onclick: () => {
        setX(x + 1);
      },
      style: "color: orange",
    })
  );
};
export const SimpleChild = () => {
  return createElement("h2", {
    innerText: "Im a simple child!!",
  });
};
export const RandomElement = () => {
  const [random] = useState(Math.random());
  const ref = useRef(0);
  useEffect(() => {
    // console.log("mounting!", random);
    return () => {
      // console.log("cleanup");
    };
  }, []);
  return createElement("div", {
    innerText: random,
  });
};
export const OuterWrapper = () => {
  const [counter, setCounter] = useState(0);
  const [toggleInner, setToggleInner] = useState(true);
  const [items, setItems] = useState([1, 2, 3, 4]);
  return createElement(
    "div",
    {
      id: "outer-wrapper",
      style: "border: 2px solid black; padding: 10px; margin: 10px;",
    },
    createElement("div", {
      innerText: "Counter: " + counter,
    }),
    createElement("button", {
      onclick: () => setCounter(counter + 1),
      innerText: "Increase Counter",
    }),
    createElement("button", {
      onclick: () => setToggleInner(!toggleInner),
      innerText: toggleInner ? "Hide Inner" : "Show Inner",
    }),
    createElement("button", {
      onclick: () => {
        setItems([...items, Math.random()]);
      },
      innerText: "Add a random value",
    }),
    createElement("button", {
      onclick: () => {
        setItems(items.slice(0, -1));
      },
      innerText: "Remove last value",
    }),
    toggleInner &&
      createElement(InnerWrapper, {
        counter,
      }),
    createElement(DualIncrementer, null),
    ...items.map((i) =>
      createElement("div", null, createElement(RandomElement, null))
    ),
    // need to do some light debugging on this
    createElement(DualIncrementer, null),
    createElement(DualIncrementer, null)
    // createElement(DualIncrementer, null)
  );
};
export const InnerWrapper = ({ counter }: any) => {
  const [innerCounter, setInnerCounter] = useState(0);

  // this evaluates in the wrong order for our logic to work
  // it will push it last
  // but why does that matter ,we initially had the sassumption all that wuld matter was the view tree
  // because we traverse the lrender node to generate the view tree, so of course that order would matter
  // we may need a temp ds to keep track of this tree so we can properly reconstruct it
  // the children could be useful? Using the return values instead of over complicating it
  return createElement(
    "div",
    {
      id: "IM AN INNER",
      style: "border: 1px solid gray; padding: 10px; margin: 10px;",
    },
    createElement("div", {
      innerText: "Inner Counter: " + innerCounter,
    }),
    createElement("button", {
      onclick: () => setInnerCounter(innerCounter + 1),
      innerText: "Increase Inner Counter",
    }),
    createElement("div", {
      innerText: "Outer Counter Value: " + counter,
    }),
    createElement(LeafComponent, null),
    createElement(ContainerComponent, null)
  );
};
export const LeafComponent = () => {
  return createElement("div", {
    id: "leaf-component",
    style: "padding: 5px; margin: 5px; background-color: lightgray;",
    innerText: "Leaf Component Content",
  });
};
export const ContainerComponent = () => {
  return createElement(
    "div",
    {
      id: "container-component",
      style: "padding: 5px; margin: 5px; background-color: lightblue;",
    },
    createElement(LeafComponent, null)
    // createElement(LeafComponent, null)
  );
};
export const DualIncrementer = () => {
  const [value, setValue] = useState(0);
  return createElement(
    "div",
    {
      id: "dual-incrementer",
      style: "padding: 5px; margin: 5px; border: 1px solid red;",
    },
    createElement("div", {
      innerText: "Current Value: " + value,
    }),
    createElement("button", {
      onclick: () => setValue(value + 1),
      innerText: "Increase Value",
    })
  );
};
const ActionButton = () => {
  const testReadContext = useContext(TestContext);
  console.log({
    testReadContext,
  });
  return createElement(
    "div",
    {
      id: "action-button",
      style: "padding: 5px; margin: 5px; border: 1px solid green;",
    },
    createElement("button", {
      onclick: () => alert("Action performed!"),
      innerText: "Perform Action, reading value of: " + testReadContext.hello,
    })
  );
};
export const MainComponent = ({ children }: any) => {
  const [x, setX] = useState(2);
  const memoXPlusOne = useMemo(() => x + 1, [x]);
  return createElement(
    // @ts-ignore
    TestContext.Provider,
    {
      value: {
        hello: x,
      },
    },
    createElement(LeafComponent, null),
    // createElement(
    //   ContainerComponent,
    //   null,
    //   createElement(LeafComponent, null)
    // ),
    createElement(DualIncrementer, null),
    // createElement(DualIncrementer, null),
    createElement(ActionButton, null),
    createElement(OuterWrapper, null),
    createElement("div", {
      innerText: "memo'd x + 1: " + memoXPlusOne,
    }),
    createElement(
      "div",
      {
        style: "color:blue",
      },
      createElement("button", {
        onclick: () => setX(x + 1),
        innerText: "RERENDER EVERYTHING " + x,
        style: "color: orange",
      })
    ),
    ...children
  );
};
export const MegaChild = () => {
  console.log("megachild re-render");
  return createElement("div", {
    innerText: "ima mega child",
  });
};
const ConditionalTest = () => {
  const [cond, setCond] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", {
      innerText: "toggle",
      onclick: () => {
        setCond(!cond);
      },
    }),
    cond &&
      createElement("div", {
        innerText: "look at me!!",
      })
  );
};
const AddItemsTest = () => {
  const [items, setItems] = useState([3]);
  return createElement(
    "div",
    null,
    createElement("button", {
      innerText: "Add random num",
      onclick: () => {
        setItems([...items, Math.random()]);
      },
    }),
    createElement("button", {
      innerText: "Remove random num",
      onclick: () => {
        setItems(items.slice(0, -1));
      },
    }),
    createElement(ConditionalTest, null),
    ...items.map((item) =>
      createElement("div", {
        innerText: item,
      })
    )
  );
};
const ListTest = () => {
  const [prev, trigger] = useState(false);
  const x = Array.from({
    length: 10,
  }).map(() => createElement(RandomElement, null));
  return createElement(
    "span",
    {
      root: "me",
    },
    createElement("button", {
      innerText: "re-render",
      onclick: () => {
        trigger(!prev);
      },
    }),
    createElement("div", {
      innerText: "what",
    }),
    ...x
  );
};
const Wrapper = () => {
  return createElement(ListTest, {});
};
const ListAndItemUnder = () => {
  const [items, setItems] = useState([1, 2, 3]);
  return createElement(
    "div",
    {
      style: "display:flex; flex-direction: column",
    },
    createElement("button", {
      innerText: "add item",
      onclick: () => setItems([...items, items.length + 1]),
    }),
    createElement("button", {
      innerText: "remove item",
      onclick: () => setItems([...items.slice(0, -1)]),
    }),
    createElement("span", {
      innerText: "above probably bugged",
    }),
    // createElement(
    //   "div",
    //   { style: "display:flex; flex-direction: column" },
    ...items.map((item) =>
      createElement("span", {
        innerText: item,
      })
    ),
    // ),
    createElement("div", {
      style: "border: 2px solid black",
      innerText: "im bugged",
    })
  );
};
if (typeof window === "undefined") {
  const { reactViewTree, reactRenderTree } = buildReactTrees(
    createElement(Increment, null)
  );
  console.log(JSON.stringify(deepTraverseAndModify(reactViewTree)));
} else {
  window.onload = () => {
    render(
      // DeadParent,
      // createElement(DeadParent, null),
      // createElement(ListAndItemUnder, null),
      createElement(MainComponent, null, createElement(DataFetcher, null)),
      // createElement(
      //   SimpleParent,
      //   null,
      //   createElement(SimpleChild, null)
      // ),
      // createElement(IsItARootTHing, null),
      // createElement(Repro, null),
      // OuterWrapper
      // createElement(Wrapper, null),
      // createElement(OuterWrapper, null),
      // createElement(AddItemsTest, null),
      // createElement(Increment, null),
      // createElement(ConditionalTest, null),
      document.getElementById("root")!
    );
  };
}
const IsItARootTHing = () => {
  return createElement(
    "div",
    null,
    createElement(SimpleParent, null, createElement(SimpleChild, null))
  );
};
const DeadParent = () => {
  const [x, setX] = useState(0);
  return createElement(
    "div",
    {
      style: "color:blue",
    },
    createElement("button", {
      innerText: "parent dies" + x,
      onclick: () => {
        setX(x + 1);
      },
      style: "color: orange",
    }),
    createElement(ConditionalTest, null),
    createElement(RenrenderedChild, null)
  );
};
const RenrenderedChild = () => {
  const [x, setX] = useState(10);
  return createElement(
    "div",
    {
      style: "color:blue",
    },
    createElement("button", {
      innerText: "re-render child" + x,
      onclick: () => {
        setX(x + 1);
      },
      // style: "color: orange",
    })
  );
};
const Repro = () => {
  const [toggleInner, setToggleInner] = useState(true);
  return createElement(
    "div",
    {
      id: "outer-wrapper",
      style: "border: 2px solid black; padding: 10px; margin: 10px;",
    },
    createElement("button", {
      onclick: () => setToggleInner(!toggleInner),
      innerText: toggleInner ? "Hide Inner" : "Show Inner",
    }),
    toggleInner &&
      createElement("div", {
        innerText: "pls break",
      }),
    createElement("div", null)
  );
};
const TestContext = createContext({
  hello: 2,
});
const ContextTest = () => {
  const readContext = useContext(TestContext);
  console.log("being rendered");
  console.log(readContext);
  return createElement(
    "span",
    {
      innerText: "test" + readContext.hello,
    },
    createElement(EvenLower, null)
  );
};
const EvenLower = () => {
  const readContext = useContext(TestContext);
  console.log("being rendered lower");
  console.log(readContext);
  return createElement("span", {
    innerText: "test lower" + readContext.hello,
  });
};
const ParentContextTest = () => {
  return createElement(
    // @ts-ignore
    TestContext.Provider,
    {
      value: {
        hello: 10,
      },
    },
    createElement(ContextTest, null)
  );
};
const DataFetcher = () => {
  const [data, setData] = useState<Array<any>>([]);
  useEffect(() => {
    console.log("fetching");
    fetch("https://jsonplaceholder.typicode.com/posts")
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      });
    return () => {
      setData([]);
    };
  }, []);
  return createElement(
    "div",
    null,
    ...data.map((item) =>
      createElement("div", {
        innerText: item.title,
      })
    )
  );
};
