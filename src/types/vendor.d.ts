// Ambient declarations for npm packages that ship no types.

// electron-squirrel-startup default-exports a boolean that is `true` when the app was
// launched by a Squirrel.Windows install/update event.
declare module 'electron-squirrel-startup' {
  const startedViaSquirrel: boolean;
  export default startedViaSquirrel;
}
