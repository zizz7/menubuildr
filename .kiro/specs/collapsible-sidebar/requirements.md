# Requirements Document

## Introduction

Add a collapsible sidebar to the dashboard desktop layout. The sidebar should toggle between an expanded state (260px, showing icons and labels) and a collapsed state (~68px, showing only icons) with a smooth CSS transition animation. The existing mobile drawer behavior remains unchanged.

## Glossary

- **Sidebar**: The fixed left-side navigation panel in the `DashboardLayout` component, visible on desktop (lg+ breakpoints)
- **Collapsed_State**: The sidebar mode where only navigation icons are visible, at a reduced width (~68px)
- **Expanded_State**: The sidebar mode where icons and text labels are visible, at full width (260px)
- **Toggle_Button**: A clickable control that switches the Sidebar between Collapsed_State and Expanded_State
- **Mobile_Drawer**: The existing slide-in navigation panel used on screens below the lg breakpoint
- **Nav_Item**: A single navigation link in the Sidebar, consisting of an icon and a text label
- **Profile_Header**: The top section of the Sidebar displaying the user avatar, name, and restaurant name
- **Sidebar_Footer**: The bottom section of the Sidebar containing the logout button and version text

## Requirements

### Requirement 1: Sidebar Toggle Control

**User Story:** As a dashboard user, I want a toggle button on the sidebar so that I can collapse or expand it on demand.

#### Acceptance Criteria

1. THE Sidebar SHALL display a Toggle_Button that is visible in both Expanded_State and Collapsed_State
2. WHEN the user clicks the Toggle_Button while the Sidebar is in Expanded_State, THE Sidebar SHALL transition to Collapsed_State
3. WHEN the user clicks the Toggle_Button while the Sidebar is in Collapsed_State, THE Sidebar SHALL transition to Expanded_State
4. THE Toggle_Button SHALL have an accessible label indicating its current action (e.g., "Collapse sidebar" or "Expand sidebar")

### Requirement 2: Sidebar Expanded State

**User Story:** As a dashboard user, I want the expanded sidebar to show icons and labels so that I can easily identify navigation items.

#### Acceptance Criteria

1. WHILE the Sidebar is in Expanded_State, THE Sidebar SHALL render at 260px width
2. WHILE the Sidebar is in Expanded_State, THE Sidebar SHALL display each Nav_Item with its icon and text label
3. WHILE the Sidebar is in Expanded_State, THE Profile_Header SHALL display the user avatar, user name, and restaurant name
4. WHILE the Sidebar is in Expanded_State, THE Sidebar_Footer SHALL display the logout icon, "Log Out" text, and version text

### Requirement 3: Sidebar Collapsed State

**User Story:** As a dashboard user, I want the collapsed sidebar to show only icons so that I have more screen space for content.

#### Acceptance Criteria

1. WHILE the Sidebar is in Collapsed_State, THE Sidebar SHALL render at 68px width
2. WHILE the Sidebar is in Collapsed_State, THE Sidebar SHALL display each Nav_Item with only its icon, hiding the text label
3. WHILE the Sidebar is in Collapsed_State, THE Profile_Header SHALL display only the user avatar, hiding the user name and restaurant name
4. WHILE the Sidebar is in Collapsed_State, THE Sidebar_Footer SHALL display only the logout icon, hiding the "Log Out" text and version text
5. WHILE the Sidebar is in Collapsed_State, THE Nav_Item icons SHALL remain centered within the Sidebar width
6. WHILE the Sidebar is in Collapsed_State, THE navigation group labels (e.g., "Main", "Customize", "Account") SHALL be hidden

### Requirement 4: Smooth Transition Animation

**User Story:** As a dashboard user, I want the sidebar to animate smoothly when collapsing and expanding so that the experience feels polished.

#### Acceptance Criteria

1. WHEN the Sidebar transitions between Expanded_State and Collapsed_State, THE Sidebar SHALL animate its width change over a duration of 200ms to 300ms using a CSS transition
2. WHEN the Sidebar transitions to Collapsed_State, THE text labels SHALL fade out during the width animation
3. WHEN the Sidebar transitions to Expanded_State, THE text labels SHALL fade in during the width animation
4. WHEN the Sidebar transitions between states, THE main content area SHALL smoothly adjust its width to fill the remaining viewport space

### Requirement 5: Main Content Layout Adjustment

**User Story:** As a dashboard user, I want the main content area to resize when the sidebar collapses so that I can use the full available space.

#### Acceptance Criteria

1. WHILE the Sidebar is in Expanded_State, THE main content area SHALL be offset by 260px from the left edge of the viewport
2. WHILE the Sidebar is in Collapsed_State, THE main content area SHALL be offset by 68px from the left edge of the viewport
3. WHEN the Sidebar transitions between states, THE main content area SHALL animate its layout adjustment in sync with the Sidebar width transition

### Requirement 6: Mobile Behavior Preservation

**User Story:** As a mobile user, I want the existing drawer navigation to remain unchanged so that my mobile experience is not affected.

#### Acceptance Criteria

1. WHILE the viewport is below the lg breakpoint, THE Mobile_Drawer SHALL continue to function as an overlay drawer with backdrop
2. WHILE the viewport is below the lg breakpoint, THE Toggle_Button for desktop collapse SHALL be hidden
3. WHILE the viewport is below the lg breakpoint, THE Sidebar collapse state SHALL have no effect on the Mobile_Drawer behavior

### Requirement 7: Collapse State Persistence

**User Story:** As a dashboard user, I want the sidebar to remember whether I collapsed it so that it stays in my preferred state across page navigations.

#### Acceptance Criteria

1. WHEN the user sets the Sidebar to Collapsed_State, THE DashboardLayout SHALL persist the collapse preference in browser localStorage
2. WHEN the DashboardLayout loads, THE Sidebar SHALL restore the previously persisted collapse state from localStorage
3. IF no persisted collapse state exists, THEN THE Sidebar SHALL default to Expanded_State

### Requirement 8: Tooltip on Collapsed Nav Items

**User Story:** As a dashboard user, I want to see tooltips when hovering over collapsed sidebar icons so that I can still identify each navigation item.

#### Acceptance Criteria

1. WHILE the Sidebar is in Collapsed_State, WHEN the user hovers over a Nav_Item icon, THE Sidebar SHALL display a tooltip showing the Nav_Item title
2. WHILE the Sidebar is in Expanded_State, THE Sidebar SHALL not display tooltips on Nav_Item hover (since labels are already visible)
