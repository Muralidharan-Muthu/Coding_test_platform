"""All default problems that will be seeded into the database.
Total: 74 problems (45 Python + 29 SQL)
"""

DEFAULT_PROBLEMS = [
  {
    "id": "P01",
    "title": "Check Even or Odd",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Given an integer N, determine whether it is even or odd.",
    "input_format": "A single integer N",
    "output_format": "Print Even or Odd",
    "sample_input": "4",
    "sample_output": "Even",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "2",
        "expected_output": "Even"
      },
      {
        "input": "5",
        "expected_output": "Odd"
      },
      {
        "input": "10",
        "expected_output": "Even"
      },
      {
        "input": "7",
        "expected_output": "Odd"
      },
      {
        "input": "0",
        "expected_output": "Even"
      }
    ]
  },
  {
    "id": "P02",
    "title": "Sum of Two Numbers",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Given two integers A and B, print their sum.",
    "input_format": "Two integers separated by space",
    "output_format": "Print sum",
    "sample_input": "5 10",
    "sample_output": "15",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1 2",
        "expected_output": "3"
      },
      {
        "input": "5 6",
        "expected_output": "11"
      },
      {
        "input": "10 20",
        "expected_output": "30"
      },
      {
        "input": "7 8",
        "expected_output": "15"
      },
      {
        "input": "100 200",
        "expected_output": "300"
      }
    ]
  },
  {
    "id": "P03",
    "title": "Factorial of a Number",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find factorial of N.",
    "input_format": "Single integer N",
    "output_format": "Print factorial",
    "sample_input": "5",
    "sample_output": "120",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "3",
        "expected_output": "6"
      },
      {
        "input": "4",
        "expected_output": "24"
      },
      {
        "input": "5",
        "expected_output": "120"
      },
      {
        "input": "1",
        "expected_output": "1"
      },
      {
        "input": "6",
        "expected_output": "720"
      }
    ]
  },
  {
    "id": "P04",
    "title": "Reverse a String",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Reverse the given string.",
    "input_format": "Single string",
    "output_format": "Reversed string",
    "sample_input": "hello",
    "sample_output": "olleh",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "cat",
        "expected_output": "tac"
      },
      {
        "input": "dog",
        "expected_output": "god"
      },
      {
        "input": "python",
        "expected_output": "nohtyp"
      },
      {
        "input": "abcd",
        "expected_output": "dcba"
      },
      {
        "input": "race",
        "expected_output": "ecar"
      }
    ]
  },
  {
    "id": "P05",
    "title": "Check Prime Number",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Check if a number is prime.",
    "input_format": "Single integer",
    "output_format": "Print Prime or Not Prime",
    "sample_input": "7",
    "sample_output": "Prime",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "2",
        "expected_output": "Prime"
      },
      {
        "input": "4",
        "expected_output": "Not Prime"
      },
      {
        "input": "9",
        "expected_output": "Not Prime"
      },
      {
        "input": "11",
        "expected_output": "Prime"
      },
      {
        "input": "13",
        "expected_output": "Prime"
      }
    ]
  },
  {
    "id": "P06",
    "title": "Sum of Digits",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find sum of digits of a number.",
    "input_format": "Integer N",
    "output_format": "Sum of digits",
    "sample_input": "123",
    "sample_output": "6",
    "starter_code": "def solve():\n    n=int(input())\n",
    "test_cases": [
      {
        "input": "111",
        "expected_output": "3"
      },
      {
        "input": "222",
        "expected_output": "6"
      },
      {
        "input": "456",
        "expected_output": "15"
      },
      {
        "input": "999",
        "expected_output": "27"
      },
      {
        "input": "100",
        "expected_output": "1"
      }
    ]
  },
  {
    "id": "P07",
    "title": "Palindrome String",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Check if string is palindrome.",
    "input_format": "String",
    "output_format": "Palindrome or Not Palindrome",
    "sample_input": "madam",
    "sample_output": "Palindrome",
    "starter_code": "def solve():\n    s=input()\n",
    "test_cases": [
      {
        "input": "madam",
        "expected_output": "Palindrome"
      },
      {
        "input": "racecar",
        "expected_output": "Palindrome"
      },
      {
        "input": "hello",
        "expected_output": "Not Palindrome"
      },
      {
        "input": "level",
        "expected_output": "Palindrome"
      },
      {
        "input": "python",
        "expected_output": "Not Palindrome"
      }
    ]
  },
  {
    "id": "P08",
    "title": "Largest Number in List",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find largest number in list.",
    "input_format": "N then N integers",
    "output_format": "Largest integer",
    "sample_input": "5\n1 2 3 4 5",
    "sample_output": "5",
    "starter_code": "def solve():\n    n=int(input())\n    arr=list(map(int,input().split()))\n",
    "test_cases": [
      {
        "input": "3\n1 2 3",
        "expected_output": "3"
      },
      {
        "input": "4\n5 6 7 8",
        "expected_output": "8"
      },
      {
        "input": "5\n10 20 30 40 50",
        "expected_output": "50"
      },
      {
        "input": "3\n9 8 7",
        "expected_output": "9"
      },
      {
        "input": "6\n1 5 3 9 2 7",
        "expected_output": "9"
      }
    ]
  },
  {
    "id": "P09",
    "title": "Count Vowels",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Count vowels in string.",
    "input_format": "String",
    "output_format": "Integer count",
    "sample_input": "hello",
    "sample_output": "2",
    "starter_code": "def solve():\n    s=input()\n",
    "test_cases": [
      {
        "input": "hello",
        "expected_output": "2"
      },
      {
        "input": "python",
        "expected_output": "1"
      },
      {
        "input": "education",
        "expected_output": "5"
      },
      {
        "input": "sky",
        "expected_output": "0"
      },
      {
        "input": "apple",
        "expected_output": "2"
      }
    ]
  },
  {
    "id": "P10",
    "title": "Multiplication Table",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Print multiplication table up to 10.",
    "input_format": "Integer N",
    "output_format": "Table values",
    "sample_input": "2",
    "sample_output": "2 4 6 8 10 12 14 16 18 20",
    "starter_code": "def solve():\n    n=int(input())\n",
    "test_cases": [
      {
        "input": "1",
        "expected_output": "1 2 3 4 5 6 7 8 9 10"
      },
      {
        "input": "2",
        "expected_output": "2 4 6 8 10 12 14 16 18 20"
      },
      {
        "input": "3",
        "expected_output": "3 6 9 12 15 18 21 24 27 30"
      },
      {
        "input": "4",
        "expected_output": "4 8 12 16 20 24 28 32 36 40"
      },
      {
        "input": "5",
        "expected_output": "5 10 15 20 25 30 35 40 45 50"
      }
    ]
  },
  {
    "id": "P21",
    "title": "Second Largest Number",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find the second largest number in the given list.",
    "input_format": "First line N, second line N integers",
    "output_format": "Second largest number",
    "sample_input": "5\n1 2 3 4 5",
    "sample_output": "4",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5\n1 2 3 4 5",
        "expected_output": "4"
      },
      {
        "input": "4\n10 20 30 40",
        "expected_output": "30"
      },
      {
        "input": "3\n5 2 8",
        "expected_output": "5"
      },
      {
        "input": "6\n1 3 5 7 9 11",
        "expected_output": "9"
      },
      {
        "input": "5\n100 200 300 400 500",
        "expected_output": "400"
      }
    ]
  },
  {
    "id": "P22",
    "title": "Find Missing Number",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Given numbers from 1..N with one number missing, find the missing number.",
    "input_format": "N then N-1 integers",
    "output_format": "Missing number",
    "sample_input": "5\n1 2 3 5",
    "sample_output": "4",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5\n1 2 3 5",
        "expected_output": "4"
      },
      {
        "input": "6\n1 2 4 5 6",
        "expected_output": "3"
      },
      {
        "input": "4\n2 3 4",
        "expected_output": "1"
      },
      {
        "input": "7\n1 2 3 4 6 7",
        "expected_output": "5"
      },
      {
        "input": "3\n1 3",
        "expected_output": "2"
      }
    ]
  },
  {
    "id": "P23",
    "title": "Rotate Array",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Rotate array to the right by K positions.",
    "input_format": "N K then N integers",
    "output_format": "Rotated array",
    "sample_input": "5 2\n1 2 3 4 5",
    "sample_output": "4 5 1 2 3",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5 2\n1 2 3 4 5",
        "expected_output": "4 5 1 2 3"
      },
      {
        "input": "4 1\n10 20 30 40",
        "expected_output": "40 10 20 30"
      },
      {
        "input": "3 1\n1 2 3",
        "expected_output": "3 1 2"
      },
      {
        "input": "6 3\n1 2 3 4 5 6",
        "expected_output": "4 5 6 1 2 3"
      },
      {
        "input": "5 4\n1 2 3 4 5",
        "expected_output": "2 3 4 5 1"
      }
    ]
  },
  {
    "id": "P24",
    "title": "Check Anagram",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Check if two strings are anagrams.",
    "input_format": "Two strings",
    "output_format": "Anagram or Not Anagram",
    "sample_input": "listen silent",
    "sample_output": "Anagram",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "listen silent",
        "expected_output": "Anagram"
      },
      {
        "input": "triangle integral",
        "expected_output": "Anagram"
      },
      {
        "input": "hello world",
        "expected_output": "Not Anagram"
      },
      {
        "input": "dusty study",
        "expected_output": "Anagram"
      },
      {
        "input": "python java",
        "expected_output": "Not Anagram"
      }
    ]
  },
  {
    "id": "P25",
    "title": "First Non Repeating Character",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find the first non-repeating character in a string.",
    "input_format": "String",
    "output_format": "Character",
    "sample_input": "aabbcdde",
    "sample_output": "c",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "aabbcdde",
        "expected_output": "c"
      },
      {
        "input": "aabbccdde",
        "expected_output": "e"
      },
      {
        "input": "abcabcx",
        "expected_output": "x"
      },
      {
        "input": "xxyz",
        "expected_output": "y"
      },
      {
        "input": "aabbccd",
        "expected_output": "d"
      }
    ]
  },
  {
    "id": "P26",
    "title": "Matrix Addition",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Add two matrices.",
    "input_format": "2x2 matrix A and B",
    "output_format": "Result matrix",
    "sample_input": "1 2\n3 4\n5 6\n7 8",
    "sample_output": "6 8\n10 12",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1 1\n1 1\n1 1\n1 1",
        "expected_output": "2 2\n2 2"
      },
      {
        "input": "2 2\n2 2\n2 2\n2 2",
        "expected_output": "4 4\n4 4"
      },
      {
        "input": "1 2\n3 4\n5 6\n7 8",
        "expected_output": "6 8\n10 12"
      },
      {
        "input": "0 0\n0 0\n1 1\n1 1",
        "expected_output": "1 1\n1 1"
      },
      {
        "input": "5 5\n5 5\n5 5\n5 5",
        "expected_output": "10 10\n10 10"
      }
    ]
  },
  {
    "id": "P27",
    "title": "Matrix Transpose",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find transpose of a matrix.",
    "input_format": "2x2 matrix",
    "output_format": "Transpose matrix",
    "sample_input": "1 2\n3 4",
    "sample_output": "1 3\n2 4",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1 2\n3 4",
        "expected_output": "1 3\n2 4"
      },
      {
        "input": "5 6\n7 8",
        "expected_output": "5 7\n6 8"
      },
      {
        "input": "9 1\n2 3",
        "expected_output": "9 2\n1 3"
      },
      {
        "input": "4 5\n6 7",
        "expected_output": "4 6\n5 7"
      },
      {
        "input": "8 9\n1 2",
        "expected_output": "8 1\n9 2"
      }
    ]
  },
  {
    "id": "P28",
    "title": "Binary to Decimal",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Convert binary number to decimal.",
    "input_format": "Binary number",
    "output_format": "Decimal number",
    "sample_input": "1010",
    "sample_output": "10",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1010",
        "expected_output": "10"
      },
      {
        "input": "111",
        "expected_output": "7"
      },
      {
        "input": "1001",
        "expected_output": "9"
      },
      {
        "input": "1100",
        "expected_output": "12"
      },
      {
        "input": "1",
        "expected_output": "1"
      }
    ]
  },
  {
    "id": "P29",
    "title": "Find GCD",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find GCD of two numbers.",
    "input_format": "Two integers",
    "output_format": "GCD",
    "sample_input": "12 18",
    "sample_output": "6",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "12 18",
        "expected_output": "6"
      },
      {
        "input": "20 30",
        "expected_output": "10"
      },
      {
        "input": "7 14",
        "expected_output": "7"
      },
      {
        "input": "9 6",
        "expected_output": "3"
      },
      {
        "input": "8 12",
        "expected_output": "4"
      }
    ]
  },
  {
    "id": "P30",
    "title": "Find LCM",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find LCM of two numbers.",
    "input_format": "Two integers",
    "output_format": "LCM",
    "sample_input": "4 6",
    "sample_output": "12",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "4 6",
        "expected_output": "12"
      },
      {
        "input": "3 5",
        "expected_output": "15"
      },
      {
        "input": "7 14",
        "expected_output": "14"
      },
      {
        "input": "8 12",
        "expected_output": "24"
      },
      {
        "input": "6 9",
        "expected_output": "18"
      }
    ]
  },
  {
    "id": "P31",
    "title": "Count Frequency of Elements",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Count frequency of each element.",
    "input_format": "N then N integers",
    "output_format": "Element frequencies",
    "sample_input": "5\n1 2 2 3 3",
    "sample_output": "1:1 2:2 3:2",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5\n1 1 2 2 3",
        "expected_output": "1:2 2:2 3:1"
      },
      {
        "input": "4\n1 2 3 4",
        "expected_output": "1:1 2:1 3:1 4:1"
      },
      {
        "input": "3\n5 5 5",
        "expected_output": "5:3"
      },
      {
        "input": "5\n2 2 2 3 3",
        "expected_output": "2:3 3:2"
      },
      {
        "input": "6\n1 1 1 2 2 3",
        "expected_output": "1:3 2:2 3:1"
      }
    ]
  },
  {
    "id": "P32",
    "title": "Longest Word in Sentence",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find longest word in sentence.",
    "input_format": "Sentence",
    "output_format": "Longest word",
    "sample_input": "I love programming",
    "sample_output": "programming",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "I love programming",
        "expected_output": "programming"
      },
      {
        "input": "Python is powerful",
        "expected_output": "powerful"
      },
      {
        "input": "ChatGPT helps coding",
        "expected_output": "ChatGPT"
      },
      {
        "input": "Hello world",
        "expected_output": "Hello"
      },
      {
        "input": "Machine learning models",
        "expected_output": "learning"
      }
    ]
  },
  {
    "id": "P33",
    "title": "Remove Vowels",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Remove vowels from string.",
    "input_format": "String",
    "output_format": "String without vowels",
    "sample_input": "hello",
    "sample_output": "hll",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "hello",
        "expected_output": "hll"
      },
      {
        "input": "python",
        "expected_output": "pythn"
      },
      {
        "input": "education",
        "expected_output": "dctn"
      },
      {
        "input": "apple",
        "expected_output": "ppl"
      },
      {
        "input": "banana",
        "expected_output": "bnn"
      }
    ]
  },
  {
    "id": "P34",
    "title": "Common Elements in Two Lists",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find common elements.",
    "input_format": "Two lists",
    "output_format": "Common numbers",
    "sample_input": "1 2 3\n2 3 4",
    "sample_output": "2 3",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1 2 3\n2 3 4",
        "expected_output": "2 3"
      },
      {
        "input": "5 6 7\n7 8 9",
        "expected_output": "7"
      },
      {
        "input": "1 2\n3 4",
        "expected_output": ""
      },
      {
        "input": "2 4 6\n2 6 8",
        "expected_output": "2 6"
      },
      {
        "input": "10 20\n20 30",
        "expected_output": "20"
      }
    ]
  },
  {
    "id": "P35",
    "title": "Subarray with Given Sum",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find if subarray exists with given sum.",
    "input_format": "N S then array",
    "output_format": "Yes or No",
    "sample_input": "5 12\n1 2 3 7 5",
    "sample_output": "Yes",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5 12\n1 2 3 7 5",
        "expected_output": "Yes"
      },
      {
        "input": "5 50\n1 2 3 4 5",
        "expected_output": "No"
      },
      {
        "input": "4 6\n1 2 3 4",
        "expected_output": "Yes"
      },
      {
        "input": "3 10\n1 2 3",
        "expected_output": "No"
      },
      {
        "input": "5 9\n2 3 4 5 6",
        "expected_output": "Yes"
      }
    ]
  },
  {
    "id": "P36",
    "title": "Majority Element",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find element appearing more than n/2 times.",
    "input_format": "N then array",
    "output_format": "Majority element",
    "sample_input": "5\n2 2 1 2 3",
    "sample_output": "2",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5\n2 2 1 2 3",
        "expected_output": "2"
      },
      {
        "input": "3\n1 1 2",
        "expected_output": "1"
      },
      {
        "input": "7\n3 3 4 3 5 3 3",
        "expected_output": "3"
      },
      {
        "input": "5\n5 5 5 2 2",
        "expected_output": "5"
      },
      {
        "input": "3\n9 9 9",
        "expected_output": "9"
      }
    ]
  },
  {
    "id": "P37",
    "title": "Pair with Given Sum",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Check if pair exists with given sum.",
    "input_format": "N S then array",
    "output_format": "Yes or No",
    "sample_input": "5 9\n2 7 11 15 1",
    "sample_output": "Yes",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5 9\n2 7 11 15 1",
        "expected_output": "Yes"
      },
      {
        "input": "4 20\n1 2 3 4",
        "expected_output": "No"
      },
      {
        "input": "3 5\n2 3 4",
        "expected_output": "Yes"
      },
      {
        "input": "5 10\n5 5 3 2 1",
        "expected_output": "Yes"
      },
      {
        "input": "4 8\n1 1 1 1",
        "expected_output": "No"
      }
    ]
  },
  {
    "id": "P38",
    "title": "Sort Dictionary by Value",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Sort dictionary by values.",
    "input_format": "Key value pairs",
    "output_format": "Sorted keys",
    "sample_input": "a 3 b 1 c 2",
    "sample_output": "b c a",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "a 3 b 1 c 2",
        "expected_output": "b c a"
      },
      {
        "input": "x 9 y 5 z 7",
        "expected_output": "y z x"
      },
      {
        "input": "p 2 q 1 r 3",
        "expected_output": "q p r"
      },
      {
        "input": "m 4 n 2 o 3",
        "expected_output": "n o m"
      },
      {
        "input": "k 5 l 1 m 2",
        "expected_output": "l m k"
      }
    ]
  },
  {
    "id": "P39",
    "title": "String Rotation",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Check if string is rotation of another.",
    "input_format": "Two strings",
    "output_format": "Yes or No",
    "sample_input": "abcd cdab",
    "sample_output": "Yes",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "abcd cdab",
        "expected_output": "Yes"
      },
      {
        "input": "abc cab",
        "expected_output": "Yes"
      },
      {
        "input": "hello llohe",
        "expected_output": "Yes"
      },
      {
        "input": "test estt",
        "expected_output": "Yes"
      },
      {
        "input": "abc def",
        "expected_output": "No"
      }
    ]
  },
  {
    "id": "P40",
    "title": "Count Substrings",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Count occurrences of substring.",
    "input_format": "String and substring",
    "output_format": "Count",
    "sample_input": "banana ana",
    "sample_output": "1",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "banana ana",
        "expected_output": "1"
      },
      {
        "input": "aaaa aa",
        "expected_output": "3"
      },
      {
        "input": "hello l",
        "expected_output": "2"
      },
      {
        "input": "python py",
        "expected_output": "1"
      },
      {
        "input": "ababab ab",
        "expected_output": "3"
      }
    ]
  },
  {
    "id": "P41",
    "title": "Longest Substring Without Repeating Characters",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find the length of the longest substring without repeating characters.",
    "input_format": "Single string",
    "output_format": "Integer length",
    "sample_input": "abcabcbb",
    "sample_output": "3",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "abcabcbb",
        "expected_output": "3"
      },
      {
        "input": "bbbbb",
        "expected_output": "1"
      },
      {
        "input": "pwwkew",
        "expected_output": "3"
      },
      {
        "input": "abcdef",
        "expected_output": "6"
      },
      {
        "input": "abba",
        "expected_output": "2"
      }
    ]
  },
  {
    "id": "P42",
    "title": "Maximum Subarray Sum",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find the maximum sum of a contiguous subarray using Kadane's algorithm.",
    "input_format": "N then N integers",
    "output_format": "Maximum subarray sum",
    "sample_input": "5\n-2 1 -3 4 -1",
    "sample_output": "4",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "5\n-2 1 -3 4 -1",
        "expected_output": "4"
      },
      {
        "input": "4\n1 2 3 4",
        "expected_output": "10"
      },
      {
        "input": "5\n-1 -2 -3 -4 -5",
        "expected_output": "-1"
      },
      {
        "input": "6\n5 -2 3 4 -1 2",
        "expected_output": "11"
      },
      {
        "input": "3\n2 -1 2",
        "expected_output": "3"
      }
    ]
  },
  {
    "id": "P43",
    "title": "Longest Increasing Subsequence",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find length of the longest increasing subsequence.",
    "input_format": "N then N integers",
    "output_format": "Length of LIS",
    "sample_input": "6\n10 9 2 5 3 7",
    "sample_output": "3",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "6\n10 9 2 5 3 7",
        "expected_output": "3"
      },
      {
        "input": "5\n1 2 3 4 5",
        "expected_output": "5"
      },
      {
        "input": "5\n5 4 3 2 1",
        "expected_output": "1"
      },
      {
        "input": "6\n1 3 6 7 9 4",
        "expected_output": "5"
      },
      {
        "input": "7\n3 10 2 1 20 4 6",
        "expected_output": "3"
      }
    ]
  },
  {
    "id": "P44",
    "title": "Merge K Sorted Lists",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Merge K sorted lists into one sorted list.",
    "input_format": "K lists of integers",
    "output_format": "Merged sorted list",
    "sample_input": "2\n1 4 5\n1 3 4",
    "sample_output": "1 1 3 4 4 5",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "2\n1 4 5\n1 3 4",
        "expected_output": "1 1 3 4 4 5"
      },
      {
        "input": "2\n2 6\n1 3 4",
        "expected_output": "1 2 3 4 6"
      },
      {
        "input": "3\n1 2\n3 4\n5 6",
        "expected_output": "1 2 3 4 5 6"
      },
      {
        "input": "2\n5 10\n6 7",
        "expected_output": "5 6 7 10"
      },
      {
        "input": "2\n1 1 1\n2 2",
        "expected_output": "1 1 1 2 2"
      }
    ]
  },
  {
    "id": "P45",
    "title": "Detect Cycle in Graph",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Detect if a cycle exists in a directed graph.",
    "input_format": "N M then edges",
    "output_format": "Cycle or No Cycle",
    "sample_input": "3 3\n1 2\n2 3\n3 1",
    "sample_output": "Cycle",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "3 3\n1 2\n2 3\n3 1",
        "expected_output": "Cycle"
      },
      {
        "input": "3 2\n1 2\n2 3",
        "expected_output": "No Cycle"
      },
      {
        "input": "4 4\n1 2\n2 3\n3 4\n4 2",
        "expected_output": "Cycle"
      },
      {
        "input": "5 4\n1 2\n2 3\n3 4\n4 5",
        "expected_output": "No Cycle"
      },
      {
        "input": "3 3\n1 2\n2 3\n3 2",
        "expected_output": "Cycle"
      }
    ]
  },
  {
    "id": "P46",
    "title": "Dijkstra Shortest Path",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find shortest path from source to all vertices using Dijkstra algorithm.",
    "input_format": "Graph edges and source node",
    "output_format": "Shortest distances",
    "sample_input": "4 4\n1 2 1\n2 3 2\n1 3 4\n3 4 1\n1",
    "sample_output": "0 1 3 4",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "4 4\n1 2 1\n2 3 2\n1 3 4\n3 4 1\n1",
        "expected_output": "0 1 3 4"
      },
      {
        "input": "3 3\n1 2 5\n2 3 2\n1 3 10\n1",
        "expected_output": "0 5 7"
      },
      {
        "input": "3 2\n1 2 1\n2 3 1\n1",
        "expected_output": "0 1 2"
      },
      {
        "input": "4 3\n1 2 2\n1 3 3\n3 4 1\n1",
        "expected_output": "0 2 3 4"
      },
      {
        "input": "5 4\n1 2 1\n2 3 2\n3 4 3\n4 5 4\n1",
        "expected_output": "0 1 3 6 10"
      }
    ]
  },
  {
    "id": "P47",
    "title": "Word Ladder",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find shortest transformation sequence from start to end word.",
    "input_format": "Start word, end word, word list",
    "output_format": "Length of transformation",
    "sample_input": "hit cog\nhot dot dog lot log cog",
    "sample_output": "5",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "hit cog\nhot dot dog lot log cog",
        "expected_output": "5"
      },
      {
        "input": "hit cog\nhot dot dog lot log",
        "expected_output": "0"
      },
      {
        "input": "a c\na b c",
        "expected_output": "2"
      },
      {
        "input": "red tax\nred ted tex tax",
        "expected_output": "4"
      },
      {
        "input": "game math\ngame fame fate mate math",
        "expected_output": "5"
      }
    ]
  },
  {
    "id": "P48",
    "title": "N Queens Problem",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find number of possible solutions for N Queens problem.",
    "input_format": "Integer N",
    "output_format": "Number of solutions",
    "sample_input": "4",
    "sample_output": "2",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "1",
        "expected_output": "1"
      },
      {
        "input": "2",
        "expected_output": "0"
      },
      {
        "input": "3",
        "expected_output": "0"
      },
      {
        "input": "4",
        "expected_output": "2"
      },
      {
        "input": "5",
        "expected_output": "10"
      }
    ]
  },
  {
    "id": "P49",
    "title": "LRU Cache Simulation",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Simulate LRU Cache operations.",
    "input_format": "Cache size and operations",
    "output_format": "Cache state",
    "sample_input": "2\nput 1\nput 2\nget 1\nput 3",
    "sample_output": "1 3",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "2\nput 1\nput 2\nget 1\nput 3",
        "expected_output": "1 3"
      },
      {
        "input": "2\nput 1\nput 2\nput 3",
        "expected_output": "2 3"
      },
      {
        "input": "3\nput 1\nput 2\nput 3\nput 4",
        "expected_output": "2 3 4"
      },
      {
        "input": "1\nput 1\nput 2",
        "expected_output": "2"
      },
      {
        "input": "2\nput 5\nput 6\nget 5",
        "expected_output": "5 6"
      }
    ]
  },
  {
    "id": "P50",
    "title": "Sudoku Validator",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Check if a Sudoku board is valid.",
    "input_format": "9x9 board",
    "output_format": "Valid or Invalid",
    "sample_input": "Valid Sudoku board",
    "sample_output": "Valid",
    "starter_code": "def solve():\n    pass",
    "test_cases": [
      {
        "input": "valid_board",
        "expected_output": "Valid"
      },
      {
        "input": "invalid_row",
        "expected_output": "Invalid"
      },
      {
        "input": "invalid_column",
        "expected_output": "Invalid"
      },
      {
        "input": "invalid_box",
        "expected_output": "Invalid"
      },
      {
        "input": "valid_board2",
        "expected_output": "Valid"
      }
    ]
  },
  {
    "id": "S01",
    "title": "Select All Employees",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Retrieve all columns from the employees table.",
    "input_format": "employees(id INT, name TEXT, department TEXT, salary INT)",
    "output_format": "Display all employee records.",
    "sample_input": "employees table",
    "sample_output": "All rows",
    "starter_code": "SELECT * FROM employees;",
    "test_cases": [
      {
        "input": "employees table",
        "expected_output": "all rows"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S02",
    "title": "Employees With Salary Greater Than 50000",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find employees whose salary is greater than 50000.",
    "input_format": "employees(id,name,department,salary)",
    "output_format": "List employee name and salary",
    "sample_input": "employees table",
    "sample_output": "employees with salary >50000",
    "starter_code": "SELECT name,salary FROM employees WHERE salary>50000;",
    "test_cases": [
      {
        "input": "table data",
        "expected_output": "filtered employees"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S03",
    "title": "Count Employees",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Count total number of employees.",
    "input_format": "employees table",
    "output_format": "Total employee count",
    "sample_input": "employees table",
    "sample_output": "integer count",
    "starter_code": "SELECT COUNT(*) FROM employees;",
    "test_cases": [
      {
        "input": "employees data",
        "expected_output": "count"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S04",
    "title": "Distinct Departments",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find all distinct departments.",
    "input_format": "employees table",
    "output_format": "unique departments",
    "sample_input": "employees table",
    "sample_output": "distinct department names",
    "starter_code": "SELECT DISTINCT department FROM employees;",
    "test_cases": [
      {
        "input": "table data",
        "expected_output": "unique departments"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S05",
    "title": "Average Salary",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find average salary of employees.",
    "input_format": "employees table",
    "output_format": "average salary",
    "sample_input": "employees table",
    "sample_output": "average salary value",
    "starter_code": "SELECT AVG(salary) FROM employees;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "avg salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S06",
    "title": "Maximum Salary",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find the maximum salary from employees table.",
    "input_format": "employees(id,name,department,salary)",
    "output_format": "Maximum salary value",
    "sample_input": "employees table",
    "sample_output": "highest salary",
    "starter_code": "SELECT MAX(salary) FROM employees;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "max salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S07",
    "title": "Minimum Salary",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find the minimum salary from employees table.",
    "input_format": "employees table",
    "output_format": "Minimum salary",
    "sample_input": "employees table",
    "sample_output": "lowest salary",
    "starter_code": "SELECT MIN(salary) FROM employees;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "min salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S08",
    "title": "Employees in IT Department",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find employees who belong to IT department.",
    "input_format": "employees table",
    "output_format": "Employee names",
    "sample_input": "employees table",
    "sample_output": "IT employees",
    "starter_code": "SELECT name FROM employees WHERE department='IT';",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S09",
    "title": "Sort Employees by Salary",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Display employees ordered by salary in descending order.",
    "input_format": "employees table",
    "output_format": "sorted employees",
    "sample_input": "employees table",
    "sample_output": "sorted by salary",
    "starter_code": "SELECT * FROM employees ORDER BY salary DESC;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "sorted"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S10",
    "title": "Employees Name Starting With A",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Find employees whose name starts with letter A.",
    "input_format": "employees table",
    "output_format": "employee names",
    "sample_input": "employees table",
    "sample_output": "names starting with A",
    "starter_code": "SELECT name FROM employees WHERE name LIKE 'A%';",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S11",
    "title": "Employees Per Department",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find number of employees in each department.",
    "input_format": "employees(id,name,department,salary)",
    "output_format": "department and count",
    "sample_input": "employees table",
    "sample_output": "dept | count",
    "starter_code": "SELECT department,COUNT(*) FROM employees GROUP BY department;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "dept counts"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S12",
    "title": "Highest Salary in Each Department",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find highest salary in each department.",
    "input_format": "employees table",
    "output_format": "department and max salary",
    "sample_input": "employees table",
    "sample_output": "dept | max salary",
    "starter_code": "SELECT department,MAX(salary) FROM employees GROUP BY department;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "max salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S13",
    "title": "Second Highest Salary",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find second highest salary.",
    "input_format": "employees table",
    "output_format": "second highest salary",
    "sample_input": "employees table",
    "sample_output": "salary value",
    "starter_code": "SELECT MAX(salary) FROM employees WHERE salary<(SELECT MAX(salary) FROM employees);",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S14",
    "title": "Employees Above Department Average Salary",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find employees earning more than their department average salary.",
    "input_format": "employees table",
    "output_format": "employee names",
    "sample_input": "employees table",
    "sample_output": "employees above dept avg",
    "starter_code": "SELECT name FROM employees e WHERE salary>(SELECT AVG(salary) FROM employees WHERE department=e.department);",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S15",
    "title": "Department with Highest Average Salary",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find department with highest average salary.",
    "input_format": "employees table",
    "output_format": "department name",
    "sample_input": "employees table",
    "sample_output": "department",
    "starter_code": "SELECT department FROM employees GROUP BY department ORDER BY AVG(salary) DESC LIMIT 1;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "dept"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S16",
    "title": "Employees Joined After 2020",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find employees who joined after 2020.",
    "input_format": "employees(id,name,join_date)",
    "output_format": "employee names",
    "sample_input": "employees table",
    "sample_output": "names",
    "starter_code": "SELECT name FROM employees WHERE join_date>'2020-12-31';",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER, join_date TEXT);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000,'2019-05-01'),(2,'Bob','IT',70000,'2021-03-15'),(3,'Charlie','IT',80000,'2022-01-10'),(4,'Diana','HR',55000,'2020-06-20');"
  },
  {
    "id": "S17",
    "title": "Total Salary Per Department",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Calculate total salary of each department.",
    "input_format": "employees table",
    "output_format": "department and total salary",
    "sample_input": "employees table",
    "sample_output": "dept salary sum",
    "starter_code": "SELECT department,SUM(salary) FROM employees GROUP BY department;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "totals"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S18",
    "title": "Departments Having More Than 5 Employees",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find departments with more than 5 employees.",
    "input_format": "employees table",
    "output_format": "department names",
    "sample_input": "employees table",
    "sample_output": "departments",
    "starter_code": "SELECT department FROM employees GROUP BY department HAVING COUNT(*)>5;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "departments"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000),(5,'Eve','IT',60000),(6,'Frank','IT',65000),(7,'Grace','IT',75000),(8,'Henry','IT',72000);"
  },
  {
    "id": "S19",
    "title": "Top 3 Highest Salaries",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find top 3 highest salaries.",
    "input_format": "employees table",
    "output_format": "top salaries",
    "sample_input": "employees table",
    "sample_output": "salary values",
    "starter_code": "SELECT salary FROM employees ORDER BY salary DESC LIMIT 3;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "top3"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S20",
    "title": "Employees Not in HR Department",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Find employees who are not in HR department.",
    "input_format": "employees table",
    "output_format": "employee names",
    "sample_input": "employees table",
    "sample_output": "names",
    "starter_code": "SELECT name FROM employees WHERE department!='HR';",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S21",
    "title": "Rank Employees by Salary",
    "language": "sql",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Rank employees by salary using window function.",
    "input_format": "employees table",
    "output_format": "name salary rank",
    "sample_input": "employees table",
    "sample_output": "employee salary rank",
    "starter_code": "SELECT name,salary,RANK() OVER(ORDER BY salary DESC) AS rank FROM employees;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "rank list"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S22",
    "title": "Running Total of Salaries",
    "language": "sql",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Calculate running total of salaries ordered by id.",
    "input_format": "employees table",
    "output_format": "id salary running total",
    "sample_input": "employees table",
    "sample_output": "running sum",
    "starter_code": "SELECT id,salary,SUM(salary) OVER(ORDER BY id) FROM employees;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "running total"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S23",
    "title": "Find Duplicate Employees",
    "language": "sql",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find employees with duplicate names.",
    "input_format": "employees table",
    "output_format": "duplicate names",
    "sample_input": "employees table",
    "sample_output": "names",
    "starter_code": "SELECT name FROM employees GROUP BY name HAVING COUNT(*)>1;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "names"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Alice','IT',80000),(4,'Diana','HR',55000);"
  },
  {
    "id": "S24",
    "title": "Employees with Same Salary",
    "language": "sql",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Find employees sharing same salary.",
    "input_format": "employees table",
    "output_format": "names",
    "sample_input": "employees table",
    "sample_output": "names",
    "starter_code": "SELECT salary FROM employees GROUP BY salary HAVING COUNT(*)>1;",
    "test_cases": [
      {
        "input": "data",
        "expected_output": "salary"
      }
    ],
    "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
    "seed_sql": "INSERT INTO employees VALUES (1,'Alice','HR',50000),(2,'Bob','IT',70000),(3,'Charlie','IT',70000),(4,'Diana','HR',55000);"
  },
  {
    "id": "P65",
    "title": "Sum of N Numbers",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Given an integer **N**, followed by **N space-separated integers**, print their sum.\n\n**Constraints:**\n- 1 \u2264 N \u2264 1000\n- -10^6 \u2264 each number \u2264 10^6",
    "description": "",
    "input_format": "N\na1 a2 a3 ... aN",
    "output_format": "Sum of the numbers",
    "sample_input": "5\n1 2 3 4 5",
    "sample_output": "15",
    "starter_code": "n = int(input())\narr = list(map(int, input().split()))\n\n# Write your code here\n",
    "test_cases": [
      {
        "input": "5\n1 2 3 4 5",
        "expected_output": "15"
      },
      {
        "input": "3\n10 20 30",
        "expected_output": "60"
      },
      {
        "input": "1\n100",
        "expected_output": "100"
      }
    ],
    "schema_sql": "",
    "seed_sql": ""
  },
  {
    "id": "P66",
    "title": "FizzBuzz",
    "language": "python",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Write a program that prints numbers from 1 to N. But for multiples of 3, print \"Fizz\" instead of the number, and for multiples of 5, print \"Buzz\". For numbers which are multiples of both 3 and 5, print \"FizzBuzz\".\n\n**Constraints:**\n- 1 \u2264 N \u2264 100",
    "description": "",
    "input_format": "A single integer N",
    "output_format": "Print the FizzBuzz sequence from 1 to N, each on a new line",
    "sample_input": "15",
    "sample_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    "starter_code": "n = int(input())\n\n# Write your code here\n",
    "test_cases": [
      {
        "input": "5",
        "expected_output": "1\n2\nFizz\n4\nBuzz"
      },
      {
        "input": "15",
        "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"
      },
      {
        "input": "3",
        "expected_output": "1\n2\nFizz"
      }
    ],
    "schema_sql": "",
    "seed_sql": ""
  },
  {
    "id": "P67",
    "title": "Palindrome Check",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Given a string, determine if it is a palindrome. Consider only alphanumeric characters and ignore case.\n\n**Constraints:**\n- 1 \u2264 length of string \u2264 10^5\n- String may contain spaces and special characters",
    "description": "",
    "input_format": "A single string",
    "output_format": "Print 'YES' if it's a palindrome, otherwise print 'NO'",
    "sample_input": "A man a plan a canal Panama",
    "sample_output": "YES",
    "starter_code": "s = input()\n\n# Write your code here\n",
    "test_cases": [
      {
        "input": "A man a plan a canal Panama",
        "expected_output": "YES"
      },
      {
        "input": "race a car",
        "expected_output": "NO"
      },
      {
        "input": "Was it a car or a cat I saw",
        "expected_output": "YES"
      },
      {
        "input": "hello",
        "expected_output": "NO"
      }
    ],
    "schema_sql": "",
    "seed_sql": ""
  },
  {
    "id": "P68",
    "title": "Two Sum",
    "language": "python",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 25,
    "statement": "Given an array of integers and a target sum, find two numbers such that they add up to the target. Print the indices (0-based) of the two numbers in ascending order.\n\n**Constraints:**\n- 2 \u2264 N \u2264 10^4\n- -10^9 \u2264 each number \u2264 10^9\n- Exactly one solution exists",
    "description": "",
    "input_format": "N target\na1 a2 a3 ... aN",
    "output_format": "Two space-separated indices in ascending order",
    "sample_input": "4 9\n2 7 11 15",
    "sample_output": "0 1",
    "starter_code": "line1 = input().split()\nn, target = int(line1[0]), int(line1[1])\narr = list(map(int, input().split()))\n\n# Write your code here\n",
    "test_cases": [
      {
        "input": "4 9\n2 7 11 15",
        "expected_output": "0 1"
      },
      {
        "input": "3 6\n3 2 4",
        "expected_output": "1 2"
      },
      {
        "input": "2 6\n3 3",
        "expected_output": "0 1"
      }
    ],
    "schema_sql": "",
    "seed_sql": ""
  },
  {
    "id": "P69",
    "title": "Longest Substring Without Repeating",
    "language": "python",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Given a string, find the length of the longest substring without repeating characters.\n\n**Constraints:**\n- 0 \u2264 length of string \u2264 5 * 10^4\n- String consists of English letters, digits, symbols and spaces",
    "description": "",
    "input_format": "A single string",
    "output_format": "An integer representing the length of the longest substring",
    "sample_input": "abcabcbb",
    "sample_output": "3",
    "starter_code": "s = input()\n\n# Write your code here\n",
    "test_cases": [
      {
        "input": "abcabcbb",
        "expected_output": "3"
      },
      {
        "input": "bbbbb",
        "expected_output": "1"
      },
      {
        "input": "pwwkew",
        "expected_output": "3"
      },
      {
        "input": "",
        "expected_output": "0"
      }
    ],
    "schema_sql": "",
    "seed_sql": ""
  },
  {
    "id": "P70",
    "title": "Department-wise Employee Count",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Given an `employees` table, write a query to find the number of employees in each department.\n\n**Table Schema:**\n```sql\nCREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);\n```\n\n**Note:** Write standard SQL only.",
    "description": "",
    "input_format": "Use the predefined `employees` table.",
    "output_format": "Return two columns: department and count.",
    "sample_input": "N/A (Schema and seed data are provided)",
    "sample_output": "department | count\nHR         | 2\nIT         | 2",
    "starter_code": "SELECT department, COUNT(*) AS count\nFROM employees\nGROUP BY department;",
    "test_cases": [
      {
        "expected_columns": [
          "department",
          "count"
        ],
        "expected_rows": [
          [
            "HR",
            2
          ],
          [
            "IT",
            2
          ]
        ]
      }
    ],
    "schema_sql": "CREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);",
    "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'HR', 50000),\n(2, 'Bob', 'IT', 70000),\n(3, 'Charlie', 'IT', 80000),\n(4, 'Diana', 'HR', 55000);"
  },
  {
    "id": "P71",
    "title": "Maximum Salary per Department",
    "language": "sql",
    "difficulty": "Easy",
    "marks": 10,
    "time_limit": 10,
    "statement": "Write a query to find the maximum salary in each department.\n\n**Table Schema:**\n```sql\nCREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);\n```",
    "description": "",
    "input_format": "Use the predefined `employees` table.",
    "output_format": "Return department and max_salary columns.",
    "sample_input": "N/A",
    "sample_output": "department | max_salary\nHR         | 55000\nIT         | 80000",
    "starter_code": "-- Write your SQL query here\nSELECT department, MAX(salary) AS max_salary\nFROM employees\nGROUP BY department;",
    "test_cases": [
      {
        "expected_columns": [
          "department",
          "max_salary"
        ],
        "expected_rows": [
          [
            "HR",
            55000
          ],
          [
            "IT",
            80000
          ]
        ]
      }
    ],
    "schema_sql": "CREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);",
    "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'HR', 50000),\n(2, 'Bob', 'IT', 70000),\n(3, 'Charlie', 'IT', 80000),\n(4, 'Diana', 'HR', 55000);"
  },
  {
    "id": "P72",
    "title": "Second Highest Salary",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 15,
    "statement": "Write a SQL query to find the second highest salary from the employees table. If there is no second highest salary, return NULL.\n\n**Table Schema:**\n```sql\nCREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);\n```",
    "description": "",
    "input_format": "Use the predefined `employees` table.",
    "output_format": "Return a single column: second_highest_salary",
    "sample_input": "N/A",
    "sample_output": "second_highest_salary\n70000",
    "starter_code": "-- Write your SQL query here\nSELECT MAX(salary) AS second_highest_salary\nFROM employees\nWHERE salary < (SELECT MAX(salary) FROM employees);",
    "test_cases": [
      {
        "expected_columns": [
          "second_highest_salary"
        ],
        "expected_rows": [
          [
            70000
          ]
        ]
      }
    ],
    "schema_sql": "CREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);",
    "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'HR', 50000),\n(2, 'Bob', 'IT', 70000),\n(3, 'Charlie', 'IT', 80000),\n(4, 'Diana', 'HR', 55000);"
  },
  {
    "id": "P73",
    "title": "Employees Above Average Salary",
    "language": "sql",
    "difficulty": "Medium",
    "marks": 20,
    "time_limit": 25,
    "statement": "Write a query to find all employees whose salary is above the average salary of all employees. Return the name and salary.\n\n**Table Schema:**\n```sql\nCREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);\n```",
    "description": "",
    "input_format": "Use the predefined `employees` table.",
    "output_format": "Return name and salary columns, ordered by salary descending.",
    "sample_input": "N/A",
    "sample_output": "name    | salary\nCharlie | 80000\nBob     | 70000",
    "starter_code": "-- Write your SQL query here\nSELECT name, salary\nFROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees)\nORDER BY salary DESC;",
    "test_cases": [
      {
        "expected_columns": [
          "name",
          "salary"
        ],
        "expected_rows": [
          [
            "Charlie",
            80000
          ],
          [
            "Bob",
            70000
          ]
        ]
      }
    ],
    "schema_sql": "CREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);",
    "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'HR', 50000),\n(2, 'Bob', 'IT', 70000),\n(3, 'Charlie', 'IT', 80000),\n(4, 'Diana', 'HR', 55000);"
  },
  {
    "id": "P74",
    "title": "Department Salary Ranking",
    "language": "sql",
    "difficulty": "Hard",
    "marks": 40,
    "time_limit": 25,
    "statement": "Write a query to rank employees within each department by salary (highest first). Return name, department, salary, and rank.\n\n**Table Schema:**\n```sql\nCREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);\n```\n\n**Note:** Use window functions if available, or subqueries for ranking.",
    "description": "",
    "input_format": "Use the predefined `employees` table.",
    "output_format": "Return name, department, salary, and salary_rank columns.",
    "sample_input": "N/A",
    "sample_output": "name    | department | salary | salary_rank\nDiana   | HR         | 55000  | 1\nAlice   | HR         | 50000  | 2\nCharlie | IT         | 80000  | 1\nBob     | IT         | 70000  | 2",
    "starter_code": "-- Write your SQL query here\nSELECT name, department, salary,\n       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank\nFROM employees\nORDER BY department, salary_rank;",
    "test_cases": [
      {
        "expected_columns": [
          "name",
          "department",
          "salary",
          "salary_rank"
        ],
        "expected_rows": [
          [
            "Diana",
            "HR",
            55000,
            1
          ],
          [
            "Alice",
            "HR",
            50000,
            2
          ],
          [
            "Charlie",
            "IT",
            80000,
            1
          ],
          [
            "Bob",
            "IT",
            70000,
            2
          ]
        ]
      }
    ],
    "schema_sql": "CREATE TABLE employees (\n  id INTEGER,\n  name TEXT,\n  department TEXT,\n  salary INTEGER\n);",
    "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'HR', 50000),\n(2, 'Bob', 'IT', 70000),\n(3, 'Charlie', 'IT', 80000),\n(4, 'Diana', 'HR', 55000);"
  }
]