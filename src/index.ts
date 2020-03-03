const INITIAL_DUMMY_TYPE = 'ministate.init';

type Context = any;
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
type GuardParams = {
  context: any;
  state: any;
  type: EventName;
  data: ActionData;
};
type Guard = (params: GuardParams) => boolean;

type State = {
  entry?: ActionName[];
  exit?: ActionName[];
  on?: {
    [key in EventName]: StateName | StateNameWithGuard;
  };
};

type ActionData = any;
type ActionName = string;
type SetContext = (context: any) => void;
type Send = (event: Event) => void;
type ContextRef = { current: Context };
type InternalActionParams = {
  send: Send;
  type: EventName;
  data: ActionData;
  contextRef: ContextRef;
};
type ActionParams = {
  setContext: SetContext;
  send: Send;
  type: EventName;
  data: ActionData;
  context: Context;
};
type Action = (actionParams: ActionParams) => any;

type Machine = {
  id: string;
  initial: StateName;
  states: { [key in StateName]: State };
};

type ContextChangeListener = (newContext: any, prevContext: any) => any;
type StateChangeListener = (newState: any, prevState: any) => any;

export type CreateMachineConfig = {
  context?: Context;
  machine: Machine | Machine[];
  actions?: { [key in ActionName]: Action };
  guards?: { [key in GuardName]: Guard };
};

function getMachines(config: CreateMachineConfig) {
  return Array.isArray(config.machine) ? config.machine : [config.machine];
}

function getInitialState(config: CreateMachineConfig) {
  return getMachines(config).reduce((state: any, machine: Machine) => {
    state[machine.id] = machine.initial;
    return state;
  }, {});
}

function getEventName(event: Event) {
  return typeof event === 'string' ? event : event.type;
}

function getEventData(event: Event) {
  return typeof event === 'string' ? null : event.data;
}

function moveToNextState(
  config: CreateMachineConfig,
  contextRef: ContextRef,
  prevState: any,
  event: Event,
  send: Send,
  contextChangeListener: ContextChangeListener | null
) {
  const rawEventName = getEventName(event);
  const eventData = getEventData(event);
  const isEventScoped = rawEventName.indexOf('.') >= 0;
  const eventScope = rawEventName.split('.')[0];
  const eventName = isEventScoped
    ? rawEventName.substr(rawEventName.indexOf('.') + 1)
    : rawEventName;
  const internalActionParams: InternalActionParams = {
    send,
    type: eventName,
    data: eventData,
    contextRef,
  };

  return getMachines(config).reduce((nextState: any, machine: Machine) => {
    if (isEventScoped && machine.id !== eventScope) {
      return nextState;
    }

    const currentState = machine.states[prevState[machine.id]];
    if (currentState.on && currentState.on[eventName] !== undefined) {
      const dest = currentState.on[eventName];
      const nextStateName = typeof dest === 'string' ? dest : dest.target;
      const guard: Guard | null | undefined =
        typeof dest === 'string'
          ? null
          : config.guards && config.guards[dest.cond];
      if (
        !guard ||
        guard({
          context: contextRef.current,
          state: prevState,
          type: eventName,
          data: eventData,
        })
      ) {
        runActions(
          'exit',
          config,
          nextState,
          contextChangeListener,
          internalActionParams
        );
        nextState[machine.id] = nextStateName;
        runActions(
          'entry',
          config,
          nextState,
          contextChangeListener,
          internalActionParams
        );
      }
    }
    return nextState;
  }, prevState);
}

function runActions(
  when: 'entry' | 'exit',
  config: CreateMachineConfig,
  state: any,
  contextChangeListener: ContextChangeListener | null,
  { send, type, data, contextRef }: InternalActionParams
) {
  const setContext: SetContext = (newContext: any) => {
    const prevContext = contextRef.current;
    contextRef.current = Object.assign({}, contextRef.current, newContext);
    if (contextChangeListener) {
      contextChangeListener(contextRef.current, prevContext);
    }
  };
  getMachines(config).forEach(machine => {
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

type MachineReturn = {
  send: Send;
  getState: () => any;
  getContext: () => any;
  listen: {
    onContextChange: (listener: ContextChangeListener) => void;
    onStateChange: (listener: StateChangeListener) => void;
  };
};

export function createMachine(config: CreateMachineConfig): MachineReturn {
  let contextChangeListener: ContextChangeListener | null = null;
  let stateChangeListener: StateChangeListener | null = null;
  const contextRef: ContextRef = {
    current: config.context,
  };
  let state = getInitialState(config);
  const send: Send = (event: Event) => {
    const prevState = state;
    state = moveToNextState(
      config,
      contextRef,
      state,
      event,
      send,
      contextChangeListener
    );
    if (stateChangeListener) {
      stateChangeListener(state, prevState);
    }
  };

  runActions('entry', config, state, contextChangeListener, {
    send,
    type: INITIAL_DUMMY_TYPE,
    data: undefined,
    contextRef,
  });

  return {
    send,
    getState: () => {
      return state;
    },
    getContext: () => {
      return contextRef.current;
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
