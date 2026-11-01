import createStyled from './base.js';
import {tags} from './src/tags.js';

// A copy, so that the shorthands are not added to base's function.
const styled = createStyled.bind(null);
for (const tag of tags) styled[tag] = styled(tag);

export default styled;
