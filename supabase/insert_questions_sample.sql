with mcq_rows as (
select *
from (
values
(
'A developer has set up an Entitlement Process. However, the "First Response" milestone timer is calculating 24/7, ignoring the company''s 9-to-5 Business Hours. The Entitlement record has the correct Business Hours lookup set. What is the most likely cause?',
'The Entitlement Process itself does not automatically inherit the Business Hours from the Entitlement record unless strictly configured. In the Entitlement Process steps, the "Business Hours" setting is likely set to "No Business Hours" or the Case record itself has a specific Business Hours field that overrides the Entitlement logic depending on the configuration hierarchy.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The Business Hours record is inactive.", "The Entitlement Process step is not configured to use the Business Hours from the Case/Entitlement.", "Milestones always run 24/7 by default and cannot be changed.", "The Apex trigger calculating the time is failing."]'::jsonb,
1
),
(
'You are designing a high-volume Email-to-Case implementation. During testing, an infinite loop occurs: Salesforce sends an auto-response, the customer''s email server sends an "Out of Office" reply, creating a new case, which triggers another Salesforce auto-response. How do you prevent this?',
'You should configure the "System Address" filters in the Email-to-Case settings to exclude specific subject lines or sender addresses (like `mailer-daemon` or `noreply`). Additionally, it is best practice to modify the Auto-Response Rule criteria to exclude inbound emails where the subject line contains standard automated tags like "Out of Office" or "Auto-reply".',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Disable Auto-Response Rules entirely.", "Configure Email-to-Case settings to block emails with specific subject lines or use logic to suppress auto-responses for OOO emails.", "Write an Apex Trigger to delete cases created by OOO emails.", "Increase the API limits to handle the loop."]'::jsonb,
1
),
(
'A support team needs to prioritize "VIP" cases in the Omni-Channel queue. These cases must jump to the front of the line, ahead of older standard cases. How do you implement this without creating a separate queue?',
'You should use "Secondary Routing Priority" in the Omni-Channel Routing Configuration. You can map a field (like "Is_VIP__c") to the priority logic. If the field is checked, the system calculates a higher priority score, pushing the work item up in the queue relative to other items in the same queue that have been waiting longer.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["This requires a separate ''VIP Queue''; you cannot prioritize within a single queue.", "Use Secondary Routing Priority in the Routing Configuration to boost priority based on case fields.", "Manually instruct agents to pick VIP cases from the list.", "Use an Escalation Rule to change the Case Owner."]'::jsonb,
1
),
(
'A user with the "Standard User" profile cannot see the "Knowledge" component on the Case Lightning Page, even though the component is added in the Lightning App Builder and the user has Read access to Knowledge articles. What is missing?',
'The user likely lacks the "Knowledge User" feature license. In Setup > Users, the "Knowledge User" checkbox must be ticked for that specific user. Without this feature license, they cannot interact with Knowledge functionality in the UI, regardless of profile permissions.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The component is filtered by device form factor.", "The user profile is missing the ''View Setup'' permission.", "The user record must have the ''Knowledge User'' checkbox enabled.", "Knowledge is only available for System Administrators."]'::jsonb,
2
),
(
'You are migrating 5 million historical Cases into Salesforce. You need to ensure that the "Created Date" reflects the original legacy date, not the day of import. However, the import fails with "Field is not writeable". What is the fix?',
'To write to audit fields like `CreatedDate`, you must enable the "Set Audit Fields upon Record Creation" permission in the User Interface settings. Then, you must assign a Permission Set containing the "Set Audit Fields upon Record Creation" system permission to the user performing the data load.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["It is impossible to modify Created Date; use a custom field instead.", "Enable ''Set Audit Fields upon Record Creation'' in Setup and assign the permission to the migration user.", "Turn off all Validation Rules.", "Use the Bulk API instead of the SOAP API."]'::jsonb,
1
),
(
'An Einstein Bot is configured to transfer a customer to an agent if it cannot answer a question. However, during off-hours when no agents are online, the chat simply ends abruptly or gets stuck. How should you handle this?',
'You must configure a "Rule" or "Condition" in the Bot Builder to check the "Queue Availability" (Estimated Wait Time or Agent Availability) *before* attempting the transfer. If no agents are available, the Bot should redirect to a dialog that apologizes and offers to log a Case or take a message instead.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The Bot automatically knows when agents are offline and creates a case.", "Configure the Bot to check Agent/Queue availability before transfer; if offline, redirect to a ''Leave a Message'' dialog.", "Hardcode the business hours into the Bot script.", "This is a known limitation of Einstein Bots."]'::jsonb,
1
),
(
'A developer writes a `before insert` trigger on Case to automatically fetch data from an external REST API (callout) to populate fields. The trigger fails with "Callout from triggers are not supported". How do you solve this while keeping the automation?',
'Triggers cannot make synchronous callouts because they hold a database transaction open. The solution is to move the callout logic to an asynchronous method, such as a `@future(callout=true)` method or a `Queueable` class. The trigger fires, passes the Case ID to the async method, which performs the callout and then updates the Case in a separate transaction.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Change the trigger to `after insert`.", "Use a `@future` method or `Queueable` Apex to perform the callout asynchronously.", "Use Flow instead of Apex; Flows support synchronous callouts in triggers.", "Enable ''Allow Callouts'' in the Apex Class settings."]'::jsonb,
1
),
(
'Agents need to send WhatsApp messages to customers. After 24 hours of inactivity from the customer, the agent tries to send a free-text message but receives an error. Why?',
'This is a restriction of the WhatsApp Business API policy enforced by Salesforce Messaging. If more than 24 hours have passed since the customer''s last message, the business cannot send free-text "Session Messages". They must send a pre-approved "Template Message" (Notification) to re-initiate the conversation.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The agent''s permission set for Messaging is expired.", "The WhatsApp integration token needs to be refreshed.", "Outside the 24-hour window, businesses must use approved Template Messages, not free-text.", "The customer has blocked the business."]'::jsonb,
2
),
(
'You want to prevent agents from declining work items in Omni-Channel. If they do decline, you want to force them to select a reason for reporting purposes. How is this configured?',
'In the "Presence Configuration" assigned to the agents, checking the "Decline Reasons" option allows you to define specific reasons. However, strictly "preventing" a decline is handled by disabling the "Decline" button entirely in the Presence Configuration (Allow Decline = False). If you want to allow decline but track it, you enable the reasons.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["This is configured in the Routing Configuration.", "In Presence Configuration, you can enable ''Decline Reasons'' or disable the ability to decline entirely.", "You must write a validation rule on the Agent Work object.", "Omni-Channel does not support decline reasons."]'::jsonb,
1
),
(
'A specific "Tier 2" Support Team needs to collaborate on Cases. They require Read/Write access to each other''s cases, but the Organization Wide Default for Case is "Private". The team members change frequently. What is the most maintainable sharing strategy?',
'The best strategy is to create a "Public Group" for Tier 2 Support. Then, create a "Case Sharing Rule" based on ownership: "If Owner is member of Group Tier 2, share with Group Tier 2 as Read/Write". This way, when staff changes, you only add/remove users from the Public Group without modifying the Sharing Rule.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use Manual Sharing for every case.", "Create a Case Sharing Rule sharing records owned by a Public Group with that same Public Group.", "Change OWD to Public Read/Write.", "Use Account Teams to grant access."]'::jsonb,
1
),
(
'An agent complains that they cannot see the "milestone countdown timer" on the Case page. You verify the Entitlement Process is active and the Case has an Entitlement. What UI component is missing?',
'The milestone timer is not a standard field; it is a specific component called the "Milestone Tracker" (or "Milestones"). It must be dragged onto the Lightning Record Page in the Lightning App Builder. If it is not on the layout, the backend logic runs, but the agent has no visibility.',
'Service Cloud',
'easy'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["The agent needs the ''Manage Entitlements'' permission.", "The ''Milestone Tracker'' component is missing from the Lightning Record Page.", "The case Status is Closed.", "The browser is blocking the timer script."]'::jsonb,
1
),
(
'You are implementing "Knowledge Data Categories" to secure internal HR articles. HR users should see them, but Support Agents should not. You set the HR articles to the "HR" Data Category. However, Support Agents can still see them via Global Search. Why?',
'Setting the category on the article is step one. Step two is restricting visibility. By default, visibility might be "All Categories" via the Profile or Role hierarchy. You must go to the "Data Category Visibility" settings for the Support Agent''s Profile (or Role) and strictly exclude the "HR" category (set visibility to "None" or only "Support" categories).',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Data Categories do not control visibility, only organization.", "The Support Agents have ''View All Data'' permission.", "You failed to restrict Data Category Visibility on the Support Agent Profile/Role.", "Global Search ignores Data Category security."]'::jsonb,
2
),
(
'A flow creates a Case and immediately tries to post a Chatter message to it. The Flow fails with an error indicating the "Entity is not available". What is the cause?',
'This often happens in a "Before-Save" Flow or if the transaction hasn''t committed the Case ID yet when the Chatter post tries to reference it. However, typically this is an Order of Execution issue. A clearer scenario is: The Case is not yet fully committed to the database when the separate process (like a legacy Apex trigger or mixed DML context) tries to access it. In Flows, ensuring the Case is created (Action: Create Records) and using the output ID in a subsequent "After-Save" context or separate transaction is key.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Chatter is disabled in the org.", "The User does not have access to the FeedItem object.", "The Case ID is not yet generated/committed when the Feed Item attempts to link to it (Timing/Transaction issue).", "Flows cannot post to Chatter."]'::jsonb,
2
),
(
'You need to calculate the "Total Time Spent" on a Case based on the time agents accept the work in Omni-Channel vs. when they close the tab. Standard reporting is insufficient. How do you track this?',
'You should utilize the "Agent Work" object. Omni-Channel creates an Agent Work record when work is routed. You can report on the "Handle Time" field (Active Time) standard on Agent Work, or build a custom report type on "Agent Work" to analyze the duration between the "Status" changes (Assigned -> Closed/Completed).',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Create a custom timer LWC.", "Report on the ''Agent Work'' object, specifically the Handle Time/Active Time fields.", "Use Field History Tracking on the Status field.", "Parse the Login History logs."]'::jsonb,
1
),
(
'A global company requires cases to be routed to agents based on the "Account Country". If the Account Country is "Germany", route to the "German Queue". If "France", route to "French Queue". If the Account Country is blank, route to "Global Queue". How do you handle the "Blank" criteria in a Case Assignment Rule?',
'In Case Assignment Rules, the criteria usually look for a specific value. To handle a blank/null value, you should use the criteria logic option "Formula evaluates to true" and use the formula `ISBLANK(Account.BillingCountry)`. This allows you to catch records where the field is missing.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Leave the criteria value empty.", "Use the formula `ISBLANK(Account.BillingCountry)` in the Assignment Rule entry.", "Create a separate workflow to populate a default value first.", "Assignment Rules cannot handle blank values."]'::jsonb,
1
),
(
'You are setting up "Partner Community" users. They need to see Cases they opened, but also Cases opened by other users belonging to the same Partner Account. The "Case" OWD is Private. How do you achieve this without Apex?',
'You should use "Sharing Sets". Sharing Sets are a feature specifically for Experience Cloud (Community) licenses (like Customer Community or Partner Community). You configure a Sharing Set to grant access to Case records where `User.Contact.Account` matches `Case.Account`. This grants "Account-level" visibility to the community users.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Use Apex Managed Sharing.", "Use Sharing Sets to match User.Contact.Account to Case.Account.", "Change OWD to Public Read Only.", "Grant ''View All'' permission to the Partner profile."]'::jsonb,
1
),
(
'A developer attempts to create a "Roll-Up Summary" field on the Account object to count the number of "Open Cases". Salesforce does not allow this. Why, and what is the workaround?',
'Account and Case have a "Lookup" relationship, not a "Master-Detail" relationship, so standard Roll-Up Summary fields are not available. The workaround is to use a "Record-Triggered Flow" (or Apex Trigger) on the Case object that increments/decrements a custom number field on the Account whenever a Case is created or the status changes, or use a tool like DLRS (Declarative Lookup Rollup Summaries).',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["You must convert the relationship to Master-Detail first.", "Case and Account are not related.", "It is a Lookup relationship; use Flow or Apex (or DLRS) to simulate the roll-up.", "You need to enable ''Roll-up Summaries'' in Service Setup."]'::jsonb,
2
),
(
'A Service Manager wants to know if an Agent is spending too much time on a specific step of a Flow script (Screen Flow). How can the developer help report on this?',
'The developer can inspect the "Screen Flow" execution data. However, for easier reporting, the developer should add "Assignment" elements between screens to capture `Flow.CurrentDateTime` into variables (e.g., `Step1_Start_Time`). Upon Flow completion, save these calculated durations into custom fields on the resulting record or a custom "Flow Log" object.',
'Service Cloud',
'medium'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Enable ''Debug Mode'' for the manager.", "Capture timestamps in Flow variables between screens and save the duration to a record.", "Use Google Analytics integration only.", "This requires Salesforce Shield Event Monitoring."]'::jsonb,
1
),
(
'An automation rule updates the Case "Priority" to "High". You have a separate "After Update" Apex trigger that sends an email to the VIP team if Priority is High. However, the email is being sent twice. What is the likely architectural flaw?',
'This is likely due to "Recursion" or "Workflow re-evaluation". If the initial update triggers a Workflow Rule or Process Builder that performs *another* field update on the Case, the transaction runs the "After Update" trigger again. The developer should add a static boolean variable (recursion handler) in the Apex class to ensure the email logic only runs once per transaction.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Salesforce always sends two emails for High priority.", "The trigger does not have a recursion check, and a workflow/process is causing the trigger to fire a second time in the same transaction.", "The email server is duplicating the message.", "The trigger is active on both Insert and Update."]'::jsonb,
1
),
(
'You need to deploy a new "Entitlement Process" and its "Milestones" from a Sandbox to Production. The deployment fails in the target org. What is a common "gotcha" with Entitlement deployments?',
'Entitlement Processes are versioned. You cannot deploy a new version if an active version exists with the same name without careful handling, but the most common "gotcha" is that **Milestones** (the metadata definition) must exist in the target org *before* the Entitlement Process (which references them) can be deployed. Often, developers try to deploy both simultaneously, or the Milestone is missing from the package.',
'Service Cloud',
'hard'::public.difficulty_level,
'Service Cloud'::public.question_category,
'Scenarios'::public.question_type,
'["Entitlement Processes cannot be deployed; they must be created manually.", "The Milestones referenced in the Process must exist in the target org; missing dependencies often cause failure.", "You must deactivate the Production org before deployment.", "Entitlements require a special Data Loader export."]'::jsonb,
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