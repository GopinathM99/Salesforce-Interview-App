with mcq_rows as (
select *
from (
values
(
'A law firm''s intake team is overwhelmed with manually creating records from website inquiries, causing delays. How would you automate this process using Litify?',
'To automate this, you would integrate the firm''s website contact form with Litify Intakes. This integration automatically creates a new intake record in Litify whenever a potential client submits an inquiry online. Additionally, you can configure workflow rules or a Flow to automatically assign the new intake to a specific team member based on case type or availability, ensuring prompt follow-up and eliminating manual data entry.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'Knowledge'::public.question_type,
'["Use a web-to-lead form that creates Salesforce Lead records.", "Integrate the website with Litify Intakes to automatically create an intake record and use workflows for assignment.", "Manually create a new Matter record for every website inquiry.", "Export website inquiries to a CSV and use Data Loader to import them weekly."]'::jsonb,
1
),
(
'A personal injury firm wants to enforce a standardized set of procedures for every car accident case to ensure consistency. How would you configure Litify to manage this?',
'The best way to enforce a standardized workflow is to use Litify''s Matter Plans. You would create a Matter Plan template specifically for car accident cases, outlining all necessary stages and tasks from initial client meeting to settlement. By applying this Matter Plan to every new car accident matter, the firm ensures that all team members follow the same established procedures, promoting consistency and reducing the risk of missed steps.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'Knowledge'::public.question_type,
'["Create and apply a standardized Matter Plan template for car accident cases.", "Build a validation rule on the Matter object that requires all fields to be filled.", "Use Salesforce a Chatter group to post daily reminders of the procedures.", "Create a custom report that tracks the time spent on each stage of the case."]'::jsonb,
0
),
(
'A client calls asking for a case status update, and their assigned attorney is busy. How does Litify enable another staff member to provide an accurate update?',
'Litify''s Matter record provides a 360-degree view of the case. A staff member can first look at the "Stage" field for a high-level status. For more detail, they can review the "Matter Plan" to see recently completed and upcoming tasks, and check the "Activity" timeline or Chatter feed for the latest emails and call logs. This allows any permissioned user to provide a confident and informed update to the client in seconds.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'Knowledge'::public.question_type,
'["The staff member should tell the client that only their assigned attorney can provide an update.", "The staff member can check the case \"Stage\" and \"Activity\" timeline on the Matter record to provide a comprehensive update.", "The staff member has to find and read through the entire physical case file.", "The staff member should send an urgent email to the busy attorney and wait for a response."]'::jsonb,
1
)
) as t(question_text, explanation, topic, difficulty, category, question_type, choices, correct_choice_index)
),
inserted_questions as (
insert into public.questions (question_text, answer_text, topic, difficulty, category, question_type)
select question_text, explanation, topic, difficulty, category, question_type
from mcq_rows
returning id, question_text, answer_text
)
insert into public.multiple_choice_questions (question_id, choices, correct_choice_index, explanation)
select iq.id, mr.choices, mr.correct_choice_index, mr.explanation
from inserted_questions iq
join mcq_rows mr on mr.question_text = iq.question_text;