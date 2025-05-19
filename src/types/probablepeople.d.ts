
declare module 'probablepeople' {
  /**
   * Parse a name string into components
   * @param name The name string to parse
   * @returns A tuple containing the parsed components and the determined name type ('person' or 'corporation')
   */
  export function parse(name: string): [Record<string, string>, 'person' | 'corporation'];
}
