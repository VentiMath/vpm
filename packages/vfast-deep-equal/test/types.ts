import equal = require('vfast-deep-equal');
import react = require('vfast-deep-equal/react');
import es6 = require('vfast-deep-equal/es6');
import es6React = require('vfast-deep-equal/es6/react');
const a: unknown = {value: 1};
const results: boolean[] = [equal(a, null), react(a, {}), es6(new Map(), new Map()), es6React(a, a)];
void results;
