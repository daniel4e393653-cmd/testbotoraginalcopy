/**
 * Extracts type arguments from a Sui Move generic type string
 * @param typeStr - The full type string (e.g., "0x...::pool::Pool<0x2::sui::SUI, 0x...::usdc::USDC>")
 * @returns Array of type arguments or null if not a generic type
 * 
 * Example:
 * extractTypeArguments("0x123::pool::Pool<0x2::sui::SUI, 0x456::usdc::USDC>")
 * => ["0x2::sui::SUI", "0x456::usdc::USDC"]
 */
export function extractTypeArguments(typeStr: string): string[] | null {
  // Match the type parameters inside angle brackets
  const match = typeStr.match(/<(.+)>$/);
  if (!match) {
    return null;
  }

  // Parse the comma-separated type arguments, handling nested generics
  const typeArgs: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of match[1]) {
    if (char === '<') {
      depth++;
      current += char;
    } else if (char === '>') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      typeArgs.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    typeArgs.push(current.trim());
  }

  return typeArgs.length > 0 ? typeArgs : null;
}
