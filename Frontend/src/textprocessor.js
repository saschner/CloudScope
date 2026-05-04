// textProcessor.js – never touches years
export function cleanEmailText(text) {
  return text
    // keep letters, numbers, spaces, basic punctuation
    .replace(/[^a-zA-Z0-9\s.,;!?()\-]/g, " ")
    // collapse extra spaces
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  const cleaned = cleanEmailText(text);
  return cleaned
    .toLowerCase()
    .split(" ")
    .filter(word => word.length > 0);
}