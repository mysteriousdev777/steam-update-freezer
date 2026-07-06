# Application Flows

This document visualizes the safety-critical logic the app enforces when it edits a game's
Steam `appmanifest_<APPID>.acf`. It has two layers:

- a **state model** — the legal states of the `.acf` on disk and the actions that move
  between them (the mental model + the core invariant), and
- three **per-action flowcharts** — the guards and abort paths inside each action (Block,
  Update, Unblock).

**Source of truth.** [`src/main/services/freezer.ts`](../src/main/services/freezer.ts) is
authoritative for *behavior*; these diagrams are derived from it. The *Domain safety rules* in
[`AGENTS.md`](../AGENTS.md) hold the *why* (invariants and rationale, not captured here). These
diagrams show safety-relevant branches, not every line of code.

## Conventions

- **Precondition (all mutating actions):** Steam must be **fully closed**. Steam holds the
  `.acf` in memory and rewrites it on exit, so any edit while it runs would be clobbered.
- **State vocabulary** (used consistently below):
  - _writable / genuine_ — the `.acf` is the real installed version (unfrozen).
  - _read-only / fake_ — the `.acf` has been rewritten to pin a build and locked (frozen).
  - _`.acf.bak`_ — the snapshot of the **genuine** manifest; a frozen `.acf` always has one.
- **Core invariant:** _frozen ⇒ a genuine `.acf.bak` exists._ Both freeze paths (Block and
  Update) establish it; every writer refuses to snapshot a `.bak` from a frozen (possibly fake)
  `.acf`.
- **Node colors:** gray = action/step, green = success (incl. no-op), red = abort.

## `.acf` state model

```mermaid
stateDiagram-v2
    direction TB

    Unfrozen: Unfrozen — .acf writable / genuine, no .acf.bak
    Frozen: Frozen — .acf read-only / fake, .acf.bak holds genuine

    [*] --> Unfrozen
    Unfrozen --> Frozen: Block / Update
    Frozen --> Frozen: Update — re-fake
    Frozen --> Unfrozen: Unblock
```

On the freeze edge, **Block** locks the current build as-is while **Update** also re-stamps the
manifest to the branch's latest build — both snapshot the genuine manifest, then lock. State-preserving
no-ops are omitted here and live in the flowcharts: **Block** on an already-frozen game does nothing,
and an **Update** already at the current build makes no change.

## Block updates (freeze)

Snapshot the genuine manifest to `.acf.bak`, then lock the `.acf` read-only. Backup **before**
lock — no backup, no freeze. Bails idempotently if the `.acf` is already read-only, so it never
snapshots a fake over the genuine backup.

```mermaid
flowchart TD
    Start([Start: Block]) --> CheckSteam{"Is Steam<br>running?"}
    CheckSteam -- Yes --> AbortSteam(["Abort: Steam must be closed"])
    CheckSteam -- No --> ReadAcf["Read .acf"]

    ReadAcf --> ReadOk{"Read OK?"}
    ReadOk -- No --> AbortRead(["Abort: not-found / read error"])
    ReadOk -- Yes --> Frozen{"Is .acf already<br>read-only?"}

    Frozen -- Yes --> NoOp([Success: already frozen, no-op])
    Frozen -- No --> Parseable{"Is .acf a parseable<br>manifest?"}

    Parseable -- No --> AbortInvalid(["Abort: unreadable — cannot freeze"])
    Parseable -- Yes --> Backup["Snapshot genuine .acf to .acf.bak<br><i>(atomic; no backup ⇒ no freeze)</i>"]

    Backup --> BackupOk{"Backup<br>successful?"}
    BackupOk -- No --> AbortBackup(["Abort: backup failed — not freezing"])
    BackupOk -- Yes --> Lock["Set .acf read-only"]

    Lock --> LockOk{"Lock OK?"}
    LockOk -- No --> AbortLock(["Abort: permission / write error"])
    LockOk -- Yes --> End([Success: frozen])

    classDef abort fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef success fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#166534;
    classDef action fill:#f3f4f6,stroke:#6b7280;

    class AbortSteam,AbortRead,AbortInvalid,AbortBackup,AbortLock abort;
    class NoOp,End success;
    class ReadAcf,Backup,Lock action;
```

## Update manifest

Rewrite the `.acf` so Steam treats the install as current at the installed branch's latest
build. Must handle both genuine and already-frozen manifests while **strictly preserving the
genuine `.acf.bak`**: snapshot only a genuine (writable) manifest; when already frozen, keep the
existing backup and refuse if it's missing or corrupt.

