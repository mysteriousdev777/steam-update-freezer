// Side-effect imports of non-code assets are handled by webpack loaders (e.g. style-loader
// + css-loader). These stubs satisfy the type-checker; they are not CSS-modules typing.
declare module '*.css';
