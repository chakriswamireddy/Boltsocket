# Project Structure

Complete file structure for bolt-socket Phase 1.

```
BoltSocket/
│
├── .vscode/                          # VS Code configuration
│   ├── extensions.json              # Recommended extensions
│   └── settings.json                # Workspace settings
│
├── .claude/                          # Claude context files
│   └── base.md                      # Project instructions
│
├── packages/                         # Monorepo packages
│   └── core/                        # @bolt-socket/core package
│       ├── src/
│       │   ├── index.ts            # Public API exports
│       │   ├── types.ts            # TypeScript type definitions
│       │   ├── event-registry.ts   # Core implementation
│       │   └── errors.ts           # Custom error classes
│       ├── package.json            # Package configuration
│       ├── tsconfig.json           # TypeScript config
│       └── README.md               # Package documentation
│
├── examples/                        # Usage examples
│   ├── basic-usage.ts              # Basic patterns (7 examples)
│   ├── edge-cases.ts               # Edge case testing (20+ tests)
│   ├── type-inference.ts           # TypeScript patterns (7 demos)
│   ├── package.json                # Examples dependencies
│   └── README.md                   # Examples guide
│
├── package.json                     # Root package.json (workspace)
├── tsconfig.base.json              # Shared TypeScript config
├── .gitignore                      # Git ignore rules
├── README.md                       # Project overview
├── QUICK-START.md                  # Quick start guide
├── PHASE-1-COMPLETE.md            # Phase 1 documentation
└── setup.ps1                       # Setup script (PowerShell)
```

## File Count

- **Configuration**: 6 files
- **Core Package**: 4 source files + 3 config files
- **Examples**: 3 example files + 2 config files
- **Documentation**: 4 markdown files

**Total: 22 files**

## Key Files

### Core Implementation

1. **types.ts** (60 lines)
   - Event schema type definitions
   - Type utilities for inference
   - Registry interface

2. **event-registry.ts** (120 lines)
   - `createEventRegistry` implementation
   - Validation logic
   - Error handling

3. **errors.ts** (25 lines)
   - Custom error classes
   - Better error messages

4. **index.ts** (15 lines)
   - Public API exports
   - Type exports

### Examples

1. **basic-usage.ts** (280 lines)
   - Basic event registry
   - Validation examples
   - Complex nested schemas

2. **edge-cases.ts** (360 lines)
   - Invalid schemas
   - Boundary testing
   - Array validation

3. **type-inference.ts** (240 lines)
   - Type extraction
   - Generic patterns
   - Discriminated unions

## Dependencies

### Core Package
- **Peer Dependencies**: `zod@^3.22.0`
- **Dev Dependencies**: `typescript@^5.3.3`, `tsup@^8.0.1`

### Examples
- **Dependencies**: `@bolt-socket/core` (workspace), `zod`, `tsx`, `typescript`

### Root
- **Dev Dependencies**: `typescript@^5.3.3`, `@types/node@^20.11.0`

## Build Outputs

After building:
```
packages/core/dist/
├── index.js          # CommonJS bundle
├── index.mjs         # ES Module bundle
├── index.d.ts        # TypeScript declarations
└── index.d.ts.map    # Declaration source maps
```

## Scripts

### Root
- `npm run build` - Build all packages
- `npm run dev` - Watch mode for all packages
- `npm run test` - Run all tests

### Core Package
- `npm run build` - Build package
- `npm run dev` - Watch mode

### Examples
- `npm run example:all` - Run all examples
- `npm run example:basic` - Basic usage
- `npm run example:edge-cases` - Edge cases
- `npm run example:types` - Type inference

## Setup

```powershell
# Run setup script (Windows PowerShell)
.\setup.ps1

# Or manually
npm install
cd packages/core
npm install
npm run build
cd ../../examples
npm install
```

## Next Phase Files

Phase 2 will add:
```
packages/
└── server/                          # @bolt-socket/server
    ├── src/
    │   ├── index.ts
    │   ├── socket-server.ts
    │   ├── auth.ts
    │   └── rooms.ts
    ├── package.json
    └── tsconfig.json
```

Phase 3 will add:
```
packages/
└── react/                           # @bolt-socket/react
    ├── src/
    │   ├── index.ts
    │   ├── provider.tsx
    │   ├── hooks.ts
    │   └── context.ts
    ├── package.json
    └── tsconfig.json
```

---

**Current Status: Phase 1 Complete ✅**

Foundation is solid and ready for building server and React packages on top.
