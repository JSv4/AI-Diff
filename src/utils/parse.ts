/**
 * Extracts text between ||| delimiters from the input string
 * @param input - The input string containing the modified text
 * @returns The extracted text or null if no match is found
 */
export function extractModifiedText(input: string): string | null {
    // Log the input for debugging
    console.log('Attempting to extract from:', input);
    
    // Try to find anything between ||| markers
    const regex = /\|\|\|([\s\S]*?)\|\|\|/;
    const match = input.match(regex);
    
    // Log the match result
    console.log('Regex match result:', match);
    
    if (match && match[1]) {
        // Trim any whitespace
        return match[1].trim();
    }
    
    // If no match with |||, return the entire input as fallback
    // This helps handle cases where the API might not wrap the response
    return input.trim();
}
