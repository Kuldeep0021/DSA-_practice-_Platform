import type { Problem } from "@/src/types/domain";

type SeedProblem = Omit<Problem, "id">;

const jsTwoSum = `function solution(nums, target) {
  const seen = new Map();

  for (let i = 0; i < nums.length; i += 1) {
    const need = target - nums[i];
    if (seen.has(need)) {
      return [seen.get(need), i];
    }
    seen.set(nums[i], i);
  }

  return [];
}`;

const pyTwoSum = `def solution(nums, target):
    seen = {}

    for i, value in enumerate(nums):
        need = target - value
        if need in seen:
            return [seen[need], i]
        seen[value] = i

    return []`;

const jsReverse = `function solution(text) {
  return text.split("").reverse().join("");
}`;

const pyReverse = `def solution(text):
    return text[::-1]`;

const jsPalindrome = `function solution(x) {
  const value = String(x);
  return value === value.split("").reverse().join("");
}`;

const pyPalindrome = `def solution(x):
    value = str(x)
    return value == value[::-1]`;

const jsMerge = `function solution(listA, listB) {
  const merged = [];
  let i = 0;
  let j = 0;

  while (i < listA.length && j < listB.length) {
    if (listA[i] <= listB[j]) {
      merged.push(listA[i]);
      i += 1;
    } else {
      merged.push(listB[j]);
      j += 1;
    }
  }

  return [...merged, ...listA.slice(i), ...listB.slice(j)];
}`;

const pyMerge = `def solution(list_a, list_b):
    merged = []
    i = 0
    j = 0

    while i < len(list_a) and j < len(list_b):
        if list_a[i] <= list_b[j]:
            merged.append(list_a[i])
            i += 1
        else:
            merged.append(list_b[j])
            j += 1

    return merged + list_a[i:] + list_b[j:]`;

const jsLongestSubstring = `function solution(text) {
  let left = 0;
  let maxLen = 0;
  const lastSeen = new Map();

  for (let right = 0; right < text.length; right += 1) {
    const ch = text[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {
      left = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}`;

const pyLongestSubstring = `def solution(text):
    left = 0
    best = 0
    last_seen = {}

    for right, ch in enumerate(text):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)

    return best`;

const jsProductExceptSelf = `function solution(nums) {
  const result = new Array(nums.length).fill(1);
  let prefix = 1;

  for (let i = 0; i < nums.length; i += 1) {
    result[i] = prefix;
    prefix *= nums[i];
  }

  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i -= 1) {
    result[i] *= suffix;
    suffix *= nums[i];
  }

  return result;
}`;

const pyProductExceptSelf = `def solution(nums):
    result = [1] * len(nums)
    prefix = 1

    for i in range(len(nums)):
        result[i] = prefix
        prefix *= nums[i]

    suffix = 1
    for i in range(len(nums) - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]

    return result`;

const jsTrapRainWater = `function solution(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let trapped = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      trapped += leftMax - height[left];
      left += 1;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      trapped += rightMax - height[right];
      right -= 1;
    }
  }

  return trapped;
}`;

const pyTrapRainWater = `def solution(height):
    left = 0
    right = len(height) - 1
    left_max = 0
    right_max = 0
    trapped = 0

    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            trapped += left_max - height[left]
            left += 1
        else:
            right_max = max(right_max, height[right])
            trapped += right_max - height[right]
            right -= 1

    return trapped`;

const jsMedianSortedArrays = `function solution(nums1, nums2) {
  if (nums1.length > nums2.length) {
    return solution(nums2, nums1);
  }

  const m = nums1.length;
  const n = nums2.length;
  let low = 0;
  let high = m;

  while (low <= high) {
    const cut1 = Math.floor((low + high) / 2);
    const cut2 = Math.floor((m + n + 1) / 2) - cut1;

    const left1 = cut1 === 0 ? -Infinity : nums1[cut1 - 1];
    const right1 = cut1 === m ? Infinity : nums1[cut1];
    const left2 = cut2 === 0 ? -Infinity : nums2[cut2 - 1];
    const right2 = cut2 === n ? Infinity : nums2[cut2];

    if (left1 <= right2 && left2 <= right1) {
      if ((m + n) % 2 === 0) {
        return (Math.max(left1, left2) + Math.min(right1, right2)) / 2;
      }
      return Math.max(left1, left2);
    }

    if (left1 > right2) {
      high = cut1 - 1;
    } else {
      low = cut1 + 1;
    }
  }

  return 0;
}`;

