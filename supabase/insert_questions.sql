with mcq_rows as (
select *
from (
values
(
'Universal Containers (UC) wants to leverage Generative AI Salesforce functionality to reduce Service Agent handling time by providing recommended replies based on the existing Knowledge articles. On which AI capability should UC train the service agents?',
'When the goal is to provide AI-generated replies specifically grounded in Salesforce Knowledge articles, the relevant feature is Knowledge Replies. This capability uses the content of the knowledge base to suggest relevant and accurate responses to agents, directly addressing the requirement to leverage existing articles.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Case Replies", "Knowledge Replies", "Service Replies"]'::jsonb,
1
),
(
'How does the AI retriever function within Data Cloud?',
'The primary function of an AI retriever within Data Cloud is to perform Retrieval-Augmented Generation (RAG). It conducts contextual searches across an indexed data source (like knowledge articles or other documents) to find the most relevant information and provide it to the LLM. This grounds the AI''s response in factual, verifiable company data, rather than relying solely on the LLM''s general knowledge.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["It monitors and aggregates data quality metrics across various data pipelines to ensure only high-integrity data is used for strategic decision-making.", "It automatically extracts and reformats raw data from diverse sources into standardized datasets for use in historical trend analysis and forecasting.", "It performs contextual searches over an indexed repository to quickly fetch the most relevant documents, enabling grounding AI responses with trustworthy, verifiable information."]'::jsonb,
2
),
(
'An Agentforce Specialist is creating a custom action in Agentforce. Which option is available for the Agentforce Specialist to choose for the custom Agent action?',
'When defining a custom Agent Action, Salesforce allows specialists to invoke declarative automation tools. Flows are the primary declarative tool for building complex business logic, making them the available and appropriate choice for executing a series of actions as part of a custom Agent Action.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Apex trigger", "SOQL", "Flows"]'::jsonb,
2
),
(
'Universal Containers would like to route SMS text messages to a service rep from an Agentforce Service Agent. Which Service Channel should the company use in the flow to ensure it''s routed properly?',
'In Salesforce Omni-Channel, different types of communication are handled by specific service channels. SMS text messages fall under the "Messaging" channel, which is designed to handle asynchronous conversations from sources like SMS, WhatsApp, and Facebook Messenger. Using this channel in the flow ensures correct routing and handling.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Live Agent", "Messaging", "Route Work Action"]'::jsonb,
1
),
(
'What should Universal Containers consider when deploying an Agentforce Service Agent with multiple topics and Agent Actions to production?',
'Deploying complex components like an Agentforce Service Agent requires following Salesforce best practices for change management. This includes ensuring all dependencies (like Apex classes, flows, and objects) are included in the deployment package, meeting Apex test coverage requirements (75%), aligning configuration settings between environments, and having a clear plan for version control and post-deployment activation.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Deploy flows or Apex after agents, topics, and Agent Actions to avoid deployment failures and potential production agent issues requiring complete redeployment.", "Deploy agent components without a test run in staging, relying on production data for reliable results. Sandbox configuration alone ensures seamless production deployment.", "Ensure all dependencies are included, Apex classes meet 75% test coverage, and configuration settings are aligned with production. Plan for version management and post-deployment activation."]'::jsonb,
2
),
(
'Universal Containers (UC) wants to enable its sales team to use AI to suggest recommended products from its catalog. Which type of prompt template should UC use?',
'A Flex prompt template offers the most versatility. It can combine data from multiple, unrelated Salesforce records and other resources. To suggest products from a catalog, the AI would likely need to reference the customer''s record (Account/Contact) and the Product catalog, which are different objects. A Flex template is designed for such complex, multi-resource prompts.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Record summary prompt template", "Email generation prompt template", "Flex prompt template"]'::jsonb,
2
),
(
'What is automatically created when a custom search index is created in Data Cloud?',
'In Data Cloud, the search index and the retriever are tightly linked. When you create and define a new custom search index for your data, Data Cloud automatically generates a corresponding retriever with the same name. This retriever can then be used in prompt templates to fetch data from that specific index.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["A dynamic retriever to allow runtime selection of retriever parameters without manual configuration", "A retriever that shares the name of the custom search index", "A predefined Apex retriever class that can be edited by a developer to meet specific needs"]'::jsonb,
1
),
(
'Amid their busy schedules, sales reps at Universal Containers dedicate time to follow up with prospects and existing clients via email regarding renewals or new deals. They spend many hours throughout the week reviewing past communications and details about their customers before performing their outreach. Which standard Agent action helps sales reps draft personalized emails to prospects by generating text based on previous successful communications?',
'The "Draft or Revise Sales Email" standard Agent Action is specifically designed for this purpose. It leverages AI to analyze past communications and customer data to generate a personalized draft email, significantly reducing the time reps spend on research and composition.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Agent Action: Draft or Revise Sales Email", "Agent Action: Summarize Record", "Agent Action: Find Similar Opportunities"]'::jsonb,
0
),
(
'An Agentforce Specialist needs to create a prompt template to fill a custom field named Latest Opportunities Summary on the Account object with information from the three most recently opened opportunities. How should the Agentforce Specialist gather the necessary data for the prompt template?',
'To gather specific, filtered, and sorted data from related records (like the three most recent opportunities), a Flow is the most powerful and appropriate tool. The Flow can query the Opportunity records related to the Account, sort them by creation date, limit the results to three, and then pass this curated information to the prompt template for summarization.',
'Salesforce Certified Agentforce Specialist',
'hard'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Select the latest Opportunities related list as a merge field.", "Select the Account Opportunity object as a resource when creating the prompt template.", "Create a flow to retrieve the opportunity information."]'::jsonb,
2
),
(
'What is the importance of Action Instructions when creating a custom Agent action?',
'Action Instructions are crucial because they provide the context the Large Language Model (LLM) needs to understand when to use a specific action. The instructions describe the action''s purpose and the types of user requests it can fulfill, enabling the LLM to intelligently map a user''s intent to the correct custom action.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Action Instructions define the expected user experience of an action.", "Action Instructions tell the user how to call this action in a conversation.", "Action Instructions tell the large language model (LLM) which action to use."]'::jsonb,
2
),
(
'When configuring a prompt template, an Agentforce Specialist previews the results of the prompt template they''ve written. They see two distinct text outputs: Resolution and Response. Which information does the Resolution text provide?',
'The "Resolution" output in the prompt template preview is a debugging and transparency tool. It shows the final, fully resolved prompt—including all the merged data from Salesforce records—that is sent to the Einstein Trust Layer and then to the LLM. This allows the specialist to verify that the correct data is being pulled and formatted as expected.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["It shows the full text that is sent to the Trust Layer.", "It shows which sensitive data is masked before it is sent to the LLM.", "It shows the response from the LLM based on the sample record."]'::jsonb,
0
),
(
'Which scenario best demonstrates when an Agentforce Data Library is most useful for improving an AI agent''s response accuracy?',
'An Agentforce Data Library is ideal for grounding an AI agent in a specific, curated set of documents. When an agent needs to provide answers based on official, regularly updated information like company policies, a data library ensures the AI retrieves information only from these approved sources, leading to accurate and trustworthy responses.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["When data is being retrieved from Snowflake using zero-copy for vectorization and retrieval.", "When the AI agent must provide answers based on a curated set of policy documents that are stored, regularly updated, and indexed in the data library.", "When the AI agent needs to combine data from disparate sources based on mutually common data, such as Customer Id and Product Id for grounding."]'::jsonb,
1
),
(
'Universal Containers deploys a new Agentforce Service Agent into the company''s website but is getting feedback that the Agentforce Service Agent is not providing answers to customer questions that are found in the company''s Salesforce Knowledge articles. What is the likely issue?',
'For an Agent to access and retrieve information from Salesforce Knowledge, the designated Agent User must have the necessary permissions. The "Allow View Knowledge" permission set (or a custom one with equivalent access) grants the user the ability to read Knowledge articles, which is a prerequisite for the agent to use them as a data source.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The Agentforce Service Agent user needs to be created under the standard Agent Knowledge profile.", "The Agentforce Service Agent user is not assigned the correct Agent Type License.", "The Agentforce Service Agent user was not given the Allow View Knowledge permission set."]'::jsonb,
2
),
(
'Universal Containers'' Agent Action includes several Apex classes for the new Agentforce Agent. What is an important consideration when deploying Apex that is invoked by an Agent Action?',
'Any Apex code being deployed to a production environment, regardless of how it is invoked, must adhere to Salesforce''s platform requirements. This includes having a minimum of 75% code coverage from unit tests and ensuring all dependent components are included in the deployment package to prevent failures.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The Apex classes must have at least 75% code coverage from unit tests, and all dependencies must be in the deployment package.", "The Apex classes may bypass the 75% code coverage requirement as long as they are only used by the agent.", "Apex classes invoked by an Agent Action may be deployed with less than 75% test coverage as long as the agent is not activated in production."]'::jsonb,
0
),
(
'Universal Containers needs its sales reps to be able to only execute prompt templates. What should the company use to achieve this requirement?',
'Salesforce uses permission sets to grant specific functionalities. The "Prompt Template User" permission set is designed for end-users. It grants them the ability to see and execute prompt templates that have been created and activated, without giving them permissions to create, edit, or manage the templates themselves.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Prompt Execute Template permission set", "Prompt Template Manager permission set", "Prompt Template User permission set"]'::jsonb,
2
),
(
'When creating a custom retriever in Einstein Studio, which step is considered essential?',
'The fundamental purpose of a retriever is to search for data. Therefore, the most essential step is to define what it should search. This involves selecting the pre-existing search index, specifying the associated Data Model Object (DMO) and data space to provide context, and optionally adding filters to refine the search results.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Define the output configuration by specifying the maximum number of results to return, and map the output fields that will ground the prompt.", "Select the search index, specify the associated data model object (DMO) and data space, and optionally define filters to narrow search results.", "Configure the search index, choose vector or hybrid search, choose the fields for filtering, the data space and model, then define the ranking method."]'::jsonb,
1
),
(
'Universal Containers'' service team wants to customize the standard case summary response from Agentforce. What should the Agentforce Specialist do to achieve this?',
'While standard templates exist, they cannot be directly modified. To create a customized version of a standard feature like case summarization, the specialist must create a new custom prompt template. They would choose the "Record Summary" type and associate it with the Case object, allowing them to define the exact structure and content of the summary.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create a custom Record Summary prompt template for the Case object.", "Summarize the Case with a standard Agent action.", "Customize the standard Record Summary template for the Case object."]'::jsonb,
0
),
(
'What is a valid use case for Data Cloud retrievers?',
'The core function of a Data Cloud retriever is to support Retrieval-Augmented Generation (RAG). It queries the vector database in Data Cloud to find relevant data (e.g., from knowledge articles, past cases) and then passes that data to an LLM. This augments the prompt with specific, contextual information, resulting in a more accurate and grounded response.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Modifying and updating data within the source systems connected to Data Cloud", "Returning relevant data from the vector database to augment a prompt", "Grounding data from external websites to augment a prompt with RAG"]'::jsonb,
1
),
(
'Universal Containers wants to reduce overall customer support handling time by minimizing the time spent typing routine answers for common questions in-chat, and reducing the post-chat analysis by suggesting values for case fields. Which combination of Agentforce for Service features enables this effort?',
'This scenario describes two distinct needs: 1) providing quick answers to common questions, which is addressed by Einstein Reply Recommendations, and 2) speeding up post-chat work by suggesting field values, which is the function of Case Classification. Together, these features address both parts of the requirement.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Einstein Service Replies and Work Summaries", "Einstein Reply Recommendations and Case Summaries", "Einstein Reply Recommendations and Case Classification"]'::jsonb,
2
),
(
'What is the role of the large language model (LLM) in understanding intent and executing an Agent Action?',
'The LLM acts as the brain of the agent. When a user provides an input, the LLM analyzes it to understand the user''s intent. It then matches that intent to the best available topic and its associated actions, determining the correct sequence in which to execute them to fulfill the user''s request.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Find similar requested topics and provide the actions that need to be executed", "Determine a user''s topic access and sort actions by priority to be executed", "Identify the best matching topic and actions and correct order of execution"]'::jsonb,
2
),
(
'Universal Containers built a Field Generation prompt template that worked for many records, but users are reporting random failures with token limit errors. What is the cause of the random nature of this error?',
'The amount of data used to ground a prompt template is dynamic; it varies based on the content of each individual record. A record with long text fields will generate more tokens than a record with short text fields. This variability can cause some records to exceed the LLM''s token limit while others do not, explaining the random nature of the failures.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The template type needs to be switched to Flex to accommodate the variable amount of tokens generated by the prompt grounding.", "The number of tokens that can be processed by the LLM varies with total user demand.", "The number of tokens generated by the dynamic nature of the prompt template will vary by record."]'::jsonb,
2
),
(
'What considerations should an Agentforce Specialist be aware of when using Record Snapshots grounding in a prompt template?',
'Record Snapshots attempt to provide a comprehensive view of a record, but they have specific limitations. A key consideration is that empty data—fields that have no value or related list sections that are empty—are automatically filtered out and not included in the data sent to the LLM. This is an efficiency measure to avoid sending useless information.',
'Salesforce Certified Agentforce Specialist',
'hard'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Email addresses associated with the object are excluded.", "Activities such as tasks and events are excluded.", "Empty data, such as fields without values or sections without limits, is filtered out."]'::jsonb,
2
),
(
'Universal Containers (UC) would like to implement Sales Development Representative (SDR) Agent. Which channel consideration should UC be aware of while implementing it?',
'The standard, out-of-the-box SDR Agent is specifically designed to work with the email channel. Its primary functions, such as drafting follow-up emails and summarizing email threads, are all centered around email-based interactions with leads and contacts.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["SDR Agent must also be deployed in the company website.", "SDR Agent must be deployed in Messaging channel.", "SDR Agent only works in Email channel."]'::jsonb,
2
),
(
'Universal Containers (UC) wants to limit an agent''s access to Knowledge articles, while deploying Answer Questions with Knowledge action. How should UC achieve this?',
'Data Categories are the standard Salesforce feature for controlling access to and visibility of Knowledge articles. By assigning articles to specific categories and then defining filters in the Agentforce Data Library based on those categories, UC can precisely control which subset of articles the agent is allowed to access and use for its responses.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Update the Data Library Retriever to filter on a custom field on the Knowledge article.", "Define scope instructions to the agent specifying a list of allowed article titles or IDs.", "Assign Data Categories to Knowledge articles, and define Data Category filters in the Agentforce Data Library."]'::jsonb,
2
),
(
'Which element in the Omni-Channel flow should be used to connect the flow with the agent?',
'The "Route Work Action" is the specific flow element designed to route a work item (like a chat, case, or message) to an agent through Omni-Channel. This action takes the work item and applies the configured routing rules (e.g., queue-based, skills-based) to assign it to the most appropriate, available agent.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Route Work Action", "Decision", "Assignment"]'::jsonb,
0
),
(
'Universal Containers (UC) is creating a new custom prompt template to populate a field with generated output. UC enabled the Einstein Trust Layer to ensure AI Audit data is captured and monitored for adoption and possible enhancements. Which prompt template type should UC use and which consideration should UC review?',
'The prompt template type specifically designed to generate content and populate a single field is "Field Generation". When using this, Dynamic Forms is a key consideration. Dynamic Forms allows for a more flexible and granular page layout, which can be important when adding AI-generated fields to a record page.',
'Salesforce Certified Agentforce Specialist',
'hard'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Flex, and that Dynamic Fields is enabled", "Field Generation, and that Dynamic Forms is enabled", "Field Generation, and that Dynamic Fields is enabled"]'::jsonb,
1
),
(
'Universal Containers is using Agentforce for Sales to find similar opportunities to help close deals faster. The team wants to understand the criteria used by the Agent to match opportunities. What is one criteria that Agentforce for Sales uses to match similar opportunities?',
'The "Find Similar Opportunities" feature focuses on learning from past successes. Therefore, a key criterion is that it specifically looks for opportunities with a status of "Closed Won". It analyzes these successful deals to find patterns and identify other open opportunities that share similar characteristics.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Matched opportunities were created in the last 12 months.", "Matched opportunities have a status of Closed Won from last 12 months.", "Matched opportunities are limited to the same account."]'::jsonb,
1
),
(
'Universal Containers plans to enhance its sales team''s productivity using AI. Which specific requirement necessitates the use of Prompt Builder?',
'Prompt Builder is used to create reusable, structured prompts for generative AI tasks. Creating a draft newsletter is a classic generative task that requires a well-defined prompt. The other options, estimating CLV and predicting churn, are predictive AI tasks that would typically be handled by tools like Einstein Prediction Builder or custom machine learning models, not Prompt Builder.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Creating a draft newsletter for an upcoming tradeshow", "Creating an estimated Customer Lifetime Value (CLV) with historical purchase data", "Predicting the likelihood of customers churning or discontinuing their relationship with the company"]'::jsonb,
0
),
(
'Universal Containers wants to implement a solution in Salesforce with a custom UX that allows users to enter a sales order number. Subsequently, the system will invoke a custom prompt template to create and display a summary of the sales order header and sales order details. Which solution should an Agentforce Specialist implement to meet this requirement?',
'This requirement involves user interaction (entering a sales order number) followed by a system action (invoking a prompt template). A Screen Flow is the perfect tool for this, as it allows you to build a custom user interface (a screen to collect the number) and then execute logic, including calling the standard "Prompt Template" action to generate the summary.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create a screen flow to collect sales order number and invoke the prompt template using the standard \"Prompt Template\" flow action.", "Create an autolaunched flow and invoke the prompt template using the standard \"Prompt Template\" flow action.", "Create a template-triggered prompt flow and invoke the prompt template using the standard \"Prompt Template\" flow action."]'::jsonb,
0
),
(
'Universal Containers has an active standard email prompt template that does not fully deliver on the business requirements. Which steps should an Agentforce Specialist take to use the content of the standard prompt email template in question and customize it to fully meet the business requirements?',
'Standard prompt templates provided by Salesforce cannot be edited directly. To create a customized version while retaining the original as a starting point, the correct procedure is to "Clone" the existing template. This creates a new, editable copy that the specialist can then modify to meet the specific business requirements.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Save as New Version and edit as needed.", "Save as New Template and edit as needed.", "Clone the existing template and modify as needed."]'::jsonb,
2
),
(
'Universal Containers (UC) wants to ensure the effectiveness, reliability, and trust of its agents prior to deploying them in production. UC would like to efficiently test a large and repeatable number of utterances. What should the Agentforce Specialist recommend?',
'The Agentforce Testing Center is specifically designed for scalable and repeatable testing. It allows specialists to create a CSV file containing a large number of test cases (utterances). This enables automated, bulk testing of the agent''s responses and behavior, which is far more efficient than manual, one-by-one testing for large-scale validation.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Leverage the Agent Large Language Model (LLM) UI and test UC''s agents with different utterances prior to activating the agent.", "Create a CSV file with UC''s test cases in Agentforce Testing Center using the testing template.", "Deploy the agent in a Q/A sandbox environment and review the Utterance Analysis reports to review effectiveness."]'::jsonb,
1
),
(
'Universal Containers (UC) wants to implement an AI-powered customer service agent that can retrieve proprietary policy documents that are stored as PDFs and ensure responses are grounded in approved company data. What should UC do first?',
'To ground an AI agent in a specific set of documents like PDFs, the first step is to create a data source that the agent can query. An Agentforce Data Library is the feature designed for this purpose. Setting up the data library allows UC to upload, store, and index the policy documents, making them available for the AI to retrieve and use in its responses.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Expand the AI agent''s scope to search all Salesforce records.", "Set up an Agentforce Data Library for AI retrieval of policy documents.", "Add the files to the content, and then select the data library option."]'::jsonb,
1
),
(
'For an Agentforce Data Library that contains uploaded files, what occurs once it is created and configured?',
'When you upload files to an Agentforce Data Library, Salesforce processes them for AI retrieval. This process involves indexing the content of the files and storing those indexes in Data Cloud. This creates a searchable vector database that the AI retriever can then use to find relevant information quickly.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Indexes the uploaded files in Salesforce File Storage", "Indexes the uploaded files in a location specified by the user", "Indexes the uploaded files into Data Cloud"]'::jsonb,
2
),
(
'Universal Containers (UC) has configured Agentforce Data Library using Knowledge articles. When testing in Agent Builder and the Experience Cloud site, the agent is not responding with grounded Knowledge article information. However, when tested in Prompt Builder, the response returns correctly. What should UC do to troubleshoot the issue?',
'This discrepancy indicates a permission issue with the Agent''s runtime user. The Agentforce Service Agent User needs permission to access the underlying data source, which in this case is Data Cloud where the Knowledge articles are indexed. Assigning the "Data Cloud User" permission set grants the necessary access for the agent to query the index during live interactions.',
'Salesforce Certified Agentforce Specialist',
'hard'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create a new permission set that assigns \"Manage Knowledge\" and assign it to the Agentforce Service Agent User.", "Ensure the assigned User permission set includes access to the prompt template used to access the Knowledge articles.", "Ensure the Data Cloud User permission set has been assigned to the Agentforce Service Agent User."]'::jsonb,
2
),
(
'Universal Containers (UC) recently rolled out Einstein Generative AI capabilities and has created a custom prompt to summarize case records. Users have reported that the case summaries generated are not returning the appropriate information. What is a possible explanation for the poor prompt performance?',
'The quality of a generative AI''s output is highly dependent on the quality of its input. If the case summaries are poor, the most likely reason is that the data being fed into the prompt (the grounding data) is not what the LLM needs. This could mean the wrong fields are being selected, or the data in those fields is sparse or irrelevant, leading to an incomplete or incorrect summary.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The Einstein Trust Layer is incorrectly configured.", "The data being used for grounding is incorrect or incomplete.", "The prompt template version is incompatible with the chosen LLM."]'::jsonb,
1
),
(
'Universal Containers recently launched a pilot program to integrate conversational AI into its CRM business operations with Agentforce Agents. How should the Agentforce Specialist monitor Agents'' usability and the assignment of actions?',
'Agent Analytics provides dedicated dashboards and reports for monitoring the performance and usage of Agentforce Agents. This tool is designed to give specialists insights into how users are interacting with the agent, which actions are being triggered, and overall effectiveness, making it the correct choice for monitoring usability.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Run Agent Analytics", "Run a report on the Platform Debug Logs.", "Query the Agent log data using the metadata API."]'::jsonb,
0
),
(
'How does an Agent respond when it can''t understand the request or find any requested information?',
'When an AI agent cannot match a user''s request to any of its configured topics or actions, or if a data retrieval action finds no results, it falls back to a default "confusion" response. This is typically a general message that informs the user it didn''t understand and asks them to rephrase or try again, preventing the conversation from stalling.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["With a general message asking the user to rephrase the request", "With a preconfigured message, based on the action type", "With a generated error message"]'::jsonb,
0
),
(
'Universal Containers tests out a new Einstein Generative AI feature for its sales team to create personalized and contextualized emails for its customers. Sometimes, users find that the draft email contains placeholders for attributes that could have been derived from the recipient''s contact record. What is the most likely explanation for why the draft email shows these placeholders?',
'Generative AI features operate within Salesforce''s security model. If the prompt template attempts to merge a field from the contact record that the running user does not have Field-Level Security (FLS) access to, the system cannot retrieve the data. Instead of failing, it inserts a placeholder to indicate that the information was requested but could not be accessed.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The user does not have Einstein Sales Emails permission assigned.", "The user does not have permission to access the fields.", "The user''s locale language is not supported by Prompt Builder."]'::jsonb,
1
),
(
'Universal Containers (UC) plans to implement prompt templates that utilize the standard foundation models. What should UC consider when building prompt templates in Prompt Builder?',
'A key prompt engineering technique is to provide context and guide the LLM''s tone and persona. Asking the LLM to role-play (e.g., "You are a helpful customer service assistant") is an effective way to shape the style, language, and focus of the generated response, leading to more consistent and appropriate outputs.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Train LLM with data using different writing styles including word choice, intensifiers, emojis, and punctuation.", "Ask it to role-play as a character in the prompt template to provide more context to the LLM.", "Include multiple-choice questions within the prompt to test the LLM''s understanding of the context."]'::jsonb,
1
),
(
'Universal Containers (UC) currently tracks Leads with a custom object. UC is preparing to implement the Sales Development Representative (SDR) Agent. Which consideration should UC keep in mind?',
'The standard Agentforce SDR Agent is pre-configured to work with Salesforce''s standard sales objects. Its built-in actions and logic are specifically designed to interact with the standard Lead and Contact objects. It does not support custom objects for lead tracking out-of-the-box.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Agentforce SDR only support custom objects associated with Accounts.", "Agentforce SDR only works with the standard Lead object.", "Agentforce SDR only works on Opportunites."]'::jsonb,
1
),
(
'Universal Containers (UC) wants to enable its sales team to get insights into product and competitor names mentioned during calls. How should UC meet this requirement?',
'Einstein Conversation Insights is the Salesforce feature designed to analyze call recordings. To get insights on products, you must enable the feature, connect a call recording provider, assign permissions to users, and then customize the insights to track specific product names. Salesforce allows tracking up to 50 products.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Enable Einstein Conversation Insights, assign permission sets, define recording managers, and customize insights with up to 50 competitor names.", "Enable Einstein Conversation Insights, connect a recording provider, assign permission sets, and customize insights with up to 25 products.", "Enable Einstein Conversation Insights, enable sales recording, assign permission sets, and customize insights with up to 50 products."]'::jsonb,
2
),
(
'Universal Containers has grounded a prompt template with a related list. During user acceptance testing (UAT), users are not getting the correct responses. What is causing this issue?',
'When grounding a prompt template with record data, the system pulls information based on what is visible to the user. For a related list to be included in the grounding data, it must be present on the page layout assigned to the user who is running the prompt. If the related list is not on the layout, the system cannot access its data.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["The related list is Read Only.", "The related list is not on the parent object''s page layout.", "The related list prompt template option is not enabled."]'::jsonb,
1
),
(
'An Agentforce Specialist is tasked with analyzing Agent interactions looking into user inputs, requests, and queries to identify patterns and trends. What functionality allows the Agentforce Specialist to achieve this?',
'The User Utterances dashboard is a component of Agent Analytics specifically designed for this purpose. It captures and displays the raw inputs (utterances) from users, allowing specialists to analyze what users are asking, identify common requests or points of confusion, and use that data to improve the agent''s performance and configuration.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["User Utterances dashboard", "Agent Event Logs dashboard", "AI Audit and Feedback Data dashboard"]'::jsonb,
0
),
(
'Universal Containers (UC) is rolling out an AI-powered support assistant to help customer service agents quickly retrieve relevant troubleshooting steps and policy guidelines. The assistant relies on a search index in Data Cloud that contains product manuals, policy documents, and past case resolutions. During testing, UC notices that agents are receiving too many irrelevant results from older product versions that no longer apply. How should UC address this issue?',
'Receiving irrelevant results is a classic sign that the data retrieval needs to be more specific. The solution is to create a custom retriever in Einstein Studio. This allows the specialist to apply filters—such as filtering by publication date to exclude old documents or by product line to only show relevant versions—thereby narrowing the search and improving the relevance of the results.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Modify the search index to only store documents from the last year and remove older records.", "Use the default retriever, as it already searches the entire search index and provides broad coverage.", "Create a custom retriever in Einstein Studio, and apply filters for publication date and product line."]'::jsonb,
2
),
(
'Universal Containers has implemented an agent that answers questions based on Knowledge articles. Which topic and Agent Action will be shown in the Agent Builder?',
'When configuring an agent to answer questions from a knowledge base, Salesforce provides standard components. The "General FAQ" topic is the standard container for this type of conversational interaction, and the "Answers Questions with Knowledge" is the standard action that performs the retrieval from the configured knowledge data source.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["General FAQ topic and Answers Questions with Knowledge Action", "General Q&A topic and Knowledge Article Answers action", "General CRM topic and Answers Questions with LLM Action"]'::jsonb,
0
),
(
'Universal Containers wants to leverage the Record Snapshots grounding feature in a prompt template. What preparations are required?',
'The Record Snapshots feature is directly tied to the Dynamic Forms functionality in Salesforce Lightning App Builder. To use Record Snapshots, you must first enable Dynamic Forms on the object''s record page. The snapshot then captures the fields and sections as they are configured in the Dynamic Forms layout.',
'Salesforce Certified Agentforce Specialist',
'hard'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create a field set for all the fields to be grounded", "Enable and configure dynamic form for the object", "Configure page layout of the master record type"]'::jsonb,
1
),
(
'Universal Containers recently added a custom flow for processing returns and created a new Agent Action. Which action should the company take to ensure the Agentforce Service Agent can run this new flow as part of the new Agent Action?',
'For any user—including the designated Agentforce Service Agent user—to be able to execute a flow, they must have the appropriate permission. The "Run Flows" user permission grants the ability to run flows that they have access to. Without this permission, any attempt by the agent to invoke the flow via the Agent Action would fail.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Assign the Manage Users permission to the Agentforce Agent user.", "Recreate the flow using the Agentforce Agent user.", "Assign the Run Flows permission to the Agentforce Agent user."]'::jsonb,
2
),
(
'Universal Containers (UC) wants to make a sales proposal and directly use data from multiple unrelated objects (standard and custom) in a prompt template. How should UC accomplish this?',
'The Flex prompt template is specifically designed for complex use cases that require grounding data from multiple, potentially unrelated sources. It allows a specialist to add several different resources (e.g., an Account record, a custom Project object, a related Opportunity) as inputs to a single prompt, combining all that information for the LLM.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create a prompt template-triggered flow to access the data from standard and custom objects.", "Create a Flex template to add resources with standard and custom objects as inputs.", "Create a prompt template passing in a special custom object that connects the records temporarily."]'::jsonb,
1
),
(
'In a Knowledge-based data library configuration, what is the primary difference between the identifying fields and the content fields?',
'When configuring a Knowledge data library, "identifying fields" (like Title or Question) are used by the system primarily for the initial search and to locate the most relevant article. "Content fields" (like Answer or Details) contain the rich, detailed information that is then extracted from the chosen article and used to enrich the AI''s final response.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Identifying fields help locate the correct Knowledge article, while content fields enrich AI responses with detailed information.", "Identifying fields highlight key terms for relevance scoring, while content fields store the full text of the article for retrieval.", "Identifying fields categorize articles for indexing purposes, while content fields provide a brief summary for display."]'::jsonb,
0
),
(
'Universal Containers (UC) uses a file upload-based data library and custom prompt to support AI-driven training content. However, users report that the AI frequently returns outdated documents. Which corrective action should UC implement to improve content relevancy?',
'To ensure only recent content is used, a custom retriever is necessary. By configuring a custom retriever, UC can add a filter condition based on a metadata field like "Last Modified Date" or "Upload Date". This allows the retriever to limit its search to only documents updated within a specific period (e.g., the last 6 months), effectively excluding outdated content.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Continue using the default retriever without filters, because periodic re-uploads will eventually phase out outdated documents without further configuration or the need for custom retrievers.", "Configure a custom retriever that includes a filter condition limiting retrieval to documents updated within a defined recent period, ensuring that only current content is used for AI responses.", "Switch the data library source from file uploads to a Knowledge-based data library, because Salesforce Knowledge bases automatically manage document recency, ensuring current documents are returned."]'::jsonb,
1
),
(
'Universal Containers (UC) is experimenting with using public Generative AI models and is familiar with the language required to get the information it needs. However, it can be time consuming for both UC''s sales and service reps to type in the prompt to get the information they need, and ensure prompt consistency. Which Salesforce feature should the company use to address these concerns?',
'This is the core use case for Einstein Prompt Builder and Prompt Templates. Prompt Builder allows a specialist to create structured, reusable prompts (Prompt Templates) that can be grounded with Salesforce data. This solves both problems: it saves reps from typing long prompts manually and ensures that everyone uses the same well-crafted, consistent prompt for a given task.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Agent Builder and Action: Query Records", "Einstein Recommendation Builder", "Einstein Prompt Builder and Prompt Templates"]'::jsonb,
2
),
(
'Universal Containers implements Custom Agent Actions to enhance its customer service operations. The development team needs to understand the core components of a Custom Agent Action to ensure proper configuration and functionality. What should the development team review in the Custom Agent Action configuration to identify one of the core components of a Custom Agent Action?',
'Instructions are a core, mandatory component of a Custom Agent Action. They provide the natural language description that tells the LLM what the action does and when it should be used. Without clear instructions, the agent would not be able to correctly map a user''s intent to the custom action.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Instructions", "Action Triggers", "Output Types"]'::jsonb,
0
),
(
'A data scientist needs to view and manage models in Einstein Studio. The data scientist also needs to create prompt templates in Prompt Builder. Which permission sets should an Agentforce Specialist assign to the data scientist?',
'This question requires combining permissions for two different areas. Access to Einstein Studio and model management is typically granted via the "Data Cloud Admin" permission set. The ability to create and manage prompt templates is granted by the "Prompt Template Manager" permission set. Therefore, the data scientist needs both to perform all required tasks.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Prompt Template Manager and Prompt Template User", "Data Cloud Admin and Prompt Template Manager", "Prompt Template User and Data Cloud Admin"]'::jsonb,
1
),
(
'The sales team at a hotel resort would like to generate a guest summary about the guests'' interests and provide recommendations based on their activity preferences captured in each guest profile. They want the summary to be available only on the contact record page. Which AI capability should the team use?',
'Prompt Builder is the correct tool for creating generative AI components that can be placed on a record page. The team would create a "Record Summary" type prompt template, ground it in the guest''s contact record and related activity data, and then add the resulting Lightning Component to the Contact record page.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Model Builder", "Prompt Builder", "Agent Builder"]'::jsonb,
1
),
(
'Universal Containers wants to utilize Agentforce for Sales to help sales reps reach their sales quotas by providing AI-generated plans containing guidance and steps for closing deals. Which feature meets this requirement?',
'The "Create Close Plan" feature within Agentforce for Sales is specifically designed for this purpose. It analyzes an opportunity and generates a tailored plan with recommended steps and guidance to help the sales rep move the deal toward a successful close, directly addressing the requirement to help them reach quotas.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Create Account Plan", "Find Similar Deals", "Create Close Plan"]'::jsonb,
2
),
(
'A customer service representative is looking at a custom object that stores travel information. They recently received a weather alert and now need to cancel flights for the customers that are related with this itinerary. The representative needs to review the Knowledge articles about canceling and rebooking the customer flights. Which Agentforce capability helps the representative accomplish this?',
'Agentforce provides a conversational interface where a user can ask questions and trigger actions. The representative can ask the agent questions about the cancellation policy, and the agent, using its ability to access Knowledge articles, can provide the answer. Simultaneously, the rep can instruct the agent to execute tasks like "cancel flight," which would trigger available actions.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Generate a Knowledge article based off the prompts that the agent enters to create steps to cancel flights.", "Execute tasks based on available actions, answering questions using information from accessible Knowledge articles.", "Invoke a flow which makes a call to external data to create a Knowledge article."]'::jsonb,
1
),
(
'An Agentforce Specialist wants to troubleshoot their Agent''s performance. Where should the Agentforce Specialist go to access all user interactions with the Agent, including Agent errors, incorrectly triggered actions, and incomplete plans?',
'The Event Logs provide a detailed, comprehensive record of all interactions with the agent. This is the primary troubleshooting tool for specialists to see the user''s input, how the agent interpreted it, which actions were triggered (or failed to trigger), and any errors that occurred during the process.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Plan Canvas", "Event Logs", "Agent Settings"]'::jsonb,
1
),
(
'Universal Containers (UC) implements a custom retriever to improve the accuracy of AI-generated responses. UC notices that the retriever is returning too many irrelevant results, making the responses less useful. What should UC do to ensure only relevant data is retrieved?',
'If a retriever is returning too much irrelevant information, the solution is to make the search more specific. Within the custom retriever''s configuration, you can define filters based on fields in the data source. These filters narrow down the search results to only those records that meet specific conditions, thereby improving the relevance of the data retrieved.',
'Salesforce Certified Agentforce Specialist',
'easy'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Increase the maximum number of results returned to capture a broader dataset.", "Define filters to narrow the search results based on specific conditions.", "Change the search index to a different data model object (DMO)."]'::jsonb,
1
),
(
'What is true of Agentforce Testing Center?',
'A key benefit of the Agentforce Testing Center is that it allows for safe and isolated testing. When tests are run, they do not consume paid Einstein credits or API limits. This allows for extensive and repeated testing without incurring additional costs or impacting production limits.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Running tests risks modifying CRM data in a production environment.", "Running tests does not consume Einstein Requests.", "Agentforce Testing Center can only be used in a production environment."]'::jsonb,
1
),
(
'Universal Containers (UC) wants to build an Agentforce Service Agent that provides the latest, active, and relevant policy and compliance information to customers. The agent must semantically search HR policies, ensure responses are grounded on published Knowledge, and allow Knowledge updates to be reflected immediately without manual reconfiguration. What should UC do to ensure the agent retrieves the right information?',
'To meet all these requirements, UC should use an Agentforce Data Library. This feature allows them to store and index the policy documents (fulfilling the need for a dedicated information source), which grounds the AI''s responses. Because the data library can be set to automatically re-index when source documents are updated, changes are reflected immediately without manual reconfiguration.',
'Salesforce Certified Agentforce Specialist',
'medium'::public.difficulty_level,
'Agentforce'::public.question_category,
'Knowledge'::public.question_type,
'["Enable the agent to search all internal records and past customer inquiries.", "Manually add policy responses into the AI model to prevent hallucinations.", "Set up an Agentforce Data Library to store and index policy documents for AI retrieval."]'::jsonb,
2
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
