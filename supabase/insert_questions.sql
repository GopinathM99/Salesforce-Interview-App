with mcq_rows as (
select *
from (
values
-- Easy Questions (1-10)
(
'A law firm''s intake team is overwhelmed with manually creating records from website inquiries, causing delays. How would you automate this process using Litify?',
'To automate this, you would integrate the firm''s website contact form with Litify Intakes. This integration automatically creates a new intake record in Litify whenever a potential client submits an inquiry online. Additionally, you can configure workflow rules or a Flow to automatically assign the new intake to a specific team member based on case type or availability, ensuring prompt follow-up and eliminating manual data entry.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Use a web-to-lead form that creates Salesforce Lead records.", "Integrate the website with Litify Intakes to automatically create an intake record and use workflows for assignment.", "Manually create a new Matter record for every website inquiry.", "Export website inquiries to a CSV and use Data Loader to import them weekly."]'::jsonb,
1
),
(
'A personal injury firm wants to enforce a standardized set of procedures for every car accident case to ensure consistency. How would you configure Litify to manage this?',
'The best way to enforce a standardized workflow is to use Litify''s Matter Plans. You would create a Matter Plan template specifically for car accident cases, outlining all necessary stages and tasks from initial client meeting to settlement. By applying this Matter Plan to every new car accident matter, the firm ensures that all team members follow the same established procedures, promoting consistency and reducing the risk of missed steps.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Create and apply a standardized Matter Plan template for car accident cases.", "Build a validation rule on the Matter object that requires all fields to be filled.", "Use Salesforce a Chatter group to post daily reminders of the procedures.", "Create a custom report that tracks the time spent on each stage of the case."]'::jsonb,
0
),
(
'A firm needs to streamline the creation of engagement letters for new clients, as the current manual process is slow and error-prone. How would you use Litify to solve this?',
'You should implement a document generation solution within Litify. By creating a standardized engagement letter template with merge fields for client and matter information (like name, address, case type), paralegals can generate a personalized letter with a single click. The generated document can then be automatically saved to the relevant matter record, saving time and improving accuracy by pulling data directly from Litify.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Use email templates to send a generic welcome message to new clients.", "Manually copy and paste client information into a Word document saved on a shared drive.", "Implement a document generation solution using a template with merge fields to create letters automatically.", "Require all clients to physically come to the office to sign a pre-printed letter."]'::jsonb,
2
),
(
'A firm wants to restrict access to sensitive financial settlement details on a Matter, allowing only the handling attorney and accounting staff to see it. How would you configure this?',
'To address this, you would use Salesforce''s field-level security. By creating or modifying user profiles (e.g., "Attorney," "Paralegal," "Accounting"), you can make the "Settlement Amount" field visible and editable only for the Attorney and Accounting profiles, while hiding it from all other profiles. This ensures that only authorized personnel can access this confidential data, enhancing data security and compliance.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Delete the settlement field from the page layout for all users.", "Create a separate, private Chatter group to discuss settlement details.", "Use field-level security to restrict visibility of the settlement field to specific user profiles.", "Store all settlement information in a separate password-protected spreadsheet."]'::jsonb,
2
),
(
'The managing partners need a high-level overview of the firm''s caseload, including the number of open cases by type and their current stage. How would you provide this information?',
'The most effective way to provide this is by creating a custom dashboard in Litify. This dashboard would contain several reports visualized as charts and graphs, such as "Open Matters by Case Type," "Matters by Stage," and "New Intakes this Month." This provides a real-time, easily digestible visual representation of the firm''s key metrics, allowing partners to gain quick insights and make informed business decisions.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Schedule a weekly meeting to verbally update the partners on every case.", "Create a custom dashboard with reports that visualize key firm metrics like caseload and case stages.", "Send a daily email with a list of all active cases.", "Give the managing partners full system administrator access to browse all records."]'::jsonb,
1
),
(
'Missing a statute of limitations is a major malpractice risk for a law firm. How would you use Litify to help attorneys and paralegals track these critical dates?',
'You would use Litify''s "Key Dates" object. When a new matter is created, a Key Date record for the statute of limitations would be entered. Then, you can configure automated reminders and tasks using a Flow or workflow rule that notify the assigned attorney and paralegal at set intervals (e.g., 90, 60, and 30 days) before the deadline. This makes critical dates highly visible and ensures proactive action is taken.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Use the \"Key Dates\" object to record the statute of limitations and set up automated reminders.", "Rely on the attorneys to keep track of all deadlines in their personal calendars.", "Create a custom text field on the Matter object to type in the date.", "Post a list of upcoming deadlines on a physical whiteboard in the office."]'::jsonb,
0
),
(
'A firm needs an efficient way to track incoming and outgoing referrals and any associated fee-sharing agreements. How would you manage this process in Litify?',
'Litify has a "Referrals" object specifically for this purpose. You would create a referral record to track the source of an incoming case or the firm an outgoing case is referred to. Custom fields can capture details about the referral agreement and fee-sharing percentages. This allows you to build reports and dashboards to monitor the volume and value of referrals from different sources, providing valuable insights into the firm''s network.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Track all referral information in a separate Excel spreadsheet.", "Use the standard Salesforce \"Lead\" object and add a custom field for \"Referred By\".", "Use the dedicated \"Referrals\" object in Litify to track incoming/outgoing cases and fee agreements.", "Create a private Chatter group for each referral partner to discuss cases."]'::jsonb,
2
),
(
'A client calls to ask about the last communication they had with the firm, but the assigned attorney is unavailable. How can a paralegal quickly find this information in Litify?',
'The paralegal can navigate to the client''s Matter record and review the "Activity" timeline or Chatter feed. Litify centralizes all client communications, so by integrating with email platforms and having staff log notes from phone calls and meetings, this feed provides a comprehensive, chronological history of all interactions. This allows any authorized team member to quickly get up to speed and assist the client promptly.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Tell the client they have to wait for the assigned attorney to call them back.", "Search through the attorney''s sent email folder to find the last message.", "Check the \"Activity\" timeline on the Matter record for a log of emails, calls, and notes.", "Ask the client if they remember what the last communication was about."]'::jsonb,
2
),
(
'A law firm needs to accurately track time spent and expenses incurred on each matter for billing purposes. How would you facilitate this in Litify?',
'You would train users to leverage Litify''s time and expense management features. Attorneys and paralegals can create "Time Entry" records to log billable hours and "Expense" records for costs like filing fees or expert witness charges, linking both directly to the relevant Matter record. Centralizing this information streamlines the billing process and ensures all billable activities and costs are captured accurately for invoicing.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Ask all employees to submit their hours and receipts in a weekly email.", "Use the \"Time Entry\" and \"Expense\" objects on the Matter record to log all billable activities and costs.", "Track all expenses on a corporate credit card statement and sort them out at the end of the month.", "Use a separate, non-integrated software for all time and expense tracking."]'::jsonb,
1
),
(
'A firm is migrating to Litify, and some senior attorneys are resistant to learning a new system. What is a key step to encourage user adoption?',
'A key step is to provide comprehensive, role-based training that highlights the direct benefits of Litify for their daily tasks. By demonstrating how Litify can streamline their work, automate tedious processes, and provide better case visibility, you can show them its value. Involving them early, identifying champions, and offering ongoing support are also crucial to alleviate concerns and foster a positive attitude towards the new platform.',
'Litify',
'easy'::public.difficulty_level,
'Litify'::public.question_category,
'["Mandate that all attorneys must use the system or face penalties.", "Provide role-based training that focuses on how Litify makes their specific jobs easier.", "Only provide training to the paralegals and assume the attorneys will learn from them.", "Assume they will not adopt the new system and create workarounds for them."]'::jsonb,
1
),
-- Medium Questions (11-30)
(
'An intake created as a "slip and fall" case is later determined to be a "product liability" case. How do you manage this change in Litify to ensure the correct procedures are followed?',
'First, you would update the "Case Type" field on the Matter record. This change should trigger a Flow or Process Builder that automatically archives the old "Slip and Fall" Matter Plan and applies the firm''s "Product Liability" Matter Plan. This ensures the case team is immediately prompted with the correct set of tasks, stages, and deadlines relevant to the new case type, ensuring a seamless transition in case strategy and management.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Update the Case Type field and configure automation to swap the Matter Plan accordingly.", "Create a brand new Matter record with the correct case type and close the old one.", "Leave the case type as \"slip and fall\" but make a note in the description field.", "Manually delete all tasks from the old plan and add new ones from a checklist."]'::jsonb,
0
),
(
'A potential new client contacts the firm. What is the standard process in Litify to perform a conflict of interest check before proceeding with an intake?',
'The standard process is to use Litify''s native conflict check functionality. Before creating a full intake, you would enter the names of all relevant parties (potential client, opposing parties, etc.) into the conflict check search bar. Litify then searches across all records—including intakes, matters, accounts, and contacts—and returns a detailed list of any potential matches, allowing the firm to document clearance before committing resources.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Manually search for the client''s name in the global search bar.", "Use Litify''s native conflict check feature to search all relevant parties against existing records.", "Ask the potential client if they have ever been involved with the firm before.", "A conflict check is not necessary until the case becomes an active Matter."]'::jsonb,
1
),
(
'In a personal injury case, the team needs to request and manage dozens of medical records and bills from various providers. How would you use Litify to keep this information organized?',
'You should use Litify''s specialized "Medical Record Request" and "Medical Bill" objects. For each provider, you would create a corresponding record associated with the Matter. This allows the team to track the status of each request (e.g., "Requested," "Received"), log follow-up communications, and store the digital documents directly on the record, centralizing all medical information for easy access and management.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Store all received medical records in a single folder on the Matter record.", "Use a separate spreadsheet to track the status of all medical record requests.", "Create a Chatter post for each medical record that is received.", "Use the \"Medical Record Request\" and \"Medical Bill\" objects to track status and store documents for each provider."]'::jsonb,
3
),
(
'A firm wants to know which of its marketing campaigns (e.g., Google Ads, TV commercials) are generating the most valuable cases. How would you track this in Litify?',
'To track marketing ROI, you must ensure the "Marketing Source" field is consistently captured on every Intake. By creating specific values for each campaign, you can then build reports and dashboards that correlate the marketing source not just with the volume of intakes, but with the conversion rate to Matters and the ultimate settlement or fee values. This provides clear data on which campaigns are generating the most revenue.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Ensure the \"Marketing Source\" field is captured on Intakes and build reports to track ROI.", "Only track the number of phone calls received from each campaign.", "Assume that the campaign with the highest budget is the most successful.", "Ask clients during their first meeting how they heard about the firm and record it in a note."]'::jsonb,
0
),
(
'A firm is collaborating with an outside law firm as co-counsel. They need a secure way to share documents and case updates without using insecure email chains. How can Litify facilitate this?',
'The best solution is to use Salesforce Experience Cloud (formerly Communities) to create a secure client or partner portal. By providing the co-counsel with limited, permission-based access, they can log in to view only the specific Matter they are working on. This portal allows for secure document sharing, collaborative task management on the Matter Plan, and a centralized communication feed, creating a single, secure source of truth for the case.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Use Experience Cloud to create a secure portal for the co-counsel to access case information.", "Share a link to a public Dropbox folder with all case documents.", "Add the co-counsel as a full internal user in your Litify organization.", "Send all documents and updates as password-protected zip files via email."]'::jsonb,
0
),
(
'A firm is handling a mass tort case with hundreds of individual plaintiffs. How would you structure this in Litify to manage the cases efficiently?',
'You would leverage Litify''s Mass Torts functionality. This involves creating a single "Master Matter" to represent the overall litigation (e.g., "In re: Defective Product Litigation"). Each individual client''s case is then created as a separate Matter but linked to this Master Matter. This allows the firm to manage universal case details at the Master level while tracking plaintiff-specific information (like damages) on the individual Matter records.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Create one single Matter record and add every plaintiff as a related contact.", "Create a separate, unconnected Matter record for each of the hundreds of plaintiffs.", "Use the Mass Torts feature to link hundreds of individual Matters to a single Master Matter.", "Manage the entire case outside of Litify using spreadsheets for better organization."]'::jsonb,
2
),
(
'A paralegal pays a $150 court filing fee for a client''s case. How should this be recorded in Litify to ensure the firm recovers this cost at settlement?',
'The paralegal should navigate to the specific Matter record and create a new "Expense" record. In this record, they would input the amount ($150), select the expense type (e.g., "Hard Cost - Filing Fees"), and add a description. Logging the expense directly against the Matter ensures it becomes part of the case''s financial ledger and is automatically included in the settlement statement for accurate cost recovery.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Add a note to the Chatter feed that a fee was paid.", "Create a new \"Expense\" record on the Matter, detailing the amount and type of cost.", "Email the accounting department and ask them to remember the expense.", "Subtract the amount from the firm''s general operating budget."]'::jsonb,
1
),
(
'A firm handles both family law and bankruptcy cases, which require different initial questions during intake. How can you ensure the intake team asks the right questions every time?',
'You would configure dynamic "Question Sets" within Litify. By building a specific set of questions for family law and a separate set for bankruptcy, you can use business rules to display the correct questionnaire based on the "Case Type" selected on the intake form. This ensures that the intake team is always guided through the correct, relevant line of questioning, leading to consistent and thorough data capture.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Provide the intake team with two different printed paper forms to fill out.", "Train the intake team to memorize all the questions for both case types.", "Configure dynamic \"Question Sets\" that appear based on the \"Case Type\" selected during intake.", "Create two different Intake record types with separate page layouts."]'::jsonb,
2
),
(
'A case has settled. How can Litify automate the generation of a detailed settlement statement for the client, breaking down fees, costs, and the net payout?',
'You would use an integrated document generation tool like Litify Docs. After ensuring the final settlement amount and all case expenses are logged on the Matter, a pre-built settlement statement template can be used. With one click, this template pulls all financial data from the Matter, performs the necessary calculations for fees and deductions, and instantly generates a professional, accurate statement ready for the client.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Export the financial data to Excel and manually create the settlement statement.", "Use a document generation tool with a template to automatically pull financial data from the Matter and calculate the breakdown.", "Ask the accounting department to manually draft a letter to the client with the details.", "Write the breakdown of funds in the body of an email to the client."]'::jsonb,
1
),
(
'An intake specialist has qualified a new case. What is the standard process in Litify for a smooth handoff to the assigned legal team?',
'The intake specialist uses the "Convert" button on the qualified Intake record. This action automatically creates a new Matter record and transfers all the data, notes, and documents collected during the intake phase. Automation can also be configured to assign ownership of the new Matter to the appropriate legal team and send an email notification alerting them that a new case is ready for their attention.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Send an email to the legal team with the client''s contact information.", "Use the \"Convert\" button on the Intake to automatically create a new Matter and transfer all data.", "Clone the Intake record and manually re-assign it to the new attorney.", "Print all intake documents and leave them on the attorney''s desk."]'::jsonb,
1
),
(
'An attorney is negotiating with three different insurance adjusters on one case. How would you track every offer and counteroffer from each party chronologically?',
'You should use the "Negotiations" related list on the Matter. You would create a separate "Negotiation" record for each of the three insurance companies. Within each of these, you would create individual "Offer" records to log every demand and offer. This structure provides a clear, organized, and chronological history of the negotiation with each specific party, preventing confusion and ensuring an accurate audit trail.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Create a single \"Offer\" record on the Matter and update it with the latest offer.", "Use the \"Negotiations\" object to create a parent record for each adjuster, then log each offer as a related \"Offer\" record.", "Track all offers in a note that is pinned to the Matter''s Chatter feed.", "Use a spreadsheet outside of Litify to manage the negotiation details."]'::jsonb,
1
),
(
'A case involves multiple insurance policies: the client''s own MedPay policy and two liability policies for at-fault drivers. How do you organize this in Litify?',
'You would use the "Insurances" object on the Matter. You should create three separate "Insurance" records. One record would be for the client''s policy with a "Type" of "First Party," and the other two would be for the defendants'' policies, each with a "Type" of "Third Party Liability." This clearly defines the role of each policy and keeps all details, like policy numbers and coverage limits, neatly organized on the case.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Combine all policy details into a single text field on the Matter record.", "Create a separate \"Insurance\" record for each policy on the Matter, using the \"Type\" field to differentiate them.", "Only track the primary defendant''s insurance policy to keep things simple.", "Create a custom object called \"Policies\" to store the information."]'::jsonb,
1
),
(
'A case has settled, but the firm must first satisfy a health insurance lien and a hospital lien before disbursing funds to the client. How do you track these obligations?',
'You would use the "Liens" object in Litify. For each obligation, a new "Lien" record should be created and associated with the Matter. This record tracks the lienholder, the initial amount, the negotiated resolution amount, and the status (e.g., "Negotiating," "Paid"). This creates a centralized ledger of all financial obligations tied to the case, ensuring none are overlooked during the final settlement disbursement.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Use the \"Liens\" object to create a record for each obligation, tracking the lienholder, amounts, and status.", "Keep track of liens by flagging emails received from the lienholders.", "Add the lien amounts to the \"Case Expenses\" to be deducted.", "Create tasks for the attorney to remind them to pay the liens before closing the case."]'::jsonb,
0
),
(
'A complex case requires deposing five key witnesses. How would you use Litify to manage the scheduling, transcripts, and notes for these depositions?',
'The "Depositions" object should be used. You would create a separate "Deposition" record for each of the five witnesses, linking it to the Matter. This record stores the schedule, deponent''s information, and court reporter details. After the deposition, the official transcript can be uploaded directly to the record, and the team can use the Notes feature to add summaries or highlight key testimony, centralizing all related information.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Create calendar events in Outlook for each deposition.", "Create a single \"Deposition\" record and list all five witnesses in the description field.", "Use the \"Depositions\" object to create a separate record for each witness to store schedules, transcripts, and notes.", "Store all deposition transcripts in a shared network drive folder outside of Litify."]'::jsonb,
2
),
(
'A firm wants to automate the calculation of a two-year statute of limitations (SoL) and an internal filing deadline that is 90 days prior to the SoL. How can you build this?',
'You can build a Salesforce Flow that is triggered when the "Date of Incident" field on a Matter is populated. The Flow would use formulas to first calculate the SoL by adding two years to the incident date, then create a "Key Date" record for it. The Flow would then calculate the internal filing deadline by subtracting 90 days from the SoL and create a second "Key Date" record. This automation ensures critical dates are set consistently and accurately.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Use a Flow or Process Builder to automatically calculate the dates from the \"Date of Incident\" and create Key Date records.", "Manually calculate the dates for every case and create the Key Date records by hand.", "Send an email notification to a paralegal to calculate the dates whenever a new case is created.", "This level of automation is not possible in Litify or Salesforce."]'::jsonb,
0
),
(
'From a client''s settlement funds held in trust, you need to pay an expert witness fee and a court reporter''s invoice. How do you track these disbursements in Litify?',
'This would be managed using Litify''s financial objects. After the settlement funds are logged as a deposit to the Matter''s trust ledger, you would create two separate "Disbursement" or "Check Request" records from the Matter. Each record would specify the payee (expert witness, court reporter) and the exact amount. This creates a clear, auditable trail of all funds going out of the trust account for that specific matter.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Tell the accounting department to write two checks and make a note of it.", "Create \"Disbursement\" records from the Matter for each payment to maintain an accurate trust ledger.", "Pay the invoices with a firm credit card and log them as general expenses.", "Withdraw cash from the trust account to pay the invoices."]'::jsonb,
1
),
(
'A firm wants to send retainer agreements to new clients for electronic signature to speed up onboarding. How would you set up this process in Litify?',
'You would integrate Litify with an e-signature application from the AppExchange, like DocuSign. After configuration, you can add a "Send for Signature" button to the Intake or Matter page layout. This button would trigger a pre-defined template, merge the client''s data, send it via the e-signature service, and then automatically save the final, executed agreement back to the Litify record upon completion.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Email a PDF of the agreement and ask the client to print, sign, scan, and email it back.", "Integrate Litify with an e-signature app like DocuSign to automate sending and receiving the signed agreement.", "Use the standard \"Send Email\" action to attach a Word document.", "Mail a physical copy of the retainer to the client and wait for it to be mailed back."]'::jsonb,
1
),
(
'An intake is for a patent dispute, a case type your firm doesn''t handle. How would you use Litify to formally refer the case to a partner firm and track it?',
'You would create a "Referral" record. On this record, you would link to the partner firm''s Account record in the "Referred To" field and change the intake''s status to "Referred Out." A workflow rule can be set up to automatically email the partner firm with case details. The Referral record then serves as the central place to add follow-up tasks to track the case status and any resulting referral fee.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Simply give the client the other firm''s phone number.", "Change the intake status to \"Closed\" and make a note about the referral.", "Forward the intake email to the partner firm and delete the intake from Litify.", "Create a \"Referral\" record, set the status to \"Referred Out,\" and use it to track follow-up and fee status."]'::jsonb,
3
),
(
'A judge issues a scheduling order with ten different deadlines. What is the most efficient way to input and manage these in Litify to ensure nothing is missed?',
'The most efficient method is to create a separate "Key Date" record for each of the ten deadlines. Each record would contain the due date, a description of the deadline (e.g., "Plaintiff''s Expert Disclosures"), and the responsible team member. You can then create a list view or report titled "Upcoming Court Deadlines" and add it to the team''s homepage dashboard for high visibility and proactive management.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["Create a single task with all ten deadlines listed in the description.", "Create a separate \"Key Date\" record for each court-mandated deadline and use a dashboard report to track them.", "Enter all ten dates into one long text field on the Matter record.", "Create a recurring event on the lead attorney''s calendar."]'::jsonb,
1
),
(
'A client calls asking for a case status update, and their assigned attorney is busy. How does Litify enable another staff member to provide an accurate update?',
'Litify''s Matter record provides a 360-degree view of the case. A staff member can first look at the "Stage" field for a high-level status. For more detail, they can review the "Matter Plan" to see recently completed and upcoming tasks, and check the "Activity" timeline or Chatter feed for the latest emails and call logs. This allows any permissioned user to provide a confident and informed update to the client in seconds.',
'Litify',
'medium'::public.difficulty_level,
'Litify'::public.question_category,
'["The staff member should tell the client that only their assigned attorney can provide an update.", "The staff member can check the case \"Stage\" and \"Activity\" timeline on the Matter record to provide a comprehensive update.", "The staff member has to find and read through the entire physical case file.", "The staff member should send an urgent email to the busy attorney and wait for a response."]'::jsonb,
1
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