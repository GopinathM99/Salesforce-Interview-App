-- Ensure a default primary admin exists
insert into public.admin_users (email, first_name, last_name, is_primary)
values ('gopinath.merugumala@example.com', 'Gopinath', 'Merugumala', true)
on conflict (email) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    is_primary = true;

-- Seed a handful of Salesforce dev interview questions
insert into public.questions (question_text, answer_text, topic, difficulty)
values
  (
    'What is a Governor Limit in Salesforce Apex and why does it exist?',
    'Governor Limits are runtime limits enforced by Salesforce to ensure multi-tenant stability. Examples: SOQL queries per transaction, DML statements per transaction, CPU time, heap size, callouts, queueable depth. Code must be bulkified and efficient to stay within these limits.',
    'Apex', 'easy'
  ),
  (
    'How do you call an external REST service from Apex and handle limits?',
    'Use HttpRequest/Http classes with a named credential where possible. Respect callout limits (max 100 per transaction), set timeouts, use queueable/future for async, and handle retries/backoffs.',
    'Integration', 'medium'
  );


with mcq_rows as (
  select *
  from (
    values
    (
      'Your company is setting up SSO between its main Salesforce org (IdP) and a newly acquired company''s org (SP). What is the best approach for configuration and user mapping?',
      'To configure SSO, I would first enable My Domain in the IdP org and then enable it as an Identity Provider. In the SP org, I would configure SAML settings, using the metadata from the IdP org to establish the trust relationship. For user mapping, I would use the Federation ID on the user records in both orgs as the unique identifier to link the accounts, ensuring a seamless login experience.',
      'SSO and IDP',
      'medium'::public.difficulty_level,
      '["Use a Connected App with OAuth for authentication", "Use Federation ID for user mapping and configure SAML in both orgs", "Rely on Salesforce-to-Salesforce for user synchronization", "Create a custom Apex REST service for authentication"]'::jsonb,
      1
    ),
    (
      'An external web app needs to access Salesforce data on behalf of a user and also perform server-side actions when the user is offline. Which OAuth flow is most appropriate?',
      'I would recommend the OAuth 2.0 web server flow. This flow is ideal for applications that can securely store a client secret. It provides both an access token for immediate API calls and a refresh token, which can be used by the server-side process to obtain new access tokens to perform actions when the user is offline.',
      'Connected Apps and OAuth',
      'medium'::public.difficulty_level,
      '["JWT Bearer Flow", "User-Agent Flow", "Web Server Flow", "Device Flow"]'::jsonb,
      2
    ),
    (
      'During JIT provisioning, new users are failing to be created silently with no clear errors. What is a common cause for this issue within the custom handler?',
      'I would investigate several areas: ensuring the user running the handler has permissions to create users, adding robust try-catch blocks in the Apex code to log any DML exceptions, verifying that all required User object fields are populated from the SAML assertion, and checking for validation rules or triggers on the User object that might be preventing the save. I would also confirm there are available user licenses.',
      'JIT Handler',
      'hard'::public.difficulty_level,
      '["The IdP is sending an invalid SAML response", "An unhandled DML exception or lack of available licenses", "The Salesforce org is in maintenance mode", "The user''s browser is blocking the SSO redirect"]'::jsonb,
      1
    ),
    (
      'How can you use the Composite API to retrieve a parent record, its children, and its grandchildren in a single, optimized callout for an LWC?',
      'I would construct a Composite API request with a series of subrequests. The first subrequest would query the parent record. I would then use the `referenceId` from this first request to dynamically build the WHERE clauses for the subsequent subrequests that query for the child and grandchild records, ensuring all data is fetched in one round trip.',
      'Composite API',
      'medium'::public.difficulty_level,
      '["Make three separate API calls", "Use a complex SOQL query with multiple subqueries", "Build a single Composite request with chained subrequests using referenceIds", "Use the Bulk API to query all objects at once"]'::jsonb,
      2
    ),
    (
      'You must execute six dependent SOQL queries in a single transaction, but the Composite API is limited to five. How do you solve this?',
      'Since the Composite API has a hard limit of five queries, I would break the operation into two sequential Composite API calls. The first call would execute the first four or five queries. The response from this call would provide the necessary data to construct the remaining queries for the second Composite API call. A loading indicator would be used to make this appear as a single operation to the user.',
      'Composite API',
      'hard'::public.difficulty_level,
      '["Request a limit increase from Salesforce support", "Use the Bulk API instead", "Combine the queries into a larger, less efficient query", "Split the work into two sequential Composite API calls"]'::jsonb,
      3
    ),
    (
      'An integration using the Composite API sometimes fails to return all records from the later queries in a 5-query request. What is a likely cause related to API limits?',
      'A likely cause is hitting the total record retrieval limit for a single composite request (2,000 records). After this limit, subsequent queries only return the first 200 records. To fix this, you must inspect the response for a `nextRecordsUrl` and make additional API calls to that URL to retrieve the remaining records.',
      'Composite API',
      'hard'::public.difficulty_level,
      '["The user''s profile is missing FLS on some fields", "The total record retrieval limit was hit, requiring calls to the nextRecordsUrl", "The API request timed out before completing", "The API version used is deprecated"]'::jsonb,
      1
    )
  ) as t(question_text, explanation, topic, difficulty, choices, correct_choice_index)
),
inserted_questions as (
  insert into public.questions (question_text, answer_text, topic, difficulty)
  select question_text, explanation, topic, difficulty
  from mcq_rows
  returning id, question_text, answer_text
)
insert into public.multiple_choice_questions (question_id, choices, correct_choice_index, explanation)
select iq.id, mr.choices, mr.correct_choice_index, mr.explanation
from inserted_questions iq
join mcq_rows mr on mr.question_text = iq.question_text;

