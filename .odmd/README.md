# Platform Patterns - Generic ONDEMANDENV Patterns

This directory contains **GENERIC** platform patterns and development guidelines that can be applied to ANY system built on the ONDEMANDENV platform.

## 🚨 **WARNING: GENERIC PATTERNS VS. SPECIFIC IMPLEMENTATION** 🚨

**These documents describe generic platform patterns.** Your project's specific implementation will have its own conventions, directory structures, and phasing that may differ from the examples provided here.

**ALWAYS prioritize your project's own documentation and established patterns.** If you find a conflict or ambiguity between these generic patterns and your project's specific documentation, **the project-specific documentation is the source of truth.**


## 📋 **GENERIC PLATFORM DOCUMENTATION**

### **Core Platform Patterns (Ordered by Importance):**

1. **`ENVER_BASED_SERVICE_CONTEXT_PATTERN.md`**: **🚀 ULTIMATE BEST PRACTICE** - Revolutionary PHASES = ENVERS architecture
2. **`SYSTEM_SPECIFIC_INPUTS.md`**: **INPUTS REQUIRED** - List of all inputs needed to customize the platform.
3. **`ONDEMANDENV_PLATFORM.md`**: Generic platform interface and architecture patterns with PHASES = ENVERS insight
4. **`SERVICE_PHASE_DEVELOPMENT_PATTERN.md`**: Generic service development lifecycle and phase management
5. **`WEB_CLIENT_BDD_PATTERN.md`**: Generic web client BDD testing patterns with enver alignment
6. **`lib/utls/ONDEMANDENV_PLATFORM_schema.md`**: Generic platform schema and configuration patterns

## 📎 Docs In Code (ContractsLib)

Contracts and contexts are described in code and point to Markdown files by path. Implementers must set:
- `OdmdBuild.serviceOverviewMD`: path to service overview MD (intent, boundaries, public interfaces).
- `OdmdBuild.serviceContextMD`: path to service context MD (implementation specs shared across envers).
- `IOdmdEnver.enverContextMD`: path to enver-scoped MD (mock/dev/main specifics). This may vary per instance.

Notes
- Provide repository-relative paths (e.g., `src/lib/repos/identity/docs/SERVICE_OVERVIEW.md`).
- No MD generation required; reviewers/devs read these files directly.
- Add a unit test to assert each path exists to prevent drift — `odmdValidate()` also checks existence, so missing paths will fail the ContractsLib build.

> Heads-up on defaults: if you forget to override these properties, the base classes fall back to the generic platform pattern docs shipped in this `.odmd/` directory (`ONDEMANDENV_PLATFORM.md`, `SERVICE_PHASE_DEVELOPMENT_PATTERN.md`, `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md`). Those defaults exist so that `odmdValidate()` doesn't fail before you've written any docs — they are **not** service documentation, and shipping them to production means your service has no real docs-in-code. Always override with service-specific paths.

### **🚨 CRITICAL: GENERIC PATTERNS ONLY**

These documents contain:
- ✅ **GENERIC** platform concepts, patterns, and templates
- ✅ **PLACEHOLDER** examples using generic service names (Service A, Service B, etc.)
- ✅ **TEMPLATE** structures that can be applied to any system
- ✅ **UNIVERSAL** development patterns and best practices

These documents do NOT contain:
- ❌ **IMPLEMENTATION-SPECIFIC** details for any particular system
- ❌ **CONCRETE** examples with real service names or data
- ❌ **SYSTEM-SPECIFIC** mock data or configuration
- ❌ **DOMAIN-SPECIFIC** business logic or requirements

## 📖 **USAGE GUIDELINES**

### **For Platform Teams:**
- Use these patterns as templates for new systems
- Maintain generic nature - avoid system-specific details
- Update patterns based on platform evolution
- Ensure patterns work across different domains

### **For Implementation Teams:**
- Reference these patterns for development guidance
- Create implementation-specific documentation in the directory specified in your project's `SYSTEM_SPECIFIC_INPUTS.md`.
- Extract concrete examples to implementation folders
- Follow generic patterns while adapting to specific needs

### **For System Architects:**
- Use as foundation for system design
- Adapt generic patterns to specific requirements
- Maintain separation between platform patterns and implementation details
- Ensure consistency across multiple systems using these patterns

This separation ensures that platform patterns remain reusable across different systems while implementation details are properly organized and maintained separately.

## IMPORTANT — Phase Status Gating and Canonical Progression
- Phase 0A is automatically ✅ DONE upon service context generation.
- All other phases require explicit user confirmation before marking ✅ COMPLETE.
- Canonical progression: mock → dev → main (no forward references).
- OdmdBuild and OdmdEnver definitions must live in the organization ContractsLib; service repos define stacks/runtime only.
- Cross-build wiring happens after all builds exist. Two valid styles: a central `wireBuildCouplings()` method on your `OndemandContracts` subclass (recommended for larger graphs), or inline wiring inside enver constructors. Neither is built into the base class — you pick and wire. See `ONDEMANDENV_PLATFORM.md` → "Two valid wiring styles".
