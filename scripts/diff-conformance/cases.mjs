export const callerPairs = [
  ["Find the sum of x and y.", "Find the product of x and y."],
  ["What is $\\frac{x+1}{2}$?", "What is $\\frac{x-1}{2}$?"],
  [
    "A triangle has area 12. Find its height.",
    "A triangle has area 18. Find its height.",
  ],
  ["The answer is 42.", "The answer is 43."],
  ["  Find  x.\n", "Find x."],
  ["Let a = b and b = a.", "Let b = a and a = b."],
  ["", "New problem statement."],
  ["Remove this sentence.", ""],
  ["<img src=x onerror=alert(1)>", "<script>literal text</script>"],
  ["A café has 12 tables.", "A café has 13 tables."],
  ["Solve x² + y² = 25.", "Solve x² + y² = 36."],
  ["😀 Find the answer.", "😀 Find all answers."],
];
export const versionChanges = [
  ["a×b", "a÷b"],
  ["ab", "a\u00adb"],
];
export function snapshots(api) {
  return callerPairs.map(([a, b]) => api.diffWords(a, b));
}
