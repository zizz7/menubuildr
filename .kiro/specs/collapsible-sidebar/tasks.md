# Implementation Plan: Collapsible Sidebar

## Overview

Add collapse/expand functionality to the desktop sidebar in `DashboardLayout`. A new Zustand store persists the collapsed state via localStorage. The sidebar toggles between 260px (expanded) and 68px (collapsed) with CSS transitions, CSS-only tooltips, and no changes to mobile drawer behavior.

## Tasks

- [x] 1. Create the sidebar Zustand store
  - [x] 1.1 Create `dashboard/lib/store/sidebar-store.ts` with `useSidebarStore`
    - Define `SidebarState` interface with `collapsed: boolean` and `toggle: () => void`
    - Use `zustand/persist` with `createJSONStorage(() => localStorage)` under key `"sidebar-storage"`
    - Default `collapsed` to `false`
    - `toggle()` flips `collapsed` via `set((s) => ({ collapsed: !s.collapsed }))`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 1.2 Write property test for toggle round-trip (Property 1)
    - **Property 1: Toggle round-trip**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.3 Write property test for persistence round-trip (Property 5)
    - **Property 5: Persistence round-trip**
    - **Validates: Requirements 7.1, 7.2**

- [x] 2. Modify DashboardLayout for collapsible sidebar
  - [x] 2.1 Refactor sidebar content to accept `collapsed` parameter
    - Extract sidebar rendering into a function/variable that accepts `collapsed: boolean`
    - Mobile drawer always passes `collapsed={false}`
    - Desktop sidebar passes the actual `collapsed` state from `useSidebarStore`
    - _Requirements: 6.3_

  - [x] 2.2 Add toggle button with accessible label
    - Import `ChevronsLeft` and `ChevronsRight` from `lucide-react`
    - Add toggle button inside the desktop sidebar (bottom of sidebar, above footer or at top)
    - `aria-label`: "Collapse sidebar" when expanded, "Expand sidebar" when collapsed
    - Hide toggle button on mobile (`hidden lg:flex`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.2_

  - [x] 2.3 Implement conditional sidebar width and transitions
    - Desktop sidebar: `w-[260px]` when expanded, `w-[68px]` when collapsed
    - Add `transition-all duration-200` to sidebar
    - Main content area adjusts offset in sync with sidebar width
    - Add `transition-all duration-200` to main content area
    - _Requirements: 2.1, 3.1, 4.1, 4.4, 5.1, 5.2, 5.3_

  - [x] 2.4 Implement text visibility toggling with fade transitions
    - Nav item text labels: `opacity-0 w-0 overflow-hidden` when collapsed, `opacity-100` when expanded
    - Group headers: hidden when collapsed
    - Profile header: show only avatar when collapsed, hide name and restaurant
    - Footer: show only logout icon when collapsed, hide text and version
    - All text elements get `transition-opacity duration-200`
    - _Requirements: 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 3.6, 4.2, 4.3_

  - [x] 2.5 Implement nav item centering and CSS tooltips when collapsed
    - Nav items use `justify-center` when collapsed
    - Add `group/navitem` wrapper with absolutely-positioned tooltip `<span>`
    - Tooltip shows on `group-hover/navitem` only when collapsed
    - _Requirements: 3.5, 8.1, 8.2_

  - [ ]* 2.6 Write property test for toggle button presence and accessible label (Property 2)
    - **Property 2: Toggle button presence and accessible label**
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 2.7 Write property test for text element visibility (Property 3)
    - **Property 3: Text element visibility matches expanded state**
    - **Validates: Requirements 2.2, 3.2, 3.6**

  - [ ]* 2.8 Write property test for tooltip visibility (Property 4)
    - **Property 4: Tooltip visibility is inverse of expanded state**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 2.9 Write property test for mobile drawer expanded content (Property 6)
    - **Property 6: Mobile drawer renders expanded content regardless of collapse state**
    - **Validates: Requirements 6.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design uses TypeScript/React with Tailwind CSS
- Property tests use `fast-check` with `@testing-library/react`
- The existing mobile drawer behavior and /me fetch must be preserved
