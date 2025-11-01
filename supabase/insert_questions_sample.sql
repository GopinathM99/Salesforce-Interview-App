with mcq_rows as (
select *
from (
values
(
'What is Litify''s relationship with Salesforce?',
'Litify is a legal practice management software built on the Salesforce platform, leveraging its CRM capabilities for the legal industry.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Litify is a competitor to Salesforce.", "Litify is a legal practice management software built on the Salesforce platform.", "Litify is a software that integrates with Salesforce via a third-party connector.", "Salesforce acquired Litify to enter the legal market."]'::jsonb,
1
),
(
'What is the primary purpose of an "Intake" record in Litify?',
'An Intake in Litify represents the initial stage of a potential new case, used to gather preliminary information and evaluate its viability before it becomes an active case (Matter).',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["To manage billing and invoices for a client.", "To store documents for an ongoing case.", "To capture preliminary information about a potential client and their legal matter.", "To track time spent on a closed case."]'::jsonb,
2
),
(
'In Litify, what does a "Matter" record represent?',
'A "Matter" in Litify represents an active legal case. It serves as the central hub for all case-related information after an Intake has been qualified and accepted by the firm.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["An initial inquiry from a potential client.", "A potential conflict of interest.", "A general contact or business account.", "An active, accepted legal case."]'::jsonb,
3
),
(
'What is a key benefit of using a platform like Litify for a law firm?',
'Litify centralizes and automates legal practice management processes, leading to increased efficiency, better organization, and improved client service by providing a single source of truth for case and client information.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["It guarantees an increase in the number of cases won.", "It centralizes case information and automates workflows, increasing efficiency.", "It replaces the need for lawyers to do legal research.", "It is only useful for managing client contact information."]'::jsonb,
1
),
(
'In Litify, which of the following is an example of a standard Salesforce object and a custom object?',
'Standard objects are included with Salesforce by default (e.g., Account, Contact). Custom objects are created to meet specific business needs. In Litify, "Account" is a standard object, while "Matter" is a custom object designed specifically for legal case management.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Standard: Matter, Custom: Account", "Standard: Report, Custom: Dashboard", "Standard: Account, Custom: Matter", "Both Matter and Account are custom objects."]'::jsonb,
2
),
(
'In Salesforce, what is the primary difference between a Profile and a Role?',
'A Profile determines what a user can *do* (object/field access, permissions), while a Role determines what data a user can *see* based on their position in the hierarchy.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["A Profile controls record visibility, while a Role controls object permissions.", "A Profile controls what a user can do, while a Role controls what data they can see.", "Roles and Profiles are interchangeable terms for the same function.", "A user can have multiple Roles but only one Profile."]'::jsonb,
1
),
(
'Which statement best describes "Cloud Computing"?',
'Cloud computing is the delivery of on-demand computing services—like servers, storage, and software—over the Internet, allowing companies to access technology without owning the underlying infrastructure.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Storing all company files on a local server network.", "The delivery of on-demand computing services over the Internet.", "A type of software that only works when disconnected from the internet.", "The physical hardware located in an office building."]'::jsonb,
1
),
(
'Why are reports and dashboards important for a law firm using Litify?',
'Reports and dashboards provide a visual representation of key firm data (e.g., caseloads, intake volume, financial performance), which helps leadership track metrics and make informed business decisions.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["They are primarily used for sending marketing emails to potential clients.", "They allow for visual tracking of key metrics to make data-driven decisions.", "They are the main tools for writing legal briefs and documents.", "They are only used by the IT department to monitor system health."]'::jsonb,
1
),
(
'What is a primary goal of legal technology platforms like Litify?',
'The primary goal is to modernize the practice of law by increasing efficiency, automating administrative tasks, and providing better data insights, allowing legal professionals to focus on higher-value work.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["To increase the complexity of legal work.", "To automate administrative tasks and improve firm efficiency.", "To eliminate the need for paralegals and legal assistants.", "To offer legal advice directly to clients via AI."]'::jsonb,
1
),
(
'What is a recommended first step when a user reports an issue in Litify?',
'The first step is often to try and replicate the user''s issue. If possible, logging in as the user (with their permission) can help to see the problem exactly as they do and diagnose if it is a permission or configuration issue.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Immediately restart the entire Salesforce server.", "Tell the user to try again later.", "Try to replicate the issue, potentially by logging in as the user.", "Delete the user''s account and create a new one."]'::jsonb,
2
)
) as t(question_text, explanation, topic, difficulty, category, choices, correct_choice_index)
),
inserted_questions as (
insert into public.questions (question_text, answer_text, topic, difficulty, category)
select question_text, explanation, topic, difficulty, category
from mcq_rows
returning id, question_text, answer_text
)
insert into public.multiple_choice_questions (question_id, choices, correct_choice_index, explanation)
select iq.id, mr.choices, mr.correct_choice_index, mr.explanation
from inserted_questions iq
join mcq_rows mr on mr.question_text = iq.question_text;