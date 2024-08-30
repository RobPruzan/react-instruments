import { Event, start } from "./core/track";

type TimingData = {
  totalTime: number;
  count: number;
  reactMeta?: any;
};

type EventStore = {
  renderTimings: { [astMetadata: string]: TimingData };
  hookTimings: { [astMetadata: string]: TimingData };
  hookCbTimings: { [astMetadata: string]: TimingData };
  renderStartTimes: { [startId: string]: number };
  hookStartTimes: { [hookCallId: string]: number };
  hookCbStartTimes: { [cbId: string]: number };
  hookCallToAst: { [hookCallId: string]: string };
  cbIdToHookCallId: { [cbId: string]: string };
};

const store: EventStore = {
  renderTimings: {},
  hookTimings: {},
  hookCbTimings: {},
  renderStartTimes: {},
  hookStartTimes: {},
  hookCbStartTimes: {},
  hookCallToAst: {},
  cbIdToHookCallId: {},
};
function processEventBatch(events: Event[]) {
  events.forEach((event) => {
    switch (event.kind) {
      case "render-start":
        store.renderStartTimes[event.startId] = event.time;
        break;

      case "render-end":
        const renderStartTime = store.renderStartTimes[event.startId];
        if (renderStartTime !== undefined) {
          const renderDuration = event.time - renderStartTime;
          const astKey = event.astMetadata;

          if (!store.renderTimings[astKey]) {
            store.renderTimings[astKey] = {
              totalTime: 0,
              count: 0,
              reactMeta: event.reactMetadata,
            };
          }

          store.renderTimings[astKey].totalTime += renderDuration;
          store.renderTimings[astKey].count += 1;

          delete store.renderStartTimes[event.startId];
        }
        break;

      case "hook-start":
        store.hookStartTimes[event.hookCallId] = event.time;
        store.hookCallToAst[event.hookCallId] = event.astMetadata;
        break;

      case "hook-end":
        const hookStartTime = store.hookStartTimes[event.hookCallId];
        const hookAstKey = store.hookCallToAst[event.hookCallId];
        if (hookStartTime !== undefined && hookAstKey !== undefined) {
          const hookDuration = event.time - hookStartTime;

          if (!store.hookTimings[hookAstKey]) {
            store.hookTimings[hookAstKey] = { totalTime: 0, count: 0 };
          }

          store.hookTimings[hookAstKey].totalTime += hookDuration;
          store.hookTimings[hookAstKey].count += 1;

          delete store.hookStartTimes[event.hookCallId];
        }
        break;

      case "hook-cb-start":
        store.hookCbStartTimes[event.cbId] = event.time;
        store.cbIdToHookCallId[event.cbId] = event.hookCallId;
        break;

      case "hook-cb-end":
        const hookCbStartTime = store.hookCbStartTimes[event.cbId];
        const hookCallIdForCb = store.cbIdToHookCallId[event.cbId];
        const hookAstKeyForCb = store.hookCallToAst[hookCallIdForCb];

        if (!hookCbStartTime || !hookAstKeyForCb) {
          throw new Error("Invariant Error: Must have mapping");
        }
        const hookCbDuration = event.time - hookCbStartTime;

        if (!store.hookCbTimings[hookAstKeyForCb]) {
          store.hookCbTimings[hookAstKeyForCb] = {
            totalTime: 0,
            count: 0,
          };
        }

        store.hookCbTimings[hookAstKeyForCb].totalTime += hookCbDuration;
        store.hookCbTimings[hookAstKeyForCb].count += 1;

        delete store.hookCbStartTimes[event.cbId];
        delete store.cbIdToHookCallId[event.cbId];
        break;
    }
  });
}

const getRankedTimings = (timings: { [key: string]: TimingData }) => {
  return Object.entries(timings)
    .map(([key, data]) => ({
      astMetadata: JSON.parse(key),
      averageTime: data.totalTime / data.count,
      data,
    }))
    .sort((a, b) => b.averageTime - a.averageTime);
};

const server = Bun.serve({
  port: 8080,
  fetch: async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/demo") {
      const html = await Bun.file("index.html").text();
      const response = new Response(html, {
        status: 200,
        headers: {
          ["Content-Type"]: "text/html",
        },
      });
      return response;
    }

    if (url.pathname === "/dispatch") {
      if (!request.body) {
        throw new Error("Request must include instrumentation data in body");
      }

      const batch = (await Bun.readableStreamToJSON(
        request.body
      )) as Array<Event>;
      processEventBatch(batch);
      const renderRankings = getRankedTimings(store.renderTimings);
      const hookRankings = getRankedTimings(store.hookTimings);
      const hookCbRankings = getRankedTimings(store.hookCbTimings);

      console.log("Render Rankings:", renderRankings);
      console.log("Hook Rankings:", hookRankings);
      console.log("Hook Callback Rankings:", hookCbRankings);

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: {
          ["Content-Type"]: "application/json",
        },
      });
    }
    const js = await Bun.file(url.pathname.slice(1))
      .text()
      .catch(() => Bun.file(url.pathname.slice(1) + ".js").text());
    const response = new Response(js, {
      status: 200,
      headers: {
        ["Content-Type"]: "application/javascript",
      },
    });

    //
    return response;
  },
});

console.log("Running server at", server.port);
