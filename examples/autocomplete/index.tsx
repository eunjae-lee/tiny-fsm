import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Autocomplete from './src/autocomplete';

const App = () => {
  return (
    <div>
      <Autocomplete />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
