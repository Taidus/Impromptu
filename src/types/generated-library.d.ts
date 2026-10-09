// `src/generated/library.json` is written by scripts/library/build.ts on predev/prebuild and is
// gitignored, so typecheck can run before it exists. Its shape is validated at runtime by
// the library loader (src/adapters/library), so `unknown` is the honest static type.
declare module "@/generated/library.json" {
  const library: unknown;
  export default library;
}
