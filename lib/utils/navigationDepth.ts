/**
 * Navigation Depth Utility
 * 
 * Determines the depth level in the cave navigation hierarchy:
 * - Depth 0: Cave entrance (my-cave, dashboard)
 * - Depth 1: Goals
 * - Depth 2: Methods
 * - Depth 3: Events
 */

export type NavigationDepth = 0 | 1 | 2 | 3 | 4;

/**
 * Get the navigation depth based on the current pathname
 * 
 * Hierarchy:
 * Depth 0: Outside (Dashboard, Login, Landing) - Lightest
 * Depth 1: Cave Entrance (My Cave)
 * Depth 2: Goals (/goals)
 * Depth 3: Methods (/methods)
 * Depth 4: Events (/events) - Darkest
 */
export function getNavigationDepth(pathname: string): NavigationDepth {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  
  // Depth 4: Events (Deepest)
  if (segments[0] === 'events') {
    return 4;
  }
  
  // Depth 3: Methods
  if (segments.includes('methods') || segments[0] === 'methods') {
    return 3;
  }
  
  // Depth 2: Goals
  if (segments[0] === 'goals') {
    return 2;
  }
  
  // Depth 1: Cave Entrance
  if (segments[0] === 'my-cave') {
    return 1;
  }
  
  // Depth 0: Outside / Dashboard
  return 0;
}

/**
 * Get the CSS class name for the current navigation depth
 */
export function getDepthClassName(pathname: string): string {
  const depth = getNavigationDepth(pathname);
  return `cave-depth-${depth}`;
}

/**
 * Get background color for a specific depth
 * Returns the CSS variable name
 */
export function getDepthBackground(depth: NavigationDepth): string {
  return `var(--background-depth-${depth})`;
}
