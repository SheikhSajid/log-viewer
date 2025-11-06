export const tokenizeSearchTerm = (searchTerm: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|([^,\s]+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(searchTerm)) !== null) {
    const quoted = match[1];
    const unquoted = match[2];
    const token = (quoted ?? unquoted ?? '').trim();
    if (token.length > 0) {
      tokens.push(token);
    }
  }

  // Handle case where there's an unmatched quote containing the rest of the string
  if (searchTerm.includes('"') && searchTerm.split('"').length % 2 === 0) {
    const lastQuoteIndex = searchTerm.lastIndexOf('"');
    if (lastQuoteIndex !== -1 && lastQuoteIndex < searchTerm.length - 1) {
      const remainder = searchTerm.slice(lastQuoteIndex + 1).trim();
      if (remainder.length > 0) {
        tokens.push(remainder);
      }
    }
  }

  return tokens;
};
