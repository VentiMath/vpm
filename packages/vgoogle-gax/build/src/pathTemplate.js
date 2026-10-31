"use strict";
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
const own = Object.hasOwn;
function put(object, key, value) {
    if (key === '__proto__') Object.defineProperty(object, key, {value, enumerable:true, writable:true, configurable:true});
    else object[key] = value;
}
const variable = /\{([$0-9a-zA-Z_.~-]+)=(\*\*|\*)\}/g;
const atomic = /^\{([$0-9a-zA-Z_.~-]+)=(\*\*|\*)\}$/;
const definition = /^\{([0-9a-zA-Z_.~-]+)(?:=(.*?))?\}$/;
const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
class PathTemplate {
    constructor(data) {
        this.data = data;
        this.bindings = Object.create(null);
        this.segments = this.parsePathTemplate(data);
        this.size = this.segments.length;
        this._names = Object.keys(this.bindings);
        this._parts = [];
        this._compiled = this.segments.map((segment, index) => {
            if (index) this._parts.push('/');
            if (!segment.includes('{')) {this._parts.push(segment);return {literal:segment};}
            const whole = atomic.exec(segment);
            if (whole) {const binding={key:whole[1],glob:whole[2]==='**'};this._parts.push(binding);return binding;}
            const matches = [...segment.matchAll(variable)];
            if (!matches.length) { this._parts.push(segment); return {literal:segment}; }
            let position = 0, pattern = '^';
            for (const match of matches) {
                const literal = segment.slice(position, match.index);
                this._parts.push(literal, {key:match[1], glob:match[2] === '**'});
                pattern += escapeRE(literal) + '([^/{}\\-_.~]+)';
                position = match.index + match[0].length;
            }
            this._parts.push(segment.slice(position));
            if (matches.length === 1 && matches[0][0] === segment) return {key:matches[0][1], glob:matches[0][2] === '**'};
            pattern += escapeRE(segment.slice(position)) + '$';
            return {keys:matches.map(m=>m[1]), expression:new RegExp(pattern)};
        });
    }
    inspect() { return this.segments.join('/'); }
    render(bindings) {
        const keys = Object.keys(bindings);
        if (keys.length !== this._names.length) throw new TypeError('The number of variables does not match the number of needed variables');
        const values = Object.create(null);
        for (const key of this._names) {
            if (!own(bindings,key)) throw new TypeError('Missing path binding: '+key);
            const value = bindings[key].toString();
            if (!(this.bindings[key] === '**' ? /^[^{}]+$/ : /^[^/{}]+$/).test(value)) throw new TypeError('Invalid path binding: '+key);
            values[key] = value;
        }
        let result = '';
        for (const part of this._parts) result += typeof part === 'string' ? part : values[part.key];
        return result;
    }
    match(path) {
        const parts = path.split('/'), result = {};
        let cursor = 0;
        const bind = (key,value) => {
            if (own(result,key) && result[key] !== value) throw new TypeError('Repeated binding differs: '+key);
            put(result,key,value);
        };
        for (let i=0; i<this._compiled.length; i++) {
            const segment=this._compiled[i];
            if (cursor >= parts.length) throw new TypeError('Path does not match template');
            if (segment.literal !== undefined) {
                if (parts[cursor++] !== segment.literal) throw new TypeError('Path literal does not match template');
            } else if (segment.key !== undefined) {
                const count = segment.glob ? parts.length - cursor - (this._compiled.length-i-1) : 1;
                if (count < 1) throw new TypeError('Missing path binding');
                const value = count === 1 ? parts[cursor] : parts.slice(cursor,cursor+count).join('/');
                if (!value || /[{}]/.test(value)) throw new TypeError('Invalid path binding');
                bind(segment.key,value); cursor+=count;
            } else {
                const match=segment.expression.exec(parts[cursor++]);
                if (!match) throw new TypeError('Path separators do not match template');
                for(let j=0;j<segment.keys.length;j++)bind(segment.keys[j],match[j+1]);
            }
        }
        if(cursor!==parts.length)throw new TypeError('Path has extra segments');
        return result;
    }
    parsePathTemplate(data) {
        const pathSegments = splitPathTemplate(data);
        let index = 0;
        let wildCardCount = 0;
        const segments = [];
        let matches;
        pathSegments.forEach(segment => {
            // * or ** -> segments.push('{$0=*}');
            //         -> bindings['$0'] = '*'
            if (segment === '*' || segment === '**') {
                this.bindings[`$${index}`] = segment;
                segments.push(`{$${index}=${segment}}`);
                index = index + 1;
                if (segment === '**') {
                    ++wildCardCount;
                }
            }
            else if (!segment.includes('{')) {
                if (/[0-9a-zA-Z-.~_]+/.test(segment)) segments.push(segment);
            }
            else if ((matches = definition.exec(segment)) && (!matches[2] || matches[2] === '*' || matches[2] === '**')) {
                const key=matches[1],value=matches[2]||'*';
                this.bindings[key]=value;
                if(value==='**')wildCardCount++;
                segments.push('{'+key+'='+value+'}');
            }
            else if ((matches = segment.match(/\{[0-9a-zA-Z-.~_]+(?:=.*?)?\}/g))) {
                for (const subsegment of matches) {
                    const pairMatch = subsegment.match(/^\{([0-9a-zA-Z-.~_]+)(?:=(.*?))?\}$/);
                    if (!pairMatch) {
                        throw new Error(`Cannot process path template segment ${subsegment}`);
                    }
                    const key = pairMatch[1];
                    let value = pairMatch[2];
                    if (!value) {
                        value = '*';
                        segment = segment.replace(subsegment, '{' + key + '=*}');
                        this.bindings[key] = value;
                    }
                    else if (value === '*') {
                        this.bindings[key] = value;
                    }
                    else if (value === '**') {
                        ++wildCardCount;
                        this.bindings[key] = value;
                    }
                }
                segments.push(segment);
            }
            else if (segment.match(/[0-9a-zA-Z-.~_]+/)) {
                segments.push(segment);
            }
        });
        if (wildCardCount > 1) {
            throw new TypeError('Can not have more than one wildcard.');
        }
        return segments;
    }
}
exports.PathTemplate = PathTemplate;
function splitPathTemplate(data) {
    let left = 0;
    let right = 0;
    let bracketCount = 0;
    const segments = [];
    while (right >= left && right < data.length) {
        if (data.charAt(right) === '{') {
            bracketCount = bracketCount + 1;
        }
        else if (data.charAt(right) === '}') {
            bracketCount = bracketCount - 1;
        }
        else if (data.charAt(right) === '/') {
            if (right === data.length - 1) {
                throw new TypeError('Invalid path, it can not be ended by /');
            }
            if (bracketCount === 0) {
                // complete bracket, to avoid the case a/b/**/*/{a=hello/world}
                segments.push(data.substring(left, right));
                left = right + 1;
            }
        }
        if (right === data.length - 1) {
            if (bracketCount !== 0) {
                throw new TypeError('Brackets are invalid.');
            }
            segments.push(data.substring(left));
        }
        right = right + 1;
    }
    return segments;
}
