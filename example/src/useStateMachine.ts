import { useState, useEffect } from 'react';
import { createMachine, CreateMachineConfig } from 'tiny-fsm';

export function useStateMachine<TContext>(
  config: CreateMachineConfig<TContext>
) {
  const [initialConfig] = useState(config);
  const [state, setState] = useState<any>(null);
  const [context, setContext] = useState<TContext | null>(null);
  const [{ send, setActions, listen }] = useState(
    createMachine<TContext>(initialConfig)
  );
  useEffect(() => {
    listen.onContextChange(setContext);
    listen.onStateChange(setState);
    return () => {
      listen.onContextChange(null);
      listen.onStateChange(null);
    };
  }, [listen, setState, setContext]);
  return {
    state,
    context,
    send,
    setActions,
  };
}
