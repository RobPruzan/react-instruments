import { Event, start } from "./core/track";

// const store = {
//   subscribers: [] as Array<() => void>,
//   subscribe: () => {},
//   publish: () => {
//     store.subscribers.forEach((subscriber) => {
//       subscriber();
//     });
//   },
// };

const eventsToStats = (events: Array<Event>) => {
  const eventMapping: Record<string, Event> = {};
  events.forEach((startEvent) => {
    if (startEvent.kind !== "render-start") {
      return;
    }
    const endEvent = events.find(
      (e) => e.kind === "render-end" && e.startId === startEvent.startId
    )!;

    console.log(
      "Render for",
      startEvent.reactMetadata.componentName,
      "at line",
      JSON.parse(startEvent.astMetadata).loc.start.line,
      "took",
      endEvent.time - startEvent.time
    );
  });

  // events.forEach(event => {

  //   const endEvent = eventMapping[event.startId]
  // })
};

const server = Bun.serve({
  port: 8080,
  fetch: async (request) => {
    console.log("got req");
    // const url = new URL(request.url);

    if (!request.body) {
      throw new Error("Request must include instrumentation data in body");
    }

    const body = (await Bun.readableStreamToJSON(request.body)) as Event;

    eventsToStats(body);
    console.log("rec event", body);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        ["Content-Type"]: "application/json",
      },
    });
  },
});

console.log("Running server at", server.port);
