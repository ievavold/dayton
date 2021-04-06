interface Item {
  value: unknown;
  label: string;
}

export const fuzzy = (pattern: string, items: Item[]): Item[] => {
  return items
    .map(item => ({ item, score: fuzzyMatch(pattern, item.label) }))
    .filter(tuple => tuple.score[1])
    .sort((a, b) => b.score[1] - a.score[1])
    .map(({ item }) => item);
};

// LICENSE
//
//   This software is dual-licensed to the public domain and under the following
//   license: you are granted a perpetual, irrevocable license to copy, modify,
//   publish, and distribute this file as you see fit.
//
// VERSION
//   0.1.0  (2016-03-28)  Initial release
//
// AUTHOR
//   Forrest Smith
//
// CONTRIBUTORS
//   Anurag Awasthi - updated to 0.2.0
//
// @link https://www.forrestthewoods.com/blog/reverse_engineering_sublime_texts_fuzzy_match/

const SEQUENTIAL_BONUS = 15; // bonus for adjacent matches
const SEPARATOR_BONUS = 30; // bonus if match occurs after a separator
const FIRST_LETTER_BONUS = 50; // bonus if the first letter is matched

const LEADING_LETTER_PENALTY = -5; // penalty applied for every letter in str before the first match
const MAX_LEADING_LETTER_PENALTY = -15; // maximum penalty for leading letters
const UNMATCHED_LETTER_PENALTY = -1;

const fuzzyMatch = (pattern: string, str: string): [boolean, number] => {
  const recursionCount = 0;
  const recursionLimit = 10;
  const matches: number[] = [];
  const maxMatches = 256;

  return fuzzyMatchRecursive(
    pattern,
    str,
    0 /* patternCurIndex */,
    0 /* strCurrIndex */,
    null /* srcMatces */,
    matches,
    maxMatches,
    0 /* nextMatch */,
    recursionCount,
    recursionLimit,
  );
};

const fuzzyMatchRecursive = (
  pattern: string,
  str: string,
  patternCurIndex: number,
  strCurrIndex: number,
  srcMatces: number[] | null,
  matches: number[],
  maxMatches: number,
  nextMatch: number,
  recursionCount: number,
  recursionLimit: number,
): [boolean, number] => {
  let outScore = 0;

  // Return if recursion limit is reached.
  if (++recursionCount >= recursionLimit) {
    return [false, outScore];
  }

  // Return if we reached ends of strings.
  if (patternCurIndex === pattern.length || strCurrIndex === str.length) {
    return [false, outScore];
  }

  // Recursion params
  let recursiveMatch = false;
  let bestRecursiveMatches: number[] = [];
  let bestRecursiveScore = 0;

  // Loop through pattern and str looking for a match.
  let firstMatch = true;
  while (patternCurIndex < pattern.length && strCurrIndex < str.length) {
    // Match found.
    if (
      pattern[patternCurIndex].toLowerCase() === str[strCurrIndex].toLowerCase()
    ) {
      if (nextMatch >= maxMatches) {
        return [false, outScore];
      }

      if (firstMatch && srcMatces) {
        matches = [...srcMatces];
        firstMatch = false;
      }

      const recursiveMatches: number[] = [];
      const [matched, recursiveScore] = fuzzyMatchRecursive(
        pattern,
        str,
        patternCurIndex,
        strCurrIndex + 1,
        matches,
        recursiveMatches,
        maxMatches,
        nextMatch,
        recursionCount,
        recursionLimit,
      );

      if (matched) {
        // Pick best recursive score.
        if (!recursiveMatch || recursiveScore > bestRecursiveScore) {
          bestRecursiveMatches = [...recursiveMatches];
          bestRecursiveScore = recursiveScore;
        }
        recursiveMatch = true;
      }

      matches[nextMatch++] = strCurrIndex;
      ++patternCurIndex;
    }
    ++strCurrIndex;
  }

  const matched = patternCurIndex === pattern.length;

  if (matched) {
    outScore = 100;

    // Apply leading letter penalty
    let penalty = LEADING_LETTER_PENALTY * matches[0];
    penalty =
      penalty < MAX_LEADING_LETTER_PENALTY
        ? MAX_LEADING_LETTER_PENALTY
        : penalty;
    outScore += penalty;

    // Apply unmatched penalty
    const unmatched = str.length - nextMatch;
    outScore += UNMATCHED_LETTER_PENALTY * unmatched;

    // Apply ordering bonuses
    for (let i = 0; i < nextMatch; i++) {
      const currIdx = matches[i];

      if (i > 0) {
        const prevIdx = matches[i - 1];
        if (currIdx === prevIdx + 1) {
          outScore += SEQUENTIAL_BONUS;
        }
      }

      // Check for bonuses based on neighbor character value.
      if (currIdx > 0) {
        // Camel case
        const neighbor = str[currIdx - 1];
        const isNeighbourSeparator = neighbor === '-' || neighbor === ' ';
        if (isNeighbourSeparator) {
          outScore += SEPARATOR_BONUS;
        }
      } else {
        // First letter
        outScore += FIRST_LETTER_BONUS;
      }
    }

    // Return best result
    if (recursiveMatch && (!matched || bestRecursiveScore > outScore)) {
      // Recursive score is better than "this"
      matches = [...bestRecursiveMatches];
      outScore = bestRecursiveScore;
      return [true, outScore];
    } else if (matched) {
      // "this" score is better than recursive
      return [true, outScore];
    } else {
      return [false, outScore];
    }
  }
  return [false, outScore];
};
