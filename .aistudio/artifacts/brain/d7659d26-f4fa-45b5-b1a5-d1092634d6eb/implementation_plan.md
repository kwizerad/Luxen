# Redesign Plan: Course Student Panel

Goal: Redesign the course student panel for a clean, minimal, Modern SaaS aesthetic while preserving all existing functionality.

## 1. Architectural Changes
- **Decompose `CourseView`**: Break the 3000-line monolithic component into modular sub-components.
- **Adopt Two-Zone Layout**: Use a clear "Interactive Stage" (main content) and "Control & Concept Deck" (sidebar/controls) as per the Educational Simulations reference.
- **UI/UX Cleanup**:
    - Remove rounded pill boxes for metadata.
    - Standardize on clean, unboxed text with typographic separators.
    - Implement a consistent 60-30-10 color scheme.
    - Simplify navigation and focus on readability.

## 2. Component Structure
- `CourseSidebar`: Module and lesson navigation.
- `StudyInterface`: Main content area (`Interactive Stage`) + `Control Deck`.
- `CourseTopBar`: Minimal brand/action bar.
- `AITools`: Encapsulated AI functionality (TTS, Translation, Note-taking).
- `CourseTimer`: Clean, unobtrusive study timer.

## 3. Migration & Verification Strategy
- **Step 1: Prototype New Structure**: Build the shell with minimal functionality.
- **Step 2: Migrate Core Logic**: Gradually move logic (timers, progress tracking, state management) into the new modular components.
- **Step 3: Refine Styling**: Apply Tailwind classes based on the Modern SaaS aesthetic.
- **Step 4: Verification**: Test all existing features (study timers, progress tracking, language switching, AI tools) after migration.
