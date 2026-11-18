import converter = require('../index.cjs');
const style: converter.Style = converter.default([['border', '1px solid hwb(90 10% 20%)']]);
const raw: string | number | boolean | null | undefined = converter.transformRawValue('width', '2px');
const named: converter.Style = converter.getStylesForProperty(converter.getPropertyName('margin-top'), '2px');
// @ts-expect-error CSS tuple values must be strings
converter.default([['width', 2]]);
void [style, raw, named];
