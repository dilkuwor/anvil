import { addTwoNumbersStory } from "./stories/add-two-numbers";
import { anagramBundlesStory } from "./stories/anagram-bundles";
import { atMostKDistinctStory } from "./stories/at-most-k-distinct";
import { atoiStory } from "./stories/atoi";
import { balancedBracketsStory } from "./stories/balanced-brackets";
import { basicCalculatorIIStory } from "./stories/basic-calculator-ii";
import { bestTimeToBuyAndSellStockStory } from "./stories/best-time-to-buy-and-sell-stock";
import { binarySearchStory } from "./stories/binary-search";
import { capacityToShipPackagesStory } from "./stories/capacity-to-ship-packages";
import { characterReplacementStory } from "./stories/character-replacement";
import { containsDuplicateStory } from "./stories/contains-duplicate";
import { copyRandomListStory } from "./stories/copy-random-list";
import { countingBitsStory } from "./stories/counting-bits";
import { decodeStringStory } from "./stories/decode-string";
import { evaluateRpnStory } from "./stories/evaluate-rpn";
import { findAllAnagramsStory } from "./stories/find-all-anagrams";
import { findMinimumRotatedStory } from "./stories/find-minimum-rotated";
import { findPeakElementStory } from "./stories/find-peak-element";
import { firstAndLastPositionStory } from "./stories/first-and-last-position";
import { firstBadVersionStory } from "./stories/first-bad-version";
import { firstMissingPositiveStory } from "./stories/first-missing-positive";
import { fruitIntoBasketsStory } from "./stories/fruit-into-baskets";
import { gasStationStory } from "./stories/gas-station";
import { groupAnagramsStory } from "./stories/group-anagrams";
import { insertIntervalStory } from "./stories/insert-interval";
import { integerToEnglishStory } from "./stories/integer-to-english";
import { intersectionTwoListsStory } from "./stories/intersection-two-lists";
import { jumpGameStory } from "./stories/jump-game";
import { jumpGameTwoStory } from "./stories/jump-game-ii";
import { longestConsecutiveStory } from "./stories/longest-consecutive-sequence";
import { longestPalindromeStory } from "./stories/longest-palindrome";
import { majorityElementStory } from "./stories/majority-element";
import { maxConsecutiveOnesStory } from "./stories/max-consecutive-ones";
import { maximumSubarrayStory } from "./stories/maximum-subarray";
import { medianTwoSortedStory } from "./stories/median-two-sorted";
import { mergedMedianStory } from "./stories/merged-median";
import { mergeSortedArrayStory } from "./stories/merge-sorted-array";
import { mergeTwoSortedListsStory } from "./stories/merge-two-sorted-lists";
import { minStackStory } from "./stories/min-stack";
import { minimumSizeSubarrayStory } from "./stories/minimum-size-subarray";
import { minimumTrackerStackStory } from "./stories/minimum-tracker-stack";
import { mirrorNumberStory } from "./stories/mirror-number";
import { missingNumberStory } from "./stories/missing-number";
import { missingRangeValueStory } from "./stories/missing-range-value";
import { moveZeroesStory } from "./stories/move-zeroes";
import { multiplyStringsStory } from "./stories/multiply-strings";
import { nextPermutationStory } from "./stories/next-permutation";
import { nonOverlappingIntervalsStory } from "./stories/non-overlapping-intervals";
import { numberOfOneBitsStory } from "./stories/number-of-1-bits";
import { pairTargetStory } from "./stories/pair-target";
import { palindromeLinkedListStory } from "./stories/palindrome-linked-list";
import { partitionLabelsStory } from "./stories/partition-labels";
import { permutationInStringStory } from "./stories/permutation-in-string";
import { powStory } from "./stories/pow";
import { productExceptSelfStory } from "./stories/product-except-self";
import { removeDuplicatesStory } from "./stories/remove-duplicates";
import { removeNthFromEndStory } from "./stories/remove-nth-from-end";
import { reorderListStory } from "./stories/reorder-list";
import { reverseWordsStory } from "./stories/reverse-words";
import { rotateArrayStory } from "./stories/rotate-array";
import { search2dMatrixStory } from "./stories/search-2d-matrix";
import { searchRangeStory } from "./stories/search-range";
import { simplifyPathStory } from "./stories/simplify-path";
import { singleNumberStory } from "./stories/single-number";
import { singlePassProfitStory } from "./stories/single-pass-profit";
import { slidingWindowMaximumStory } from "./stories/sliding-window-maximum";
import { sortListStory } from "./stories/sort-list";
import { stockTwoStory } from "./stories/stock-ii";
import { subarraySumEqualsKStory } from "./stories/subarray-sum-equals-k";
import { taskSchedulerStory } from "./stories/task-scheduler";
import { threeSumClosestStory } from "./stories/three-sum-closest";
import { topKFrequentStory } from "./stories/top-k-frequent";
import { twoSumStory } from "./stories/two-sum";
import { twoSumIIStory } from "./stories/two-sum-ii";
import { validAnagramStory } from "./stories/valid-anagram";
import { validPalindromeStory } from "./stories/valid-palindrome";
import { validPalindromeIIStory } from "./stories/valid-palindrome-ii";
import { validParenthesesStory } from "./stories/valid-parentheses";
import type { AnyProblemStory } from "./types";

