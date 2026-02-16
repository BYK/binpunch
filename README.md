# binpunch

Reduce compressed binary size by **~24%** by zeroing unused ICU data entries.

Works with any binary that embeds ICU common data — **Bun** compiled executables, **Node.js SEA** binaries, or anything linked against ICU with full data.

## How it works

Compiled runtimes like Bun and Node.js embed the full ICU dataset (~30 MB) for internationalization support. Most of that data (charset converters, CJK dictionaries, non-English locale resources) is unused by typical applications.

`binpunch` scans the binary for the ICU data blob, parses its Table of Contents, and **zeros the data bytes** of unused entries. The TOC structure is left intact so the binary remains valid. The zeroed regions compress to nearly nothing with gzip/zstd, dramatically shrinking download size.

**What gets zeroed:**
- `.cnv` charset converters
- CJK break dictionaries (`cjdict`, `thaidict`, etc.)
- Non-English locale data in subcategories (`coll/`, `curr/`, `lang/`, `region/`, `zone/`, `unit/`)

**What's kept:**
- Root-level entries (core ICU functionality)
- Normalization files (`nfc.nrm`, `nfkc.nrm`, etc.)
- Break iterator data (`char.brk`, `word.brk`, etc.)
- English locale data

## Install

```bash
npm install -D binpunch
```

## CLI usage

```bash
# Single binary
npx binpunch ./my-app

# Multiple binaries
npx binpunch dist/app-linux dist/app-mac

# Verbose output
npx binpunch -v ./my-app
```

Binaries are modified **in-place**. Raw file size stays the same — only compressed size shrinks.

## API usage

```typescript
import { processBinary } from "binpunch";

const stats = processBinary("./my-app");
if (stats) {
  console.log(`Zeroed ${stats.removedEntries}/${stats.totalEntries} ICU entries`);
  console.log(`${stats.bytesZeroed} bytes zeroed`);
}
```

### Exports

| Function | Description |
|---|---|
| `processBinary(path)` | High-level: read file, punch, write back. Returns `HolePunchStats \| null` |
| `findIcuBlob(buf)` | Find ICU data blob offset in a buffer (-1 if not found) |
| `parseIcuToc(buf, offset)` | Parse the ICU Table of Contents at a given offset |
| `shouldRemoveEntry(name)` | Default filter: returns `true` if an entry is safe to zero |
| `holePunch(buf, scan)` | Zero removable entries in a buffer (mutates in-place) |
| `formatSize(bytes)` | Format byte count as human-readable string |

## License

MIT
