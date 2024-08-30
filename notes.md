Making an instrumenting compiler

- High level goal
  - Modify source code that can send data over some communication channel (can abstract the channel) so that we can perform analysis over it at runtime
  - Need an ast of the users code, the underlying implementation does not matter
  - Can shove a bunch of the ast information through the communication channel
  - will probably just send over http, collect data in some task queue that can process the data to generate stats in real time, i don't really care how good this part is

Low level details needed:

- how to even make a babel transform
- does babel give us an ast
- how does babel allow code transformations after we identified what we want to transform
  - how do we identify what we want to transform
    - create element invocations
    - hooks calls
    - render information
    - time taken to render
      - maintain a stack
  - ok just gotta mutate the transformer, not too bad just gotta learn the api a little
  - get it working for a trivial example, then work our way up
- can have a map of component instance, can track time it took to render, can track number of children
- i wouldn't mind having enough information to flame graph, so we need to make a caller id

- new idea, what if we update the code itself so we go to the definition of the caller. Then we mutate it so at the top of def we start, get back a start id. Then it ends by in the return calling a function that takes in the expression + the startId, ends the start id and sends the event. We can work on getting more info after
- maybe we can batch events keeping the order alive, then flushing to server
