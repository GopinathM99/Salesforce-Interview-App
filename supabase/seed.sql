-- Seed a handful of Salesforce dev interview questions
insert into public.questions (question_text, answer_text, topic, difficulty)
values
  (
    'What is a Governor Limit in Salesforce Apex and why does it exist?',
    'Governor Limits are runtime limits enforced by Salesforce to ensure multi-tenant stability. Examples: SOQL queries per transaction, DML statements per transaction, CPU time, heap size, callouts, queueable depth. Code must be bulkified and efficient to stay within these limits.',
    'Apex', 'easy'
  ),
  (
    'When should you use a before trigger vs an after trigger?',
    'Use before triggers to set field values or validate data before saving (no DML needed). Use after triggers when you need record Ids or to perform operations that require the record to be committed, like creating related records.',
    'Triggers', 'medium'
  ),
  (
    'Explain the difference between SOQL and SOSL.',
    'SOQL queries specific objects/fields with filtering; returns records. SOSL performs text search across objects/fields; returns lists of sObjects with text matches. Use SOSL for unstructured keyword search, SOQL for structured queries.',
    'SOQL', 'easy'
  ),
  (
    'What is the order of execution for a DML operation in Salesforce?',
    'System validation, before triggers, custom validation, duplicate rules, after triggers, assignment rules, auto-response, workflow (and field updates), processes/flows, escalation rules, roll-up summary updates, sharing recalculation, post-commit logic.',
    'Triggers', 'hard'
  ),
  (
    'How do you prevent recursion in triggers?',
    'Use static variables, handler patterns with state flags, or platform features like Trigger.new/old comparison. Guard DML and future logic from re-entry using a static set/map or a Trigger Framework.',
    'Triggers', 'medium'
  ),
  (
    'What is the difference between Queueable, Future, Batchable, and Schedulable Apex?',
    'Future: simple async, no chaining, limited parameters. Queueable: async with chaining and complex types. Batchable: process large data in chunks with execute per batch. Schedulable: schedule jobs to run at specific times (often to kick off Batchable).',
    'Async', 'medium'
  ),
  (
    'How do you call an external REST service from Apex and handle limits?',
    'Use HttpRequest/Http classes with a named credential where possible. Respect callout limits (max 100 per transaction), set timeouts, use queueable/future for async, and handle retries/backoffs.',
    'Integration', 'medium'
  );

-- Add a few MCQ examples
insert into public.questions (question_text, answer_text, choices, correct_choice_index, topic, difficulty)
values
  (
    'Which collection type in Apex maintains insertion order and allows duplicates?',
    'List maintains insertion order and allows duplicates. Set does not allow duplicates; Map stores key-value pairs.',
    '["List", "Set", "Map", "sObject"]'::jsonb,
    0,
    'Apex','easy'
  ),
  (
    'What is the max number of records that a single SOQL query can return?',
    '50,000 records per transaction. Use Batch Apex for larger data volumes.',
    '["10,000", "50,000", "100,000", "250,000"]'::jsonb,
    1,
    'SOQL','easy'
  ),
  (
    'Which trigger context variable holds the list of IDs of records that were deleted?',
    'Trigger.old contains the old version of sObjects; Trigger.oldMap maps Id to old records. For delete triggers, use Trigger.old and Trigger.oldMap (there is no Trigger.new).',
    '["Trigger.new", "Trigger.old", "Trigger.newMap", "Trigger.size"]'::jsonb,
    1,
    'Triggers','medium'
  );

