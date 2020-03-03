// TODO: implement this

const config = {
  context: {
    query: null,
    hits: [],
    highlightedIndex: null,
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
          entry: ['setHits', 'openOrCloseDropdown'],
          on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
        },
      },
    },
    {
      id: 'dropdown',
      initial: 'closed',
      states: {
        closed: {
          on: { OPEN: 'opened', ESCAPE: 'reset' },
        },
        opened: {
          on: { CLOSE: 'closed', ESCAPE: 'closed' },
        },
        reset: {
          entry: ['resetEverything'],
          redirectTo: 'closed',
        },
      },
    },
    {
      id: 'highlight',
      initial: 'none',
      states: {
        none: {
          entry: ['resetHighlightedIndex'],
          on: {
            HIGHLIGHT_NEXT: { target: 'highlighted', cond: 'hasHits' },
            HIGHLIGHT_PREV: { target: 'highlighted', cond: 'hasHits' },
            HIGHLIGHT_SPECIFIC_INDEX: 'highlighted',
          },
        },
        highlighted: {
          entry: ['updateHighlightedIndex'],
          on: {
            HIGHLIGHT_NEXT: 'highlighted',
            HIGHLIGHT_PREV: 'highlighted',
            HIGHLIGHT_SPECIFIC_INDEX: 'highlighted',
            RESET_HIGHLIGHT: 'none',
          },
        },
      },
    },
  ],
  actions: {
    // setContext, send, type, data, context
    resetSearch: ({ setContext }) => {
      setContext({
        hits: [],
        query: null,
      });
    },
    setQuery: ({ setContext, data }) => {
      setContext({
        query: data.query,
      });
    },
    search: ({ send, data }) => {
      const query = data.query;
      const hits = [
        { title: `hello1 from ${query}` },
        { title: `hello2 from ${query}` },
      ];
      setTimeout(() => {
        send({ type: 'FETCHED', data: { hits } });
      }, 100);
    },
    setHits: ({ setContext, data }) => {
      setContext({
        hits: data.hits,
      });
    },
    openOrCloseDropdown: ({ send, data }) => {
      if ((data.hits || []).length > 0) {
        send('OPEN');
      } else {
        send('CLOSE');
      }
    },
    resetEverything: ({ send }) => {
      send('RESET_SEARCH');
      send('RESET_HIGHLIGHT');
    },
    resetHighlightedIndex: ({ setContext }) => {
      setContext({
        highlightedIndex: null,
      });
    },
    updateHighlightedIndex: ({ setContext, type, data, context }) => {
      const { hits, highlightedIndex } = context;
      const { specificIndex } = data;

      let finalHighlightedIndex;
      if (specificIndex !== undefined) {
        finalHighlightedIndex = specificIndex;
      } else if (highlightedIndex === null) {
        finalHighlightedIndex = 0;
      } else if (type === 'HIGHLIGHT_NEXT') {
        finalHighlightedIndex =
          highlightedIndex + 1 < hits.length ? highlightedIndex + 1 : 0;
      } else if (type === 'HIGHLIGHT_PREV') {
        finalHighlightedIndex =
          highlightedIndex - 1 >= 0 ? highlightedIndex - 1 : hits.length - 1;
      } else {
        finalHighlightedIndex = null;
      }
      setContext({
        highlightedIndex: finalHighlightedIndex,
      });
    },
  },
  guards: {
    hasHits: ({ context }) => {
      return (context.hits || []).length > 0;
    },
  },
};

const { send, listen } = createMachine(config);

listen.onContextChange(context => {
  console.log(context);
});

listen.onStateChange(state => {
  console.log(state);
});

// context === {
//   query: null,
//   hits: [],
//   highlightedIndex: null
// }

// state === {
//   searchBox: 'initial',
//   dropdown: 'closed',
//   highlight: 'none'
// }

// send("ABC") -> sends "ABC" to all machines.

// send("searchBox.ABC") -> sends "ABC" to "searchBox" machine.
