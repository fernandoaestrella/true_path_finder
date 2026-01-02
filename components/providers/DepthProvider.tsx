'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { getDepthClassName } from '@/lib/utils/navigationDepth';

/**
 * DepthProvider Component
 * 
 * Applies the appropriate cave depth class to the body element based on the current route.
 * This creates a progressive darkening effect as users navigate deeper into the cave.
 */
export function DepthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Get the depth class name based on current pathname
    const depthClass = getDepthClassName(pathname);
    
    // Remove any existing depth classes
    document.body.classList.remove(
      'cave-depth-0',
      'cave-depth-1',
      'cave-depth-2',
      'cave-depth-3',
      'cave-depth-4'
    );
    
    // Add the new depth class
    document.body.classList.add(depthClass);
    
    // Cleanup function to remove the class when component unmounts
    return () => {
      document.body.classList.remove(depthClass);
    };
  }, [pathname]);

  return <>{children}</>;
}