/**
 * Stories written by grok. Only grok edits this file, so two tools can add stories at the
 * same time without touching the same lines. `registry.ts` gathers every part.
 */
export const GROK_STORIES: AnyProblemStory[] = [
  fruitIntoBasketsStory,
  atMostKDistinctStory,
  maxConsecutiveOnesStory,
  minimumSizeSubarrayStory,
  characterReplacementStory,
  findAllAnagramsStory,
  permutationInStringStory,
  slidingWindowMaximumStory,
  validPalindromeStory,
  threeSumClosestStory,
  twoSumIIStory,
  removeDuplicatesStory,
  moveZeroesStory,
  validPalindromeIIStory,
  mergeSortedArrayStory,
  nonOverlappingIntervalsStory,
  insertIntervalStory,
  capacityToShipPackagesStory,
  findMinimumRotatedStory,
  findPeakElementStory,
  firstBadVersionStory,
  searchRangeStory,
  medianTwoSortedStory,
  binarySearchStory,
  search2dMatrixStory,
  copyRandomListStory,
  reorderListStory,
  sortListStory,
  intersectionTwoListsStory,
  removeNthFromEndStory,
  addTwoNumbersStory,
  mergeTwoSortedListsStory,
  palindromeLinkedListStory,
  balancedBracketsStory,
  validParenthesesStory,
  evaluateRpnStory,
  minStackStory,
  basicCalculatorIIStory,
  decodeStringStory,
  simplifyPathStory,
  minimumTrackerStackStory,
  twoSumStory,
  pairTargetStory,
  longestConsecutiveStory,
  containsDuplicateStory,
  validAnagramStory,
  topKFrequentStory,
  groupAnagramsStory,
  subarraySumEqualsKStory,
  firstAndLastPositionStory,
  bestTimeToBuyAndSellStockStory,
  majorityElementStory,
  rotateArrayStory,
  productExceptSelfStory,
  nextPermutationStory,
  firstMissingPositiveStory,
  maximumSubarrayStory,
  mergedMedianStory,
  missingRangeValueStory,
  singlePassProfitStory,
  stockTwoStory,
  gasStationStory,
  jumpGameTwoStory,
  jumpGameStory,
  taskSchedulerStory,
  partitionLabelsStory,
  singleNumberStory,
  numberOfOneBitsStory,
  missingNumberStory,
  countingBitsStory,
  multiplyStringsStory,
  powStory,
  mirrorNumberStory,
  anagramBundlesStory,
  reverseWordsStory,
  integerToEnglishStory,
  longestPalindromeStory,
  atoiStory,
];