const pyMedianSortedArrays = `def solution(nums1, nums2):
    if len(nums1) > len(nums2):
        return solution(nums2, nums1)

    m, n = len(nums1), len(nums2)
    low, high = 0, m

    while low <= high:
        cut1 = (low + high) // 2
        cut2 = (m + n + 1) // 2 - cut1

        left1 = float("-inf") if cut1 == 0 else nums1[cut1 - 1]
        right1 = float("inf") if cut1 == m else nums1[cut1]
        left2 = float("-inf") if cut2 == 0 else nums2[cut2 - 1]
        right2 = float("inf") if cut2 == n else nums2[cut2]

        if left1 <= right2 and left2 <= right1:
            if (m + n) % 2 == 0:
                return (max(left1, left2) + min(right1, right2)) / 2
            return max(left1, left2)
        elif left1 > right2:
            high = cut1 - 1
        else:
            low = cut1 + 1

    return 0.0`;

const jsSearchRotated = `function solution(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (nums[mid] === target) {
      return mid;
    }

    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    } else {
      if (nums[mid] < target && target <= nums[right]) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }

  return -1;
}`;

const pySearchRotated = `def solution(nums, target):
    left = 0
    right = len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            return mid

        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1`;

const jsSearchRange = `function solution(nums, target) {
  const lowerBound = (findFirst) => {
    let left = 0;
    let right = nums.length - 1;
    let answer = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (nums[mid] > target || (findFirst && nums[mid] === target)) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
      if (nums[mid] === target) {
        answer = mid;
      }
    }

    return answer;
  };

  return [lowerBound(true), lowerBound(false)];
}`;

const pySearchRange = `def solution(nums, target):
    def boundary(find_first):
        left = 0
        right = len(nums) - 1
        answer = -1

        while left <= right:
            mid = (left + right) // 2
            if nums[mid] > target or (find_first and nums[mid] == target):
                right = mid - 1
            else:
                left = mid + 1

            if nums[mid] == target:
                answer = mid

        return answer

    return [boundary(True), boundary(False)]`;

const jsMinWindow = `function solution(s, t) {
  if (!s || !t || t.length > s.length) {
    return "";
  }

  const need = new Map();
  for (const ch of t) {
    need.set(ch, (need.get(ch) || 0) + 1);
  }

  let required = need.size;
  let left = 0;
  let minLen = Infinity;
  let start = 0;

  const window = new Map();

  for (let right = 0; right < s.length; right += 1) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);

    if (need.has(ch) && window.get(ch) === need.get(ch)) {
      required -= 1;
    }

    while (required === 0) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        start = left;
      }

      const leftCh = s[left];
      window.set(leftCh, window.get(leftCh) - 1);
      if (need.has(leftCh) && window.get(leftCh) < need.get(leftCh)) {
        required += 1;
      }
      left += 1;
    }
  }

  return minLen === Infinity ? "" : s.slice(start, start + minLen);
}`;

const pyMinWindow = `def solution(s, t):
    if not s or not t or len(t) > len(s):
        return ""

    need = {}
    for ch in t:
        need[ch] = need.get(ch, 0) + 1

    required = len(need)
    left = 0
    start = 0
    min_len = float("inf")
    window = {}

    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1

        if ch in need and window[ch] == need[ch]:
            required -= 1

        while required == 0:
            if right - left + 1 < min_len:
                min_len = right - left + 1
                start = left

            left_ch = s[left]
            window[left_ch] -= 1
            if left_ch in need and window[left_ch] < need[left_ch]:
                required += 1
            left += 1

    if min_len == float("inf"):
        return ""
    return s[start:start + min_len]`;

const jsLargestRectangle = `function solution(heights) {
  const stack = [];
  let maxArea = 0;

  for (let i = 0; i <= heights.length; i += 1) {
    const currentHeight = i === heights.length ? 0 : heights[i];

    while (stack.length > 0 && currentHeight < heights[stack[stack.length - 1]]) {
      const top = stack.pop();
      const height = heights[top];
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, height * width);
    }

    stack.push(i);
  }

  return maxArea;
}`;

const pyLargestRectangle = `def solution(heights):
    stack = []
    max_area = 0

    for i in range(len(heights) + 1):
        current_height = 0 if i == len(heights) else heights[i]

        while stack and current_height < heights[stack[-1]]:
            top = stack.pop()
            height = heights[top]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)

        stack.append(i)

    return max_area`;

