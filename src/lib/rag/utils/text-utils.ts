export function cleanDocumentText(text: string): string {
  if (!text) return "";
  
  // 1. Normalize excessive newlines (more than 2 becomes 2)
  let cleaned = text.replace(/\n{3,}/g, '\n\n');
  
  // 2. Fix layout wraps caused by PDF extraction.
  // If a line ends in a lower-case letter, comma, or hyphen, and the next line 
  // begins with a lower-case letter, it's highly likely a broken sentence wrap.
  cleaned = cleaned.replace(/([a-z,-])\n([a-z])/g, '$1 $2');
  
  // 3. Normalize excessive spaces
  cleaned = cleaned.replace(/ {3,}/g, '  ');
  
  // 4. Remove zero-width characters and unusual control characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  return cleaned.trim();
}

export function generateSnippet(text: string, maxLength: number = 350): string {
  const cleaned = cleanDocumentText(text);
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Find a sensible sentence boundary within the max length window
  const windowStr = cleaned.substring(0, maxLength);
  
  // Look for last sentence-ending punctuation followed by space or EOF
  const lastPunctuationIndex = windowStr.search(/[.!?](?=\s|$)[^.!?]*$/);
  
  if (lastPunctuationIndex !== -1 && lastPunctuationIndex > maxLength * 0.5) {
    // Break cleanly at the sentence end
    return windowStr.substring(0, lastPunctuationIndex + 1) + " ...";
  }
  
  // If no good punctuation is found, break at the last word boundary
  const lastSpace = windowStr.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) {
    return windowStr.substring(0, lastSpace) + " ...";
  }
  
  // Fallback to strict cutoff
  return windowStr + "...";
}
