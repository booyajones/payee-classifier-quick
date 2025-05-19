
declare module "probablepeople" {
  /**
   * Parse a name into components
   * @param name The name string to parse
   * @returns A tuple with [parsed components, type] where type is 'person' or 'corporation'
   */
  export function parse(name: string): [any, 'person' | 'corporation'];
  
  /**
   * Tag a name string with components
   * @param name The name string to tag
   * @returns A tagged string
   */
  export function tag(name: string): string;
}