export const SAMPLE_PROBLEMS: SeedProblem[] = [
  {
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    difficulty: "Easy",
    tags: ["array", "hashmap"],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "nums[0] + nums[1] = 9",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "Exactly one valid answer exists.",
    ],
    starterCode: {
      javascript: jsTwoSum,
      python: pyTwoSum,
    },
    testCases: [
      { input: [[2, 7, 11, 15], 9], output: [0, 1] },
      { input: [[3, 2, 4], 6], output: [1, 2] },
      { input: [[3, 3], 6], output: [0, 1] },
    ],
  },
  {
    title: "Reverse String",
    description: "Write a function that reverses a given string.",
    difficulty: "Easy",
    tags: ["string"],
    examples: [
      {
        input: "text = \"hello\"",
        output: "\"olleh\"",
      },
    ],
    constraints: ["1 <= text.length <= 10^4"],
    starterCode: {
      javascript: jsReverse,
      python: pyReverse,
    },
    testCases: [
      { input: ["hello"], output: "olleh" },
      { input: ["dsa"], output: "asd" },
      { input: ["a"], output: "a" },
    ],
  },
  {
    title: "Palindrome Number",
    description: "Given an integer x, return true if x is a palindrome, and false otherwise.",
    difficulty: "Easy",
    tags: ["math"],
    examples: [
      {
        input: "x = 121",
        output: "true",
      },
      {
        input: "x = -121",
        output: "false",
      },
    ],
    constraints: ["-2^31 <= x <= 2^31 - 1"],
    starterCode: {
      javascript: jsPalindrome,
      python: pyPalindrome,
    },
    testCases: [
      { input: [121], output: true },
      { input: [-121], output: false },
      { input: [10], output: false },
    ],
  },
  {
    title: "Merge Two Sorted Lists",
    description:
      "Given two sorted integer arrays, merge them into a single sorted array and return it.",
    difficulty: "Easy",
    tags: ["two-pointers", "array"],
    examples: [
      {
        input: "listA = [1,2,4], listB = [1,3,4]",
        output: "[1,1,2,3,4,4]",
      },
    ],
    constraints: [
      "0 <= listA.length, listB.length <= 10^3",
      "-10^4 <= values <= 10^4",
      "Inputs are sorted in non-decreasing order.",
    ],
    starterCode: {
      javascript: jsMerge,
      python: pyMerge,
    },
    testCases: [
      { input: [[1, 2, 4], [1, 3, 4]], output: [1, 1, 2, 3, 4, 4] },
      { input: [[], []], output: [] },
      { input: [[], [0]], output: [0] },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description:
      "Given a string, return the length of the longest substring without repeating characters.",
    difficulty: "Medium",
    tags: ["string", "sliding-window", "hashmap"],
    examples: [
      {
        input: 'text = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc".',
      },
      {
        input: 'text = "bbbbb"',
        output: "1",
      },
    ],
    constraints: [
      "0 <= text.length <= 5 * 10^4",
      "text consists of English letters, digits, symbols and spaces.",
    ],
    starterCode: {
      javascript: jsLongestSubstring,
      python: pyLongestSubstring,
    },
    testCases: [
      { input: ["abcabcbb"], output: 3 },
      { input: ["bbbbb"], output: 1 },
      { input: ["pwwkew"], output: 3 },
      { input: [""], output: 0 },
    ],
  },
  {
    title: "Product of Array Except Self",
    description:
      "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements of nums except nums[i].",
    difficulty: "Medium",
    tags: ["array", "prefix-sum"],
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]",
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums fits in a 32-bit integer.",
    ],
    starterCode: {
      javascript: jsProductExceptSelf,
      python: pyProductExceptSelf,
    },
    testCases: [
      { input: [[1, 2, 3, 4]], output: [24, 12, 8, 6] },
      { input: [[-1, 1, 0, -3, 3]], output: [0, 0, 9, 0, 0] },
      { input: [[2, 3, 4, 5]], output: [60, 40, 30, 24] },
    ],
  },
  {
    title: "Trapping Rain Water",
    description:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    difficulty: "Hard",
    tags: ["array", "two-pointers", "dynamic-programming"],
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9",
      },
    ],
    constraints: [
      "1 <= height.length <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    starterCode: {
      javascript: jsTrapRainWater,
      python: pyTrapRainWater,
    },
    testCases: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], output: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], output: 9 },
      { input: [[2, 0, 2]], output: 2 },
    ],
  },
  {
    title: "Median of Two Sorted Arrays",
    description:
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    difficulty: "Hard",
    tags: ["array", "binary-search", "divide-and-conquer"],
    examples: [
      {
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.0",
      },
      {
        input: "nums1 = [1,2], nums2 = [3,4]",
        output: "2.5",
      },
    ],
    constraints: [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m <= 1000",
      "0 <= n <= 1000",
      "1 <= m + n <= 2000",
      "-10^6 <= nums1[i], nums2[i] <= 10^6",
    ],
    starterCode: {
      javascript: jsMedianSortedArrays,
      python: pyMedianSortedArrays,
    },
    testCases: [
      { input: [[1, 3], [2]], output: 2 },
      { input: [[1, 2], [3, 4]], output: 2.5 },
      { input: [[0, 0], [0, 0]], output: 0 },
    ],
  },
  {
    title: "Search in Rotated Sorted Array",
    description:
      "There is an integer array nums sorted in ascending order and rotated at an unknown pivot. Given nums and target, return the index of target if it is in nums, or -1 otherwise.",
    difficulty: "Medium",
    tags: ["array", "binary-search"],
    examples: [
      {
        input: "nums = [4,5,6,7,0,1,2], target = 0",
        output: "4",
      },
      {
        input: "nums = [4,5,6,7,0,1,2], target = 3",
        output: "-1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
      "nums is an ascending array rotated at some pivot.",
    ],
    starterCode: {
      javascript: jsSearchRotated,
      python: pySearchRotated,
    },
    testCases: [
      { input: [[4, 5, 6, 7, 0, 1, 2], 0], output: 4 },
      { input: [[4, 5, 6, 7, 0, 1, 2], 3], output: -1 },
      { input: [[1], 0], output: -1 },
    ],
  },
  {
    title: "Find First and Last Position of Element in Sorted Array",
    description:
      "Given an array of integers nums sorted in non-decreasing order, find the starting and ending position of a given target value.",
    difficulty: "Medium",
    tags: ["array", "binary-search"],
    examples: [
      {
        input: "nums = [5,7,7,8,8,10], target = 8",
        output: "[3,4]",
      },
      {
        input: "nums = [5,7,7,8,8,10], target = 6",
        output: "[-1,-1]",
      },
    ],
    constraints: [
      "0 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
      "nums is sorted in non-decreasing order.",
      "-10^9 <= target <= 10^9",
    ],
    starterCode: {
      javascript: jsSearchRange,
      python: pySearchRange,
    },
    testCases: [
      { input: [[5, 7, 7, 8, 8, 10], 8], output: [3, 4] },
      { input: [[5, 7, 7, 8, 8, 10], 6], output: [-1, -1] },
      { input: [[], 0], output: [-1, -1] },
    ],
  },
  {
    title: "Minimum Window Substring",
    description:
      "Given two strings s and t, return the minimum window substring of s such that every character in t is included in the window.",
    difficulty: "Hard",
    tags: ["string", "sliding-window", "hashmap"],
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: '"BANC"',
      },
      {
        input: 's = "a", t = "aa"',
        output: '""',
      },
    ],
    constraints: [
      "1 <= s.length, t.length <= 10^5",
      "s and t consist of uppercase and lowercase English letters.",
    ],
    starterCode: {
      javascript: jsMinWindow,
      python: pyMinWindow,
    },
    testCases: [
      { input: ["ADOBECODEBANC", "ABC"], output: "BANC" },
      { input: ["a", "a"], output: "a" },
      { input: ["a", "aa"], output: "" },
    ],
  },
  {
    title: "Largest Rectangle in Histogram",
    description:
      "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    difficulty: "Hard",
    tags: ["array", "stack", "monotonic-stack"],
    examples: [
      {
        input: "heights = [2,1,5,6,2,3]",
        output: "10",
      },
      {
        input: "heights = [2,4]",
        output: "4",
      },
    ],
    constraints: [
      "1 <= heights.length <= 10^5",
      "0 <= heights[i] <= 10^4",
    ],
    starterCode: {
      javascript: jsLargestRectangle,
      python: pyLargestRectangle,
    },
    testCases: [
      { input: [[2, 1, 5, 6, 2, 3]], output: 10 },
      { input: [[2, 4]], output: 4 },
      { input: [[2, 1, 2]], output: 3 },
    ],
  },
];
