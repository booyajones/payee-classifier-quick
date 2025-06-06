
// Lazy-loaded probablepeople module to handle import issues
let probablepeople: any = null;
let importPromise: Promise<any> | null = null;

const loadProbablePeople = async () => {
  if (probablepeople) return probablepeople;
  
  if (!importPromise) {
    importPromise = (async () => {
      try {
        const module = await import('probablepeople');
        probablepeople = (module as any).default ?? module;
        return probablepeople;
      } catch (error) {
        console.warn('Warning: probablepeople package not available, using fallback classification only');
        probablepeople = {
          parse: () => {
            throw new Error('probablepeople not available');
          }
        };
        return probablepeople;
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
