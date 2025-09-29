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