```mermaid
flowchart TD
    Start([Start: Update]) --> CheckSteam{"Is Steam<br>running?"}
    CheckSteam -- Yes --> AbortSteam(["Abort: Steam must be closed"])
    CheckSteam -- No --> ReadAcf["Read .acf<br><i>(note: read-only ⇒ frozen, writable ⇒ genuine)</i>"]

    ReadAcf --> ReadOk{"Read OK?"}
    ReadOk -- No --> AbortRead(["Abort: not-found / read error"])
    ReadOk -- Yes --> Parse["Parse VDF"]

    Parse --> ParseOk{"Parse OK &<br>has AppState?"}
    ParseOk -- No --> AbortParse(["Abort: parse / invalid manifest"])
    ParseOk -- Yes --> Fetch["Fetch buildid & depot manifests<br>for the installed branch<br><i>(api.steamcmd.net)</i>"]

    Fetch --> FetchOk{"Fetch OK?"}
    FetchOk -- No --> AbortFetch(["Abort: network / http / branch error"])
    FetchOk -- Yes --> AtBuild{"Already at<br>this build?"}

    AtBuild -- Yes --> NoOp([Success: already current, no rewrite])
    AtBuild -- No --> Apply["Apply build in memory<br><i>(buildid, depot manifests,<br>StateFlags=4, AutoUpdateBehavior=1)</i>"]

    Apply --> IsFrozen{"Is .acf<br>already frozen?"}

    IsFrozen -- No (genuine) --> Snapshot["Snapshot genuine .acf to .acf.bak<br><i>(atomic)</i>"]
    Snapshot --> SnapOk{"Backup OK?"}
    SnapOk -- No --> AbortSnap(["Abort: backup failed — not writing"])
    SnapOk -- Yes --> Write

    IsFrozen -- Yes (fake) --> CheckBak{"Existing .acf.bak<br>present & parseable?"}
    CheckBak -- No --> AbortBak(["Abort: genuine backup missing/corrupt —<br>unblock before updating"])
    CheckBak -- Yes --> Preserve["Preserve existing genuine .acf.bak<br><i>(never snapshot a fake)</i>"]
    Preserve --> Write

    Write["Write new manifest to .acf<br><i>(atomic; staged copy locked read-only<br>before rename, re-lock in finally)</i>"] --> WriteOk{"Write OK?"}
    WriteOk -- No --> AbortWrite(["Abort: permission / write error"])
    WriteOk -- Yes --> End([Success: re-faked & locked])

    classDef abort fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef success fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#166534;
    classDef action fill:#f3f4f6,stroke:#6b7280;

    class AbortSteam,AbortRead,AbortParse,AbortFetch,AbortSnap,AbortBak,AbortWrite abort;
    class NoOp,End success;
    class ReadAcf,Parse,Fetch,Apply,Snapshot,Preserve,Write action;
```

## Unblock updates (restore)

Restore the genuine manifest from `.acf.bak`, clear read-only, then drop the backup so the next
freeze re-snapshots afresh. Restoring the true installed version is what lets SteamPipe compute a
correct delta on the next update; a corrupt/empty backup aborts rather than overwriting the live
manifest with garbage.

```mermaid
flowchart TD
    Start([Start: Unblock]) --> CheckSteam{"Is Steam<br>running?"}
    CheckSteam -- Yes --> AbortSteam(["Abort: Steam must be closed"])
    CheckSteam -- No --> ReadBak["Read .acf.bak"]

    ReadBak --> BakRead{"Read result?"}
    BakRead -- Read error --> AbortRead(["Abort: read error"])
    BakRead -- Missing (ENOENT) --> Unlock["Clear read-only on .acf<br><i>(plain unblock — nothing to restore)</i>"]
    BakRead -- Present --> Parseable{"Is .acf.bak<br>parseable?"}

    Parseable -- No --> AbortInvalid(["Abort: backup empty/corrupt — not restoring"])
    Parseable -- Yes --> Restore["Restore genuine manifest: write .acf.bak into .acf<br><i>(atomic; stays writable / unfrozen)</i>"]

    Restore --> RestoreOk{"Restore OK?"}
    RestoreOk -- No --> RelockAbort(["Re-lock read-only, then<br>Abort: write error"])
    RestoreOk -- Yes --> DropBak["Remove .acf.bak<br><i>(next freeze re-snapshots)</i>"]
    DropBak --> End([Success: unfrozen / writable])

    Unlock --> UnlockOk{"OK?"}
    UnlockOk -- No --> AbortUnlock(["Abort: permission / write error"])
    UnlockOk -- Yes --> End

    classDef abort fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef success fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#166534;
    classDef action fill:#f3f4f6,stroke:#6b7280;

    class AbortSteam,AbortRead,AbortInvalid,RelockAbort,AbortUnlock abort;
    class End success;
    class ReadBak,Unlock,Restore,DropBak action;
```
