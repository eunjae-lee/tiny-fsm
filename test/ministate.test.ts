import { createMachine, CreateMachineConfig } from '../src';

const config: CreateMachineConfig = {
  machine: {
    id: 'searchBox',
    initial: 'initial',
    states: {
      initial: {
        on: { INPUT: 'searching' },
      },
      searching: {
        on: {
          FETCHED: 'success',
          INPUT: 'searching',
          RESET_SEARCH: 'initial',
        },
      },
      success: {
        on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
      },
    },
  },
};

describe('tiny-fsm', () => {
  it('has correct initial state', () => {
    const { getState } = createMachine(config);
    expect(getState()).toEqual({
      searchBox: 'initial',
    });
  });

  describe('send', () => {
    const configWithMultipleMachines: CreateMachineConfig = {
      machine: [
        {
          id: 'searchBox',
          initial: 'initial',
          states: {
            initial: {
              on: { INPUT: 'searching' },
            },
            searching: {
              on: {
                FETCHED: 'success',
                INPUT: 'searching',
                RESET_SEARCH: 'initial',
              },
            },
            success: {
              on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
            },
          },
        },
        {
          id: 'searchBox2',
          initial: 'initial',
          states: {
            initial: {
              on: { INPUT: 'searching' },
            },
            searching: {
              on: {
                FETCHED: 'success',
                INPUT: 'searching',
                RESET_SEARCH: 'initial',
              },
            },
            success: {
              on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
            },
          },
        },
      ],
    };

    it('changes state', () => {
      const { send, getState } = createMachine(config);
      send('INPUT');
      expect(getState()).toEqual({
        searchBox: 'searching',
      });
    });

    it('does not change state with unknown event', () => {
      const { send, getState } = createMachine(config);
      send('UNKNOWN');
      expect(getState()).toEqual({
        searchBox: 'initial',
      });
    });

    it('changes state of multiple machines', () => {
      const { send, getState } = createMachine(configWithMultipleMachines);
      send('INPUT');
      expect(getState()).toEqual({
        searchBox: 'searching',
        searchBox2: 'searching',
      });
    });

    it('changes state of specific machine', () => {
      const { send, getState } = createMachine(configWithMultipleMachines);
      send('searchBox2.INPUT');
      expect(getState()).toEqual({
        searchBox: 'initial',
        searchBox2: 'searching',
      });
    });
  });

  describe('entry', () => {
    describe('run actions', () => {
      it('runs action on initial state', () => {
        const reset = jest.fn();
        const config: CreateMachineConfig = {
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                entry: ['reset'],
                on: { INPUT: 'searching' },
              },
              searching: {
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            reset,
          },
        };
        createMachine(config);
        expect(reset).toHaveBeenCalledTimes(1);
      });

      it('runs after setting state', done => {
        const config: CreateMachineConfig = {
          context: {
            query: null,
          },
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['setQuery'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            setQuery: ({ setContext, data }) => {
              setContext({
                query: data.query,
              });
            },
          },
        };
        const { listen, send } = createMachine(config);
        let contextChanged = false;
        listen.onContextChange(() => {
          contextChanged = true;
        });
        listen.onStateChange(() => {
          expect(contextChanged).toBe(false);
          done();
        });
        send({ type: 'INPUT', data: { query: 'hello' } });
      });

      it('does not trigger actions of other irrelevant state', () => {
        const setQuery = jest.fn();
        const config: CreateMachineConfig = {
          context: {
            query: null,
          },
          machine: [
            {
              id: 'searchBox',
              initial: 'initial',
              states: {
                initial: {
                  on: { INPUT: 'searching' },
                },
                searching: {
                  entry: ['setQuery'],
                  on: {
                    INPUT: 'searching',
                  },
                },
              },
            },
            {
              id: 'dropdown',
              initial: 'closed',
              states: {
                closed: {
                  on: { OPEN: 'opened' },
                },
                opened: {
                  on: { CLOSE: 'closed' },
                },
              },
            },
          ],
          actions: {
            setQuery,
          },
        };
        const { send } = createMachine(config);
        send('INPUT');
        expect(setQuery).toHaveBeenCalledTimes(1);
        send('OPEN');
        expect(setQuery).toHaveBeenCalledTimes(1);
      });
    });

    describe('setContext', () => {
      it('has setContext parameter', () => {
        const config: CreateMachineConfig = {
          context: {
            query: null,
            hits: null,
            something: null,
          },
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                entry: ['reset'],
                on: { INPUT: 'searching' },
              },
              searching: {
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            reset: ({ setContext }) => {
              setContext({
                query: '',
                hits: [],
              });
              setContext({
                something: 'else',
              });
            },
          },
        };
        const { getContext } = createMachine(config);
        expect(getContext()).toEqual({
          query: '',
          hits: [],
          something: 'else',
        });
      });
    });
    describe('send', () => {
      it('has send parameter', () => {
        const config: CreateMachineConfig = {
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['search'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            search: ({ send }) => {
              send('FETCHED');
            },
          },
        };
        const { send, getState } = createMachine(config);
        send('INPUT');
        expect(getState()).toEqual({
          searchBox: 'success',
        });
      });
    });
    describe('type', () => {
      it('has type parameter', () => {
        const search = jest.fn();
        const config: CreateMachineConfig = {
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['search'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            search,
          },
        };
        const { send } = createMachine(config);
        send('INPUT');
        expect(search).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'INPUT',
          })
        );
      });
    });
    describe('data', () => {
      it('has data parameter', () => {
        const search = jest.fn();
        const config: CreateMachineConfig = {
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['search'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            search,
          },
        };
        const { send } = createMachine(config);
        send({ type: 'INPUT', data: { query: 'Hello' } });
        expect(search).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { query: 'Hello' },
          })
        );
      });
    });
    describe('context', () => {
      it('has context parameter', () => {
        const initialCheck = jest.fn();
        const checkContext = jest.fn();
        const config: CreateMachineConfig = {
          context: {
            query: null,
            something: 'else',
          },
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                entry: ['initialCheck'],
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['search', 'checkContext'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            initialCheck,
            search: ({ setContext, data }) => {
              setContext({
                query: data.query,
              });
            },
            checkContext,
          },
        };
        const { send } = createMachine(config);
        expect(initialCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            context: {
              query: null,
              something: 'else',
            },
          })
        );
        send({ type: 'INPUT', data: { query: 'hello' } });
        expect(checkContext).toHaveBeenCalledWith(
          expect.objectContaining({
            context: {
              query: 'hello',
              something: 'else',
            },
          })
        );
      });

      it('gets correct context when context is set asynchronously', done => {
        const config: CreateMachineConfig = {
          context: {
            query: null,
          },
          machine: {
            id: 'searchBox',
            initial: 'initial',
            states: {
              initial: {
                on: { INPUT: 'searching' },
              },
              searching: {
                entry: ['search'],
                on: {
                  FETCHED: 'success',
                  INPUT: 'searching',
                  RESET_SEARCH: 'initial',
                },
              },
              success: {
                on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
              },
            },
          },
          actions: {
            search: ({ setContext, data }) => {
              setTimeout(() => {
                setContext({
                  query: data.query,
                });
              }, 100);
            },
          },
        };
        const { send, getContext } = createMachine(config);
        send({ type: 'INPUT', data: { query: 'hello' } });
        expect(getContext()).toEqual({
          query: null,
        });
        setTimeout(() => {
          expect(getContext()).toEqual({
            query: 'hello',
          });
          done();
        }, 100);
      });
    });
  });
  describe('exit', () => {
    it('runs action on exit', () => {
      const noMoreInitial = jest.fn();
      const config: CreateMachineConfig = {
        machine: {
          id: 'searchBox',
          initial: 'initial',
          states: {
            initial: {
              exit: ['noMoreInitial'],
              on: { INPUT: 'searching' },
            },
            searching: {
              on: {
                FETCHED: 'success',
                INPUT: 'searching',
                RESET_SEARCH: 'initial',
              },
            },
            success: {
              on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
            },
          },
        },
        actions: {
          noMoreInitial,
        },
      };
      const { send } = createMachine(config);
      send('INPUT');
      expect(noMoreInitial).toHaveBeenCalledTimes(1);
    });
  });
  describe('redirect implementation by using entry action', () => {
    const config: CreateMachineConfig = {
      context: {
        query: null,
      },
      machine: {
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
            entry: ['redirect'],
            on: { REDIRECT: 'closed' },
          },
        },
      },
      actions: {
        redirect: ({ send }) => {
          send('REDIRECT');
        },
      },
    };
    const { send, getState } = createMachine(config);
    send('ESCAPE');
    expect(getState()).toEqual({
      dropdown: 'closed',
    });
  });
  describe('guards', () => {
    it('moves to next state only when condition is met', () => {
      const indexUpdated = jest.fn();
      const config: CreateMachineConfig = {
        context: {
          highlightedIndex: null,
          hits: [{ name: 'Apple iPhone XR' }, { name: 'Apple iPhone 11 Pro' }],
        },
        machine: {
          id: 'highlight',
          initial: 'none',
          states: {
            none: {
              on: {
                HIGHLIGHT_NEXT: { target: 'highlighted', cond: 'hasNextHit' },
              },
            },
            highlighted: {
              entry: ['updateHighlightedIndex'],
              on: {
                HIGHLIGHT_NEXT: { target: 'highlighted', cond: 'hasNextHit' },
              },
            },
          },
        },
        actions: {
          updateHighlightedIndex: ({ context, setContext, type }) => {
            if (type === 'HIGHLIGHT_NEXT') {
              setContext({
                highlightedIndex:
                  context.highlightedIndex === null
                    ? 0
                    : context.highlightedIndex + 1,
              });
              indexUpdated();
            }
          },
        },
        guards: {
          hasNextHit: ({ context /* , state, type, data */ }) => {
            if (context.highlightedIndex === null) {
              return true;
            } else if (context.highlightedIndex + 1 < context.hits.length) {
              return true;
            } else {
              return false;
            }
          },
        },
      };
      const { send, getState, getContext } = createMachine(config);
      send('HIGHLIGHT_NEXT');
      expect(getState()).toEqual({
        highlight: 'highlighted',
      });
      expect(getContext()).toEqual(
        expect.objectContaining({
          highlightedIndex: 0,
        })
      );

      send('HIGHLIGHT_NEXT');
      expect(getState()).toEqual({
        highlight: 'highlighted',
      });
      expect(getContext()).toEqual(
        expect.objectContaining({
          highlightedIndex: 1,
        })
      );

      send('HIGHLIGHT_NEXT');
      expect(getState()).toEqual({
        highlight: 'highlighted',
      });
      expect(getContext()).toEqual(
        expect.objectContaining({
          highlightedIndex: 1,
        })
      );

      expect(indexUpdated).toHaveBeenCalledTimes(2);
    });
  });

  describe('listen', () => {
    const config: CreateMachineConfig = {
      context: {
        query: null,
      },
      machine: {
        id: 'searchBox',
        initial: 'initial',
        states: {
          initial: {
            on: { INPUT: 'searching' },
          },
          searching: {
            entry: ['search'],
            on: {
              FETCHED: 'success',
              INPUT: 'searching',
              RESET_SEARCH: 'initial',
            },
          },
          success: {
            on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
          },
        },
      },
      actions: {
        search: ({ setContext, data }) => {
          setContext({
            query: data.query,
          });
        },
      },
    };

    describe('onContextChange', () => {
      it('is called', done => {
        const { send, listen } = createMachine(config);
        listen.onContextChange(context => {
          expect(context).toEqual({
            query: 'hello',
          });
          done();
        });
        send({ type: 'INPUT', data: { query: 'hello' } });
      });
    });
    describe('onStateChange', () => {
      it('is called', done => {
        const { send, listen } = createMachine(config);
        listen.onStateChange(state => {
          expect(state).toEqual({
            searchBox: 'searching',
          });
          done();
        });
        send({ type: 'INPUT', data: { query: 'hello' } });
      });
    });
  });

  describe('setActions', () => {
    const config: CreateMachineConfig = {
      context: {
        query: null,
      },
      machine: {
        id: 'searchBox',
        initial: 'initial',
        states: {
          initial: {
            on: { INPUT: 'searching' },
          },
          searching: {
            entry: ['search', 'anotherAction'],
            on: {
              FETCHED: 'success',
              INPUT: 'searching',
              RESET_SEARCH: 'initial',
            },
          },
          success: {
            on: { INPUT: 'searching', RESET_SEARCH: 'initial' },
          },
        },
      },
      actions: {
        search: ({ setContext, data }) => {
          setContext({
            query: data.query,
          });
        },
      },
    };

    it('can setActions later', () => {
      const { setActions, send } = createMachine(config);
      const anotherAction = jest.fn();
      setActions({
        anotherAction,
      });

      send({ type: 'INPUT', data: { query: 'hello' } });
      expect(anotherAction).toHaveBeenCalledTimes(1);
    });
  });
});
