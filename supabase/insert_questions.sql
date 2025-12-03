with mcq_rows as (
select *
from (
values
(
'An organization uses Header-Based Threading for Email-to-Case. A client replies to an email chain from 3 years ago (before the update). A new Case is created instead of logging the reply to the existing Case. Why is this happening and how should it be addressed?',
'This occurs because the old email lacks the modern Message-ID headers required for Header-Based Threading. The system falls back to creating a new case because it cannot find a match. To address this, you should ensure that the "Ref ID" threading (body-based) is not entirely disabled if backward compatibility is critical, or train agents to manually merge these rare legacy occurrences.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The old case is closed, so Salesforce automatically blocks updates to it.", "The old email lacks the Message-ID headers required for Header-Based Threading, causing a new case creation.", "Email-to-Case settings automatically archive emails older than 2 years.", "The client changed their email address, breaking the link."]'::jsonb,
1
),
(
'A global support team uses "Public Read/Write" on Cases. However, a "General Support" user owns 300,000 closed cases. When triggers run on related records, developers see "UNABLE_TO_LOCK_ROW" errors. What is the root cause?',
'This is a classic case of "Ownership Skew." When a single user owns more than 10,000 records of an object, Salesforce must perform complex sharing recalculations whenever those records (or their children) are modified. Since the user owns so many records, the system locks the user record for extended periods during updates, causing other transactions to fail.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The Data Storage limit for the org has been exceeded.", "There is a recursive trigger on the Case object.", "This is Ownership Skew; the heavy volume of records owned by one user causes sharing calculation locks.", "The user profile is corrupted and needs to be reset."]'::jsonb,
2
),
(
'You are implementing Omni-Channel. The business requires that agents can handle up to 4 Chats or 1 complicated Case at a time. A Case is considered "complicated" based on a dynamic "Complexity_Score__c" field calculated by Apex. How do you achieve this routing logic?',
'You should use Omni-Channel Flow (or a Before-Save Flow/Apex) to assign a specific "Capacity Weight" to the work item based on the "Complexity_Score__c". You would set the Agent''s total capacity to a fixed number (e.g., 20). A Chat consumes 5 units, and a Case consumes a variable amount (e.g., 20 for complex, 5 for simple) determined by the flow before routing.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Create separate queues for Chats and Cases and rely on agent manual selection.", "Use Omni-Channel Flow to dynamically set the Capacity Weight of the work item based on the score.", "Write a Validation Rule to prevent agents from accepting cases if they have chats open.", "This is not possible; capacity is fixed per object type in Salesforce."]'::jsonb,
1
),
(
'A support manager wants to pause the "First Response" SLA timer automatically when a Case Status is changed to "Waiting on Customer", and resume it when the customer replies. How is this configured?',
'You must enable "Entitlement Management" settings. Specifically, ensure the "Stopped" checkbox is mapped to the "Waiting on Customer" Status in the Support Settings. Then, in the Entitlement Process, check the "Business Hours" logic to ensure it respects the "IsStopped" boolean flag on the Case, which effectively pauses the milestone countdown.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use a Workflow Rule to clear the Entitlement Start Date field.", "Map the ''Stopped'' checkbox to the status in Support Settings and configure the Entitlement Process to respect it.", "Create a scheduled Apex job to recalculate the target date every hour.", "Agents must manually uncheck the ''Active'' box on the Entitlement record."]'::jsonb,
1
),
(
'You have a custom "Junior Agent" profile. These users can view the Knowledge tab but cannot see any articles, despite the "Read" permission being enabled on the Knowledge object. What is the most likely configuration issue?',
'The issue is likely "Data Category Visibility." In Salesforce Knowledge, object-level permissions are not enough; users must also have visibility assigned to the specific Data Categories (like "FAQ" or "Technical Fix") that categorize the articles. If the visibility is set to "None" or a different branch for their Role/Profile, they will see an empty list.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The articles are in Draft status and Junior Agents cannot see drafts.", "The Junior Agent profile lacks Data Category Visibility settings for the relevant categories.", "The Knowledge component is not added to their Lightning Page.", "Sharing Rules on Knowledge are set to Private."]'::jsonb,
1
),
(
'A developer attempts to merge two Case records using Apex (`merge case1 case2`). The merge fails with an error related to a custom `After Delete` trigger on the Case object. What logic must be handled in the trigger?',
'When a merge occurs, the non-master record is deleted. The trigger fires as a `delete` event. However, for merged records, the `MasterRecordId` field is populated. The trigger logic likely attempts to perform an operation that is invalid for a merged-away record (like re-parenting a unique child that has already been moved). The developer must check if `MasterRecordId` is not null to distinguish a merge from a standard delete.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The trigger must implement the `System.isMerge()` method.", "The trigger must check if `MasterRecordId` is populated to identify and handle merged records differently.", "Triggers are not allowed on the Case object during a merge.", "The developer must disable triggers before performing a merge."]'::jsonb,
1
),
(
'An automated process updates a User record (deactivating them) and immediately updates all their open Cases to "Closed" in the same transaction. The process fails with a "Mixed DML" error. How do you fix this?',
'A Mixed DML error occurs when Setup objects (User) and non-Setup objects (Case) are updated in the same transaction. To fix this, you must separate the context. The standard approach is to perform the User update, then call a `@future` method or `Queueable` Apex class to handle the Case updates asynchronously (or vice versa), ensuring they run in separate transaction contexts.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use a `try-catch` block to suppress the error.", "Perform the User update in a `@future` method or separate asynchronous context.", "Change the User Organization Wide Defaults to Public Read/Write.", "Grant the executing user the ''Modify All Data'' permission."]'::jsonb,
1
),
(
'Agents using the Service Console complain that the browser freezes when opening a Case record. The page layout contains 15 Related Lists and 8 custom Lightning Web Components. What is the most effective performance optimization?',
'The most effective optimization is to use the "Lightning Console" features like Accordions or Tabs to "lazy load" the content. By moving heavy related lists and non-critical LWC components into secondary tabs or accordion sections that are not expanded by default, the browser only renders the initial visible components, significantly reducing the "Page Load Time" (PLT).',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Switch back to Salesforce Classic.", "Use Accordions or Tabs to lazy-load related lists and components so they don''t render immediately.", "Instruct agents to clear their browser cache daily.", "Remove all Validation Rules from the Case object."]'::jsonb,
1
),
(
'A customer contacts support via SMS (Service Cloud Messaging) and later via WhatsApp. The system creates two separate "Messaging User" records. How can you ensure the agent sees these as the same person?',
'You should use "Channel-Object Linking" (or manually configure a flow) to link both `MessagingUser` records to the same existing `Contact` record. By linking them to a common Contact, the "Contact" related list or "Customer 360" view in the Console will show the history from both conversation channels in one place.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Merge the two Messaging User records.", "Link both Messaging User records to the same parent Contact record using Channel-Object Linking.", "It is not possible to link different channels to one person.", "Create a custom Lookup field on the Case object."]'::jsonb,
1
),
(
'You need to integrate an external Order Management System (OMS) into the Service Console. Agents need to see real-time "Order Status" and "Shipping History" without storing this massive dataset in Salesforce. What is the recommended architectural approach?',
'The recommended approach is "Salesforce Connect" using an OData adapter. This allows you to define "External Objects" in Salesforce that map to the OMS database tables. These External Objects act like native Salesforce records (tabs, related lists, reports) but the data remains in the OMS and is fetched on-demand (real-time) when the agent views the page.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use Batch Apex to import the data every night.", "Use Salesforce Connect (External Objects) via OData to view data in real-time without storage.", "Build a custom Canvas App to iframe the OMS website.", "Create a custom LWC that makes a REST callout every time a record is clicked."]'::jsonb,
1
),
(
'A Case is created on Friday at 4:50 PM. The Entitlement "First Response" milestone is set to 20 minutes. Business Hours are Mon-Fri, 9:00 AM to 5:00 PM. When does the Milestone actually violate?',
'The milestone calculates 10 minutes of consumption on Friday (4:50 PM to 5:00 PM). It then pauses for the weekend. It resumes Monday at 9:00 AM. It has 10 minutes remaining. Therefore, the violation occurs at Monday 9:10 AM.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Friday at 5:10 PM.", "Monday at 9:10 AM.", "Monday at 9:20 AM.", "Saturday at 4:50 PM."]'::jsonb,
1
),
(
'You are configuring an Einstein Bot. You want the Bot to look up an Order status. The user might type "Bill Smith" or "William Smith". A standard SOQL query inside a Flow often fails to find a match. How should the Bot search for the contact?',
'Instead of a strict SOQL query (`WHERE Name = ...`), the Bot should utilize a Flow that calls an Apex Action performing a `SOSL` (Salesforce Object Search Language) search or a fuzzy match logic. SOSL is designed for searching text across fields and is more forgiving with partial matches compared to a rigid SOQL equality check.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use strict SOQL queries only for security.", "Use SOSL (Search) instead of SOQL to handle fuzzy matching and name variations.", "Hardcode all possible name variations in the Bot variables.", "Ask the user to type their specific Salesforce ID."]'::jsonb,
1
),
(
'Agents are using the "Macro" utility to close cases. A specific Macro works for 90% of cases but fails silently for cases with the "RMA" Record Type. What is the most likely reason?',
'Macros execute actions on the UI. If the "RMA" Record Type has a specific Page Layout with a Validation Rule that triggers upon closing, or if a field required by the Macro is missing from that specific Page Layout, the Macro will fail. Macros cannot bypass Validation Rules or field visibility restrictions.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Macros do not work on custom Record Types.", "The Macro encounters a Validation Rule or missing field on the RMA page layout, causing it to fail.", "The agents do not have the ''Run Macros'' permission.", "RMA cases are read-only by default."]'::jsonb,
1
),
(
'You need to route Chat requests to agents who speak "French" and are "Level 2" support. These attributes are stored on the User record. How do you implement this in Omni-Channel?',
'Use "Skills-Based Routing." Create Skills for "Language: French" and "Level: 2". Assign these skills to the relevant Service Resources (Agents). Then, configure a Skill-Based Routing Rule (or Omni-Channel Flow) to map the incoming Chat parameters (e.g., pre-chat form language selection) to these specific Skill requirements.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Create a Queue named ''French Level 2'' and add users manually.", "Use Skills-Based Routing to map work item requirements to agent skills.", "Use a Round Robin assignment rule.", "This requires a third-party CTI integration."]'::jsonb,
1
),
(
'A developer needs to create a printable "Service Report" PDF that summarizes a Case, its related Work Orders, and Parts Consumed. Why would they choose Visualforce over Lightning Web Components (LWC) for this specific task?',
'Despite LWC being the modern standard, it lacks a native engine to render HTML as a PDF file server-side. Visualforce has a specific attribute `renderAs="pdf"` which utilizes a server-side engine to convert the markup into a downloadable PDF. This remains the primary use case where Visualforce is preferred over LWC.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Visualforce is faster to develop than LWC.", "LWC cannot access child records like Work Orders.", "Visualforce has the `renderAs=''pdf''` capability which LWC lacks natively.", "Service Cloud does not support LWC."]'::jsonb,
2
),
(
'You want to implement a "Follow-the-Sun" support model where Cases are reassigned to the "London Queue" at 5 PM EST and the "Sydney Queue" at 5 PM GMT. How would you automate this?',
'You should use a Scheduled Flow (or Scheduled Apex) that runs hourly. The logic would query for Open Cases in the specific queues where the local time has passed 5 PM and update the `OwnerId` to the next regional queue. Standard Escalation Rules are usually time-based relative to the Case creation, not specific time-of-day clock times, so a scheduled job is more precise for this global handover.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use Case Escalation Rules.", "Use a Scheduled Flow to query and reassign cases based on the current time and queue region.", "Use Validation Rules to prevent saving cases after 5 PM.", "Relies solely on agents manually changing ownership."]'::jsonb,
1
),
(
'A "Case Team" needs to be automatically added to a Case whenever the Priority is set to "Critical". The team includes the Account Owner and the Support Manager. How do you automate this?',
'Use a Record-Triggered Flow on the Case object. When the Priority changes to "Critical", the Flow should use a "Get Records" element to find the predefined `CaseTeamTemplate` (if using templates) or specific Users, and then use a "Create Records" element to insert `CaseTeamMember` records linking those users to the Case.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use a Case Assignment Rule.", "Use a Record-Triggered Flow to insert `CaseTeamMember` records.", "This requires an Apex Trigger; Flows cannot create Team Members.", "Use a Formula field."]'::jsonb,
1
),
(
'A Supervisor in Omni-Channel reports that they cannot see the "Active Work" tab for a specific group of agents. They can only see the agents'' names but no details on what they are working on. What is missing?',
'The Supervisor Configuration is likely restricting visibility. In "Omni-Channel Supervisor Settings" (Supervisor Configurations), you must define which "Queues" or "Groups" of agents the supervisor can monitor. If the agents belong to a Queue not added to the Supervisor''s configuration, their work items will be hidden.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The Supervisor needs the ''Modify All Data'' permission.", "The Supervisor Configuration is filtering out the specific queues/agents.", "The agents are in ''Offline'' status.", "The Supervisor must be in the same Role as the agents."]'::jsonb,
1
),
(
'You are building a custom CTI integration using Open CTI. When a call arrives, you want to pop a specific Visualforce page if the phone number is hidden/private, but pop the Contact record if the number is visible. Which Open CTI method do you use?',
'You would use the `screenPop()` method (or `searchAndScreenPop` in classic CTI, though modern is `screenPop`). In your CTI Adapter logic (JavaScript), you evaluate the incoming call payload. If the number is "Private", you pass the URL of the Visualforce page to the `screenPop` function. If it is a number, you pass the record ID or search query.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["saveLog()", "screenPop()", "enableClickToDial()", "runApex()"]'::jsonb,
1
),
(
'A business uses "Parent-Child" cases. When a Parent Case is closed, they want all open Child Cases to be closed automatically with the same solution comments. How is this best achieved?',
'This can be achieved using a Record-Triggered Flow on the Case object (After Save). When a Case is closed (`Status` = Closed), the Flow should query for all Child Cases (`ParentId` = Current Case ID) that are not closed. It then loops through them, assigning the Parent''s `Solution_Comments__c` and setting the Status to Closed, then performs a bulk update.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["This is built-in standard functionality of Service Cloud.", "Use a Record-Triggered Flow to query and update child cases upon parent closure.", "Use a Roll-Up Summary field.", "It requires a Batch Apex job running nightly."]'::jsonb,
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