-- Seed coding questions
insert into public.coding_questions (title, description, problem_statement, solution_code, explanation, difficulty, tags)
values
  (
    'Two Sum Problem',
    'Find two numbers in an array that add up to a target value.',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].',
    'function twoSum(nums, target) {\n  const map = new Map();\n  \n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    \n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    \n    map.set(nums[i], i);\n  }\n  \n  return [];\n}',
    'This solution uses a hash map to store each number and its index as we iterate through the array. For each number, we calculate its complement (target - current number) and check if it exists in our map. If it does, we found our pair. Time complexity: O(n), Space complexity: O(n).',
    'easy',
    ARRAY['arrays', 'hash-table', 'two-pointers']
  ),
  (
    'Valid Parentheses',
    'Check if a string containing only parentheses is valid.',
    'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nExample:\nInput: s = "()[]{}"\nOutput: true',
    'function isValid(s) {\n  const stack = [];\n  const map = {\n    ''('': '')'',\n    ''['': '']'',\n    ''{'': ''}''\n  };\n  \n  for (let char of s) {\n    if (char in map) {\n      stack.push(char);\n    } else {\n      const last = stack.pop();\n      if (map[last] !== char) {\n        return false;\n      }\n    }\n  }\n  \n  return stack.length === 0;\n}',
    'This solution uses a stack data structure. We push opening brackets onto the stack and pop them when we encounter closing brackets. If the popped bracket doesn''t match the current closing bracket, the string is invalid. Time complexity: O(n), Space complexity: O(n).',
    'easy',
    ARRAY['string', 'stack']
  ),
  (
    'Binary Tree Inorder Traversal',
    'Traverse a binary tree in inorder (left, root, right) sequence.',
    'Given the root of a binary tree, return the inorder traversal of its nodes'' values.\n\nIn inorder traversal:\n1. Traverse the left subtree\n2. Visit the root\n3. Traverse the right subtree\n\nExample:\nInput: root = [1,null,2,3]\nOutput: [1,3,2]',
    'function inorderTraversal(root) {\n  const result = [];\n  \n  function traverse(node) {\n    if (!node) return;\n    \n    traverse(node.left);\n    result.push(node.val);\n    traverse(node.right);\n  }\n  \n  traverse(root);\n  return result;\n}\n\n// Iterative version\nfunction inorderTraversalIterative(root) {\n  const result = [];\n  const stack = [];\n  let current = root;\n  \n  while (current || stack.length > 0) {\n    while (current) {\n      stack.push(current);\n      current = current.left;\n    }\n    \n    current = stack.pop();\n    result.push(current.val);\n    current = current.right;\n  }\n  \n  return result;\n}',
    'This solution demonstrates both recursive and iterative approaches to inorder traversal. The recursive version is simpler but uses O(h) stack space where h is the height of the tree. The iterative version uses an explicit stack. Time complexity: O(n), Space complexity: O(h) for recursive, O(n) for iterative in worst case.',
    'medium',
    ARRAY['tree', 'stack', 'recursion']
  );
