/**
 * seed_mock_tests.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Purges ALL old mock test packs and practice questions, then re-seeds with:
 * 
 * FREE TESTS (5):
 *   1. Coding Test (DSA / Programming)
 *   2. English Speaking & IELTS Practice
 *   3. Aptitude + Reasoning Test
 *   4. Typing Speed & English Test
 *   5. Communication Skills Assessment
 *
 * PAID TESTS (11):
 *   1. CBSE Board Exams (10th & 12th)
 *   2. ICSE Board Exams
 *   3. State Board Exams — Bihar & UP Board (10th & 12th)
 *   4. JEE Main (Engineering)
 *   5. NEET (Medical)
 *   6. CUET (UG)
 *   7. NDA (Defense)
 *   8. CA Foundation
 *   9. UPSC Civil Services (IAS, IPS)
 *  10. SSC CGL
 *  11. SSC CHSL
 *
 * EVERY PACK HAS EXACTLY 35 MCQ QUESTIONS.
 * ─────────────────────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const MockTestPack = require('./models/MockTestPack');
const PracticeQuestion = require('./models/PracticeQuestion');

const MONGO_URI = process.env.MONGO_URI;

// ─── QUESTION BANKS (35 Qs each) ────────────────────────────────────────────

const QUESTION_BANKS = {

  // ════════════════════════════════════════════════════════════
  // FREE 1: Coding Test (DSA / Programming)
  // ════════════════════════════════════════════════════════════
  'coding-dsa-free': {
    category: 'Tech Free', subject: 'Programming',
    qs: [
      { q:'What does CPU stand for?', opts:['Central Processing Unit','Central Program Unit','Computer Personal Unit','Control Process Unit'], ans:'Central Processing Unit' },
      { q:'Which data structure uses LIFO principle?', opts:['Queue','Stack','Linked List','Heap'], ans:'Stack' },
      { q:'Time complexity of Binary Search?', opts:['O(n)','O(n²)','O(log n)','O(1)'], ans:'O(log n)' },
      { q:'What does HTML stand for?', opts:['Hyper Text Markup Language','High Text Machine Language','Hyper Table Markup Language','None'], ans:'Hyper Text Markup Language' },
      { q:'Keyword to define a function in Python?', opts:['function','fun','def','define'], ans:'def' },
      { q:'Which is NOT a programming language?', opts:['Java','Python','HTML','C++'], ans:'HTML' },
      { q:'What does SQL stand for?', opts:['Structured Query Language','Simple Query Logic','Sequential Query Language','Standard Query Logic'], ans:'Structured Query Language' },
      { q:'Merge Sort average time complexity?', opts:['O(n²)','O(n)','O(n log n)','O(log n)'], ans:'O(n log n)' },
      { q:'What does RAM stand for?', opts:['Read Access Memory','Random Access Memory','Rapid Access Module','Read And Modify'], ans:'Random Access Memory' },
      { q:'Which is a NoSQL database?', opts:['MySQL','PostgreSQL','MongoDB','Oracle'], ans:'MongoDB' },
      { q:'Default HTTP port?', opts:['21','443','80','8080'], ans:'80' },
      { q:'In OOP, encapsulation means?', opts:['Inheriting properties','Hiding internal state','Overriding methods','Creating objects'], ans:'Hiding internal state' },
      { q:'HTML tag for hyperlink?', opts:['<link>','<href>','<a>','<nav>'], ans:'<a>' },
      { q:'Purpose of a compiler?', opts:['Run programs directly','Convert source to machine code','Manage memory','Debug programs'], ans:'Convert source to machine code' },
      { q:'In recursion, what is the base case?', opts:['The first call','The stopping condition','A loop inside recursion','None'], ans:'The stopping condition' },
      { q:'Which sorting algorithm is most efficient on average?', opts:['Bubble Sort','Selection Sort','Quick Sort','Insertion Sort'], ans:'Quick Sort' },
      { q:'What is a Linked List?', opts:['Array with fixed size','Nodes with data and pointer to next','A type of queue','A hash map'], ans:'Nodes with data and pointer to next' },
      { q:'What is Big-O notation used for?', opts:['Measuring memory only','Describing algorithm efficiency','Counting loops','Measuring disk space'], ans:'Describing algorithm efficiency' },
      { q:'What is polymorphism in OOP?', opts:['Multiple classes in one file','One interface, many implementations','Creating many objects','Using multiple loops'], ans:'One interface, many implementations' },
      { q:'What does API stand for?', opts:['Applied Program Interface','Application Programming Interface','Automated Program Interaction','None'], ans:'Application Programming Interface' },
      { q:'Which data structure is best for BFS traversal?', opts:['Stack','Queue','Array','Tree'], ans:'Queue' },
      { q:'What is a binary tree?', opts:['Tree with max 3 children','Tree with max 2 children','Tree with 10 nodes','None'], ans:'Tree with max 2 children' },
      { q:'Hash tables offer which average lookup time?', opts:['O(n)','O(log n)','O(1)','O(n²)'], ans:'O(1)' },
      { q:'What is the purpose of a "return" statement?', opts:['End the program','Return value from function and exit it','Print output','Create a loop'], ans:'Return value from function and exit it' },
      { q:'Which language is primarily used for iOS development?', opts:['Java','Kotlin','Swift','Python'], ans:'Swift' },
      { q:'What is Git used for?', opts:['Web design','Version control and collaboration','Database management','Network configuration'], ans:'Version control and collaboration' },
      { q:'What does IDE stand for?', opts:['Integrated Development Environment','Internet Design Engine','Internal Data Explorer','None'], ans:'Integrated Development Environment' },
      { q:'What is the difference between stack and heap memory?', opts:['Stack=slow, Heap=fast','Stack=static/local, Heap=dynamic','Both are same','Heap is smaller'], ans:'Stack=static/local, Heap=dynamic' },
      { q:'Which keyword is used for inheritance in Java?', opts:['implement','extends','inherits','using'], ans:'extends' },
      { q:'What is "debugging"?', opts:['Adding new features','Finding and fixing program errors','Writing documentation','Deleting old code'], ans:'Finding and fixing program errors' },
      { q:'What does JSON stand for?', opts:['JavaScript Object Notation','Java Script Order Node','JSON Script Object','None'], ans:'JavaScript Object Notation' },
      { q:'REST stands for?', opts:['Remote Execution Standard Tool','Representational State Transfer','Real-time Event System','None'], ans:'Representational State Transfer' },
      { q:'In Python, what is a list comprehension?', opts:['A detailed list documentation','A concise way to create lists','A library for lists','None'], ans:'A concise way to create lists' },
      { q:'What is "version control" in software development?', opts:['Tracking and managing code changes','Managing server versions','Setting software versions','None'], ans:'Tracking and managing code changes' },
      { q:'What is "open source" software?', opts:['Software that is expensive','Software with publicly available source code','Proprietary software','None'], ans:'Software with publicly available source code' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // FREE 2: English Speaking & IELTS Practice
  // ════════════════════════════════════════════════════════════
  'english-ielts-free': {
    category: 'Tech Free', subject: 'English Language',
    qs: [
      { q:'What is the plural of "analysis"?', opts:['analysises','analysis','analyses','analyzees'], ans:'analyses' },
      { q:'Choose the correct sentence:', opts:['She don\'t like it.','She doesn\'t likes it.','She doesn\'t like it.','She not like it.'], ans:'She doesn\'t like it.' },
      { q:'IELTS stands for?', opts:['International English Language Testing System','International Exam Language Test Series','Indian English Language Test','None'], ans:'International English Language Testing System' },
      { q:'In IELTS, the speaking test maximum band is?', opts:['10','8','9','7'], ans:'9' },
      { q:'"Ephemeral" means?', opts:['Permanent','Long-lasting','Short-lived','Infinite'], ans:'Short-lived' },
      { q:'Choose the correct passive voice: "They built the house"', opts:['The house was built by them.','The house is built by them.','The house were built.','Built the house was.'], ans:'The house was built by them.' },
      { q:'What is a "synonym"?', opts:['A word with opposite meaning','A word with similar meaning','A type of grammar rule','A figure of speech'], ans:'A word with similar meaning' },
      { q:'"Ubiquitous" means?', opts:['Rare and unusual','Found everywhere','Expensive','Invisible'], ans:'Found everywhere' },
      { q:'Correct usage of "their, they\'re, there"?', opts:['"Their going to there house."','"They\'re going to their house."','"There going to their house."','None'], ans:'"They\'re going to their house."' },
      { q:'Which is a conjunction?', opts:['quickly','beautiful','because','running'], ans:'because' },
      { q:'"Concise" writing means?', opts:['Writing in detail','Clear and brief writing','Complex language','Long sentences'], ans:'Clear and brief writing' },
      { q:'IELTS Academic vs General Training — difference?', opts:['Different topics and text types','Same test, different scoring','Different languages','No difference'], ans:'Different topics and text types' },
      { q:'Which article goes before a vowel sound?', opts:['a','an','the','no article'], ans:'an' },
      { q:'"Perseverance" means?', opts:['Quick decision','Continued effort despite difficulty','Giving up easily','Lack of motivation'], ans:'Continued effort despite difficulty' },
      { q:'Fill in: "She is __ best student in class."', opts:['a','an','the','some'], ans:'the' },
      { q:'What is a "thesis statement"?', opts:['A book title','Main argument/point of an essay','A conclusion sentence','A question opener'], ans:'Main argument/point of an essay' },
      { q:'"Ambiguous" means?', opts:['Very clear','Open to multiple interpretations','Definitely wrong','None'], ans:'Open to multiple interpretations' },
      { q:'Active voice: "The manager approved the request." Passive voice?', opts:['The request approved the manager.','The request was approved by the manager.','The request is approving.','Was request approved?'], ans:'The request was approved by the manager.' },
      { q:'IELTS writing Task 1 (Academic) requires?', opts:['Writing a letter','Describing a chart/graph/diagram','Writing an essay','A short story'], ans:'Describing a chart/graph/diagram' },
      { q:'"Coherence" in writing refers to?', opts:['Using difficult words','Logical flow and connection of ideas','Correct grammar only','Word count'], ans:'Logical flow and connection of ideas' },
      { q:'Which word is a preposition?', opts:['run','beautiful','under','quickly'], ans:'under' },
      { q:'"Prolific" means?', opts:['Lazy','Producing much work or output','Very old','Silent'], ans:'Producing much work or output' },
      { q:'Correct form: "He has been studying __ two hours."', opts:['since','for','from','during'], ans:'for' },
      { q:'What is "intonation" in speaking?', opts:['Spelling accuracy','Rise and fall of voice pitch','Grammar accuracy','Word order'], ans:'Rise and fall of voice pitch' },
      { q:'IELTS General Training Writing Task 1 requires writing a?', opts:['Report','Formal or informal letter','Short story','Poem'], ans:'Formal or informal letter' },
      { q:'"Benevolent" means?', opts:['Cruel','Well-meaning and kind','Selfish','Angry'], ans:'Well-meaning and kind' },
      { q:'Which tense: "I have been living here since 2020"?', opts:['Simple present','Past perfect','Present perfect continuous','Future'], ans:'Present perfect continuous' },
      { q:'What is a "paragraph"?', opts:['A single sentence','A group of related sentences on one idea','A chapter','A heading'], ans:'A group of related sentences on one idea' },
      { q:'"Pragmatic" means?', opts:['Idealistic','Dreamlike','Practical and realistic','Impossible'], ans:'Practical and realistic' },
      { q:'IELTS band 7 means?', opts:['Expert user','Good user (rare errors, complex language)','Modest user','Basic user'], ans:'Good user (rare errors, complex language)' },
      { q:'What does "paraphrase" mean?', opts:['Copy exact text','Restate something in different words','Summarize into 1 word','Translate to another language'], ans:'Restate something in different words' },
      { q:'"Monotone" speech is?', opts:['Very expressive','Speaking with little variation in pitch','Very loud speech','Whispering'], ans:'Speaking with little variation in pitch' },
      { q:'Correct: "Neither of the boys __ present."', opts:['were','are','was','have been'], ans:'was' },
      { q:'"Verbose" means?', opts:['Silent','Using more words than necessary','Precise and clear','Incomplete'], ans:'Using more words than necessary' },
      { q:'What is "skimming" in reading?', opts:['Reading every word carefully','Reading quickly to get the general idea','Memorizing the passage','Reading backwards'], ans:'Reading quickly to get the general idea' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // FREE 3: Aptitude + Reasoning Test
  // ════════════════════════════════════════════════════════════
  'aptitude-reasoning-free': {
    category: 'Tech Free', subject: 'General Aptitude',
    qs: [
      { q:'15% of 200 = ?', opts:['25','30','35','40'], ans:'30' },
      { q:'If A is the brother of B, and B is the sister of C, how is A related to C?', opts:['Father','Brother','Sister','Uncle'], ans:'Brother' },
      { q:'Next in series: 2, 4, 8, 16, __', opts:['24','28','32','36'], ans:'32' },
      { q:'If MANGO is coded as OCPIQ, then APPLE is coded as?', opts:['CRRNG','CRRNF','DSSOG','BQQMF'], ans:'CRRNF' },
      { q:'A train travels 60 km in 1.5 hours. Speed?', opts:['30 km/h','40 km/h','45 km/h','50 km/h'], ans:'40 km/h' },
      { q:'Simple Interest on ₹5000 at 8% per year for 3 years?', opts:['₹1000','₹1200','₹1500','₹2000'], ans:'₹1200' },
      { q:'If 3x + 7 = 22, then x = ?', opts:['3','4','5','6'], ans:'5' },
      { q:'Odd one out: Apple, Mango, Carrot, Banana', opts:['Apple','Mango','Carrot','Banana'], ans:'Carrot' },
      { q:'Work done by 5 men in 6 days; work done by 3 men in how many days?', opts:['8','10','12','15'], ans:'10' },
      { q:'Which number is divisible by both 3 and 5?', opts:['10','15','20','25'], ans:'15' },
      { q:'A:B = 2:3, B:C = 4:5. Find A:B:C', opts:['8:12:15','2:3:5','4:6:10','2:4:5'], ans:'8:12:15' },
      { q:'Mirror image: Time shown as 7:45. Mirror image shows?', opts:['4:15','4:45','5:15','6:15'], ans:'4:15' },
      { q:'LCM of 12, 18, and 24?', opts:['36','48','72','96'], ans:'72' },
      { q:'A can do work in 10 days, B in 15 days. Together in how many days?', opts:['5','6','7','8'], ans:'6' },
      { q:'Which is the smallest prime number?', opts:['0','1','2','3'], ans:'2' },
      { q:'If PENCIL : PEN, then NOTEBOOK : ?', opts:['NOTE','BOOK','BOOKLET','NOTE BOOK'], ans:'NOTE' },
      { q:'Compound interest on ₹10,000 at 10% for 2 years?', opts:['₹2000','₹2050','₹2100','₹2200'], ans:'₹2100' },
      { q:'Data Interpretation: If 60% of 500 students passed, how many failed?', opts:['200','250','300','350'], ans:'200' },
      { q:'What comes next: Z, X, V, T, ?', opts:['Q','R','S','P'], ans:'R' },
      { q:'Profit = Selling Price - ?', opts:['Tax','Cost Price','Market Price','Discount'], ans:'Cost Price' },
      { q:'Average of 5, 10, 15, 20, 25 = ?', opts:['10','12','15','20'], ans:'15' },
      { q:'If NORTH is SOUTH, EAST is?', opts:['WEST','NORTH','EAST','SOUTH'], ans:'WEST' },
      { q:'Pipe A fills tank in 6 hrs, Pipe B drains in 12 hrs. Net fill time (both open)?', opts:['6 hrs','10 hrs','12 hrs','8 hrs'], ans:'12 hrs' },
      { q:'What percentage is 45 of 180?', opts:['20%','25%','30%','35%'], ans:'25%' },
      { q:'Statement: All dogs are animals. Conclusion: All animals are dogs. Valid?', opts:['Valid','Invalid','Partially valid','Cannot say'], ans:'Invalid' },
      { q:'Distance = Speed × ?', opts:['Force','Time','Mass','Volume'], ans:'Time' },
      { q:'If a dice shows 3 on top, what is on the bottom?', opts:['6','4','1','5'], ans:'4' },
      { q:'₹800 at 5% p.a. SI for 2 years = ?', opts:['₹80','₹880','₹960','₹900'], ans:'₹880' },
      { q:'Next: 1, 4, 9, 16, 25, ?', opts:['30','36','49','64'], ans:'36' },
      { q:'If 6 boys complete in 12 days, 9 boys complete in how many days?', opts:['6','8','9','10'], ans:'8' },
      { q:'Synonyms: APT means?', opts:['Inappropriate','Suitable','Heavy','Famous'], ans:'Suitable' },
      { q:'Cube root of 125?', opts:['5','25','15','10'], ans:'5' },
      { q:'Find odd one: Triangle, Square, Cube, Circle', opts:['Triangle','Square','Cube','Circle'], ans:'Cube' },
      { q:'Profit % if CP=200 and SP=250?', opts:['15%','20%','25%','30%'], ans:'25%' },
      { q:'Who is the father of all numbers? (Math answer)', opts:['0','1','π','e'], ans:'0' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // FREE 4: Typing Speed & English Test
  // ════════════════════════════════════════════════════════════
  'typing-english-free': {
    category: 'Tech Free', subject: 'English Grammar',
    qs: [
      { q:'Average typing speed for a professional typist?', opts:['20-30 WPM','40-50 WPM','60-80 WPM','100+ WPM'], ans:'60-80 WPM' },
      { q:'WPM stands for?', opts:['Words Per Minute','Works Per Memory','Write Per Mark','None'], ans:'Words Per Minute' },
      { q:'Which keyboard layout is most common worldwide?', opts:['DVORAK','AZERTY','QWERTY','COLEMAK'], ans:'QWERTY' },
      { q:'Correct spelling?', opts:['Accomodation','Accommodation','Acomodation','Accomadation'], ans:'Accommodation' },
      { q:'Choose correctly spelled word:', opts:['Seperate','Occured','Necessary','Definately'], ans:'Necessary' },
      { q:'Touch typing means?', opts:['Typing using one finger','Typing without looking at keyboard','Typing on touchscreen only','Typing only numbers'], ans:'Typing without looking at keyboard' },
      { q:'"Their" vs "There" — correct usage?', opts:['"Their is a problem."','"I\'ll be there."','"There book is here."','"I went their."'], ans:'"I\'ll be there."' },
      { q:'Correctly spelled?', opts:['Reciept','Receipt','Receit','Receept'], ans:'Receipt' },
      { q:'Which key deletes text to the right of cursor?', opts:['Backspace','Delete','Shift','Ctrl'], ans:'Delete' },
      { q:'CPM stands for?', opts:['Characters Per Minute','Codes Per Minute','Copies Per Machine','Count Per Module'], ans:'Characters Per Minute' },
      { q:'Correct: "She __ studying since morning."', opts:['is','was','has been','were'], ans:'has been' },
      { q:'Keyboard shortcut to Select All?', opts:['Ctrl+A','Ctrl+S','Ctrl+C','Ctrl+X'], ans:'Ctrl+A' },
      { q:'Which sentence uses "its" correctly?', opts:['"The dog lost its bone."','"Its raining today."','"Its a good day."','Both B and C'], ans:'"The dog lost its bone."' },
      { q:'Correct spelling:', opts:['Buisness','Business','Businesss','Bussiness'], ans:'Business' },
      { q:'Keyboard shortcut for Undo?', opts:['Ctrl+Z','Ctrl+Y','Ctrl+U','Ctrl+X'], ans:'Ctrl+Z' },
      { q:'Keyboarding accuracy is measured by?', opts:['Keystrokes per second','Error rate percentage','WPM only','CPM only'], ans:'Error rate percentage' },
      { q:'Correct possessive: "The students __ books were lost."', opts:['student\'s','students\'','students\'s','None'], ans:'students\'' },
      { q:'Correct spelling:', opts:['Calender','Calendar','Calandar','Calander'], ans:'Calendar' },
      { q:'"Effect" vs "Affect" — which is usually a VERB?', opts:['Effect','Affect','Both','Neither'], ans:'Affect' },
      { q:'Function row keys on keyboard are labeled?', opts:['A-Z','1-10','F1-F12','Ctrl-Alt'], ans:'F1-F12' },
      { q:'Correct: "She is taller __ her brother."', opts:['from','then','than','of'], ans:'than' },
      { q:'Professional SSC typing test requirement (English)?', opts:['25 WPM','35 WPM','40 WPM','50 WPM'], ans:'35 WPM' },
      { q:'Spelling correct?', opts:['Judgement/Judgment','Jugdement','Judgmant','Jujment'], ans:'Judgement/Judgment' },
      { q:'Press __ to move to end of line?', opts:['Home','End','PgDn','Ctrl+End'], ans:'End' },
      { q:'Antonym of "Verbose"?', opts:['Lengthy','Concise','Elaborate','Wordy'], ans:'Concise' },
      { q:'Correct sentence:', opts:['Me and him went.','Him and me went.','He and I went.','I and he went.'], ans:'He and I went.' },
      { q:'Spell check shortcut in MS Word?', opts:['F7','F5','F1','F12'], ans:'F7' },
      { q:'"Criterion" plural is?', opts:['Criterions','Criterias','Criteria','Criterium'], ans:'Criteria' },
      { q:'Keys "Home Row" in touch typing are?', opts:['Q, W, E, R, T','A, S, D, F, G, H, J, K, L','Z, X, C, V, B','1, 2, 3, 4, 5'], ans:'A, S, D, F, G, H, J, K, L' },
      { q:'Correct: "Neither the teacher nor the students __ ready."', opts:['were','was','is','are'], ans:'were' },
      { q:'Most errors while typing come from?', opts:['Wrong keyboard layout','Not looking at screen','Poor finger placement and rushing','Wrist problems only'], ans:'Poor finger placement and rushing' },
      { q:'Correct spelling:', opts:['Consious','Conscous','Conscious','Conscius'], ans:'Conscious' },
      { q:'"Whom" vs "Who" — which is used as object?', opts:['Who','Whom','Both','Neither'], ans:'Whom' },
      { q:'Keyboard "NumLock" is for?', opts:['Locking the keyboard','Enabling numeric keypad input','Locking special characters','None'], ans:'Enabling numeric keypad input' },
      { q:'DVORAK keyboard is designed for?', opts:['Gaming','Faster and more ergonomic typing','Programming only','Graphic design'], ans:'Faster and more ergonomic typing' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // FREE 5: Communication Skills Assessment
  // ════════════════════════════════════════════════════════════
  'communication-free': {
    category: 'Tech Free', subject: 'Soft Skills',
    qs: [
      { q:'Active listening involves?', opts:['Talking as much as possible','Fully focusing and responding thoughtfully','Appearing to listen while thinking of your reply','Multitasking simultaneously'], ans:'Fully focusing and responding thoughtfully' },
      { q:'Non-verbal communication includes?', opts:['Emails and texts','Body language, facial expressions, gestures','Phone calls only','Written reports'], ans:'Body language, facial expressions, gestures' },
      { q:'Purpose of an elevator pitch?', opts:['Explaining lift safety','Brief persuasive speech in 60 seconds','A long business presentation','Job interview format'], ans:'Brief persuasive speech in 60 seconds' },
      { q:'Assertive communication means?', opts:['Being aggressive','Expressing thoughts confidently while respecting others','Saying yes to everything','Avoiding all confrontation'], ans:'Expressing thoughts confidently while respecting others' },
      { q:'Best opening for a professional email?', opts:['"Yo, what\'s up"','"Dear Mr./Ms. [Name],"','"Hey!!!"','"To whom it concerns"'], ans:'"Dear Mr./Ms. [Name],"' },
      { q:'"Empathy" in communication means?', opts:['Feeling sorry only','Understanding and sharing feelings of others','Agreeing with everything','Avoiding difficult conversations'], ans:'Understanding and sharing feelings of others' },
      { q:'"Paraphrasing" means?', opts:['Copying words exactly','Restating in your own words','Interrupting the speaker','Changing the topic'], ans:'Restating in your own words' },
      { q:'Body language accounts for roughly what % of communication?', opts:['7%','About 55% of impression','100%','10%'], ans:'About 55% of impression' },
      { q:'Constructive feedback is?', opts:['Only positive comments','Specific actionable suggestions for improvement','Harsh criticism','Vague advice'], ans:'Specific actionable suggestions for improvement' },
      { q:'Effective public speaking requires?', opts:['Speaking very fast','Clear structure, eye contact, confident delivery','Reading directly from notes','Using complex vocabulary only'], ans:'Clear structure, eye contact, confident delivery' },
      { q:'Small talk\'s purpose?', opts:['Wasting time','Building rapport before important discussions','Avoiding work topics','Gossiping'], ans:'Building rapport before important discussions' },
      { q:'"Tone" in written communication is?', opts:['Volume of text','Attitude conveyed through word choice','Font style','Subject line content'], ans:'Attitude conveyed through word choice' },
      { q:'Best practice for professional email?', opts:['Using all capital letters','Being clear, concise, proper grammar','Adding many emojis','Very long paragraphs'], ans:'Being clear, concise, proper grammar' },
      { q:'"Interpersonal communication" is?', opts:['Between companies','Between individuals directly','Internal thoughts','Written only'], ans:'Between individuals directly' },
      { q:'Handling communication conflict?', opts:['Ignore it','Listen, acknowledge, find common ground','Always escalate immediately','Argue until you win'], ans:'Listen, acknowledge, find common ground' },
      { q:'7Cs of Communication include?', opts:['Clear, Concise, Correct, Complete, Coherent, Courteous, Considerate','Only Clarity and Correctness','Just Complete and Concise','Vague communication guidelines'], ans:'Clear, Concise, Correct, Complete, Coherent, Courteous, Considerate' },
      { q:'"Feedback loop" in communication means?', opts:['A technical bug','The response from receiver that completes communication cycle','Repeating the same message','A one-way broadcast'], ans:'The response from receiver that completes communication cycle' },
      { q:'Barrier to effective communication?', opts:['Clear language','Cultural differences and noise','Good listening skills','Strong vocabulary'], ans:'Cultural differences and noise' },
      { q:'What is a "memo" in professional communication?', opts:['A text message','Internal business document for announcements','A legal contract','A customer invoice'], ans:'Internal business document for announcements' },
      { q:'"Downward communication" in organizations means?', opts:['From subordinates to managers','From managers to subordinates','Between peers','External communication'], ans:'From managers to subordinates' },
      { q:'Impact of poor communication in workplace?', opts:['No impact','Misunderstandings, productivity loss, conflicts','Only minor delays','Better creativity'], ans:'Misunderstandings, productivity loss, conflicts' },
      { q:'Best way to communicate complex technical info to non-experts?', opts:['Use maximum jargon','Use simple language and analogies','Use only graphs','Send a very long email'], ans:'Use simple language and analogies' },
      { q:'"Minutes of Meeting" document is used for?', opts:['Timing meeting duration','Recording discussions and decisions from meetings','Scheduling future meetings only','Writing emails after meetings'], ans:'Recording discussions and decisions from meetings' },
      { q:'Which communication style builds best relationships?', opts:['Passive','Aggressive','Assertive','Passive-aggressive'], ans:'Assertive' },
      { q:'"Proxemics" in communication refers to?', opts:['Speaking speed','Physical space between people during communication','Eye contact rules','Voice tone'], ans:'Physical space between people during communication' },
      { q:'Best response to receiving negative feedback?', opts:['Become defensive immediately','Listen, reflect, thank, and improve','Ignore it','Argue with the giver'], ans:'Listen, reflect, thank, and improve' },
      { q:'"Lateral communication" is between?', opts:['Manager and employees','Peers at same hierarchy level','CEO and board','Company and public'], ans:'Peers at same hierarchy level' },
      { q:'Key skill for negotiations?', opts:['Always being the loudest','Active listening and finding win-win solutions','Ignoring other party\'s needs','Making ultimatums'], ans:'Active listening and finding win-win solutions' },
      { q:'"Grapevine communication" refers to?', opts:['Official channels','Informal gossip/rumor network in organizations','Agricultural communication','A type of email chain'], ans:'Informal gossip/rumor network in organizations' },
      { q:'Which factor most affects listening effectiveness?', opts:['Room temperature','Distractions and mental noise','Speaker appearance','Font size of notes'], ans:'Distractions and mental noise' },
      { q:'Difference between "hearing" and "listening"?', opts:['No difference','Hearing is passive; listening is active and intentional','Listening is passive; hearing is active','Only relevant in music'], ans:'Hearing is passive; listening is active and intentional' },
      { q:'"Written communication" advantages include?', opts:['Instantly forgotten','Permanent record, can be reviewed anytime','Real-time adjustment','Best for emotional topics'], ans:'Permanent record, can be reviewed anytime' },
      { q:'Most important quality in a good communicator?', opts:['Only speaking well','Clarity, empathy, and active listening','Using big words','Talking more than listening'], ans:'Clarity, empathy, and active listening' },
      { q:'"Formal communication" follows?', opts:['Gossip and rumors','Official channels and set protocols','Random chats','Social media posts'], ans:'Official channels and set protocols' },
      { q:'Best way to close a professional email?', opts:['"Later, bye!"','"Sincerely / Best regards, [Name]"','"K, thanks"','"See ya"'], ans:'"Sincerely / Best regards, [Name]"' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 1: CBSE Board Exams (10th & 12th)
  // ════════════════════════════════════════════════════════════
  'cbse-10-paid': {
    category: 'State Board', subject: 'CBSE Class 10',
    qs: [
      { q:'Chemical formula of Baking Soda?', opts:['NaCl','NaHCO₃','Na₂CO₃','CaCO₃'], ans:'NaHCO₃' },
      { q:'Author of "Gulliver\'s Travels"?', opts:['Charles Dickens','Jonathan Swift','Mark Twain','William Shakespeare'], ans:'Jonathan Swift' },
      { q:'SI unit of Electric Resistance?', opts:['Ampere','Volt','Ohm','Watt'], ans:'Ohm' },
      { q:'Light travels fastest in?', opts:['Water','Glass','Vacuum','Air'], ans:'Vacuum' },
      { q:'Indian Constitution was adopted on?', opts:['15 Aug 1947','26 Jan 1950','26 Nov 1949','1 Jan 1950'], ans:'26 Nov 1949' },
      { q:'Mitochondria is called?', opts:['Brain of cell','Powerhouse of cell','Storehouse of cell','Kitchen of cell'], ans:'Powerhouse of cell' },
      { q:'Chemical formula of water?', opts:['HO','H₂O','H₂O₂','HO₂'], ans:'H₂O' },
      { q:'Who wrote "Godan"?', opts:['Kabir','Munshi Premchand','Tulsidas','R. Tagore'], ans:'Munshi Premchand' },
      { q:'Pythagoras theorem: In right triangle, hypotenuse² = ?', opts:['a+b','a²-b²','a²+b²','(a+b)²'], ans:'a²+b²' },
      { q:'Which gas do plants absorb during photosynthesis?', opts:['Oxygen','Nitrogen','Carbon Dioxide','Hydrogen'], ans:'Carbon Dioxide' },
      { q:'NCERT Class 10 — "First Flight" is a?', opts:['Textbook','Science Lab Manual','English Reader','Hindi Textbook'], ans:'English Reader' },
      { q:'First PM of India?', opts:['Sardar Patel','B.R. Ambedkar','Jawaharlal Nehru','Rajendra Prasad'], ans:'Jawaharlal Nehru' },
      { q:'Valency of Carbon?', opts:['2','4','6','8'], ans:'4' },
      { q:'Area of circle formula?', opts:['2πr','πr²','πr','2πr²'], ans:'πr²' },
      { q:'Which is a vector quantity?', opts:['Speed','Mass','Temperature','Displacement'], ans:'Displacement' },
      { q:'Which hormone controls blood sugar?', opts:['Adrenaline','Thyroxine','Insulin','Cortisol'], ans:'Insulin' },
      { q:'Constitution of India — Article 21 deals with?', opts:['Right to Equality','Right to Freedom','Right to Life and Personal Liberty','Right against Exploitation'], ans:'Right to Life and Personal Liberty' },
      { q:'Ohm\'s Law: V = ?', opts:['IR','I/R','R/I','I²R'], ans:'IR' },
      { q:'pH of pure water?', opts:['0','7','14','5'], ans:'7' },
      { q:'Chapter "Nelson Mandela" is from which CBSE class textbook?', opts:['Class 8','Class 9','Class 10','Class 11'], ans:'Class 10' },
      { q:'Hereditary unit is called?', opts:['Chromosome','Nucleus','Gene','DNA sequence'], ans:'Gene' },
      { q:'GST stands for?', opts:['Goods and Services Tax','Government Sales Tax','General Sales Tax','None'], ans:'Goods and Services Tax' },
      { q:'Lens formula: 1/f = ?', opts:['1/v + 1/u','1/v - 1/u','1/u - 1/v','v/u'], ans:'1/v - 1/u' },
      { q:'Plural of "Bacterium"?', opts:['Bacteriums','Bacterias','Bacteria','Bacterium'], ans:'Bacteria' },
      { q:'Non-renewable resource example?', opts:['Solar energy','Wind energy','Petroleum','Tidal energy'], ans:'Petroleum' },
      { q:'Which metal is liquid at room temperature?', opts:['Iron','Mercury','Copper','Gold'], ans:'Mercury' },
      { q:'"Two Stories about Flying" Class 10 — Author of "His First Flight"?', opts:['Liam O\'Flaherty','Katherine Mansfield','Guy de Maupassant','Anton Chekhov'], ans:'Liam O\'Flaherty' },
      { q:'Equation of motion: v² = u² + ?', opts:['2as','at','a/2s','2a/s'], ans:'2as' },
      { q:'Which part of the human brain controls balance?', opts:['Cerebrum','Cerebellum','Medulla','Thalamus'], ans:'Cerebellum' },
      { q:'Acid present in lemon?', opts:['Citric acid','Acetic acid','Lactic acid','Tartaric acid'], ans:'Citric acid' },
      { q:'Mirror formula?', opts:['1/f = 1/v + 1/u','1/f = 1/v - 1/u','1/f = 1/u - 1/v','f = u+v'], ans:'1/f = 1/v + 1/u' },
      { q:'"A Letter to God" protagonist?', opts:['Lencho','Nelson Mandela','Anne Frank','Rajvir'], ans:'Lencho' },
      { q:'Process of formation of soil is called?', opts:['Pedogenesis','Erosion','Weathering','Decomposition'], ans:'Weathering' },
      { q:'Which planet is the closest to Sun?', opts:['Venus','Mars','Mercury','Earth'], ans:'Mercury' },
      { q:'Smallest prime number?', opts:['1','2','3','5'], ans:'2' },
    ]
  },
  'cbse-12-paid': {
    category: 'State Board', subject: 'CBSE Class 12',
    qs: [
      { q:'CBSE board full form?', opts:['Central Board of School Examination','Central Board of Secondary Education','Council of Board School Education','None'], ans:'Central Board of Secondary Education' },
      { q:'Class 12 Physics — Coulomb\'s Law gives force between?', opts:['Magnetic poles','Two point charges','Neutrons','Gravitational masses'], ans:'Two point charges' },
      { q:'Who gave the Theory of Relativity?', opts:['Isaac Newton','Niels Bohr','Albert Einstein','Max Planck'], ans:'Albert Einstein' },
      { q:'Which acid is present in vinegar?', opts:['Hydrochloric acid','Acetic acid','Sulfuric acid','Nitric acid'], ans:'Acetic acid' },
      { q:'Class 12 — Integration of e^x dx = ?', opts:['xe^x','e^x + C','e^x/x','ln(x)+C'], ans:'e^x + C' },
      { q:'Human body — largest organ?', opts:['Liver','Heart','Lung','Skin'], ans:'Skin' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 2: ICSE Board Exams
  // ════════════════════════════════════════════════════════════
  'icse-board-paid': {
    category: 'State Board', subject: 'Mixed Subjects',
    qs: [
      { q:'ICSE stands for?', opts:['Indian Certificate of School Examination','Indian Certificate of Secondary Education','International Certificate of School Education','None'], ans:'Indian Certificate of Secondary Education' },
      { q:'Who is called "Father of Economics"?', opts:['Karl Marx','J.M. Keynes','Adam Smith','Alfred Marshall'], ans:'Adam Smith' },
      { q:'Chemical symbol of Gold?', opts:['Go','Gd','Au','Ag'], ans:'Au' },
      { q:'Mitosis results in how many daughter cells?', opts:['1','2','4','8'], ans:'2' },
      { q:'Which poet wrote "Daffodils"?', opts:['John Keats','William Wordsworth','Percy Shelley','Lord Byron'], ans:'William Wordsworth' },
      { q:'Speed of sound in air at 20°C?', opts:['300 m/s','343 m/s','400 m/s','250 m/s'], ans:'343 m/s' },
      { q:'ICSE offers curriculum until which grade?', opts:['Grade 8','Grade 10','Grade 12','Grade 9'], ans:'Grade 10' },
      { q:'Formula for Density?', opts:['Mass × Volume','Mass / Volume','Volume / Mass','None'], ans:'Mass / Volume' },
      { q:'Merchant of Venice author?', opts:['Christopher Marlowe','Ben Jonson','William Shakespeare','John Donne'], ans:'William Shakespeare' },
      { q:'Universal donor blood group?', opts:['A','B','AB','O'], ans:'O' },
      { q:'Xylem transports?', opts:['Food from leaves','Water and minerals from roots','Glucose to roots','Oxygen to cells'], ans:'Water and minerals from roots' },
      { q:'Which country gifted the Statue of Liberty to the USA?', opts:['UK','Canada','France','Germany'], ans:'France' },
      { q:'Number of chromosomes in a human cell?', opts:['23','46','48','44'], ans:'46' },
      { q:'The Periodic Table was developed by?', opts:['Albert Einstein','Dmitri Mendeleev','Marie Curie','Robert Boyle'], ans:'Dmitri Mendeleev' },
      { q:'"Animal Farm" author?', opts:['J.K. Rowling','George Orwell','Aldous Huxley','H.G. Wells'], ans:'George Orwell' },
      { q:'Chemical formula for table salt?', opts:['KCl','NaCl','CaCl₂','MgCl₂'], ans:'NaCl' },
      { q:'SI unit of pressure?', opts:['Newton','Pascal','Joule','Watt'], ans:'Pascal' },
      { q:'Which ocean is the largest?', opts:['Atlantic Ocean','Indian Ocean','Pacific Ocean','Arctic Ocean'], ans:'Pacific Ocean' },
      { q:'"The Road Not Taken" — poet?', opts:['Robert Frost','Langston Hughes','Emily Dickinson','Walt Whitman'], ans:'Robert Frost' },
      { q:'Digestive enzyme in saliva?', opts:['Pepsin','Lipase','Amylase','Trypsin'], ans:'Amylase' },
      { q:'Planet closest to the Sun?', opts:['Venus','Earth','Mercury','Mars'], ans:'Mercury' },
      { q:'If x² - 5x + 6 = 0, roots are?', opts:['2 and 3','1 and 6','2 and -3','3 and -2'], ans:'2 and 3' },
      { q:'Mahatma Gandhi\'s birth date?', opts:['2 October 1869','15 August 1947','26 January 1950','30 January 1948'], ans:'2 October 1869' },
      { q:'Newton\'s third law states?', opts:['F=ma','Every action has an equal and opposite reaction','Objects at rest remain at rest','Energy is conserved'], ans:'Every action has an equal and opposite reaction' },
      { q:'"Merchant of Venice" is set in which city?', opts:['Rome','Florence','Venice','Naples'], ans:'Venice' },
      { q:'Cell membrane is made of?', opts:['Cellulose','Phospholipid bilayer','Protein only','Chitin'], ans:'Phospholipid bilayer' },
      { q:'"To Kill a Mockingbird" author?', opts:['Harper Lee','Toni Morrison','Maya Angelou','Zora Neale Hurston'], ans:'Harper Lee' },
      { q:'ICSE is affiliated to which council?', opts:['CBSE','CISCE','State government','NCERT'], ans:'CISCE' },
      { q:'Work formula?', opts:['F×d','F/d','d/F','F²×d'], ans:'F×d' },
      { q:'Refraction of light is governed by?', opts:['Hooke\'s Law','Snell\'s Law','Boyle\'s Law','Faraday\'s Law'], ans:'Snell\'s Law' },
      { q:'"Julius Caesar" is written by?', opts:['Charles Dickens','William Shakespeare','Thomas Hardy','Jane Austen'], ans:'William Shakespeare' },
      { q:'Capital of Australia?', opts:['Sydney','Melbourne','Canberra','Perth'], ans:'Canberra' },
      { q:'Plants make food through?', opts:['Respiration','Photosynthesis','Digestion','Fermentation'], ans:'Photosynthesis' },
      { q:'HCl is?', opts:['Hydrochloric acid','Hydrocarbon','Hydroxyl acid','Hydrous compound'], ans:'Hydrochloric acid' },
      { q:'What is the full form of DNA?', opts:['Department of Natural Arrangement','Deoxyribonucleic Acid','Dynamic Nuclear Assembly','Data Nucleotide Algorithm'], ans:'Deoxyribonucleic Acid' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 3: State Board (Bihar & UP — 10th & 12th)
  // ════════════════════════════════════════════════════════════
  'bihar-10-paid': {
    category: 'State Board', subject: 'Bihar Board Class 10',
    qs: [
      { q:'बिहार बोर्ड की स्थापना कब हुई? (Bihar Board established in?)', opts:['1952','1952 mein BSEB','1947','1960'], ans:'1952 mein BSEB' },
      { q:'Ohm ka Niyam (Ohm\'s Law): V = ?', opts:['IR','I/R','R/I','I+R'], ans:'IR' },
      { q:'Photosynthesis mein kaun si gas release hoti hai?', opts:['CO₂','N₂','O₂','H₂'], ans:'O₂' },
      { q:'Jal ka rasaynik sutra (Chemical formula of Water)?', opts:['HO','H₂O₂','H₂O','OH'], ans:'H₂O' },
      { q:'Bharat ka pratham rashtrapati kaun tha? (First President of India?)', opts:['Jawaharlal Nehru','Sardar Patel','Dr. Rajendra Prasad','B.R. Ambedkar'], ans:'Dr. Rajendra Prasad' },
      { q:'Aadarsh gas ka sutra (Ideal gas equation)?', opts:['PV=nRT','PV=RT','P=nRT','V=nRT/P'], ans:'PV=nRT' },
      { q:'Newton ka dwitiya niyam (Newton\'s 2nd Law): F = ?', opts:['mv','ma','m+a','m/a'], ans:'ma' },
      { q:'"Godan" kiski rachna hai? (Author of Godan?)', opts:['Premchand','Kabirdas','Tulsidas','Mahadevi Varma'], ans:'Premchand' },
      { q:'Hindi alphabet mein kitne swar hote hain? (Vowels in Hindi alphabet?)', opts:['11','13','15','16'], ans:'11' },
      { q:'Hamare Saur Mandal mein kitne grah hain? (Planets in Solar System?)', opts:['7','8','9','10'], ans:'8' },
      { q:'Glucose ka rasaynik sutra (Chemical formula of Glucose)?', opts:['C₆H₁₂O₆','C₁₂H₂₂O₁₁','CH₄','CO₂'], ans:'C₆H₁₂O₆' },
      { q:'Bharat ka Rashtriya Phool (National Flower of India)?', opts:['Gulab','Kamal (Lotus)','Champa','Jasmine'], ans:'Kamal (Lotus)' },
      { q:'Mahatma Gandhi ka pura naam (Full name of Mahatma Gandhi)?', opts:['Mohandas Karamchand Gandhi','Mahatma Mohandas Gandhi','Karamchand Mahatma Gandhi','Gopal Karamchand Gandhi'], ans:'Mohandas Karamchand Gandhi' },
      { q:'Blood group jo sabko de sakta hai (Universal Blood Donor)?', opts:['A+','B+','O+','AB+'], ans:'O+' },
      { q:'Area of Triangle = ?', opts:['base × height','½ × base × height','2 × base × height','base + height'], ans:'½ × base × height' },
      { q:'Sanvidhaan kis din laagu hua? (Constitution adopted on?)', opts:['15 August 1947','26 January 1950','26 November 1949','1 January 1950'], ans:'26 January 1950' },
      { q:'LCM of 4 and 6?', opts:['12','24','6','18'], ans:'12' },
      { q:'Bihar ki rajdhani (Capital of Bihar)?', opts:['Gaya','Muzaffarpur','Patna','Bhagalpur'], ans:'Patna' },
      { q:'Prakaash ki gati (Speed of Light)?', opts:['3×10⁸ m/s','3×10⁶ m/s','3×10¹⁰ m/s','3×10⁵ m/s'], ans:'3×10⁸ m/s' },
      { q:'Which is an acid? (Kaun sa aaml hai?)', opts:['NaOH','Ca(OH)₂','HCl','KOH'], ans:'HCl' },
      { q:'"Tulsidas" ne kaun si rachna likhi? (Famous work of Tulsidas?)', opts:['Ramcharitmanas','Godan','Gitanjali','Kamayani'], ans:'Ramcharitmanas' },
      { q:'Haemoglobin kis kaam aata hai? (Function of Haemoglobin?)', opts:['Digest food','Carry oxygen in blood','Filter blood','Fight infection'], ans:'Carry oxygen in blood' },
      { q:'Pani ka boiling point (Boiling point of water in °C)?', opts:['90°C','95°C','100°C','105°C'], ans:'100°C' },
      { q:'Proton ka charge (Charge of proton)?', opts:['Negative','Positive','Neutral','Zero'], ans:'Positive' },
      { q:'1 km = ? meter', opts:['10','100','1000','10000'], ans:'1000' },
      { q:'Bihar ka rajya pakshi (State Bird of Bihar)?', opts:['Mor','Goraiya (House Sparrow)','Pankaj','Kabutar'], ans:'Goraiya (House Sparrow)' },
      { q:'Sabse chota mahadeep (Smallest Continent)?', opts:['Asia','Africa','Australia','Europe'], ans:'Australia' },
      { q:'Inert gas example?', opts:['Hydrogen','Oxygen','Helium','Nitrogen'], ans:'Helium' },
      { q:'Magadh ki prachin rajdhani?', opts:['Patna','Rajgir','Gaya','Vaishali'], ans:'Rajgir' },
      { q:'Square root of 144?', opts:['10','12','14','16'], ans:'12' },
      { q:'Buddhism ke sansthapak kaun the?', opts:['Mahavira','Gautama Buddha','Ashoka','Chandragupta'], ans:'Gautama Buddha' },
      { q:'Nitrogen gas atmosphere mein kitni hai?', opts:['21%','78%','0.03%','1%'], ans:'78%' },
      { q:'Sun is a?', opts:['Planet','Star','Satellite','Comet'], ans:'Star' },
      { q:'Acid Rain is caused by?', opts:['SO2 & NO2','CO2','O2','N2'], ans:'SO2 & NO2' },
      { q:'First Man on Moon?', opts:['Neil Armstrong','Yuri Gagarin','Rakesh Sharma','Buzz Aldrin'], ans:'Neil Armstrong' },
    ]
  },
  'bihar-12-science-paid': {
    category: 'State Board', subject: 'Bihar Board Class 12 Science',
    qs: [
      { q:'Integration of 1/x dx?', opts:['ln|x| + C','x²','1','log(x)'], ans:'ln|x| + C' },
      { q:'BSEB full form?', opts:['Bihar School Examination Board','Bihar Secondary Education Board','Bihar State Education Board','None'], ans:'Bihar School Examination Board' },
      { q:'Charge of an electron?', opts:['-1.6 × 10⁻¹⁹ C','1.6 × 10⁻¹⁹ C','9.1 × 10⁻³¹ C','None'], ans:'-1.6 × 10⁻¹⁹ C' },
      { q:'Class 12 Bihar Board — "Digant Part 2" is for?', opts:['Hindi','English','Mathematics','History'], ans:'Hindi' },
      { q:'Derivative of tan(x)?', opts:['sec²(x)','-cosec²(x)','sec(x)tan(x)','cos(x)'], ans:'sec²(x)' },
      { q:'Who is the father of Indian Constitution?', opts:['Mahatma Gandhi','Sardar Patel','Dr. B.R. Ambedkar','Jawaharlal Nehru'], ans:'Dr. B.R. Ambedkar' },
      { q:'pH of blood?', opts:['6.4','7.4','8.4','7.0'], ans:'7.4' },
      { q:'Which is NOBLE gas?', opts:['Neon','Chlorine','Fluorine','Oxygen'], ans:'Neon' },
      { q:'Integration of 1/(1+x²) dx?', opts:['tan⁻¹(x) + C','sin⁻¹(x) + C','log|1+x²|','None'], ans:'tan⁻¹(x) + C' },
      { q:'Unit of magnetic field?', opts:['Tesla','Ampere','Volt','Watt'], ans:'Tesla' },
      { q:'Human Heart has how many chambers?', opts:['2','3','4','1'], ans:'4' },
      { q:'Chemical formula of Ozone?', opts:['O₂','O₃','O','O₄'], ans:'O₃' },
      { q:'Father of Biology?', opts:['Aristotle','Darwin','Lamarck','Newton'], ans:'Aristotle' },
      { q:'Derivative of sin⁻¹(x)?', opts:['1/√(1-x²)','-1/√(1-x²)','1/(1+x²)','None'], ans:'1/√(1-x²)' },
      { q:'Electric potential is a?', opts:['Scalar quantity','Vector quantity','Tensor','None'], ans:'Scalar quantity' },
      { q:'Bohr model is for?', opts:['Hydrogen atom','Multielectron atoms','Nucleus','Neutron'], ans:'Hydrogen atom' },
      { q:'Total number of bones in human adult?', opts:['200','206','300','250'], ans:'206' },
      { q:'Functional group of Aldehyde?', opts:['-CHO','-CO-','-COOH','-OH'], ans:'-CHO' },
      { q:'Mendeleev Periodic Table is based on?', opts:['Atomic number','Atomic mass','Volume','None'], ans:'Atomic mass' },
      { q:'Integration of sin(2x) dx?', opts:['-cos(2x)/2 + C','sin(2x)/2','cos(2x)','None'], ans:'-cos(2x)/2 + C' },
      { q:'Which lens is used for Myopia?', opts:['Concave','Convex','Cylindrical','None'], ans:'Concave' },
      { q:'Power of a lens is P = ?', opts:['1/f','f','2f','f/2'], ans:'1/f' },
      { q:'Unit of capacitance?', opts:['Farad','Ohm','Tesla','Henry'], ans:'Farad' },
      { q:'Who discovered the Nucleus of atom?', opts:['Rutherford','Bohr','Thomson','Dalton'], ans:'Rutherford' },
      { q:'Is glass a crystalline solid?', opts:['No, it is amorphous','Yes','Depends','None'], ans:'No, it is amorphous' },
      { q:'"Indian Civilization and Culture" Class 12 Author?', opts:['Mahatma Gandhi','Dr. Zakir Hussain','Manohar Malgonkar','Martin Luther King Jr.'], ans:'Mahatma Gandhi' },
      { q:'Value of Sin 90°?', opts:['0','1','1/2','√3/2'], ans:'1' },
      { q:'Matrix A where A = Aᵀ is called?', opts:['Symmetric','Skew-symmetric','Identity','Null'], ans:'Symmetric' },
      { q:'Vector quantity example?', opts:['Force','Work','Energy','Speed'], ans:'Force' },
      { q:'Smallest unit of heredity?', opts:['Gene','Cell','Nucleus','DNA'], ans:'Gene' },
      { q:'Which metal is stored in kerosene?', opts:['Sodium','Iron','Gold','Silver'], ans:'Sodium' },
      { q:'Bohr radius for hydrogen is?', opts:['0.529 Å','1 Å','0.1 Å','None'], ans:'0.529 Å' },
      { q:'Integration of eˣ(f(x) + f\'(x)) dx?', opts:['eˣ f(x) + C','eˣ + C','f(x) + C','None'], ans:'eˣ f(x) + C' },
      { q:'Refractive index of diamond?', opts:['1.5','2.42','1.33','1.0'], ans:'2.42' },
      { q:'Father of Indian Physics?', opts:['C.V. Raman','Homi Bhabha','Vikram Sarabhai','S.N. Bose'], ans:'C.V. Raman' },
    ]
  },
  'bihar-12-arts-paid': {
    category: 'State Board', subject: 'Bihar Board Class 12 Arts',
    qs: [
      { q:'Who was the founder of Mughal Empire in India?', opts:['Akbar','Babur','Humayun','Aurangzeb'], ans:'Babur' },
      { q:'Indus Valley Civilization Harappa site is located near which river?', opts:['Indus','Ravi','Sutlej','Ganges'], ans:'Ravi' },
      { q:'Which ashrama represents student life in ancient India?', opts:['Brahmacharya','Grihastha','Vanaprastha','Sannyasa'], ans:'Brahmacharya' },
      { q:'The famous book "Discovery of India" was written by?', opts:['Mahatma Gandhi','Jawaharlal Nehru','Rabindranath Tagore','Subhas Chandra Bose'], ans:'Jawaharlal Nehru' },
      { q:'Who was the president of the Constituent Assembly of India?', opts:['Dr. B.R. Ambedkar','Dr. Rajendra Prasad','Jawaharlal Nehru','Sardar Patel'], ans:'Dr. Rajendra Prasad' },
      { q:'In which year did the Jallianwala Bagh massacre take place?', opts:['1915','1919','1921','1929'], ans:'1919' },
      { q:'Which movement was started by Mahatma Gandhi after the Chauri Chaura incident was called off?', opts:['Non-Cooperation Movement','Quit India Movement','Civil Disobedience Movement','Champaran Satyagraha'], ans:'Non-Cooperation Movement' },
      { q:'The Constitution of India came into force on?', opts:['15 August 1947','26 January 1950','26 November 1949','30 January 1948'], ans:'26 January 1950' },
      { q:'Who is known as the "Iron Man of India"?', opts:['Subhas Chandra Bose','Sardar Vallabhbhai Patel','Lal Bahadur Shastri','Bal Gangadhar Tilak'], ans:'Sardar Vallabhbhai Patel' },
      { q:'The famous slogan "Swaraj is my birthright and I shall have it" was given by?', opts:['Bal Gangadhar Tilak','Lala Lajpat Rai','Bipin Chandra Pal','Bhagat Singh'], ans:'Bal Gangadhar Tilak' },
      { q:'Which planet is nearest to the Sun?', opts:['Venus','Earth','Mercury','Mars'], ans:'Mercury' },
      { q:'Which state is the largest producer of rice in India?', opts:['West Bengal','Punjab','Uttar Pradesh','Andhra Pradesh'], ans:'West Bengal' },
      { q:'Which river is known as the "Sorrow of Bihar"?', opts:['Ganges','Kosi','Gandak','Sone'], ans:'Kosi' },
      { q:'The oldest mountain range in India is?', opts:['Himalayas','Aravalli Range','Western Ghats','Satpura Range'], ans:'Aravalli Range' },
      { q:'What is the capital of Bihar?', opts:['Gaya','Patna','Muzaffarpur','Bhagalpur'], ans:'Patna' },
      { q:'Which soil is best suited for cotton cultivation?', opts:['Alluvial Soil','Black Soil (Regur)','Red Soil','Laterite Soil'], ans:'Black Soil (Regur)' },
      { q:'Which is the largest ocean in the world?', opts:['Atlantic Ocean','Indian Ocean','Pacific Ocean','Arctic Ocean'], ans:'Pacific Ocean' },
      { q:'Bhakti movement in South India was led by?', opts:['Alvars & Nayanars','Kabir','Ramanuja','Basavanna'], ans:'Alvars & Nayanars' },
      { q:'Who wrote the famous epic "Ramcharitmanas"?', opts:['Valmiki','Tulsidas','Kabir','Surdas'], ans:'Tulsidas' },
      { q:'The third battle of Panipat was fought in the year?', opts:['1526','1556','1761','1857'], ans:'1761' },
      { q:'Who was the author of "Arthashastra"?', opts:['Megasthenes','Chanakya (Kautilya)','Kalidasa','Aryabhata'], ans:'Chanakya (Kautilya)' },
      { q:'Which fundamental right is called the "Heart and Soul of the Constitution" by Dr. Ambedkar?', opts:['Right to Equality','Right to Freedom','Right to Constitutional Remedies','Right to Freedom of Religion'], ans:'Right to Constitutional Remedies' },
      { q:'How many fundamental duties are prescribed in the Indian Constitution?', opts:['10','11','12','9'], ans:'11' },
      { q:'Who appoints the Governor of a State in India?', opts:['Prime Minister','Chief Justice of India','President of India','Chief Minister'], ans:'President of India' },
      { q:'What is the minimum age to qualify for election to the Lok Sabha?', opts:['18 years','21 years','25 years','30 years'], ans:'25 years' },
      { q:'The headquarters of the United Nations is located in?', opts:['London','Geneva','New York','Paris'], ans:'New York' },
      { q:'Who is considered the founder of Jainism?', opts:['Rishabhadeva','Mahavira','Gautama Buddha','Parshvanatha'], ans:'Rishabhadeva' },
      { q:'Which script is used to write Hindi language?', opts:['Devanagari','Brahmi','Gurmukhi','Roman'], ans:'Devanagari' },
      { q:'"Godan" is a famous Hindi novel written by?', opts:['Munshi Premchand','Harivansh Rai Bachchan','Mahadevi Varma','Ramdhari Singh Dinkar'], ans:'Munshi Premchand' },
      { q:'Which Indian state has the highest literacy rate?', opts:['Kerala','Tamil Nadu','Delhi','Mizoram'], ans:'Kerala' },
      { q:'Who composed the national song "Vande Mataram"?', opts:['Rabindranath Tagore','Bankim Chandra Chatterjee','Sarojini Naidu','Subhas Chandra Bose'], ans:'Bankim Chandra Chatterjee' },
      { q:'The French Revolution started in the year?', opts:['1789','1776','1815','1917'], ans:'1789' },
      { q:'In which state is the ancient university of Nalanda located?', opts:['Uttar Pradesh','Bihar','West Bengal','Odisha'], ans:'Bihar' },
      { q:'Which layer of the atmosphere contains the Ozone layer?', opts:['Troposphere','Stratosphere','Mesosphere','Thermosphere'], ans:'Stratosphere' },
      { q:'Which is the smallest state of India by area?', opts:['Sikkim','Goa','Tripura','Manipur'], ans:'Goa' }
    ]
  },
  'up-10-paid': {
    category: 'State Board', subject: 'UP Board Class 10',
    qs: [
      { q:'UP Board kin classes ke liye hai? (UP Board is for which classes?)', opts:['9-10 only','1-8 only','9-12','11-12 only'], ans:'9-12' },
      { q:'UP ki rajdhani (Capital of Uttar Pradesh)?', opts:['Varanasi','Agra','Allahabad','Lucknow'], ans:'Lucknow' },
      { q:'"Tulsidas" ne kaun si rachna likhi? (Famous work of Tulsidas?)', opts:['Ramcharitmanas','Godan','Gitanjali','Kamayani'], ans:'Ramcharitmanas' },
      { q:'Electricity — unit of Power?', opts:['Volt','Ampere','Watt','Joule'], ans:'Watt' },
      { q:'Mitosis ho sakti hai? (Mitosis occurs in which cells?)', opts:['Only germ cells','Only body (somatic) cells','Both germ and somatic','Neither'], ans:'Only body ( somatic ) cells' },
      { q:'Bharat mein kitne rajya hain? (States in India as of 2019?)', opts:['25','28','29','30'], ans:'28' },
      { q:'Aankh ka kya kaam hai? (Function of the eye lens?)', opts:['Produce light','Focus image on retina','Detect color','Produce tears'], ans:'Focus image on retina' },
      { q:'"Kabirdas" kab ke kavi the? (Kabirdas was a poet of which era?)', opts:['Modern period','Medieval period (Bhakti Movement)','Ancient period','Colonial period'], ans:'Medieval period (Bhakti Movement)' },
      { q:'Simple Interest formula?', opts:['P×R×T/100','P+R+T','P×R/100','P/R×T'], ans:'P×R×T/100' },
      { q:'Haemoglobin kis kaam aata hai? (Function of Haemoglobin?)', opts:['Digest food','Carry oxygen in blood','Filter blood','Fight infection'], ans:'Carry oxygen in blood' },
      { q:'Pani ka boiling point (Boiling point of water in °C)?', opts:['90°C','95°C','100°C','105°C'], ans:'100°C' },
      { q:'"Rashtriya Geet" kaun sa hai? (National Song of India?)', opts:['Jana Gana Mana','Vande Mataram','Saare Jahan Se Achha','Jai Hind'], ans:'Vande Mataram' },
      { q:'"Rashtriya Gaan" kaun sa hai? (National Anthem of India?)', opts:['Jana Gana Mana','Vande Mataram','Jai Hind','Saare Jahan'], ans:'Jana Gana Mana' },
      { q:'UP Board established in?', opts:['1921','1947','1950','1960'], ans:'1921' },
      { q:'High Court of UP sits in?', opts:['Lucknow','Kanpur','Allahabad (Prayagraj)','Varanasi'], ans:'Allahabad (Prayagraj)' },
      { q:'UP Board High School topper marks are calculated in?', opts:['Percentage (%)','CGPA','Grades','None'], ans:'Percentage (%)' },
      { q:'Author of "Kamayani"?', opts:['Jaishankar Prasad','Premchand','Mahadevi Varma','Tulsidas'], ans:'Jaishankar Prasad' },
      { q:'"Buddhacharita" was written by?', opts:['Ashvaghosha','Kalidasa','Banabhatta','Tulsidas'], ans:'Ashvaghosha' },
      { q:'UP ka pratik chinh (Symbol of UP Gov)?', opts:['Dhanush aur Machli','Mor','Sher','Hathi'], ans:'Dhanush aur Machli' },
      { q:'Atomic number of Hydrogen?', opts:['1','2','3','4'], ans:'1' },
      { q:'Largest state of India by population?', opts:['Bihar','UP','Maharashtra','WB'], ans:'UP' },
      { q:'Acid in Tamarind (Imli)?', opts:['Tartaric acid','Citric acid','Acetic acid','Lactic acid'], ans:'Tartaric acid' },
      { q:'Who is called "The Iron Man of India"?', opts:['Sardar Patel','Mahatma Gandhi','Nehru','Subhash Bose'], ans:'Sardar Patel' },
      { q:'Discovery of Cell?', opts:['Robert Hooke','Leeuwenhoek','Brown','Schwann'], ans:'Robert Hooke' },
      { q:'Capital of India?', opts:['Mumbai','Kolkata','Delhi','Chennai'], ans:'Delhi' },
      { q:'Area of square?', opts:['side × side','4 × side','side + side','2 × side'], ans:'side × side' },
      { q:'Holi is the festival of?', opts:['Light','Colors','Harvest','None'], ans:'Colors' },
      { q:'National river of India?', opts:['Yamuna','Ganga','Narmada','Tapi'], ans:'Ganga' },
      { q:'Sound cannot travel through?', opts:['Water','Air','Steel','Vacuum'], ans:'Vacuum' },
      { q:'Process of water changing into vapor?', opts:['Evaporation','Condensation','Freezing','Melting'], ans:'Evaporation' },
      { q:'"Surdas" was a devotee of?', opts:['Lord Rama','Lord Krishna','Lord Shiva','Goddess Durga'], ans:'Lord Krishna' },
      { q:'The word "Satyameva Jayate" is from?', opts:['Mundaka Upanishad','Ramayana','Gita','Veda'], ans:'Mundaka Upanishad' },
      { q:'Total number of vowels in English?', opts:['5','7','21','26'], ans:'5' },
      { q:'Which animal is known as Ship of Desert?', opts:['Lion','Camel','Horse','Elephant'], ans:'Camel' },
      { q:'1 Ton = ? kg', opts:['100','500','1000','2000'], ans:'1000' },
    ]
  },
  'up-12-paid': {
    category: 'State Board', subject: 'UP Board Class 12',
    qs: [
      { q:'UP Board Intermediate exams correspond to?', opts:['Class 10','Class 11','Class 12','Class 12+'], ans:'Class 12' },
      { q:'UP Board headquarter location?', opts:['Lucknow','Prayagraj (Allahabad)','Meerut','Varanasi'], ans:'Prayagraj (Allahabad)' },
      { q:'Integration of sec²(x) dx?', opts:['tan(x) + C','sec(x) + C','log|sec x|','None'], ans:'tan(x) + C' },
      { q:'Newton\'s 1st Law is also known as?', opts:['Law of Inertia','Law of Acceleration','Law of Action-Reaction','None'], ans:'Law of Inertia' },
      { q:'Chemical name of Gypsum?', opts:['CaSO₄·2H₂O','CuSO₄','MgSO₄','None'], ans:'CaSO₄·2H₂O' },
      { q:'Class 12 UP Board - English poetry "My Mother at Sixty-Six" author?', opts:['Kamala Das','Stephen Spender','Robert Frost','John Keats'], ans:'Kamala Das' },
      { q:'Derivative of log(sin x)?', opts:['cot x','tan x','1/sin x','None'], ans:'cot x' },
      { q:'Functional group of Ether?', opts:['-O-','-CO-','-CHO','-COOH'], ans:'-O-' },
      { q:'Refractive index of Glass (general)?', opts:['1.5','1.33','2.42','1.0'], ans:'1.5' },
      { q:'Total resistance in series?', opts:['R1 + R2','1/R1 + 1/R2','R1 × R2','None'], ans:'R1 + R2' },
      { q:'Human eye — Part that controls light entry?', opts:['Iris','Pupil','Lens','Retina'], ans:'Pupil' },
      { q:'Which mirror is used as a rear-view mirror?', opts:['Concave','Convex','Plane','None'], ans:'Convex' },
      { q:'Derivative of e^(2x)?', opts:['2e^(2x)','e^(2x)','e^x','2e^x'], ans:'2e^(2x)' },
      { q:'Integration of 1/√(x) dx?', opts:['2√x + C','√x','1/2√x','None'], ans:'2√x + C' },
      { q:'Identity Matrix property?', opts:['AI = A','AI = I','AI = 0','None'], ans:'AI = A' },
      { q:'Who is called the Father of Chemistry?', opts:['Lavoisier','Dalton','Mendeleev','Bohr'], ans:'Lavoisier' },
      { q:'Unit of resistance?', opts:['Ohm','Volt','Ampere','Watt'], ans:'Ohm' },
      { q:'X-Rays were discovered by?', opts:['Roentgen','Curie','Thomson','Bohr'], ans:'Roentgen' },
      { q:'Isotope of Hydrogen?', opts:['Deuterium','Helium','Lithium','None'], ans:'Deuterium' },
      { q:'Power formula P = ?', opts:['VI','I²R','V²/R','All of these'], ans:'All of these' },
      { q:'Integration of zero dx?', opts:['Constant C','0','1','x'], ans:'Constant C' },
      { q:'Magnetic flux unit?', opts:['Weber','Tesla','Henry','Farad'], ans:'Weber' },
      { q:'The chemical name of aspirin is?', opts:['Acetylsalicylic acid','Citric acid','Acetic acid','None'], ans:'Acetylsalicylic acid' },
      { q:'DNA replication occurs in?', opts:['S-phase','G1-phase','M-phase','G2-phase'], ans:'S-phase' },
      { q:'Father of Indian Industry?', opts:['J.N. Tata','Ambani','Birla','None'], ans:'J.N. Tata' },
      { q:'Work done in a closed path for conservative force?', opts:['Zero','Max','Min','None'], ans:'Zero' },
      { q:'Angle of minimum deviation for prism?', opts:['δ = (μ-1)A','A','μA','None'], ans:'δ = (μ-1)A' },
      { q:'Bioluminescence is shown by?', opts:['Firefly','Dog','Cat','Man'], ans:'Firefly' },
      { q:'Acid in Ant sting?', opts:['Methanoic acid','Citric acid','Acetic acid','Lactic acid'], ans:'Methanoic acid' },
      { q:'"Wings of Fire" author?', opts:['A.P.J. Abdul Kalam','Nehru','Gandhi','Bose'], ans:'A.P.J. Abdul Kalam' },
      { q:'Atomic number of Oxygen?', opts:['6','8','10','16'], ans:'8' },
      { q:'Smallest bone in human body?', opts:['Stapes','Femur','Skull','Rib'], ans:'Stapes' },
      { q:'Speed of sound is max in?', opts:['Steel','Water','Air','Vacuum'], ans:'Steel' },
      { q:'Which is an inert gas?', opts:['Argon','Nitrogen','Oxygen','Hydrogen'], ans:'Argon' },
      { q:'Integration of tan x dx?', opts:['log|sec x| + C','log|sin x|','sec²x','None'], ans:'log|sec x| + C' },
    ]
  },
  'punjab-10-paid': {
    category: 'State Board', subject: 'Punjab Board Class 10',
    qs: [
      { q:'PSEB stands for?', opts:['Punjab School Education Board','Punjab Secondary Education Board','Punjab State Education Board','None'], ans:'Punjab School Education Board' },
      { q:'Capital of Punjab?', opts:['Chandigarh','Ludhiana','Amritsar','Patiala'], ans:'Chandigarh' },
      { q:'Major crop of Punjab?', opts:['Wheat','Cotton','Rice','Tea'], ans:'Wheat' },
      { q:'Process of soil reclamation in Punjab?', opts:['Afforestation','Green Revolution methods','Irrigation control','None'], ans:'Green Revolution methods' },
      { q:'Punjab is known as?', opts:['Land of Five Rivers','Land of Gold','Heart of India','None'], ans:'Land of Five Rivers' },
      { q:'Area of circle with radius r?', opts:['πr²','2πr','πr','2π'], ans:'πr²' },
      { q:'Who founded the Sikh religion?', opts:['Guru Nanak Dev','Guru Gobind Singh','Guru Arjan Dev','None'], ans:'Guru Nanak Dev' },
      { q:'PSEB headquarter?', opts:['Mohali','Chandigarh','Ludhiana','Amritsar'], ans:'Mohali' },
      { q:'Atomic number of Carbon?', opts:['6','8','12','1'], ans:'6' },
      { q:'Punjab Board (PSEB) Class 10th science medium?', opts:['Punjabi','English','Hindi','All of these'], ans:'All of these' },
      { q:'Unit of Electric Current?', opts:['Ampere','Volt','Watt','Ohm'], ans:'Ampere' },
      { q:'Which is a renewable source of energy?', opts:['Solar','Coal','Petrol','Natural Gas'], ans:'Solar' },
      { q:'Chemical formula for Salt?', opts:['NaCl','NaOH','HCl','KOH'], ans:'NaCl' },
      { q:'Square root of 225?', opts:['15','25','12','20'], ans:'15' },
      { q:'First Guru of Sikhs?', opts:['Guru Nanak Dev Ji','Guru Angad Dev Ji','Guru Ram Das Ji','None'], ans:'Guru Nanak Dev Ji' },
      { q:'"Golden Temple" is located in?', opts:['Amritsar','Ludhiana','Patiala','Bhatinda'], ans:'Amritsar' },
      { q:'The Green Revolution started in?', opts:['1960s','1980s','1940s','2000s'], ans:'1960s' },
      { q:'1 kg-wt is equal to?', opts:['9.8 N','10 N','1 N','None'], ans:'9.8 N' },
      { q:'Largest district of Punjab?', opts:['Ludhiana','Sangrur','Amritsar','Ferozepur'], ans:'Ludhiana' },
      { q:'Human body temperature (normal) in °C?', opts:['37°C','98.6°C','30°C','40°C'], ans:'37°C' },
      { q:'The river Satluj passes through?', opts:['Punjab','Bihar','UP','Kerala'], ans:'Punjab' },
      { q:'Smallest state of India by area?', opts:['Goa','Sikkim','Punjab','Haryana'], ans:'Goa' },
      { q:'Functional group of Carboxylic acid?', opts:['-COOH','-OH','-CHO','-CO'], ans:'-COOH' },
      { q:'The chemical formula of methane is?', opts:['CH₄','C₂H₆','C₃H₈','C₄H₁₀'], ans:'CH₄' },
      { q:'Who gave the "Law of Octaves"?', opts:['Newlands','Mendeleev','Dobereiner','Moseley'], ans:'Newlands' },
      { q:'Which acid is in curd?', opts:['Lactic acid','Citric acid','Acetic acid','Formic acid'], ans:'Lactic acid' },
      { q:'Sunlight takes approx how much time to reach Earth?', opts:['8 mins','1 min','20 mins','5 mins'], ans:'8 mins' },
      { q:'National flower of India?', opts:['Lotus','Rose','Jasmine','Marigold'], ans:'Lotus' },
      { q:'Which gas is filled in balloons?', opts:['Helium','Nitrogen','Hydrogen','Carbon Dioxide'], ans:'Helium' },
      { q:'Sum of angles in a triangle?', opts:['90°','180°','360°','270°'], ans:'180°' },
      { q:'Value of Pi (approx)?', opts:['3.14','2.14','4.14','1.14'], ans:'3.14' },
      { q:'The primary colors are?', opts:['Red, Blue, Green','Black, White, Gray','Pink, Yellow, Orange','None'], ans:'Red, Blue, Green' },
      { q:'Number of teeth in adult human?', opts:['28','30','32','34'], ans:'32' },
      { q:'Who invented the Light Bulb?', opts:['Thomas Edison','Tesla','Newton','Einstein'], ans:'Thomas Edison' },
      { q:'"Vande Mataram" was written by?', opts:['Bankim Chandra Chattopadhyay','Rabindranath Tagore','Mahatma Gandhi','None'], ans:'Bankim Chandra Chattopadhyay' },
    ]
  },
  'punjab-12-paid': {
    category: 'State Board', subject: 'Punjab Board Class 12',
    qs: [
      { q:'Class 12 PSEB — "General English" is compulsory?', opts:['Yes','No','Optional','None'], ans:'Yes' },
      { q:'Integration of 1/(x ln x) dx?', opts:['ln|ln x| + C','ln x','1/x','None'], ans:'ln|ln x| + C' },
      { q:'Unit of resistivity?', opts:['Ohm-meter','Ohm','Volt','Ampere'], ans:'Ohm-meter' },
      { q:'Physics — Focal length of plane mirror?', opts:['Infinity','Zero','10cm','1m'], ans:'Infinity' },
      { q:'Chemical name of Bleaching Powder?', opts:['Calcium Oxychloride (CaOCl₂)','NaCl','NaHCO₃','None'], ans:'Calcium Oxychloride (CaOCl₂)' },
      { q:'Who is the tenth Guru of Sikhs?', opts:['Guru Gobind Singh Ji','Guru Nanak Dev Ji','Guru Tegh Bahadur Ji','None'], ans:'Guru Gobind Singh Ji' },
      { q:'PSEB Class 12th commerce subject example?', opts:['Accountancy','Physics','Biology','None'], ans:'Accountancy' },
      { q:'Derivative of cos⁻¹(x)?', opts:['-1/√(1-x²)','1/√(1-x²)','1/(1+x²)','None'], ans:'-1/√(1-x²)' },
      { q:'Functional group of Ketone?', opts:['-CO-','-CHO','-COOH','-OH'], ans:'-CO-' },
      { q:'Integration of xⁿ dx?', opts:['(xⁿ⁺¹)/(n+1) + C','nxⁿ⁻¹','xⁿ','None'], ans:'(xⁿ⁺¹)/(n+1) + C' },
      { q:'Magnetic permeability of vacuum?', opts:['4π × 10⁻⁷ T m/A','1','0','None'], ans:'4π × 10⁻⁷ T m/A' },
      { q:'Speed of light in water?', opts:['2.25 × 10⁸ m/s','3 × 10⁸ m/s','2 × 10⁸ m/s','None'], ans:'2.25 × 10⁸ m/s' },
      { q:'Chemical formula of Rust?', opts:['Fe₂O₃·xH₂O','FeO','Fe₃O₄','None'], ans:'Fe₂O₃·xH₂O' },
      { q:'Who discovered Neutron?', opts:['James Chadwick','Thomson','Rutherford','Bohr'], ans:'James Chadwick' },
      { q:'Integration of sec(x) dx?', opts:['log|sec x + tan x| + C','sec x tan x','log|sin x|','None'], ans:'log|sec x + tan x| + C' },
      { q:'Rank of a matrix — Is it unique?', opts:['Yes','No','Depends','None'], ans:'Yes' },
      { q:'Vector dot product of î·ĵ?', opts:['0','1','k̂','None'], ans:'0' },
      { q:'SI unit of Luminous Intensity?', opts:['Candela','Lumen','Lux','Watt'], ans:'Candela' },
      { q:'The gas used in fluorescent tubes?', opts:['Mercury vapor & Argon','Oxygen','Nitrogen','CO2'], ans:'Mercury vapor & Argon' },
      { q:'Alcoholic fermentation is done by?', opts:['Yeast','Bacteria','Virus','Amoeba'], ans:'Yeast' },
      { q:'Who is called the Father of Computer?', opts:['Charles Babbage','Alan Turing','Bill Gates','None'], ans:'Charles Babbage' },
      { q:'Full form of LAN?', opts:['Local Area Network','Large Area Node','Link All Nodes','None'], find: 'Local Area Network', ans:'Local Area Network' },
      { q:'Sum of two sides of triangle is always?', opts:['Greater than 3rd side','Smaller than 3rd side','Equal to 3rd side','None'], ans:'Greater than 3rd side' },
      { q:'Integration of 1 dx?', opts:['x + C','0','1','C'], ans:'x + C' },
      { q:'The chemical formula of sulfuric acid is?', opts:['H₂SO₄','HCl','HNO₃','H₃PO₄'], ans:'H₂SO₄' },
      { q:'Who proposed the atomic theory?', opts:['John Dalton','Rutherford','Bohr','Einstein'], ans:'John Dalton' },
      { q:'Which is the largest gland in the body?', opts:['Liver','Pancreas','Pituitary','Thyroid'], ans:'Liver' },
      { q:'Current carrier in metals?', opts:['Electrons','Protons','Ions','Neutrons'], ans:'Electrons' },
      { q:'Newton is a unit of?', opts:['Force','Work','Power','Energy'], ans:'Force' },
      { q:'Angle between electric field and equipotential surface?', opts:['90°','0°','45°','180°'], ans:'90°' },
      { q:'The value of G (gravitational constant) is?', opts:['6.67 × 10⁻¹¹ N m²/kg²','9.8','1.6','None'], ans:'6.67 × 10⁻¹¹ N m²/kg²' },
      { q:'Integration of log x dx?', opts:['x log x - x + C','1/x','log x','None'], ans:'x log x - x + C' },
      { q:'Who is the Author of "Deep Water"?', opts:['William Douglas','Anees Jung','Louis Fischer','John Keats'], ans:'William Douglas' },
      { q:'Refractive index of water?', opts:['1.33','1.5','2.42','1.0'], ans:'1.33' },
      { q:'Number of states in USA?', opts:['50','51','48','45'], ans:'50' },
    ]
  },


  // ════════════════════════════════════════════════════════════
  // PAID 4: JEE Main
  // ════════════════════════════════════════════════════════════
  'jee-main-paid': {
    category: 'National Exam', subject: 'Physics, Chemistry, Mathematics',
    qs: [
      { q:'Dimensional formula of force?', opts:['[MLT⁻¹]','[MLT⁻²]','[ML²T⁻²]','[M⁰LT⁻²]'], ans:'[MLT⁻²]' },
      { q:'Integration of sin(x) dx?', opts:['cos(x)+C','-cos(x)+C','sin(x)+C','-sin(x)+C'], ans:'-cos(x)+C' },
      { q:'Molecular formula of Benzene?', opts:['C₆H₁₂','C₆H₆','C₆H₁₄','CH₄'], ans:'C₆H₆' },
      { q:'If f(x) = x², then f\'(x) = ?', opts:['x','2x','x²','2x²'], ans:'2x' },
      { q:'Magnetic field unit in SI?', opts:['Newton','Gauss','Tesla','Ampere'], ans:'Tesla' },
      { q:'Faraday\'s Law of Electrolysis relates to?', opts:['Light reflection','Amount of substance deposited during electrolysis','Electromagnetic induction','Radioactivity'], ans:'Amount of substance deposited during electrolysis' },
      { q:'∫₀¹ x² dx = ?', opts:['1/2','1/3','1/4','2/3'], ans:'1/3' },
      { q:'De Broglie wavelength formula?', opts:['λ = h/mv','λ = mv/h','λ = hm/v','λ = v/mh'], ans:'λ = h/mv' },
      { q:'Hybridization of carbon in ethylene (C₂H₄)?', opts:['sp','sp²','sp³','sp³d'], ans:'sp²' },
      { q:'Roots of x² - 5x + 6 = 0?', opts:['2, 3','-2, -3','1, 6','-1, -6'], ans:'2, 3' },
      { q:'Escape velocity from Earth\'s surface (approx)?', opts:['11.2 km/s','7.9 km/s','3 km/s','9.8 km/s'], ans:'11.2 km/s' },
      { q:'Bohr\'s model gives radius of nth orbit as?', opts:['rₙ = n²a₀','rₙ = na₀','rₙ = n/a₀','rₙ = a₀/n²'], ans:'rₙ = n²a₀' },
      { q:'Number of atoms in one mole?', opts:['6.023×10²³','3.016×10²³','12×10²³','1.6×10⁻¹⁹'], ans:'6.023×10²³' },
      { q:'Derivative of ln(x)?', opts:['x','1/x','ln(x)/x','e/x'], ans:'1/x' },
      { q:'Young\'s modulus measures?', opts:['Elasticity of material','Magnetic permeability','Viscosity','Thermal expansion'], ans:'Elasticity of material' },
      { q:'Law of Conservation of Energy states?', opts:['Energy can be created','Energy is always lost','Total energy of isolated system is constant','Energy equals mass times speed'], ans:'Total energy of isolated system is constant' },
      { q:'General solution of dy/dx = y is?', opts:['y = Ce^x','y = C ln(x)','y = Cx','y = C+e^x'], ans:'y = Ce^x' },
      { q:'Oxidation number of sulfur in H₂SO₄?', opts:['+4','+6','-2','0'], ans:'+6' },
      { q:'Work-Energy theorem: Work done = ?', opts:['Change in potential energy','Change in kinetic energy','Total mechanical energy','Force × velocity'], ans:'Change in kinetic energy' },
      { q:'Raoult\'s Law relates to?', opts:['Gas pressure and temperature','Vapor pressure of solutions','Electrolysis','Radioactive decay'], ans:'Vapor pressure of solutions' },
      { q:'2 ∫₀π sin(x)dx = ?', opts:['0','2','4','π'], ans:'4' },
      { q:'In photoelectric effect, stopping potential depends on?', opts:['Intensity of light','Frequency of light','Both intensity and frequency','Wave nature of light'], ans:'Frequency of light' },
      { q:'Arrhenius equation relates to?', opts:['Reaction rate and temperature','Equilibrium constant','Enthalpy','Entropy'], ans:'Reaction rate and temperature' },
      { q:'Area enclosed by y=x² and y=x is?', opts:['1/6','1/3','1/2','1/4'], ans:'1/6' },
      { q:'If A and B are mutually exclusive events, P(A∪B) = ?', opts:['P(A)×P(B)','P(A)+P(B)','P(A)-P(B)','P(A)/P(B)'], ans:'P(A)+P(B)' },
      { q:'In SHM, at equilibrium position, which energy is maximum?', opts:['Potential energy','Kinetic energy','Both equal','Total energy only'], ans:'Kinetic energy' },
      { q:'Le Chatelier\'s principle applies to?', opts:['Ideal gas behavior','Equilibrium systems responding to disturbances','Radioactive decay','Acid-base neutralization only'], ans:'Equilibrium systems responding to disturbances' },
      { q:'∫ sec²(x) dx = ?', opts:['sin(x)+C','tan(x)+C','-cot(x)+C','sec(x)+C'], ans:'tan(x)+C' },
      { q:'Which particle has zero mass?', opts:['Proton','Neutron','Electron','Photon'], ans:'Photon' },
      { q:'In JEE Main, how many questions are there in total?', opts:['75','90','100','80'], ans:'90' },
      { q:'Kirchhoff\'s Current Law (KCL) is based on?', opts:['Conservation of energy','Conservation of charge (sum of currents at node = 0)','Ohm\'s Law','Faraday\'s Law'], ans:'Conservation of charge (sum of currents at node = 0)' },
      { q:'Mole fraction of solute in 180g water + 18g glucose solution?', opts:['0.1','0.01','0.5','0.2'], ans:'0.01' },
      { q:'Lorentz force on a charge in magnetic field?', opts:['F = qE','F = qvB','F = mv²/r','F = ma'], ans:'F = qvB' },
      { q:'Sum of all roots of x³ - 6x² + 11x - 6 = 0?', opts:['6','11','-6','-11'], ans:'6' },
      { q:'JEE Main is conducted by?', opts:['IITs','CBSE','NTA (National Testing Agency)','UPSC'], ans:'NTA (National Testing Agency)' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 5: NEET (Medical)
  // ════════════════════════════════════════════════════════════
  'neet-paid': {
    category: 'National Exam', subject: 'Biology, Physics, Chemistry',
    qs: [
      { q:'Powerhouse of the cell?', opts:['Nucleus','Ribosome','Mitochondria','Golgi Apparatus'], ans:'Mitochondria' },
      { q:'Double helix model of DNA proposed by?', opts:['Gregor Mendel','Francis Crick & James Watson','Rosalind Franklin','Frederick Griffith'], ans:'Francis Crick & James Watson' },
      { q:'Which blood type is the universal recipient?', opts:['A+','B+','O+','AB+'], ans:'AB+' },
      { q:'Normal human body temperature (°C)?', opts:['35°C','36°C','37°C','38°C'], ans:'37°C' },
      { q:'Meiosis occurs in?', opts:['Somatic cells','Germ cells (gonads)','Liver cells','Nerve cells'], ans:'Germ cells (gonads)' },
      { q:'Which enzyme is involved in DNA replication (main polymerizing enzyme)?', opts:['RNA Polymerase','DNA Polymerase III','Helicase','Ligase'], ans:'DNA Polymerase III' },
      { q:'Site of photosynthesis?', opts:['Mitochondria','Nucleus','Chloroplast','Ribosome'], ans:'Chloroplast' },
      { q:'Fleming\'s Left Hand Rule applies to?', opts:['Induced EMF','Force on current-carrying conductor in magnetic field','Electric field direction','Lens power'], ans:'Force on current-carrying conductor in magnetic field' },
      { q:'Molecular formula of Adenine?', opts:['C₄H₅N₃O','C₅H₅N₅','C₅H₄N₄O','C₄H₄N₂O'], ans:'C₅H₅N₅' },
      { q:'Number of chromosomes in human gametes (sperm/egg)?', opts:['46','23','48','44'], ans:'23' },
      { q:'Krebs cycle occurs in?', opts:['Cytoplasm','Nucleus','Mitochondrial matrix','Chloroplast'], ans:'Mitochondrial matrix' },
      { q:'Which vitamin deficiency causes Rickets?', opts:['Vitamin A','Vitamin B12','Vitamin C','Vitamin D'], ans:'Vitamin D' },
      { q:'Enzyme that joins DNA fragments (Okazaki fragments)?', opts:['Helicase','DNA Ligase','Topoisomerase','Primase'], ans:'DNA Ligase' },
      { q:'Kidney functional unit?', opts:['Neuron','Nephron','Alveolus','Islet of Langerhans'], ans:'Nephron' },
      { q:'How many total questions in NEET exam?', opts:['150','180','200','100'], ans:'180' },
      { q:'Which hormone is secreted during stress (Fight or Flight)?', opts:['Insulin','Thyroxine','Adrenaline','Cortisol'], ans:'Adrenaline' },
      { q:'In photosynthesis, oxygen is released from?', opts:['CO₂','H₂O (water splitting in light reactions)','Both CO₂ and H₂O','Glucose'], ans:'H₂O (water splitting in light reactions)' },
      { q:'Mendelian law of segregation states?', opts:['Traits blend in offspring','Two alleles separate during gamete formation','Genes are linked on chromosomes','Environment controls all traits'], ans:'Two alleles separate during gamete formation' },
      { q:'Which organelle is involved in protein synthesis?', opts:['Mitochondria','Lysosome','Ribosome','Centrosome'], ans:'Ribosome' },
      { q:'Penicillin was discovered by?', opts:['Louis Pasteur','Robert Koch','Alexander Fleming','Jonas Salk'], ans:'Alexander Fleming' },
      { q:'Rh factor is found on?', opts:['Plasma','White blood cells','Red blood cells (surface)','Platelets'], ans:'Red blood cells (surface)' },
      { q:'Which is the largest gland in human body?', opts:['Pancreas','Thyroid','Liver','Kidney'], ans:'Liver' },
      { q:'"Linkage" refers to?', opts:['Joining of two cells','Genes located on same chromosome tending to be inherited together','DNA replication','Crossing over only'], ans:'Genes located on same chromosome tending to be inherited together' },
      { q:'NEET is conducted by?', opts:['CBSE','MCI','NTA','AIIMS'], ans:'NTA' },
      { q:'Which layer of the atmosphere contains ozone?', opts:['Troposphere','Stratosphere','Mesosphere','Thermosphere'], ans:'Stratosphere' },
      { q:'In ecological pyramid, the base represents?', opts:['Top predators','Primary consumers','Producers','Decomposers'], ans:'Producers' },
      { q:'Law of Dominance was given by?', opts:['Charles Darwin','Gregor Mendel','Hugo de Vries','Morgan'], ans:'Gregor Mendel' },
      { q:'Refraction Index = ?', opts:['Speed of light in vacuum / Speed in medium','Medium speed / Vacuum speed','Frequency × Wavelength','None of these'], ans:'Speed of light in vacuum / Speed in medium' },
      { q:'Phloem transports?', opts:['Water only','Minerals only','Photosynthate/food (sugar)','Both water and food'], ans:'Photosynthate/food (sugar)' },
      { q:'Totipotency means?', opts:['Cell can only divide','A cell can develop into a complete organism','Cell cannot differentiate','Cells are identical'], ans:'A cell can develop into a complete organism' },
      { q:'Which is a vestigial organ in humans?', opts:['Liver','Appendix','Kidney','Spleen'], ans:'Appendix' },
      { q:'Gibbs Free Energy (ΔG) for a spontaneous reaction is?', opts:['Positive','Zero','Negative','Undefined'], ans:'Negative' },
      { q:'Crossing over occurs during which phase of Meiosis?', opts:['Metaphase I','Prophase I','Anaphase II','Telophase I'], ans:'Prophase I' },
      { q:'Maximum marks in NEET exam?', opts:['600','720','800','900'], ans:'720' },
      { q:'"Cri-du-chat" syndrome is due to?', opts:['Extra chromosome','Deletion of short arm of chromosome 5','Trisomy 21','X-linked recessive disorder'], ans:'Deletion of short arm of chromosome 5' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 6: CUET (UG)
  // ════════════════════════════════════════════════════════════
  'cuet-paid': {
    category: 'National Exam', subject: 'General Test & Domain',
    qs: [
      { q:'CUET UG stands for?', opts:['Central University Exam Test','Common University Entrance Test (UG)','Central Undergraduate Entrance Test','None'], ans:'Common University Entrance Test (UG)' },
      { q:'CUET is conducted by?', opts:['NTA','CBSE','UGC','University Grants Commission'], ans:'NTA' },
      { q:'CUET replaced which exam for DU admissions?', opts:['DUET','JEE','NEET','CET'], ans:'DUET' },
      { q:'Section IA of CUET covers?', opts:['Domain subjects','General Test','Language (English/Hindi)','Science only'], ans:'Language (English/Hindi)' },
      { q:'Maximum marks per subject in CUET?', opts:['100','150','200','250'], ans:'200' },
      { q:'Author of "The God of Small Things"?', opts:['Arundhati Roy','Anita Desai','Jhumpa Lahiri','Kiran Desai'], ans:'Arundhati Roy' },
      { q:'Identify the correct sentence:', opts:['He don\'t know.','She doesn\'t know.','They doesn\'t know.','We don\'t knows.'], ans:'She doesn\'t know.' },
      { q:'GDP stands for?', opts:['Gross Domestic Product','General Domestic Product','Grand Development Plan','None'], ans:'Gross Domestic Product' },
      { q:'Who wrote the Indian National Anthem?', opts:['Bankim Chandra','Rabindranath Tagore','Sarojini Naidu','Subramania Bharati'], ans:'Rabindranath Tagore' },
      { q:'The Preamble of India starts with?', opts:['We the Citizens','We the People of India','We the Representatives','We the Government'], ans:'We the People of India' },
      { q:'Which was the first University established in India?', opts:['Banaras Hindu University','Calcutta University','Mumbai University','Delhi University'], ans:'Calcutta University' },
      { q:'The Headquarters of United Nations is in?', opts:['London','Paris','New York','Geneva'], ans:'New York' },
      { q:'Iron and Steel city of India?', opts:['Mumbai','Jamshedpur','Kolkata','Pune'], ans:'Jamshedpur' },
      { q:'Which Fundamental Right abolishes untouchability?', opts:['Article 14','Article 17','Article 19','Article 21'], ans:'Article 17' },
      { q:'Synonym of "Eloquent"?', opts:['Silent','Fluent and expressive','Confused','Boring'], ans:'Fluent and expressive' },
      { q:'National Literacy Mission was launched in?', opts:['1988','1990','1985','1995'], ans:'1988' },
      { q:'India\'s first superhero in Indian mythology?', opts:['Arjuna','Hanuman','Karna','Bhima'], ans:'Hanuman' },
      { q:'Fill in: "The committee __ decided to postpone the meeting."', opts:['have','has','are','is'], ans:'has' },
      { q:'Ecology is the study of?', opts:['Atoms and molecules','Organisms and their environment','Earth\'s magnetic field','Human behavior'], ans:'Organisms and their environment' },
      { q:'Silicon Valley is located in?', opts:['New York','Texas','California','Seattle'], ans:'California' },
      { q:'Who was the first Chief Justice of India?', opts:['M. Patanjali Shastri','Harilal Jekisundas Kania','H.J. Kania','P.N. Bhagwati'], ans:'Harilal Jekisundas Kania' },
      { q:'Antonym of "Benevolent"?', opts:['Kind','Generous','Malevolent','Helpful'], ans:'Malevolent' },
      { q:'In which year was India\'s Constitution adopted?', opts:['1947','1950','1949','1952'], ans:'1949' },
      { q:'Which planet is known as the Red Planet?', opts:['Jupiter','Saturn','Mars','Venus'], ans:'Mars' },
      { q:'World Environment Day is celebrated on?', opts:['June 5','April 22','October 2','March 21'], ans:'June 5' },
      { q:'"No man is an island" — this statement implies?', opts:['People cannot swim','Humans are naturally social','Islands are dangerous','No one lives alone on island'], ans:'Humans are naturally social' },
      { q:'Article 370 (now abrogated) was related to?', opts:['Goa','Jammu & Kashmir','North Eastern states','Andaman Islands'], ans:'Jammu & Kashmir' },
      { q:'Which gas is responsible for global warming?', opts:['Nitrogen','Oxygen','CO₂','Noble gases'], ans:'CO₂' },
      { q:'CUET Domain Subject Section allows up to how many domain subjects?', opts:['3','5','6','8'], ans:'6' },
      { q:'Jawaharlal Nehru University (JNU) is located in?', opts:['Mumbai','Hyderabad','New Delhi','Kolkata'], ans:'New Delhi' },
      { q:'Cricketer Sachin Tendulkar\'s first international match — year?', opts:['1987','1989','1991','1985'], ans:'1989' },
      { q:'"Incredible India" is a tourism campaign of?', opts:['State Tourism Department','Ministry of Tourism, Government of India','IRCTC','None'], ans:'Ministry of Tourism, Government of India' },
      { q:'Which Amendment added "Socialist" and "Secular" to Preamble?', opts:['42nd','44th','73rd','86th'], ans:'42nd' },
      { q:'Mission Shakti in India is related to?', opts:['Women\'s Safety','Anti-Satellite Missile test (ASAT)','Agriculture','Education'], ans:'Anti-Satellite Missile test (ASAT)' },
      { q:'CUET was introduced from which academic year?', opts:['2020-21','2021-22','2022-23','2023-24'], ans:'2022-23' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 7: NDA (Defense)
  // ════════════════════════════════════════════════════════════
  'nda-paid': {
    category: 'Govt Exam', subject: 'Mathematics & General Ability',
    qs: [
      { q:'NDA stands for?', opts:['National Defense Academy','National Development Authority','National Diploma Association','None'], ans:'National Defense Academy' },
      { q:'NDA exam is conducted by?', opts:['Ministry of Defense','Army HQ','UPSC','NTA'], ans:'UPSC' },
      { q:'NDA is for entry into which forces?', opts:['Only Army','Only Navy','Army, Navy and Air Force','CRPF and BSF'], ans:'Army, Navy and Air Force' },
      { q:'NDA exam has how many papers?', opts:['1','2','3','4'], ans:'2' },
      { q:'Age limit for NDA exam?', opts:['16.5 to 19 years','18 to 21 years','17 to 20 years','15 to 18 years'], ans:'16.5 to 19 years' },
      { q:'NDA Paper 1 is on?', opts:['General Ability','Mathematics','Physics only','English only'], ans:'Mathematics' },
      { q:'If sin(θ) = 3/5, then cos(θ) = ?', opts:['4/5','3/4','5/4','4/3'], ans:'4/5' },
      { q:'Logical: "All soldiers are brave. Ram is a soldier." Conclusion?', opts:['Ram is not brave','Ram is brave','Cannot say','Ram is a soldier only'], ans:'Ram is brave' },
      { q:'Which is India\'s first indigenously built aircraft carrier?', opts:['INS Vikramaditya','INS Vikrant','INS Viraat','INS Talwar'], ans:'INS Vikrant' },
      { q:'Area of a circle with radius 7 cm (π = 22/7)?', opts:['154 cm²','44 cm²','22 cm²','308 cm²'], ans:'154 cm²' },
      { q:'National Defence Academy is located in?', opts:['Pune, Maharashtra','Delhi','Dehradun','Bangalore'], ans:'Pune, Maharashtra' },
      { q:'NDA SSB stands for?', opts:['Service Selection Board','Special Service Bureau','Soldiers Squad Board','None'], ans:'Service Selection Board' },
      { q:'LCM of 15 and 20?', opts:['40','60','30','80'], ans:'60' },
      { q:'Chief of Defence Staff (CDS) post was created in?', opts:['2019','2020','2017','2018'], ans:'2019' },
      { q:'Which gas is used in submarines for breathing?', opts:['Pure O₂','CO₂','Nitrogen-Oxygen mix','Hydrogen'], ans:'Nitrogen-Oxygen mix' },
      { q:'Integration of x dx from 0 to 2?', opts:['1','2','4','0'], ans:'2' },
      { q:'Which is NOT a military rank?', opts:['Colonel','Brigadier','Inspector General','Wing Commander'], ans:'Inspector General' },
      { q:'"Operation Blue Star" was carried out in?', opts:['1980','1984','1987','1971'], ans:'1984' },
      { q:'Value of tan(45°)?', opts:['0','√3','1','1/√3'], ans:'1' },
      { q:'Which country has the largest army in the world?', opts:['USA','Russia','India','China'], ans:'China' },
      { q:'Speed of sound in air at 0°C?', opts:['332 m/s','343 m/s','300 m/s','360 m/s'], ans:'332 m/s' },
      { q:'India\'s first nuclear submarine?', opts:['INS Arihant','INS Sindhughosh','INS Chakra','INS Kalvari'], ans:'INS Arihant' },
      { q:'Derivative of cos(x)?', opts:['sin(x)','-sin(x)','cos(x)','-cos(x)'], ans:'-sin(x)' },
      { q:'"Operation Vijay" (1999) was about?', opts:['1971 Bangladesh liberation','Kargil War','1965 Indo-Pak War','Sri Lanka Operation'], ans:'Kargil War' },
      { q:'NDA Academy training period?', opts:['2 years','3 years','4 years','1.5 years'], ans:'3 years' },
      { q:'Binomial theorem: (a+b)³ = ?', opts:['a³+b³','a³+3a²b+3ab²+b³','a³-b³','3a³+3b³'], ans:'a³+3a²b+3ab²+b³' },
      { q:'Indira Gandhi Airport is in?', opts:['Mumbai','Kolkata','New Delhi','Chennai'], ans:'New Delhi' },
      { q:'India-China border dispute line is called?', opts:['Radcliffe Line','McMahon Line / LAC','Durand Line','Wagah Border'], ans:'McMahon Line / LAC' },
      { q:'P(A∩B) for independent events = ?', opts:['P(A)+P(B)','P(A)×P(B)','P(A)-P(B)','P(A)/P(B)'], ans:'P(A)×P(B)' },
      { q:'Which is India\'s highest military honor?', opts:['Vir Chakra','Param Vir Chakra','Ashoka Chakra','Mahavir Chakra'], ans:'Param Vir Chakra' },
      { q:'Solution of 2x + 3 = 9 is?', opts:['x=2','x=3','x=4','x=6'], ans:'x=3' },
      { q:'Indian Army Day is celebrated on?', opts:['15 January','26 January','15 August','26 November'], ans:'15 January' },
      { q:'Which defense organization makes missiles in India?', opts:['ISRO','BARC','DRDO','CSIR'], ans:'DRDO' },
      { q:'If angles of a triangle are in ratio 1:2:3, the largest angle is?', opts:['60°','90°','120°','75°'], ans:'90°' },
      { q:'MARCOS is India\'s?', opts:['Air Force special unit','Navy Marine Commandos','Army Rangers','Intelligence unit'], ans:'Navy Marine Commandos' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 8: CA Foundation
  // ════════════════════════════════════════════════════════════
  'ca-foundation-paid': {
    category: 'Govt Exam', subject: 'Accounting, Law, Economics, Mathematics',
    qs: [
      { q:'CA stands for?', opts:['Cost Accountant','Chartered Accountant','Commerce Accountant','None'], ans:'Chartered Accountant' },
      { q:'ICAI stands for?', opts:['Institute of Cost Accountants India','Indian Commerce Accounting Institute','Institute of Chartered Accountants of India','None'], ans:'Institute of Chartered Accountants of India' },
      { q:'Golden Rule: Real account — Debit what?', opts:['Comes in','Goes out','The giver','The receiver'], ans:'Comes in' },
      { q:'Full form of GAAP?', opts:['Generally Accepted Accounting Principles','Global Accounting Audit Procedure','General Accounting and Analysis Practice','None'], ans:'Generally Accepted Accounting Principles' },
      { q:'In Double Entry System, every debit has a corresponding?', opts:['Debit','Credit','Both debit and credit','None'], ans:'Credit' },
      { q:'Net Profit = Gross Profit - ?', opts:['Cost of Goods Sold','Indirect Expenses','Direct Expenses','Sales'], ans:'Indirect Expenses' },
      { q:'Working Capital = Current Assets - ?', opts:['Fixed Assets','Long-term Liabilities','Current Liabilities','Owner\'s Equity'], ans:'Current Liabilities' },
      { q:'Bank Reconciliation Statement reconciles?', opts:['Cash book and bank statement','Debtor and creditor balances','Capital and revenue expenditure','Purchase and sales'], ans:'Cash book and bank statement' },
      { q:'"Going Concern" concept means?', opts:['Business will close soon','Business will continue for foreseeable future','Assets will be sold','Accounting only for past'], ans:'Business will continue for foreseeable future' },
      { q:'Which is NOT a current asset?', opts:['Stock','Debtors','Cash','Plant & Machinery'], ans:'Plant & Machinery' },
      { q:'Contract Act, 1872 — Consideration means?', opts:['Free gift','Something in return for a promise','A legal document','None of these'], ans:'Something in return for a promise' },
      { q:'Price Elasticity of Demand (PED) measures?', opts:['How price changes over time','Responsiveness of quantity demanded to price change','Total revenue change','Consumer income change'], ans:'Responsiveness of quantity demanded to price change' },
      { q:'"Materiality Principle" means?', opts:['Only physical assets matter','Report information significant enough to influence decisions','Materials used in production','No small transactions recorded'], ans:'Report information significant enough to influence decisions' },
      { q:'Present Value of ₹1000 at 10% after 1 year?', opts:['₹900','₹1000','₹909.09','₹1100'], ans:'₹909.09' },
      { q:'A contract is void if?', opts:['Made in writing','There is mistake about subject matter','There are two parties','Consideration is present'], ans:'There is mistake about subject matter' },
      { q:'Deferred Revenue Expenditure is?', opts:['Revenue income','Capital expenditure only','Expenditure with benefit over multiple years','Normal business expense'], ans:'Expenditure with benefit over multiple years' },
      { q:'In a monopoly market, seller has?', opts:['No price control','Only 1 seller with full price control','Multiple sellers','Perfect competition'], ans:'Only 1 seller with full price control' },
      { q:'Trial Balance helps verify?', opts:['Profit and loss','Arithmetical accuracy of ledger accounts','Closing stock valuation','Tax liability'], ans:'Arithmetical accuracy of ledger accounts' },
      { q:'GNP = GDP + ?', opts:['Net Factor Income from Abroad','Domestic savings','Government expenditure','Imports - Exports'], ans:'Net Factor Income from Abroad' },
      { q:'CA Foundation has how many papers?', opts:['2','3','4','6'], ans:'4' },
      { q:'Partnership Act was enacted in?', opts:['1932','1947','1956','1872'], ans:'1932' },
      { q:'Absorption Costing includes?', opts:['Only variable costs','All manufacturing costs (fixed + variable)','Only direct costs','Selling costs only'], ans:'All manufacturing costs (fixed + variable)' },
      { q:'"Break-Even Point" is where?', opts:['Profit is maximum','Total Revenue = Total Costs','Loss is minimum','Sales > Costs'], ans:'Total Revenue = Total Costs' },
      { q:'An offer becomes a contract when?', opts:['Offer is made','Offer is accepted with consideration','Offer is written','More than 2 parties involved'], ans:'Offer is accepted with consideration' },
      { q:'Fiscal Policy is controlled by?', opts:['Reserve Bank of India','Central Government and Ministry of Finance','Stock Exchange','World Bank'], ans:'Central Government and Ministry of Finance' },
      { q:'Straight Line Method of Depreciation?', opts:['Depreciates faster initially','Fixed amount each year','Depends on use','Reverses depreciation'], ans:'Fixed amount each year' },
      { q:'Which of these is a liability?', opts:['Cash in hand','Debtors','Bank Loan','Stock'], ans:'Bank Loan' },
      { q:'Accounting Equation: Assets = ?', opts:['Liabilities only','Capital only','Liabilities + Capital','Revenue - Expenses'], ans:'Liabilities + Capital' },
      { q:'Goods returned by customer — recorded in?', opts:['Purchase Returns Book','Sales Returns Book','Cash Book','Journal Proper'], ans:'Sales Returns Book' },
      { q:'In CA Foundation exam, passing marks per paper?', opts:['33%','40%','50%','45%'], ans:'40%' },
      { q:'Which cost is sunk cost?', opts:['Future variable cost','Past cost already incurred','Marginal cost','Opportunity cost'], ans:'Past cost already incurred' },
      { q:'"Law of Diminishing Marginal Utility" states?', opts:['Utility increases with more consumption','Utility decreases as more units are consumed','Total utility is fixed','Only applies to luxury goods'], ans:'Utility decreases as more units are consumed' },
      { q:'Forfeiture of shares means?', opts:['Shares transferred to someone else','Shares cancelled due to non-payment of calls','New shares issued','Shares bonused'], ans:'Shares cancelled due to non-payment of calls' },
      { q:'Quick Ratio = ?', opts:['Current Assets / Current Liabilities','(Current Assets - Inventory) / Current Liabilities','Net Profit / Sales','None'], ans:'(Current Assets - Inventory) / Current Liabilities' },
      { q:'Revenue Receipts affect?', opts:['Capital of business','Profit & Loss Account','Balance Sheet only','None'], ans:'Profit & Loss Account' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 9: UPSC Civil Services (IAS, IPS)
  // ════════════════════════════════════════════════════════════
  'upsc-paid': {
    category: 'Govt Exam', subject: 'GS Paper 1 & 2',
    qs: [
      { q:'UPSC Prelims has how many papers?', opts:['1','2','3','4'], ans:'2' },
      { q:'UPSC Mains GS Paper I covers?', opts:['Indian Economy','Indian Heritage, Culture, History, Geography','Indian Constitution','Science & Technology'], ans:'Indian Heritage, Culture, History, Geography' },
      { q:'First Indian ICS officer?', opts:['Satyendranath Tagore','Surendranath Banerjea','V.N. Narayanan','None'], ans:'Satyendranath Tagore' },
      { q:'Which Article allows President\'s Rule in a state?', opts:['Article 352','Article 356','Article 370','Article 360'], ans:'Article 356' },
      { q:'Panchayati Raj was introduced in which Five Year Plan?', opts:['First','Second','Third','Fourth'], ans:'Second' },
      { q:'"Zero-Based Budgeting" means?', opts:['Budget starts from last year','Every budget cycle starts from scratch, justifying every expense','No expenditure allowed','Based on zero inflation'], ans:'Every budget cycle starts from scratch, justifying every expense' },
      { q:'Deccan Plateau is made of?', opts:['Sedimentary rocks','Igneous rocks (Basalt)','Metamorphic rocks','Alluvial soil'], ans:'Igneous rocks (Basalt)' },
      { q:'NITI Aayog replaced?', opts:['Finance Commission','Planning Commission','Election Commission','CAG'], ans:'Planning Commission' },
      { q:'"Sarkaria Commission" was related to?', opts:['Electoral reforms','Centre-State Relations','Judicial appointments','Media regulation'], ans:'Centre-State Relations' },
      { q:'Chipko Movement was about?', opts:['Forest conservation','Water rights','Scheduled tribe rights','Land reform'], ans:'Forest conservation' },
      { q:'Who appoints the Chief Election Commissioner?', opts:['Prime Minister','Parliament','President of India','Supreme Court'], ans:'President of India' },
      { q:'India\'s first Five Year Plan started in?', opts:['1947','1949','1951','1955'], ans:'1951' },
      { q:'Parliament of India comprises?', opts:['Lok Sabha only','Rajya Sabha and Lok Sabha','Lok Sabha, Rajya Sabha, and President','Only Houses, not President'], ans:'Lok Sabha, Rajya Sabha, and President' },
      { q:'CSAT (UPSC Prelims Paper 2) is?', opts:['Qualifying (33%) + merit-based','Only qualifying (33%), not for merit ranking','Merit-based, not qualifying','Optional paper'], ans:'Only qualifying (33%), not for merit ranking' },
      { q:'"Directive Principles of State Policy" are in which part of Constitution?', opts:['Part II','Part III','Part IV','Part V'], ans:'Part IV' },
      { q:'River Ganga originates from?', opts:['Yamunotri Glacier','Gangotri Glacier','Siachen Glacier','Badrinath'], ans:'Gangotri Glacier' },
      { q:'Which Schedule of Constitution lists official languages?', opts:['6th Schedule','7th Schedule','8th Schedule','9th Schedule'], ans:'8th Schedule' },
      { q:'Pradhan Mantri Jan Dhan Yojana launched in?', opts:['2011','2012','2014','2016'], ans:'2014' },
      { q:'CAG (Comptroller & Auditor General) reports to?', opts:['Prime Minister','President of India','Parliament','Finance Ministry'], ans:'Parliament' },
      { q:'"Critical Minerals" are important for?', opts:['Nuclear weapons','Green energy technologies (EV, solar, wind)','Traditional agriculture','Space exploration only'], ans:'Green energy technologies (EV, solar, wind)' },
      { q:'Indus Valley Civilization major sites include?', opts:['Mohenjo-daro and Harappa','Delhi and Agra','Patna and Varanasi','Ayodhya and Ujjain'], ans:'Mohenjo-daro and Harappa' },
      { q:'Silent Valley Movement was for?', opts:['Save a tribal community','Protection of tropical rainforest in Kerala','Anti-dam movement','None'], ans:'Protection of tropical rainforest in Kerala' },
      { q:'Who has the power to issue ordinances in India?', opts:['Prime Minister','President when Parliament is not in session','Both PM and President','Supreme Court'], ans:'President when Parliament is not in session' },
      { q:'"Pradhan Mantri Awas Yojana" aims at?', opts:['Agricultural development','Housing for all (Urban & Rural)','Employment generation','Digital India'], ans:'Housing for all (Urban & Rural)' },
      { q:'Tropical Cyclones in Bay of Bengal move towards?', opts:['Northwest','Northeast','Southeast','Southwest'], ans:'Northwest' },
      { q:'UPSC final selection is based on?', opts:['Prelims score only','Mains + Personality Test (Interview)','Prelims + Interview only','GPA from college'], ans:'Mains + Personality Test (Interview)' },
      { q:'Who chairs the Rajya Sabha?', opts:['President of India','Prime Minister','Vice President of India','Speaker of Lok Sabha'], ans:'Vice President of India' },
      { q:'Khilafat Movement was related to?', opts:['Muslim concern about Ottoman Caliphate','Hindu reform movement','Partition of Bengal','Salt March'], ans:'Muslim concern about Ottoman Caliphate' },
      { q:'"Atal Tunnel" (Rohtang Tunnel) connects?', opts:['Manali to Leh (bypassing Rohtang Pass)','Shimla to Chandigarh','Kashmir to Delhi','Sikkim to Bengal'], ans:'Manali to Leh (bypassing Rohtang Pass)' },
      { q:'Habeas Corpus writ protects against?', opts:['Illegal detention','Unfair dismissal','Tax evasion','Property disputes'], ans:'Illegal detention' },
      { q:'India\'s first satellite "Aryabhata" was launched in?', opts:['1972','1975','1980','1969'], ans:'1975' },
      { q:'Eastern Ghats vs Western Ghats — which is a UNESCO World Heritage Site?', opts:['Eastern Ghats','Western Ghats (Western Ghats Biodiversity)','Both','Neither'], ans:'Western Ghats (Western Ghats Biodiversity)' },
      { q:'"Sovereign, Socialist, Secular, Democratic Republic" was added through which Amendment?', opts:['25th Amendment','42nd Amendment','44th Amendment','52nd Amendment'], ans:'42nd Amendment' },
      { q:'"India Stack" refers to?', opts:['Physical infrastructure','Digital public goods (Aadhaar, UPI, DigiLocker, etc.)','India\'s nuclear stack','IT companies group'], ans:'Digital public goods (Aadhaar, UPI, DigiLocker, etc.)' },
      { q:'First General Elections of India were held in?', opts:['1947','1950','1951-52','1955'], ans:'1951-52' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 10: SSC CGL
  // ════════════════════════════════════════════════════════════
  'ssc-cgl-paid': {
    category: 'Govt Exam', subject: 'Quantitative, Reasoning, English, GK',
    qs: [
      { q:'SSC CGL Tier 1 has how many questions?', opts:['75','100','150','50'], ans:'100' },
      { q:'SSC CGL stands for?', opts:['Staff Selection Commission Combined Graduate Level','Staff Sector Commission Civil Graduate Level','System Selection Civil Graduate Level','None'], ans:'Staff Selection Commission Combined Graduate Level' },
      { q:'15% of 400 = ?', opts:['50','60','70','80'], ans:'60' },
      { q:'If A:B = 3:4 and B:C = 5:6, then A:B:C = ?', opts:['15:20:24','3:4:6','5:6:8','1:4:6'], ans:'15:20:24' },
      { q:'Odd one out: BDFH, QSUW, ACEG, MOQR', opts:['BDFH','QSUW','ACEG','MOQR'], ans:'MOQR' },
      { q:'Choose correct spelling:', opts:['Grammer','Grammer','Grammar','Gramer'], ans:'Grammar' },
      { q:'Who is known as "Frontier Gandhi"?', opts:['Mahatma Gandhi','Khan Abdul Ghaffar Khan','G.K. Gokhale','B.G. Tilak'], ans:'Khan Abdul Ghaffar Khan' },
      { q:'Simple Interest on ₹8000 at 6% for 3 years?', opts:['₹1440','₹1500','₹2000','₹1200'], ans:'₹1440' },
      { q:'Synonym of "Proficient"?', opts:['Incompetent','Skilled','Average','Weak'], ans:'Skilled' },
      { q:'If 8 men do a job in 12 days, 12 men do it in how many days?', opts:['6','8','10','16'], ans:'8' },
      { q:'Which is the highest civilian award in India?', opts:['Padma Shri','Padma Bhushan','Bharat Ratna','Padma Vibhushan'], ans:'Bharat Ratna' },
      { q:'In a triangle, sum of all angles = ?', opts:['90°','180°','270°','360°'], ans:'180°' },
      { q:'Antonym of "Verbose"?', opts:['Wordy','Concise','Elaborate','Lengthy'], ans:'Concise' },
      { q:'What is Acid Rain caused by?', opts:['CO₂','SO₂ and NO₂','O₃','N₂'], ans:'SO₂ and NO₂' },
      { q:'Leap year in which of these?', opts:['1900','1800','2000','1700'], ans:'2000' },
      { q:'One who cannot be corrected is called?', opts:['Insolvent','Incorrigible','Infallible','Indifferent'], ans:'Incorrigible' },
      { q:'Train 150m long at 60 km/h crosses a platform 200m long in how many seconds?', opts:['19 sec','21 sec','20 sec','18 sec'], ans:'21 sec' },
      { q:'"Tipu Sultan" was ruler of?', opts:['Marathas','Mysore','Hyderabad','Awadh'], ans:'Mysore' },
      { q:'Choose the correct sentence:', opts:['She and me went to market.','She and I went to market.','Me and she went.','Her and me went.'], ans:'She and I went to market.' },
      { q:'Cube of 12?', opts:['144','1728','1728','1296'], ans:'1728' },
      { q:'National River of India?', opts:['Yamuna','Brahmaputra','Ganga','Godavari'], ans:'Ganga' },
      { q:'"One who eats everything" — one word substitution?', opts:['Herbivore','Omnivore','Carnivore','Granivore'], ans:'Omnivore' },
      { q:'Area of a rectangle 12m × 8m?', opts:['40 m²','48 m²','96 m²','88 m²'], ans:'96 m²' },
      { q:'Which gas is used in fire extinguishers?', opts:['O₂','N₂','CO₂','H₂'], ans:'CO₂' },
      { q:'Ravi buys at ₹500 and sells at ₹600. Profit %?', opts:['10%','15%','20%','25%'], ans:'20%' },
      { q:'"Spot the error": She is one of the best student in the class.', opts:['She is one','of the best','student in the','class — Error: "student" should be "students"'], ans:'class — Error: "student" should be "students"' },
      { q:'HCF of 24 and 36?', opts:['4','6','8','12'], ans:'12' },
      { q:'Nalanda University was in which state?', opts:['Uttar Pradesh','Bihar','West Bengal','Odisha'], ans:'Bihar' },
      { q:'What is the full form of NABARD?', opts:['National Bank for Agriculture and Rural Development','National Board For Agriculture Research Development','None','Main body for bank audit'], ans:'National Bank for Agriculture and Rural Development' },
      { q:'Volume of a cube with side 5 cm?', opts:['25 cm³','75 cm³','100 cm³','125 cm³'], ans:'125 cm³' },
      { q:'"One who is present everywhere" is called?', opts:['Omniscient','Omnipotent','Omnipresent','Philanthropist'], ans:'Omnipresent' },
      { q:'Sound cannot travel through?', opts:['Water','Air','Steel','Vacuum'], ans:'Vacuum' },
      { q:'Which country won the most FIFA World Cups (till 2022)?', opts:['Germany','Argentina','Brazil','France'], ans:'Brazil' },
      { q:'Fill in the blank: "He has been __ here for 5 years."', opts:['working','work','worked','works'], ans:'working' },
      { q:'SSC CGL Tier 2 tests competency in which additional skill?', opts:['Physical fitness','Computer Knowledge and Data Entry','Language Test','Interview'], ans:'Computer Knowledge and Data Entry' },
    ]
  },

  // ════════════════════════════════════════════════════════════
  // PAID 11: SSC CHSL
  // ════════════════════════════════════════════════════════════
  'ssc-chsl-paid': {
    category: 'Govt Exam', subject: 'Quantitative, Reasoning, English, GK',
    qs: [
      { q:'SSC CHSL stands for?', opts:['Combined Higher Secondary Level','Civil Higher Secondary Level','Staff Classification Higher Secondary Level','None'], ans:'Combined Higher Secondary Level' },
      { q:'SSC CHSL is for candidates who have passed?', opts:['Class 8','Class 10','Class 12 (10+2)','Graduation'], ans:'Class 12 (10+2)' },
      { q:'Posts offered through CHSL include?', opts:['IAS, IPS','LDC, DEO, Postal Assistant','Income Tax Officer','Deputy Collector'], ans:'LDC, DEO, Postal Assistant' },
      { q:'DEO in SSC CHSL stands for?', opts:['Data Entry Operator','Digital Entry Officer','Department Entry Order','Document Entry Office'], ans:'Data Entry Operator' },
      { q:'25% of 480 = ?', opts:['100','110','120','130'], ans:'120' },
      { q:'Blood is a type of?', opts:['Epithelial tissue','Muscular tissue','Connective tissue','Nervous tissue'], ans:'Connective tissue' },
      { q:'If DELHI is coded as EFMIJ, then MUMBAI = ?', opts:['NVNCBJ','NVNCBI','MVNCBJ','None'], ans:'NVNCBJ' },
      { q:'Choose correctly spelled word:', opts:['Millenium','Millennium','Milennium','Millenniam'], ans:'Millennium' },
      { q:'Hardest natural substance?', opts:['Iron','Titanium','Diamond','Platinum'], ans:'Diamond' },
      { q:'"The train is late __ 2 hours." Fill in:', opts:['for','since','from','by'], ans:'by' },
      { q:'Capital of France?', opts:['London','Berlin','Rome','Paris'], ans:'Paris' },
      { q:'Perimeter of a square with side 8 cm?', opts:['16 cm','24 cm','32 cm','64 cm'], ans:'32 cm' },
      { q:'Antonym of "Genuine"?', opts:['Real','Authentic','Fake','Original'], ans:'Fake' },
      { q:'How many sides does a hexagon have?', opts:['5','6','7','8'], ans:'6' },
      { q:'India\'s national game?', opts:['Cricket','Hockey','Football','Kabaddi'], ans:'Hockey' },
      { q:'One word for "a story that explains natural phenomena" — ?', opts:['Novel','Myth','Biography','Allegory'], ans:'Myth' },
      { q:'Speed = Distance ÷ ?', opts:['Mass','Time','Force','Weight'], ans:'Time' },
      { q:'Rani Lakshmi Bai was queen of?', opts:['Jhansi','Mysore','Jodhpur','Bhopal'], ans:'Jhansi' },
      { q:'Find the missing term: 3, 9, 27, 81, ?', opts:['162','243','150','200'], ans:'243' },
      { q:'Synonym of "Arduous"?', opts:['Easy','Simple','Difficult','Pleasant'], ans:'Difficult' },
      { q:'Which organ pumps blood in the human body?', opts:['Liver','Lungs','Heart','Kidney'], ans:'Heart' },
      { q:'SSC CHSL Tier 1 duration?', opts:['30 minutes','1 hour','1 hour 30 min (60 min for PWD)','2 hours'], ans:'1 hour' },
      { q:'Which country invented Paper?', opts:['India','Egypt','China','Greece'], ans:'China' },
      { q:'Noun form of "Clarify"?', opts:['Clarification','Clarifier','Clarifyed','Clarity only'], ans:'Clarification' },
      { q:'If 2 chairs cost ₹1500, 5 chairs cost?', opts:['₹3000','₹3500','₹3750','₹4000'], ans:'₹3750' },
      { q:'"Malgudi Days" author?', opts:['Mulkraj Anand','R.K. Narayan','Khushwant Singh','Vikram Seth'], ans:'R.K. Narayan' },
      { q:'Angle in a straight line?', opts:['90°','180°','270°','360°'], ans:'180°' },
      { q:'LDC in SSC CHSL means?', opts:['Lower Division Clerk','Legal Document Consultant','Lower Data Clerk','None'], ans:'Lower Division Clerk' },
      { q:'"First in Flight" — who made the first airplane?', opts:['Robert Goddard','Nikola Tesla','Wright Brothers','Neil Armstrong'], ans:'Wright Brothers' },
      { q:'India launched its first moon mission "Chandrayaan-1" in?', opts:['2005','2008','2010','2012'], ans:'2008' },
      { q:'"Passive Voice" of "They built this bridge in 1990"?', opts:['This bridge was built in 1990 by them.','This bridge is built by them in 1990.','This bridge built in 1990.','Built by them in 1990.'], ans:'This bridge was built in 1990 by them.' },
      { q:'Ohm\'s Law: Current = Voltage ÷ ?', opts:['Power','Resistance','Inductance','Capacitance'], ans:'Resistance' },
      { q:'Computer memory unit — 1 KB = ?', opts:['100 bytes','1000 bytes','1024 bytes','512 bytes'], ans:'1024 bytes' },
      { q:'International Women\'s Day observed on?', opts:['March 5','March 7','March 8','March 10'], ans:'March 8' },
      { q:'Profit % if Cost Price = ₹400 and Selling Price = ₹500?', opts:['10%','15%','20%','25%'], ans:'25%' },
    ]
  }
};

// ─── BUILD MOCK PACK DATA ────────────────────────────────────────────────────

const FREE_PACKS = [
  { id: 'coding-dsa-free',         title: 'Coding Test (DSA / Programming)',        price: 0,   isFree: true,  totalTests: 3, thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80',  duration: 60, qKey: 'coding-dsa-free' },
  { id: 'english-ielts-free',      title: 'English Speaking & IELTS Practice',      price: 0,   isFree: true,  totalTests: 3, thumbnail: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',  duration: 45, qKey: 'english-ielts-free' },
  { id: 'aptitude-reasoning-free', title: 'Aptitude + Reasoning Test',              price: 0,   isFree: true,  totalTests: 3, thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd48219d8?w=800&q=80',  duration: 60, qKey: 'aptitude-reasoning-free' },
  { id: 'typing-english-free',     title: 'Typing Speed & English Test',            price: 0,   isFree: true,  totalTests: 2, thumbnail: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=800&q=80',  duration: 30, qKey: 'typing-english-free' },
  { id: 'communication-free',      title: 'Communication Skills Assessment',        price: 0,   isFree: true,  totalTests: 2, thumbnail: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',  duration: 40, qKey: 'communication-free' },
  // State Boards (Made FREE as per user request)
  { id: 'cbse-10-paid',         title: 'CBSE Board Class 10 Mock',           price: 0,   isFree: true,  totalTests: 10, thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80', duration: 90, qKey: 'cbse-10-paid' },
  { id: 'cbse-12-paid',         title: 'CBSE Board Class 12 Mock',           price: 0,   isFree: true,  totalTests: 12, thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80', duration: 90, qKey: 'cbse-12-paid' },
  { id: 'icse-board-paid',         title: 'ICSE Board Exams',                       price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&q=80', duration: 90, qKey: 'icse-board-paid' },
  { id: 'bihar-10-paid',        title: 'Bihar Board Class 10 Mock Test Series',          price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'bihar-10-paid' },
  { id: 'bihar-12-science-paid',title: 'Bihar Board Class 12 Science Mock Test Series',  price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'bihar-12-science-paid' },
  { id: 'bihar-12-arts-paid',   title: 'Bihar Board Class 12 Arts Mock Test Series',     price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'bihar-12-arts-paid' },
  { id: 'up-10-paid',           title: 'UP Board Class 10 Mock',             price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'up-10-paid' },
  { id: 'up-12-paid',           title: 'UP Board Class 12 Mock',             price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'up-12-paid' },
  { id: 'punjab-10-paid',       title: 'Punjab Board Class 10 Mock',         price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'punjab-10-paid' },
  { id: 'punjab-12-paid',       title: 'Punjab Board Class 12 Mock',         price: 0,   isFree: true,  totalTests: 8,  thumbnail: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?w=800&q=80', duration: 90, qKey: 'punjab-12-paid' },
];

const PAID_PACKS = [
  { id: 'jee-main-paid',           title: 'JEE Main — Engineering Entrance',        price: 149, isFree: false, totalTests: 20, thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80', duration: 180, qKey: 'jee-main-paid' },
  { id: 'neet-paid',               title: 'NEET — Medical Entrance',                price: 149, isFree: false, totalTests: 20, thumbnail: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80', duration: 200, qKey: 'neet-paid' },
  { id: 'cuet-paid',               title: 'CUET (UG) — Central University Entrance',price: 99,  isFree: false, totalTests: 10, thumbnail: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80', duration: 120, qKey: 'cuet-paid' },
  { id: 'nda-paid',                title: 'NDA — National Defense Academy',         price: 129, isFree: false, totalTests: 10, thumbnail: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=800&q=80', duration: 150, qKey: 'nda-paid' },
  { id: 'ca-foundation-paid',      title: 'CA Foundation (ICAI)',                   price: 129, isFree: false, totalTests: 12, thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80', duration: 120, qKey: 'ca-foundation-paid' },
  { id: 'upsc-paid',               title: 'UPSC Civil Services (IAS, IPS)',         price: 199, isFree: false, totalTests: 15, thumbnail: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=800&q=80', duration: 120, qKey: 'upsc-paid' },
  { id: 'ssc-cgl-paid',            title: 'SSC CGL — Staff Selection Commission',   price: 119, isFree: false, totalTests: 20, thumbnail: 'https://images.unsplash.com/photo-1454165833772-d996d49510d1?w=800&q=80', duration: 60,  qKey: 'ssc-cgl-paid' },
  { id: 'ssc-chsl-paid',           title: 'SSC CHSL — Higher Secondary Level',      price: 99,  isFree: false, totalTests: 15, thumbnail: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&q=80', duration: 60,  qKey: 'ssc-chsl-paid' },
];

// ─── SEED ────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Purge old data
    console.log('🗑️  Purging all old Mock Test Packs & Practice Questions...');
    await MockTestPack.deleteMany({});
    await PracticeQuestion.deleteMany({});
    console.log('✅ Old data purged');

    const allPacks = [...FREE_PACKS, ...PAID_PACKS];

    for (const packMeta of allPacks) {
      const bank = QUESTION_BANKS[packMeta.qKey];
      if (!bank) { console.error(`❌ No question bank for ${packMeta.id}`); continue; }

      // Save 35 questions to PracticeQuestion collection
      const savedQs = await PracticeQuestion.insertMany(
        bank.qs.map(q => ({
          question: q.q,
          options: q.opts,
          correctAnswer: q.ans,
          explanation: `Correct Answer: ${q.ans}`,
          category: bank.category,
          subject: bank.subject,
          difficulty: 'Medium',
          isMockTestOnly: true
        }))
      );

      // Create MockTestPack with test referencing 35 Q IDs
      const pack = await MockTestPack.create({
        id: packMeta.id,
        title: packMeta.title,
        category: bank.category,
        description: `${packMeta.title} — 35 MCQ Questions, ${packMeta.duration} minutes`,
        thumbnail: packMeta.thumbnail,
        price: packMeta.price,
        isFree: packMeta.isFree,
        totalTests: packMeta.totalTests,
        isActive: true,
        tests: [{
          testId: `${packMeta.id}-test-1`,
          testTitle: `${packMeta.title} — Full Mock Test`,
          numQuestions: 35,
          durationMinutes: packMeta.duration,
          questions: savedQs.map(q => q._id)
        }]
      });

      console.log(`  ✅ ${packMeta.isFree ? '🆓 FREE' : '💰 PAID'} — ${pack.title} (35 Qs, ₹${packMeta.price})`);
    }

    console.log('\n✨ ALL DONE!');
    console.log(`   🆓 Free Test Packs: ${FREE_PACKS.length}`);
    console.log(`   💰 Paid Test Packs: ${PAID_PACKS.length}`);
    console.log(`   📝 Total: ${allPacks.length} Test Packs`);
    console.log(`   ❓ Questions per pack: 35 MCQs`);
    console.log(`   💳 Paid packs require Cashfree payment`);

    process.exit(0);
  } catch (err) {
    console.error('❌ SEED ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
