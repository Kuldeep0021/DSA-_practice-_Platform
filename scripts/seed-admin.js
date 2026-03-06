const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
  try {
    const path = require('path');
    const saPath = path.resolve(__dirname, '..', 'service-account.json');
    if (!fs.existsSync(saPath)) {
      console.error('service-account.json not found at', saPath);
      process.exit(1);
    }

    const serviceAccount = require(saPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    const firestore = admin.firestore();

    const problems = [
      {
        title: 'Two Sum',
        description: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
        difficulty: 'Easy',
        tags: ['array', 'hash-table'],
        testCases: [
          { input: [[2,7,11,15], 9], output: [0,1] },
          { input: [[3,2,4], 6], output: [1,2] },
        ],
      },
      {
        title: 'Reverse String',
        description: 'Write a function that reverses a string.',
        difficulty: 'Easy',
        tags: ['string'],
        testCases: [
          { input: ['hello'], output: 'olleh' },
          { input: ['a'], output: 'a' },
        ],
      },
      {
        title: 'Merge Sorted Arrays',
        description: 'Merge two sorted arrays and return a single sorted array.',
        difficulty: 'Easy',
        tags: ['array', 'two-pointers'],
        testCases: [
          { input: [[1,3,5], [2,4,6]], output: [1,2,3,4,5,6] },
        ],
      },
      {
        title: 'Valid Parentheses',
        description: 'Given a string containing just the characters "()[]{}", determine if the input string is valid.',
        difficulty: 'Easy',
        tags: ['stack', 'string'],
        testCases: [
          { input: ['()[]{}'], output: true },
          { input: ['(]'], output: false },
        ],
      },
      {
        title: 'Binary Search',
        description: 'Given a sorted array and a target value, return the index if the target is found, otherwise return -1.',
        difficulty: 'Easy',
        tags: ['binary-search'],
        testCases: [
          { input: [[-1,0,3,5,9,12], 9], output: 4 },
          { input: [[1,2,3,4], 5], output: -1 },
        ],
      },
      {
        title: 'Longest Substring Without Repeating Characters',
        description: 'Given a string, find the length of the longest substring without repeating characters.',
        difficulty: 'Medium',
        tags: ['string', 'sliding-window'],
        testCases: [
          { input: ['abcabcbb'], output: 3 },
          { input: ['bbbbb'], output: 1 },
        ],
      },
      {
        title: 'Container With Most Water',
        description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, find two lines that together with the x-axis forms a container, such that the container contains the most water.',
        difficulty: 'Medium',
        tags: ['two-pointers'],
        testCases: [
          { input: [[1,8,6,2,5,4,8,3,7]], output: 49 },
        ],
      },
      {
        title: 'Merge K Sorted Lists (flattened arrays)',
        description: 'Given an array of sorted arrays, merge them into one sorted array.',
        difficulty: 'Hard',
        tags: ['heap', 'divide-and-conquer'],
        testCases: [
          { input: [[[1,4,5],[1,3,4],[2,6]]], output: [1,1,2,3,4,4,5,6] },
        ],
      },
      {
        title: 'Product of Array Except Self',
        description: 'Given an array nums of n integers where n > 1, return an array output such that output[i] is the product of all the elements of nums except nums[i].',
        difficulty: 'Medium',
        tags: ['array', 'prefix-suffix'],
        testCases: [
          { input: [[1,2,3,4]], output: [24,12,8,6] },
        ],
      },
      {
        title: 'Climbing Stairs',
        description: 'You are climbing a stair case. It takes n steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
        difficulty: 'Easy',
        tags: ['dynamic-programming'],
        testCases: [
          { input: [5], output: 8 },
        ],
      },
      {
        title: 'Find Minimum in Rotated Sorted Array',
        description: 'Suppose an array sorted in ascending order is rotated at some pivot. Find the minimum element.',
        difficulty: 'Medium',
        tags: ['binary-search'],
        testCases: [
          { input: [[3,4,5,1,2]], output: 1 },
        ],
      },
      {
        title: 'Maximum Subarray',
        description: 'Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
        difficulty: 'Medium',
        tags: ['dynamic-programming', 'divide-and-conquer'],
        testCases: [
          { input: [[-2,1,-3,4,-1,2,1,-5,4]], output: 6 },
        ],
      },
      {
        title: 'Valid Anagram',
        description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
        difficulty: 'Easy',
        tags: ['hash-table', 'string'],
        testCases: [
          { input: ['anagram','nagaram'], output: true },
          { input: ['rat','car'], output: false },
        ],
      },
      {
        title: 'Rotate Image',
        description: 'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).',
        difficulty: 'Medium',
        tags: ['matrix'],
        testCases: [
          { input: [[[1,2,3],[4,5,6],[7,8,9]]], output: [[7,4,1],[8,5,2],[9,6,3]] },
        ],
      },
      {
        title: 'Implement strStr()',
        description: 'Return the index of the first occurrence of needle in haystack, or -1 if needle is not part of haystack.',
        difficulty: 'Easy',
        tags: ['string'],
        testCases: [
          { input: ['hello','ll'], output: 2 },
          { input: ['aaaa','bba'], output: -1 },
        ],
      },
    ];

    console.log('Seeding problems...');
    for (const p of problems) {
      try {
        console.log('Writing problem:', p.title);
        const ref = firestore.collection('problems').doc();
        // sanitize testCases by round-tripping through JSON to avoid any
        // problematic nested entity types
        const safeTestCases = JSON.parse(JSON.stringify(p.testCases));
        await ref.set({
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          tags: p.tags,
          // store test cases as JSON string to avoid Firestore nested-entity issues
          testCasesJson: JSON.stringify(safeTestCases),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Wrote problem', ref.id, p.title);
      } catch (err) {
        console.error('Failed writing problem', p.title, err.message || err);
        throw err;
      }
    }

    const demoEmail = 'demo@dsa-verse.test';
    const demoPassword = 'password123';

    try {
      const existing = await admin.auth().getUserByEmail(demoEmail);
      console.log('Demo user already exists:', existing.uid);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/user-not-found') {
        const user = await admin.auth().createUser({
          email: demoEmail,
          emailVerified: false,
          password: demoPassword,
          displayName: 'Demo User',
        });
        console.log('Created demo user:', user.uid, demoEmail, demoPassword);
      } else {
        console.error('Error checking demo user:', err.message || err);
      }
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

main();
