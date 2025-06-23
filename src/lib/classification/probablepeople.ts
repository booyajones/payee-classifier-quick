
// Attempt to load the optional probablepeople package when first used.
// If the package isn't installed we fall back to a no-op implementation.
let loadedModule: any | null | undefined = undefined;

const loadProbablePeople = async () => {
  if (loadedModule !== undefined) return loadedModule;

  try {
    loadedModule = await import('probablepeople');
  } catch {
    console.warn('Warning: probablepeople package not available, using fallback classification only');
    loadedModule = null;
  }

  return loadedModule;
};

// Export a wrapper that handles the lazy loading
export const probablepeople = {
  /**
   * Parse a payee name using probablepeople if available.
   *
   * When the library is missing or parsing fails, this returns `null` or `{}`
   * instead of throwing so callers can gracefully degrade.
   */
  parse: async (name: string): Promise<any> => {
    const pp = await loadProbablePeople();

    if (!pp || typeof pp.parse !== 'function') {
      return null;
    }

    try {
      return await pp.parse(name);
    } catch {
      return {};
    }
  }
};
