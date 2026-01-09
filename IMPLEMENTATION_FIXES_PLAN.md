# Implementation Fixes Plan

**Date**: 2026-01-08
**Branch**: langchain
**Status**: Ready for implementation

This document outlines the plan to resolve all discrepancies between the specification documents and the current implementation, excluding the LangChain branch naming issue.

---

## Executive Summary

**Total Issues**: 10 (excluding #5 - LangChain branch name)
**Priority Breakdown**:
- Critical: 4 issues (schema mismatches)
- Medium: 3 issues (visual language, validation)
- Low: 3 issues (cleanup, documentation)

**Estimated Work**: 3-4 implementation phases

---

## Phase 1: Schema Alignment & Documentation (CRITICAL)

### Decision: Hybrid Approach - Keep Simple Implementation, Add Pedagogical Data

**Rationale**: The current `frets: Array<number | null>` implementation is simpler and works well, but we should add optional pedagogical metadata to support the spec's vision without breaking existing code.

### Issue #1: Chord Diagram Schema Mismatch

**Current State**:
```typescript
// chordSpec.ts
type ChordDiagramSpec = {
  type: "chord";
  style: "jazz-clean-v1";
  title?: string;
  tuning: string[];
  frets: Array<number | null>;  // Simple array approach
  base_fret?: number;
  root_strings?: number[];
};
```

**Proposed Enhancement**:
```typescript
// chordSpec.ts - Enhanced version
type ChordDiagramSpec = {
  type: "chord";
  style: "jazz-clean-v1";
  title?: string;
  tuning: string[];

  // Primary data (keep existing simple approach)
  frets: Array<number | null>;
  base_fret?: number;
  root_strings?: number[];

  // NEW: Optional pedagogical metadata
  finger_numbers?: Array<number | null>; // 1-4 or null, aligned with frets array
  note_roles?: Array<NoteRole | null>;   // 'root' | 'third' | 'fifth' | 'seventh' | 'extension'

  // Backward compat: these are derived from frets if not provided
  mutedStrings?: number[];  // Derived from frets array nulls
  openStrings?: number[];   // Derived from frets array zeros
};

type NoteRole = 'root' | 'third' | 'fifth' | 'seventh' | 'extension';
```

**Implementation Tasks**:
1. ✅ Update `chordSpec.ts` type definition
2. ✅ Create Zod schema for validation (`ChordDiagramSpecSchema`)
3. ✅ Update `renderChordSvg.ts` to optionally render finger numbers
4. ✅ Update `voicingToChordSpec.ts` to populate finger numbers when available
5. ✅ Update AI agent prompts to optionally include finger data
6. ✅ Add migration guide for existing diagram specs

**Files to Modify**:
- `apps/web/src/lib/diagrams/chordSpec.ts`
- `apps/web/src/lib/diagrams/renderChordSvg.ts`
- `apps/web/src/lib/diagrams/voicingToChordSpec.ts`
- `apps/web/src/lib/schemas/diagram.schema.ts` (add Zod validation)

---

### Issue #2: Fretboard Diagram Schema Alignment

**Current State**: Uses `fret_range: [number, number]`
**Spec Shows**: `startFret` and `endFret` as separate fields

**Decision**: **Keep current implementation** - tuple is more concise and type-safe.

**Action**: Update spec document to reflect implementation choice.

**Implementation Tasks**:
1. ✅ Add Zod schema for `FretboardDiagramSpec`
2. ✅ Rename `notes` → `markers` in spec document (already correct in code)
3. ✅ Rename `label` → `title` in spec document (already correct in code)
4. ✅ Document the `fret_range` tuple rationale

**Files to Modify**:
- `specs/diagram_rendering_system_guitar_app.md` (update spec to match code)
- `apps/web/src/lib/schemas/diagram.schema.ts` (add Zod validation)

---

### Issue #3: Missing Canonical Coordinate Model (NoteMarker)

**Current State**: `FretboardMarker` exists but `NoteMarker` doesn't
**Spec Defines**: Shared `NoteMarker` interface for both diagram types

**Decision**: Create `NoteMarker` type but keep existing implementations.

**Implementation Tasks**:
1. ✅ Define canonical `NoteMarker` type in shared location
2. ✅ Document relationship between `NoteMarker` and existing types
3. ✅ Add type guards and converters if needed

**Files to Create/Modify**:
- `apps/web/src/lib/diagrams/noteMarker.ts` (new file)
- Update spec document to clarify divergence

---

### Issue #4: Schema Validation - schemas.md vs Implementation

**Current State**: `schemas.md` shows simplified version, implementation has full Zod schemas
**Spec Confusion**: Two sources of truth (detailed spec doc vs schemas.md)

**Decision**: Make `schemas.md` the single source of truth for JSON contracts.

**Implementation Tasks**:
1. ✅ Update `specs/schemas.md` with complete, accurate JSON schemas
2. ✅ Add TypeScript type examples alongside JSON
3. ✅ Cross-reference from detailed spec docs to schemas.md
4. ✅ Validate that Zod schemas match schemas.md examples
5. ✅ Add validation that `review_logic` is properly used (currently optional)

**Files to Modify**:
- `specs/schemas.md` (comprehensive rewrite)
- `specs/diagram_rendering_system_guitar_app.md` (add cross-references)

---

## Phase 2: Validation Layer (MEDIUM PRIORITY)

### Issue #7: Missing Hard-Fail Validation

**Current State**: Silent try-catch blocks in `diagramEnrich.ts`
**Spec Requirement**: "No silent corrections. Hard fail on invalid data."

**Decision**: Add strict validation mode with graceful fallback option.

**Implementation Tasks**:
1. ✅ Create `validateChordSpec()` and `validateFretboardSpec()` functions
2. ✅ Add `strict` mode flag to diagram enrichment
3. ✅ Collect validation errors and surface to user/logs
4. ✅ Add telemetry for diagram validation failures
5. ✅ Update AI agent retry logic to use validation errors

**Files to Create/Modify**:
- `apps/web/src/lib/diagrams/validation.ts` (new file)
- `apps/web/src/lib/ai/diagramEnrich.ts` (use validation functions)
- `apps/web/src/lib/ai/dispatcher.ts` (add retry logic with validation errors)

**Validation Rules to Enforce**:
- Fret numbers must be 0-24
- String indices must be 0-5 (internal) or 1-6 (external)
- Tuning array must have exactly 6 elements
- `base_fret` must be positive
- No fret should be more than 12 frets above `base_fret` in a chord diagram
- Fretboard `fret_range[1]` must be > `fret_range[0]`

---

## Phase 3: Visual Language & Rendering (MEDIUM PRIORITY)

### Issue #5: Missing Visual Language Elements

**Current State**:
- Root notes: ✅ Red filled circle
- Other notes: ❌ Solid black (should be white fill, black stroke per spec)
- Finger numbers: ❌ Not rendered

**Spec Requirement** (diagram spec lines 156-176):
- Root note: filled black or red
- Other notes: white fill, black stroke
- Finger numbers inside circles

**Decision**: Implement spec visual language with backward compatibility.

**Implementation Tasks**:
1. ✅ Update `renderChordSvg.ts` to use white fill + black stroke for non-root notes
2. ✅ Add finger number rendering when `finger_numbers` array is present
3. ✅ Add visual regression tests (optional but recommended)
4. ✅ Update diagram examples in spec with actual rendered output

**Files to Modify**:
- `apps/web/src/lib/diagrams/renderChordSvg.ts`
- Visual style may need refinement based on actual rendering

**Visual Design Decisions Needed**:
- Font size for finger numbers (suggest 11-12px)
- Positioning of finger numbers (centered in circles)
- Color contrast for finger numbers on root notes (white on red)

---

### Issue #6: Inconsistent String Numbering

**Current State**: Mix of 0-indexed and 1-indexed references
**Spec Ambiguity**: Doesn't clearly specify internal vs external convention

**Decision**: Establish clear convention:
- **External API/AI**: 1-6 (string 1 = high E)
- **Internal Arrays**: 0-5 (index 0 = low E string 6)
- **Fretboard Markers**: 1-6 (user-facing)

**Implementation Tasks**:
1. ✅ Document string numbering convention in schemas.md
2. ✅ Add helper functions `stringNumberToIndex()` and `stringIndexToNumber()`
3. ✅ Audit all string references for consistency
4. ✅ Add validation that catches wrong string numbers
5. ✅ Update AI agent prompts to use 1-6 convention

**Files to Create/Modify**:
- `apps/web/src/lib/diagrams/stringHelpers.ts` (new file)
- Update all diagram-related files to use helpers
- `specs/schemas.md` (document convention clearly)

---

## Phase 4: Code Cleanup & Documentation (LOW PRIORITY)

### Issue #10: Deleted Files in Git Status

**Current State**: Multiple deleted files not committed

**Files to Handle**:
- `apps/web/src/app/(app)/lesson-demo/page.tsx` (deleted)
- `.npm-cache/_logs/*.log` (8+ files, should be gitignored)

**Implementation Tasks**:
1. ✅ Add `.npm-cache/` to `.gitignore`
2. ✅ Commit deletion of lesson-demo page
3. ✅ Clean up git status
4. ✅ Verify .gitignore patterns

**Files to Modify**:
- `.gitignore`
- Run: `git add -A` and commit cleanup

---

### Issue #11: Missing API Route Documentation

**Current State**: `route_implementation_ai_guitar_practice_app.md` has example code that doesn't match actual implementation

**Decision**: Update route spec to match actual implementation.

**Implementation Tasks**:
1. ✅ Document actual request/response formats for `/api/lesson`
2. ✅ Add examples with real payloads
3. ✅ Document all existing API routes with current signatures
4. ✅ Cross-reference from PRD to route docs

**Files to Modify**:
- `specs/route_implementation_ai_guitar_practice_app.md`

**Routes to Document**:
- `POST /api/lesson` - Full lesson generation
- `POST /api/plan/generate` - Plan generation
- `POST /api/plan/save` - Plan persistence
- `POST /api/diagram/chord` - Chord diagram SVG
- `POST /api/diagram/fretboard` - Fretboard diagram SVG
- `POST /api/library/ingest-url` - URL ingestion
- `POST /api/library/ingest-pdf` - PDF ingestion
- `POST /api/library/ingest-youtube` - YouTube ingestion
- `POST /api/tracks/wizard` - Track wizard
- `POST /api/adhoc/wizard` - Ad-hoc wizard

---

### Issue #8: Plan JSON Schema Review Logic

**Current State**: `review_logic` is optional in Zod schema (correctly implemented)
**Spec Shows**: As required field in example

**Decision**: Keep as optional (correct), update spec example.

**Implementation Tasks**:
1. ✅ Update `specs/schemas.md` to show `review_logic` as optional
2. ✅ Document when `review_logic` should be populated
3. ✅ Verify lesson generator populates it when appropriate

**Files to Modify**:
- `specs/schemas.md`

---

## Implementation Order

### Sprint 1: Schema Foundation (1-2 days)
- [ ] Issue #1: Enhance ChordDiagramSpec with pedagogical data
- [ ] Issue #2: Add Zod schemas for both diagram types
- [ ] Issue #4: Rewrite schemas.md as single source of truth
- [ ] Issue #8: Clarify review_logic as optional

**Deliverable**: All TypeScript types and Zod schemas match spec, schemas.md is comprehensive.

---

### Sprint 2: Validation & Error Handling (1 day)
- [ ] Issue #7: Implement validation layer
- [ ] Issue #3: Create canonical NoteMarker type
- [ ] Issue #6: Document and enforce string numbering convention

**Deliverable**: Strict validation mode works, clear error messages for invalid diagrams.

---

### Sprint 3: Visual Refinements (1 day)
- [ ] Issue #5: Update chord rendering visual language
- [ ] Render finger numbers in chord diagrams
- [ ] Test with real lesson generation

**Deliverable**: Diagrams match spec visual language, finger numbers render correctly.

---

### Sprint 4: Documentation & Cleanup (0.5 days)
- [ ] Issue #10: Git cleanup and .gitignore
- [ ] Issue #11: Update route documentation
- [ ] Update all spec docs to reflect decisions
- [ ] Add migration guide for any breaking changes

**Deliverable**: All specs match implementation, clean git status, comprehensive docs.

---

## Testing Strategy

### Unit Tests to Add
1. `validateChordSpec()` with invalid inputs
2. `validateFretboardSpec()` with out-of-range frets
3. String number conversion helpers
4. Voicing parser with finger numbers

### Integration Tests
1. Full lesson generation with new diagram schemas
2. AI agent diagram enrichment with validation errors
3. Diagram SVG rendering with finger numbers

### Manual Testing
1. Generate lessons with various chord progressions
2. Verify finger numbers render correctly
3. Test validation error messages
4. Verify backward compatibility with old diagrams

---

## Migration Strategy

### Backward Compatibility

**New fields are all optional**, so existing diagram specs continue to work:
- `finger_numbers?: Array<number | null>`
- `note_roles?: Array<NoteRole | null>`

### AI Agent Updates

Agents should be updated to include finger numbers when known:
- Update guitar theory agent prompt
- Update diagram enrichment agent prompt
- Add finger number inference for common open chords

### Database Migration

No database changes needed - `plan_json` is JSONB and accepts new fields.

---

## Risk Assessment

### Low Risk
- Adding optional fields (backward compatible)
- Documentation updates
- Git cleanup

### Medium Risk
- Validation layer (could break existing flows if too strict)
- Visual language changes (could affect user experience)

### Mitigation
- Feature flag for strict validation mode
- A/B test visual changes
- Comprehensive testing before deployment

---

## Success Criteria

- [ ] All Zod schemas match schemas.md
- [ ] No silent failures in diagram enrichment
- [ ] Spec documents accurately reflect implementation
- [ ] Clean git status
- [ ] All routes documented with examples
- [ ] Visual regression tests pass (if implemented)
- [ ] Backward compatibility verified
- [ ] AI agents generate valid diagrams with new schema

---

## Notes

### Design Philosophy Clarification

The original spec suggested a more complex `NoteMarker[]` approach, but the implementation chose a simpler `frets: Array<number | null>` approach. This plan **preserves the simpler approach** while adding optional pedagogical metadata to satisfy the spec's goals.

**Rationale**:
1. Simpler data model is easier for AI agents to generate correctly
2. Optional metadata allows progressive enhancement
3. Backward compatibility maintained
4. Pedagogical data (finger numbers) can be added when available

### Open Questions

1. Should finger numbers be required for beginner lessons?
2. Should we add a diagram "quality score" for validation?
3. Do we need a visual diagram editor for manual corrections?

---

**End of Implementation Plan**
