'use strict';
const React = require('react');

const {
  selectionReader
} = require('./selection.cjs');

exports.useSyncExternalStoreWithSelector = function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  const committed = React.useRef();

  const readers = React.useMemo(() => {
    const select = selectionReader(selector, isEqual, () => committed.current);

    return [
      () => select(getSnapshot()),
      getServerSnapshot === undefined ? undefined : () => select(getServerSnapshot())
    ];
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);

  const value = React.useSyncExternalStore(subscribe, readers[0], readers[1]);

  React.useEffect(() => {
    committed.current = {
      value
    };
  }, [value]);

  React.useDebugValue(value);
  return value;
};
