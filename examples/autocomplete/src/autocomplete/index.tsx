import * as React from 'react';
import { config, Context } from './config';
import { useStateMachine } from '../useStateMachine';
import { search } from '../search';
import './style.css';

export default () => {
  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  React.useEffect(() => {
    search(''); // trigger an empty search to cache the search results.
  }, []);

  const { context, send } = useStateMachine<Context>(config);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    send({ type: 'INPUT', data: { query: event.target.value } });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.keyCode === 38) {
      // up
      event.preventDefault();
      send('HIGHLIGHT_PREV');
    } else if (event.keyCode === 40) {
      // down
      event.preventDefault();
      send('HIGHLIGHT_NEXT');
    } else if (
      // enter
      event.keyCode === 13 &&
      context &&
      context.highlightedIndex !== undefined
    ) {
      const { text } = context.hits[context.highlightedIndex!];
      event.preventDefault();
      console.log('Selected:', text);
    }
  }

  const hits = context?.hits || [];
  return (
    <div className="autocomplete">
      <input
        className="searchbox"
        onChange={onChange}
        spellCheck={false}
        autoFocus
      />
      {hits.length > 0 && (
        <ul className="hits">
          {hits.map(({ text }, index: number) => (
            <li
              key={index}
              className={[
                'hit',
                context?.highlightedIndex === index ? 'highlighted' : '',
              ].join(' ')}
              onClick={() => console.log('Selected:', text)}
              onMouseEnter={() => {
                send({
                  type: 'HIGHLIGHT_SPECIFIC_INDEX',
                  data: { specificIndex: index },
                });
              }}
            >
              {text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
