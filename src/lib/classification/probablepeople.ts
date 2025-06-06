
// Lazy-loaded probablepeople module to handle import issues
let loadedModule: any = null;
let importPromise: Promise<any> | null = null;

const loadProbablePeople = async () => {
  if (loadedModule) return loadedModule;
  
  if (!importPromise) {
    importPromise = (async () => {
      try {
        const module = await import('probablepeople');
        loadedModule = (module as any).default ?? module;
        return loadedModule;
      } catch (error) {
        console.warn('Warning: probablepeople package not available, using fallback classification only');
        loadedModule = {
          parse: () => {
            throw new Error('probablepeople not available');
          }
        };
        return loadedModule;
      }
    })();
  }
  
  return await importPromise;
};

// Export a wrapper that handles the lazy loading
export const probablepeople = {
  parse: async (name: string) => {
    const pp = await loadProbablePeople();
    return pp.parse(name);
  }
};
