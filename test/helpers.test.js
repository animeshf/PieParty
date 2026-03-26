const test = require("node:test");
const assert = require("node:assert/strict");
const { normalize, snapshot } = require("../server");

test("normalize lowercases, trims, removes punctuation, and collapses spaces", () => {
  assert.equal(normalize("  Hello,   WORLD!!  "), "hello world");
});

test("normalize removes unsupported characters", () => {
  assert.equal(normalize("Pi-day!!! 🥧 #1"), "piday 1");
});

test("snapshot filters zero/negative counts and sorts descending", () => {
  const result = snapshot({
    chess: 2,
    pie: 5,
    music: 0,
    books: -1,
    movies: 3,
  });

  assert.deepEqual(result, {
    pie: 5,
    movies: 3,
    chess: 2,
  });
});
