
// Use a dynamic import to support ESM environments
let probablepeople: any;

try {
  const module = await import('probablepeople');
  probablepeople = (module as any).default ?? module;
} catch {
  console.warn(
    'Warning: probablepeople package not available, using fallback classification only'
  );
  probablepeople = {
    parse: () => {
      throw new Error('probablepeople not available');
    }
  };
}

export { probablepeople };
