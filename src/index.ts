const INITIAL_DUMMY_TYPE = 'tiny-fsm.init';

type StateName = string;
type EventName = string;
type EventWithData = {
  type: EventName;
  data: any;
};
type Event = EventName | EventWithData;
type GuardName = string;
type StateNameWithGuard = {
  target: StateName;
  cond: GuardName;
};
type GuardParams<TContext> = {
  context: TContext;
  state: unknown;
  type: EventName;
  data: ActionData;
};
type Guard<TContext> = (params: GuardParams<TContext>) => boolean;

type StateDefinition = {
  entry?: ActionName[];
  exit?: ActionName[];
  on?: {
    [key in EventName]: StateName | StateNameWithGuard;
  };
};

type ActionData = any;
type ActionName = string;
type SetContext<TContext> = (context: Partial<TContext> | undefined) => void;
type Send = (event: Event) => void;
type ContextRef<TContext> = { current: TContext };
type State = Record<string, StateName>;
type StateRef = { current: State };
type InternalActionParams<TContext> = {
  send: Send;
  type: EventName;
  data: ActionData;
  contextRef: ContextRef<TContext>;
};
type ActionParams<TContext> = {
  setContext: SetContext<TContext>;
  send: Send;
  type: EventName;
  data: ActionData;
  context: TContext;
};
type Action<TContext> = (actionParams: ActionParams<TContext>) => void;

type Machine = {
  id: string;
  initial: StateName;
  states: Record<StateName, StateDefinition>;
};

type ContextChangeListener<TContext> = (
  newContext: TContext,
  prevContext: TContext
) => void;
type StateChangeListener = (newState: unknown, prevState: unknown) => void;

export type CreateMachineConfig<TContext = any> = {
  context?: TContext;
  machine: Machine | Machine[];
  actions?: Record<ActionName, Action<TContext>>;
  guards?: Record<GuardName, Guard<TContext>>;
};

function getMachines<TContext>(config: CreateMachineConfig<TContext>) {
  return Array.isArray(config.machine) ? config.machine : [config.machine];
}

function getInitialState<TContext>(
  config: CreateMachineConfig<TContext>
): State {
  return getMachines(config).reduce((state: State, machine: Machine) => {
    state[machine.id] = machine.initial;
    return state;
  }, {});
}

function getEventName(event: Event) {
  return typeof event === 'string' ? event : event.type;
}

function getEventData(event: Event) {
  return typeof event === 'string' ? undefined : event.data;
}

function moveToNextState<TContext>(
  config: CreateMachineConfig<TContext>,
  contextRef: ContextRef<TContext>,
  stateRef: StateRef,
  event: Event,
  send: Send,
  stateChangeListener: StateChangeListener | null,
  contextChangeListener: ContextChangeListener<TContext> | null
) {
  const rawEventName = getEventName(event);
  const eventData = getEventData(event);
  const isEventScoped = rawEventName.indexOf('.') >= 0;
  const eventScope = rawEventName.split('.')[0];
  const eventName = isEventScoped
    ? rawEventName.substr(rawEventName.indexOf('.') + 1)
    : rawEventName;
  const internalActionParams: InternalActionParams<TContext> = {
    send,
    type: eventName,
    data: eventData,
    contextRef,
  };

  return getMachines(config).forEach((machine: Machine) => {
    if (isEventScoped && machine.id !== eventScope) {
      return;
    }

    const currentStateName = stateRef.current[machine.id];
    const currentState = machine.states[currentStateName];
    if (currentState.on && currentState.on[eventName] !== undefined) {
      const dest = currentState.on[eventName];
      const nextStateName = typeof dest === 'string' ? dest : dest.target;
      const guard: Guard<TContext> | null | undefined =
        typeof dest === 'string'
          ? null
          : config.guards && config.guards[dest.cond];
      if (
        !guard ||
        guard({
          context: contextRef.current,
          state: stateRef.current,
          type: eventName,
          data: eventData,
        })
      ) {
        runActions(
          'exit',
          [machine],
          config,
          stateRef.current,
          contextChangeListener,
          internalActionParams
        );
        const prevState = {
          ...stateRef.current,
        };
        stateRef.current[machine.id] = nextStateName;
        if (stateChangeListener) {
          stateChangeListener(stateRef.current, prevState);
        }
        runActions(
          'entry',
          [machine],
          config,
          stateRef.current,
          contextChangeListener,
          internalActionParams
        );
      }
    }
  });
}

function runActions<TContext>(
  when: 'entry' | 'exit',
  machines: Machine[],
  config: CreateMachineConfig<TContext>,
  state: State,
  contextChangeListener: ContextChangeListener<TContext> | null,
  { send, type, data, contextRef }: InternalActionParams<TContext>
) {
  const setContext: SetContext<TContext> = newContext => {
    const prevContext = contextRef.current;
    contextRef.current = Object.assign({}, contextRef.current, newContext);
    if (contextChangeListener) {
      contextChangeListener(contextRef.current, prevContext);
    }
  };
  machines.forEach(machine => {
    const actions = machine.states[state[machine.id]][when];
    if (Array.isArray(actions)) {
      actions.forEach(actionName => {
        config.actions![actionName]({
          send,
          type,
          data,
          context: contextRef.current,
          setContext,
        });
      });
    }
  });
}

type MachineReturn<TContext> = {
  send: Send;
  getState: () => unknown;
  getContext: () => TContext;
  setActions: (actions: Record<ActionName, Action<TContext>>) => void;
  listen: {
    onContextChange: (listener: ContextChangeListener<TContext> | null) => void;
    onStateChange: (listener: StateChangeListener | null) => void;
  };
};

export function createMachine<TContext>(
  config: CreateMachineConfig<TContext>
): MachineReturn<TContext> {
  let contextChangeListener: ContextChangeListener<TContext> | null = null;
  let stateChangeListener: StateChangeListener | null = null;
  const contextRef: ContextRef<TContext> = {
    current: config.context || ({} as TContext),
  };
  let stateRef: StateRef = {
    current: getInitialState(config),
  };
  const send: Send = (event: Event) => {
    moveToNextState(
      config,
      contextRef,
      stateRef,
      event,
      send,
      stateChangeListener,
      contextChangeListener
    );
  };

  runActions(
    'entry',
    getMachines(config),
    config,
    stateRef.current,
    contextChangeListener,
    {
      send,
      type: INITIAL_DUMMY_TYPE,
      data: undefined,
      contextRef,
    }
  );

  return {
    send,
    getState: () => {
      return stateRef.current;
    },
    getContext: () => {
      return contextRef.current;
    },
    setActions: (actions: Record<ActionName, Action<TContext>>): void => {
      config.actions = Object.assign({}, config.actions, actions);
    },
    listen: {
      onContextChange: listener => {
        contextChangeListener = listener;
      },
      onStateChange: listener => {
        stateChangeListener = listener;
      },
    },
  };
}
