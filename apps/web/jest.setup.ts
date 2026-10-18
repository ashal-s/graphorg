import { TextDecoder, TextEncoder } from "util";

import "@testing-library/jest-dom";

// node-postgres (and some other Node libs) need these; jsdom does not
// always define them on `global`.
Object.assign(globalThis, { TextEncoder, TextDecoder });
