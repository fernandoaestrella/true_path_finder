# Navigation Depth System

## Overview

The navigation depth system creates a progressive background darkening effect as users navigate deeper into the "cave" structure of the application. This provides a subtle visual cue about the user's current location in the navigation hierarchy.

## Depth Levels

The application has 5 depth levels:

| Depth | Location | Background Color | Example Routes |
|-------|----------|------------------|----------------|
| **0** | Outside | `#FFFFFF` (White) | `/dashboard`, `/login`, Landing |
| **1** | Cave Entrance | `#F5F6F8` (Lightest Grey) | `/my-cave` |
| **2** | Goals | `#EEF0F3` | `/goals`, `/goals/123` |
| **3** | Methods | `#E7EAEE` | `/methods/123`, `/goals/123/methods` |
| **4** | Events | `#E0E4E9` (Darkest) | `/events`, `/events/123` |

## How It Works

### 1. CSS Custom Properties (`globals.css`)

Five CSS custom properties define the background colors for each depth:

```css
--background-depth-0: #FFFFFF; /* Outside */
--background-depth-1: #F5F6F8; /* Cave Entrance */
--background-depth-2: #EEF0F3; /* Goals */
--background-depth-3: #E7EAEE; /* Methods */
--background-depth-4: #E0E4E9; /* Events */
```

### 2. CSS Classes (`globals.css`)

Five classes apply these backgrounds:

```css
.cave-depth-0 { background: var(--background-depth-0); }
.cave-depth-1 { background: var(--background-depth-1); }
.cave-depth-2 { background: var(--background-depth-2); }
.cave-depth-3 { background: var(--background-depth-3); }
.cave-depth-4 { background: var(--background-depth-4); }
```

### 3. Navigation Depth Utility (`lib/utils/navigationDepth.ts`)

The utility determines the depth based on the current pathname:

- `getNavigationDepth(pathname)` - Returns the depth level (0-4)
- `getDepthClassName(pathname)` - Returns the appropriate CSS class name
- `getDepthBackground(depth)` - Returns the CSS variable for a specific depth


### 4. DepthProvider Component (`components/providers/DepthProvider.tsx`)

A client component that:
1. Monitors the current route using `usePathname()`
2. Calculates the appropriate depth class
3. Applies the class to the `<body>` element
4. Updates automatically when the route changes

### 5. Root Layout Integration (`app/layout.tsx`)

The `DepthProvider` wraps all children in the root layout:

```tsx
<DepthProvider>
  {children}
</DepthProvider>
```

## Usage

The depth system works automatically - no manual intervention needed on individual pages. When a user navigates:

1. The URL changes
2. `DepthProvider` detects the pathname change
3. It calculates the new depth level
4. It applies the corresponding `cave-depth-X` class to `<body>`
5. The background color smoothly transitions

## Customization

### Adjusting Colors

To make the backgrounds darker or lighter, edit the CSS custom properties in `globals.css`:

```css
/* Make depth 3 darker */
--background-depth-3: #D8DCE1;

/* Make depth 1 lighter */
--background-depth-1: #F2F4F6;
```

### Adding New Depth Levels

If you need to add a 5th depth level:

1. Add the CSS custom property in `globals.css`:
   ```css
   --background-depth-4: #D9DDE2;
   ```

2. Add the CSS class:
   ```css
   .cave-depth-4 {
     background: var(--background-depth-4);
   }
   ```

3. Update the `NavigationDepth` type in `navigationDepth.ts`:
   ```typescript
   export type NavigationDepth = 0 | 1 | 2 | 3 | 4;
   ```

4. Update the `getNavigationDepth()` function to return `4` for the appropriate routes

5. Update the `DepthProvider` to remove the new class in cleanup:
   ```typescript
   document.body.classList.remove(
     'cave-depth-0',
     'cave-depth-1',
     'cave-depth-2',
     'cave-depth-3',
     'cave-depth-4'
   );
   ```

### Changing Route Mappings

To change which routes map to which depths, edit the `getNavigationDepth()` function in `lib/utils/navigationDepth.ts`.

For example, to make the profile page depth 1:

```typescript
if (segments[0] === 'profile') {
  return 1;
}
```

## Technical Notes

- The depth classes are applied to `<body>`, not individual page containers
- This ensures consistent backgrounds across all pages
- The system uses `usePathname()` from Next.js, which updates on client-side navigation
- Classes are cleaned up when the component unmounts
- The transition is handled by CSS, making it smooth and performant

## Troubleshooting

**Background not changing:**
- Check that `DepthProvider` is properly wrapped in the root layout
- Verify the route is correctly mapped in `getNavigationDepth()`
- Inspect the `<body>` element to see if the class is being applied

**Wrong depth level:**
- Check the pathname parsing logic in `getNavigationDepth()`
- Ensure the route segments are being split correctly

**Conflicts with page-level backgrounds:**
- Remove inline background styles from page containers
- Let the body background show through instead
