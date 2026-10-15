# Third-party notice: COPC reader

`vendor/copc-reader.js` bundles the browser build of `copc` 0.0.9 by Connor Manning, distributed under the MIT License. The application passes its existing local `laz-perf` decoder to this reader; it does not download executable code at runtime.

The COPC reader uses the browser's native `fetch` implementation only for its URL helper. Ocarto supplies a local `File.slice()` range reader for user-selected files.
