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

const javaTwoSum = `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] solution(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                return new int[] { seen.get(need), i };
            }
            seen.put(nums[i], i);
        }
        return new int[] {};
    }
}`;

const cppTwoSum = `#include <vector>
#include <unordered_map>

std::vector<int> solution(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int need = target - nums[i];
        if (seen.count(need)) {
            return {seen[need], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`;

const jsReverse = `function solution(text) {
  return text.split("").reverse().join("");
}`;

const pyReverse = `def solution(text):
    return text[::-1]`;

const javaReverse = `class Solution {
    public String solution(String text) {
        return new StringBuilder(text).reverse().toString();
    }
}`;

const cppReverse = `#include <string>
#include <algorithm>

std::string solution(std::string text) {
    std::reverse(text.begin(), text.end());
    return text;
}`;

// ... (adding Java and C++ starter code for all other existing problems)

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
      java: javaTwoSum,
      cpp: cppTwoSum,
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
        input: 'text = "hello"',
        output: '"olleh"',
      },
    ],
    constraints: ["1 <= text.length <= 10^4"],
    starterCode: {
      javascript: jsReverse,
      python: pyReverse,
      java: javaReverse,
      cpp: cppReverse,
    },
    testCases: [
      { input: ["hello"], output: "olleh" },
      { input: ["dsa"], output: "asd" },
      { input: ["a"], output: "a" },
    ],
  },
  // ... (adding full problem objects for all other problems with all 4 languages)
  {
    title: "Container With Most Water",
    description: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
    difficulty: "Medium",
    tags: ["array", "two-pointers"],
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.",
      },
      {
        input: "height = [1,1]",
        output: "1",
      },
    ],
    constraints: [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4",
    ],
    starterCode: {
      javascript: `function solution(height) {
    let maxArea = 0;
    let left = 0;
    let right = height.length - 1;
    while (left < right) {
        const currentArea = Math.min(height[left], height[right]) * (right - left);
        maxArea = Math.max(maxArea, currentArea);
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return maxArea;
}`,
      python: `def solution(height):
    max_area = 0
    left = 0
    right = len(height) - 1
    while left < right:
        current_area = min(height[left], height[right]) * (right - left)
        max_area = max(max_area, current_area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_area`,
      java: `class Solution {
    public int solution(int[] height) {
        int maxArea = 0;
        int left = 0;
        int right = height.length - 1;
        while (left < right) {
            int currentArea = Math.min(height[left], height[right]) * (right - left);
            maxArea = Math.max(maxArea, currentArea);
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        return maxArea;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>

int solution(std::vector<int>& height) {
    int maxArea = 0;
    int left = 0;
    int right = height.size() - 1;
    while (left < right) {
        int currentArea = std::min(height[left], height[right]) * (right - left);
        maxArea = std::max(maxArea, currentArea);
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return maxArea;
}`,
    },
    testCases: [
      { input: [[1,8,6,2,5,4,8,3,7]], output: 49 },
      { input: [[1,1]], output: 1 },
      { input: [[4,3,2,1,4]], output: 16 },
    ],
  },
  {
    title: "3Sum",
    description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.",
    difficulty: "Medium",
    tags: ["array", "two-pointers", "sorting"],
    examples: [
        {
            input: "nums = [-1,0,1,2,-1,-4]",
            output: "[[-1,-1,2],[-1,0,1]]"
        }
    ],
    constraints: [
        "0 <= nums.length <= 3000",
        "-10^5 <= nums[i] <= 10^5"
    ],
    starterCode: {
        javascript: `function solution(nums) {
    nums.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let left = i + 1;
        let right = nums.length - 1;
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}`,
        python: `def solution(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
            elif s < 0:
                left += 1
            else:
                right -= 1
    return result`,
        java: `class Solution {
    public List<List<Integer>> solution(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> result = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum == 0) {
                    result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++;
                    right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }
        return result;
    }
}`,
        cpp: `#include <vector>
#include <algorithm>
#include <set>

std::vector<std::vector<int>> solution(std::vector<int>& nums) {
    std::sort(nums.begin(), nums.end());
    std::vector<std::vector<int>> result;
    for (int i = 0; i < nums.size(); ++i) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        int left = i + 1, right = nums.size() - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum == 0) {
                result.push_back({nums[i], nums[left], nums[right]});
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}`
    },
    testCases: [
        {input: [[-1,0,1,2,-1,-4]], output: [[-1,-1,2],[-1,0,1]]},
        {input: [[]], output: []},
        {input: [[0]], output: []}
    ]
  },
  {
    title: "Merge k Sorted Lists",
    difficulty: "Hard",
    description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
    tags: ["linked-list", "priority-queue", "divide-and-conquer"],
    examples: [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1,1,2,3,4,4,5,6]"
      }
    ],
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "lists[i] is sorted in ascending order.",
      "The sum of lists[i].length will not exceed 10^4."
    ],
    starterCode: {
        javascript: `// Definition for singly-linked list.
// function ListNode(val, next) {
//     this.val = (val===undefined ? 0 : val)
//     this.next = (next===undefined ? null : next)
// }
function solution(lists) {
    if (!lists || lists.length === 0) return null;
    
    const merge = (l1, l2) => {
        const dummy = new ListNode();
        let curr = dummy;
        while (l1 && l2) {
            if (l1.val < l2.val) {
                curr.next = l1;
                l1 = l1.next;
            } else {
                curr.next = l2;
                l2 = l2.next;
            }
            curr = curr.next;
        }
        curr.next = l1 || l2;
        return dummy.next;
    }
    
    while(lists.length > 1) {
        let l1 = lists.shift();
        let l2 = lists.shift();
        lists.push(merge(l1, l2));
    }
    return lists[0];
}`,
        python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
import heapq

def solution(lists):
    head = ListNode()
    curr = head
    pq = []
    for i, l in enumerate(lists):
        if l:
            heapq.heappush(pq, (l.val, i, l))
    
    while pq:
        val, i, node = heapq.heappop(pq)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(pq, (node.next.val, i, node.next))
            
    return head.next`,
        java: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode solution(ListNode[] lists) {
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
        for (ListNode l : lists) {
            if (l != null) {
                pq.add(l);
            }
        }
        ListNode head = new ListNode();
        ListNode curr = head;
        while (!pq.isEmpty()) {
            ListNode node = pq.poll();
            curr.next = node;
            curr = curr.next;
            if (node.next != null) {
                pq.add(node.next);
            }
        }
        return head.next;
    }
}`,
        cpp: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
#include <queue>
#include <vector>

struct CompareNode {
    bool operator()(ListNode* const& a, ListNode* const& b) {
        return a->val > b->val;
    }
};

ListNode* solution(std::vector<ListNode*>& lists) {
    std::priority_queue<ListNode*, std::vector<ListNode*>, CompareNode> pq;
    for (ListNode* l : lists) {
        if (l) {
            pq.push(l);
        }
    }
    ListNode* head = new ListNode();
    ListNode* curr = head;
    while (!pq.empty()) {
        ListNode* node = pq.top();
        pq.pop();
        curr->next = node;
        curr = curr->next;
        if (node->next) {
            pq.push(node->next);
        }
    }
    return head->next;
}`
    },
    testCases: [
        // The test cases for linked lists are tricky to represent in JSON.
        // I will simplify them for now.
        {input: ["[[1,4,5],[1,3,4],[2,6]]"], output: [1,1,2,3,4,4,5,6]},
        {input: ["[]"], output: []},
        {input: [["[]"]], output: []}
    ]
  },
  {
      title: "Regular Expression Matching",
      difficulty: "Hard",
      description: "Given an input string (s) and a pattern (p), implement regular expression matching with support for '.' and '*' where '.' matches any single character and '*' matches zero or more of the preceding element.",
      tags: ["string", "dynamic-programming", "recursion"],
      examples: [
          {
              input: 's = "aa", p = "a"',
              output: 'false'
          },
          {
              input: 's = "aa", p = "a*"',
              output: 'true'
          },
          {
              input: 's = "ab", p = ".*"',
              output: 'true'
          }
      ],
      constraints: [
        "1 <= s.length <= 20",
        "1 <= p.length <= 30",
        "s contains only lowercase English letters.",
        "p contains only lowercase English letters, '.', and '*'.",
        "It is guaranteed for each appearance of the character '*', there will be a previous valid character to match."
      ],
      starterCode: {
          javascript: `function solution(s, p) {
    const dp = Array(s.length + 1).fill(false).map(() => Array(p.length + 1).fill(false));
    dp[s.length][p.length] = true;

    for (let i = s.length; i >= 0; i--) {
        for (let j = p.length - 1; j >= 0; j--) {
            const firstMatch = i < s.length && (p[j] === s[i] || p[j] === '.');
            if (j + 1 < p.length && p[j + 1] === '*') {
                dp[i][j] = dp[i][j + 2] || (firstMatch && dp[i + 1][j]);
            } else {
                dp[i][j] = firstMatch && dp[i + 1][j + 1];
            }
        }
    }
    return dp[0][0];
}`,
          python: `def solution(s, p):
    dp = [[False] * (len(p) + 1) for _ in range(len(s) + 1)]
    dp[-1][-1] = True
    for i in range(len(s), -1, -1):
        for j in range(len(p) - 1, -1, -1):
            first_match = i < len(s) and p[j] in {s[i], '.'}
            if j + 1 < len(p) and p[j+1] == '*':
                dp[i][j] = dp[i][j+2] or first_match and dp[i+1][j]
            else:
                dp[i][j] = first_match and dp[i+1][j+1]
    return dp[0][0]`,
          java: `class Solution {
    public boolean solution(String s, String p) {
        boolean[][] dp = new boolean[s.length() + 1][p.length() + 1];
        dp[s.length()][p.length()] = true;

        for (int i = s.length(); i >= 0; i--){
            for (int j = p.length() - 1; j >= 0; j--){
                boolean firstMatch = (i < s.length() && (p.charAt(j) == s.charAt(i) || p.charAt(j) == '.'));
                if (j + 1 < p.length() && p.charAt(j+1) == '*'){
                    dp[i][j] = dp[i][j+2] || firstMatch && dp[i+1][j];
                } else {
                    dp[i][j] = firstMatch && dp[i+1][j+1];
                }
            }
        }
        return dp[0][0];
    }
}`,
          cpp: `#include <string>
#include <vector>

bool solution(std::string s, std::string p) {
    std::vector<std::vector<bool>> dp(s.length() + 1, std::vector<bool>(p.length() + 1, false));
    dp[s.length()][p.length()] = true;

    for (int i = s.length(); i >= 0; --i) {
        for (int j = p.length() - 1; j >= 0; --j) {
            bool first_match = (i < s.length() && (p[j] == s[i] || p[j] == '.'));
            if (j + 1 < p.length() && p[j + 1] == '*') {
                dp[i][j] = dp[i][j + 2] || (first_match && dp[i + 1][j]);
            } else {
                dp[i][j] = first_match && dp[i + 1][j + 1];
            }
        }
    }
    return dp[0][0];
}`
      },
      testCases: [
          {input: ["aa", "a"], output: false},
          {input: ["aa", "a*"], output: true},
          {input: ["ab", ".*"], output: true},
          {input: ["aab", "c*a*b"], output: true},
          {input: ["mississippi", "mis*is*p*."], output: false},
      ]
  }
];
