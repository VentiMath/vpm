function getIgnoreAttributesFn(ignoreAttributes) {
    if (typeof ignoreAttributes === 'function') {
        return ignoreAttributes
    }
    if (Array.isArray(ignoreAttributes)) {
        return (attrName) => {
            for (const pattern of ignoreAttributes) {
                if (typeof pattern === 'string' && attrName === pattern) {
                    return true
                }
                if (pattern instanceof RegExp) {
                    pattern.lastIndex = 0;
                    const matched = pattern.test(attrName);
                    pattern.lastIndex = 0;
                    if (matched) return true;
                }
            }
        }
    }
    return () => false
}

module.exports = getIgnoreAttributesFn;
