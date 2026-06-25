const regexOld = /^(?:Ans\s*)?([^a-zA-Z0-9]*[Xx]?[^a-zA-Z0-9]*)\b([A-D1-4])(?:\)|\]|\.|\s)\s*(.*)/i;
const regexNew = /^(?:Ans\s*)?([^a-zA-Z0-9]*(?:[xX][^a-zA-Z0-9]*)?)\b([A-D1-4])(?:\)|\]|\.|\s)\s*(.*)/i;

// A string starting with non-alphanumeric characters and containing some 'x' that doesn't match the full pattern
const testStr = "-".repeat(25) + "x" + "-".repeat(25) + "x" + "-".repeat(25);

console.time("Old Regex");
testStr.match(regexOld);
console.timeEnd("Old Regex");

console.time("New Regex");
testStr.match(regexNew);
console.timeEnd("New Regex");
