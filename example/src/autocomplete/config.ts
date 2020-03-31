import { CreateMachineConfig } from 'tiny-fsm';
import { search } from '../search';

export type Context = {
  query: string | null;
  hits: any[];
  highlightedIndex: number | null;
};

export const config: CreateMachineConfig<Context> = {
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
          entry: ['resetEverything', 'redirectToClosed'],
          on: { REDIRECT_TO_CLOSED: 'closed' },
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
    openOrCloseDropdown: ({ send, data: { hits } }) => {
      if ((hits || []).length > 0) {
        send('OPEN');
      } else {
        send('CLOSE');
      }
    },
    resetHighlightedIndex: ({ setContext }) => {
      setContext({ highlightedIndex: null });
    },
    updateHighlightedIndex: ({
      setContext,
      type,
      context: { highlightedIndex, hits },
      data: { specificIndex } = {},
    }) => {
      if (specificIndex !== undefined) {
        setContext({ highlightedIndex: specificIndex });
      } else if (highlightedIndex === null) {
        setContext({ highlightedIndex: 0 });
      } else if (type === 'HIGHLIGHT_NEXT') {
        setContext({
          highlightedIndex:
            highlightedIndex + 1 < hits.length ? highlightedIndex + 1 : 0,
        });
      } else if (type === 'HIGHLIGHT_PREV') {
        setContext({
          highlightedIndex:
            highlightedIndex - 1 >= 0 ? highlightedIndex - 1 : hits.length - 1,
        });
      } else {
        setContext({ highlightedIndex: null });
      }
    },
    resetEverything: ({ send }) => {
      send('RESET_SEARCH');
      send('RESET_HIGHLIGHT');
    },
  },
  guards: {
    hasHits: ({ context: { hits } }) => {
      return (hits || []).length > 0;
    },
  },
};
