import { htmlRender } from "../html-render";
import { HEADER } from "../constants";

const source = `
## Next steps
- [About](/index.html)
- [First Page](/other.html)
`;

htmlRender(HEADER, source);

