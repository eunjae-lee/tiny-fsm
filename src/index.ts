const INITIAL_DUMMY_TYPE = 'tiny-fsm.init';

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
type StateRef = { current: any };
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
  states: Record<StateName, State>;
};

type ContextChangeListener = (newContext: any, prevContext: any) => any;
type StateChangeListener = (newState: any, prevState: any) => any;

export type CreateMachineConfig = {
  context?: Context;
  machine: Machine | Machine[];
  actions?: Record<ActionName, Action>;
  guards?: Record<GuardName, Guard>;
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
  return typeof event === 'string' ? undefined : event.data;
}

function moveToNextState(
  config: CreateMachineConfig,
  contextRef: ContextRef,
  stateRef: StateRef,
  event: Event,
  send: Send,
  stateChangeListener: StateChangeListener | null,
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

  return getMachines(config).forEach((machine: Machine) => {
    if (isEventScoped && machine.id !== eventScope) {
      return;
    }

    const currentStateName = stateRef.current[machine.id];
    const currentState = machine.states[currentStateName];
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

function runActions(
  when: 'entry' | 'exit',
  machines: Machine[],
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

type MachineReturn = {
  send: Send;
  getState: () => any;
  getContext: () => any;
  setActions: (actions: Record<ActionName, Action>) => void;
  listen: {
    onContextChange: (listener: ContextChangeListener | null) => void;
    onStateChange: (listener: StateChangeListener | null) => void;
  };
};

export function createMachine(config: CreateMachineConfig): MachineReturn {
  let contextChangeListener: ContextChangeListener | null = null;
  let stateChangeListener: StateChangeListener | null = null;
  const contextRef: ContextRef = {
    current: config.context,
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
    setActions: (actions: Record<ActionName, Action>): void => {
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
