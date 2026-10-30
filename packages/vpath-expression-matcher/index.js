'use strict';
exports.Expression = require('./lib/expression.js').Expression;
exports.Matcher = require('./lib/matcher.js').Matcher;
exports.MatcherView = require('./lib/matcher.js').MatcherView;
exports.ExpressionSet = require('./lib/set.js').ExpressionSet;
exports.default = {Expression: exports.Expression, Matcher: exports.Matcher, MatcherView: exports.MatcherView, ExpressionSet: exports.ExpressionSet};
