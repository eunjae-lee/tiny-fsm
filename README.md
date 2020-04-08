# Tiny FSM

## What is this?

This is a tiny library for finite state machine. The gzipped bundle size is around 1kb.

## Demo

- AutoComplete: https://codesandbox.io/s/github/eunjae-lee/tiny-fsm/tree/master/examples/autocomplete

## Who should use this?

You'd better just use [@xstate/fsm](https://xstate.js.org/docs/packages/xstate-fsm/).

I wanted to use it, but it doesn't provide parallel states, so I made this.

This is not a serious project, but more of an outcome of what I tried myself.

Use [xstate](https://xstate.js.org/docs/) if you can.

However, tiny-fsm is good enough if it meets your needs.

## Installation

```
npm install tiny-fsm
or
yarn add tiny-fsm
```

## Usage

```js
import { createMachine } from 'tiny-fsm';

const config = {
  context: {
    query: null,
    hits: [],
  },
  machine: [
    {
      id: 'searchBox',
      initial: 'initial',
      states: {
        initial: {
          entry: ['resetSearch'],
          on: { INPUT: 'searching' },
        },
        searching: {
          entry: ['setQuery', 'search'],
          on: {
            FETCHED: 'success',
            INPUT: 'searching',
            RESET_SEARCH: 'initial',
          },
        },
        success: {
          entry: ['setHits'],
          on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
        },
      },
    },
  ],
  actions: {
    resetSearch: ({ setContext }) => {
      setContext({
        hits: [],
        query: null,
      });
    },
    setQuery: ({ setContext, data: { query } }) => {
      setContext({
        query,
      });
    },
    search: async ({ data: { query }, send }) => {
      const hits = await search(query);
      send({ type: 'FETCHED', data: { hits } });
    },
    setHits: ({ setContext, data: { hits } }) => {
      setContext({
        hits,
      });
    },
  },
};

const { getState, getContext, send } = createMachine(config);
send({ type: 'INPUT', data: { query: 'hello' } });
console.log(getState()); // { searchBox: 'searching' }
console.log(getContext()); // { query: 'hello', hits: [] }
```

## Documentation

It's not ready. However, the demo shows almost all the features tiny-fsm provides.
