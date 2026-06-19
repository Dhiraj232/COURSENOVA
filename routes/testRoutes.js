const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Course = require('../models/Course');
const DailyChallenge = require('../models/DailyChallenge');
const TestResult = require('../models/TestResult');

// ── PUBLIC ROUTES (Daily Challenge) ──────────────────────────────────

// GET /api/test/daily-challenge/today/:examType
router.get('/daily-challenge/today/:examType', async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { examType } = req.params;
        
        let challenge = await DailyChallenge.findOne({ date: todayStr, examType });
        
        // AUTO-GENERATE if not exists
        if (!challenge) {
            console.log(`🎲 Auto-generating ${examType} challenge for ${todayStr}`);
            const bank = QUESTION_BANKS[examType] || QUESTION_BANKS['default'];
            
            // Randomize and pick 15 questions
            const shuffled = [...bank].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 15).map((q, i) => ({
                question: q.q || q.question,
                options: q.opts || q.options,
                correctAnswer: q.opts ? q.opts[q.ans] : q.correctAnswer,
                explanation: q.explanation || "No explanation available."
            }));

            challenge = new DailyChallenge({
                date: todayStr,
                title: `${examType} Daily Set - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
                examType,
                questions: selected,
                totalQuestions: selected.length,
                durationMinutes: 15 // 1 min per question
            });
            await challenge.save();
        }

        res.json({ ok: true, challenge });
    } catch (err) {
        console.error('Daily Challenge Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
});

// GET /api/test/daily-challenge/challenge/:id
router.get('/daily-challenge/challenge/:id', requireAuth, async (req, res) => {
    try {
        const challenge = await DailyChallenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ ok: false, error: 'Challenge not found' });
        res.json({ ok: true, challenge });
    } catch (err) {
        console.error('Fetch challenge error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
});

// GET /api/test/daily-challenge/all
router.get('/daily-challenge/all', async (req, res) => {
    try {
        const challenges = await DailyChallenge.find({})
            .select('date title examType totalQuestions durationMinutes isPremium price pdfUrl solutionsPdfUrl createdAt questions._id')
            .sort({ date: -1 });
        res.json({ ok: true, challenges });
    } catch (err) {
        res.status(500).json({ ok: false, error: 'Server error' });
    }
});

// ── Hardcoded fallback question banks (moved from frontend) ────────────────
const QUESTION_BANKS = {
    default: [
        { q: 'What does CPU stand for?', opts: ['Central Processing Unit', 'Central Program Unit', 'Computer Personal Unit', 'Control Processing Unit'], ans: 0 },
        { q: 'Which data structure operates on LIFO principle?', opts: ['Queue', 'Stack', 'Tree', 'Heap'], ans: 1 },
        { q: 'What is the time complexity of Binary Search?', opts: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], ans: 2 },
        { q: 'HTML stands for?', opts: ['Hyper Text Markup Language', 'High Text Machine Language', 'Hyper Tabular Markup Language', 'None'], ans: 0 },
        { q: 'Which keyword defines a function in Python?', opts: ['function', 'fun', 'def', 'define'], ans: 2 },
        { q: 'What symbol is used for comments in Python?', opts: ['//', '/* */', '#', '<!--'], ans: 2 },
        { q: 'Which is NOT a programming language?', opts: ['Java', 'Python', 'HTML', 'C++'], ans: 2 },
        { q: 'What does SQL stand for?', opts: ['Structured Query Language', 'Simple Query Language', 'Sequential Query Logic', 'Standard Query Language'], ans: 0 },
        { q: 'Which sorting has O(n log n) average complexity?', opts: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'], ans: 2 },
        { q: 'What does RAM stand for?', opts: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Module', 'Read And Modify'], ans: 1 },
        { q: 'Which is a NoSQL database?', opts: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle'], ans: 2 },
        { q: 'Default port for HTTP?', opts: ['21', '443', '80', '8080'], ans: 2 },
        { q: 'In OOP, what is encapsulation?', opts: ['Inheriting properties', 'Hiding internal state', 'Overriding methods', 'Creating objects'], ans: 1 },
        { q: 'Which HTML tag creates a hyperlink?', opts: ['<link>', '<href>', '<a>', '<nav>'], ans: 2 },
        { q: 'Purpose of a compiler?', opts: ['Run programs directly', 'Convert source code to machine code', 'Manage memory', 'Debug programs'], ans: 1 },
    ],
    'C Programming Fundamentals': [
        { q: 'Which header file is required for printf in C?', opts: ['stdio.h', 'stdlib.h', 'string.h', 'math.h'], ans: 0 },
        { q: 'Size of int in C (32-bit system)?', opts: ['1 byte', '2 bytes', '4 bytes', '8 bytes'], ans: 2 },
        { q: 'Operator for pointer dereferencing?', opts: ['&', '*', '->', '.'], ans: 1 },
        { q: 'What does malloc() do in C?', opts: ['Free memory', 'Allocate static memory', 'Allocate dynamic memory', 'Copy memory'], ans: 2 },
        { q: 'Which loop is guaranteed to execute at least once?', opts: ['for', 'while', 'do-while', 'All of the above'], ans: 2 },
        { q: 'Return type of main() in C?', opts: ['void', 'int', 'char', 'float'], ans: 1 },
        { q: 'Function to copy strings in C?', opts: ['strcat()', 'strcpy()', 'strcmp()', 'strlen()'], ans: 1 },
        { q: 'What is a segmentation fault?', opts: ['Syntax error', 'Invalid memory access', 'Compilation error', 'Stack overflow'], ans: 1 },
        { q: 'What does & do with variables?', opts: ['Dereferences pointer', 'Gets address of variable', 'Bitwise AND', 'Logical AND'], ans: 1 },
        { q: 'Used to end a switch case?', opts: ['exit', 'stop', 'break', 'end'], ans: 2 },
        { q: 'Array indices in C start at?', opts: ['1', '0', '-1', 'Any'], ans: 1 },
        { q: 'What is a null pointer?', opts: ['Pointer to zero', 'Invalid pointer', 'Pointer that points to nothing', 'Dangling pointer'], ans: 2 },
        { q: 'Keyword to define a constant in C?', opts: ['var', 'let', 'const', '#define can be used'], ans: 3 },
        { q: 'printf format specifier for float?', opts: ['%d', '%c', '%f', '%s'], ans: 2 },
        { q: 'What does sizeof() return?', opts: ['Value of variable', 'Address of variable', 'Size in bytes', 'Number of elements'], ans: 2 },
    ],
    'Frontend Developer': [
        { q: 'Which HTML tag is used for the largest heading?', opts: ['<h6>', '<h1>', '<head>', '<header>'], ans: 1 },
        { q: 'What does CSS stand for?', opts: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Colorful Style Sheets'], ans: 1 },
        { q: 'Which CSS property changes text color?', opts: ['font-color', 'text-color', 'color', 'foreground'], ans: 2 },
        { q: 'How do you center a block element with CSS?', opts: ['text-align: center', 'margin: 0 auto', 'align: center', 'position: center'], ans: 1 },
        { q: 'What does the "display: flex" property do?', opts: ['Hides the element', 'Enables Flexbox layout', 'Makes text flexible', 'Centers the element'], ans: 1 },
        { q: 'Which JavaScript method selects an element by ID?', opts: ['querySelector()', 'getElementById()', 'getElement()', 'selectId()'], ans: 1 },
        { q: 'What is the box model in CSS?', opts: ['A 3D model', 'Content, padding, border, margin', 'A CSS framework', 'A grid system'], ans: 1 },
        { q: 'What does "responsive design" mean?', opts: ['Fast loading websites', 'Design that adapts to screen sizes', 'Websites that respond to clicks', 'A CSS library'], ans: 1 },
        { q: 'Which HTML element is used to link external CSS?', opts: ['<style>', '<link>', '<css>', '<script>'], ans: 1 },
        { q: 'What is React primarily used for?', opts: ['Server-side rendering', 'Building user interfaces', 'Database management', 'Network requests'], ans: 1 },
        { q: 'What does "alt" attribute in <img> do?', opts: ['Sets image size', 'Provides alternative text', 'Links the image', 'Styles the image'], ans: 1 },
        { q: 'What is the purpose of the <nav> element?', opts: ['Navigation links', 'Create a new page', 'Format text', 'Insert a video'], ans: 0 },
        { q: 'Which CSS unit is relative to the viewport width?', opts: ['px', 'em', 'vw', 'rem'], ans: 2 },
        { q: 'What does JavaScript "addEventListener" do?', opts: ['Creates a new element', 'Attaches an event handler', 'Removes an element', 'Adds CSS'], ans: 1 },
        { q: 'What is a media query used for?', opts: ['Fetching data', 'Applying styles based on screen size', 'Playing media files', 'Creating animations'], ans: 1 },
    ],
    'Time Management': [
        { q: 'What is the Pomodoro Technique?', opts: ['25 min work + 5 min break cycles', 'Working 8 hours straight', 'A task management app', 'A sleep schedule method'], ans: 0 },
        { q: 'GTD stands for?', opts: ['Get Things Done', 'Getting Things Done', 'Go Toward Dreams', 'Goals That Drive'], ans: 1 },
        { q: 'What is time-blocking?', opts: ['Blocking social media sites', 'Scheduling specific tasks in calendar slots', 'Setting timers for tasks', 'Blocking distracting thoughts'], ans: 1 },
        { q: 'The Eisenhower Matrix categorizes tasks by?', opts: ['Cost and time', 'Urgency and importance', 'Difficulty and duration', 'Priority and resources'], ans: 1 },
        { q: 'What is "eating the frog" in productivity?', opts: ['A healthy breakfast habit', 'Doing the hardest task first', 'A meditation technique', 'Avoiding difficult tasks'], ans: 1 },
        { q: 'Parkinson\'s Law states that?', opts: ['Work expands to fill the time available', 'Earlier is always better', 'Deadlines reduce quality', 'Multitasking saves time'], ans: 0 },
        { q: 'What is the 2-minute rule?', opts: ['Take a 2-min break every hour', 'If it takes under 2 mins, do it now', 'Plan 2 days ahead', 'Work in 2-hour blocks'], ans: 1 },
        { q: 'Which of these is a poor time management habit?', opts: ['Setting deadlines', 'Multitasking constantly', 'Prioritizing tasks', 'Taking regular breaks'], ans: 1 },
        { q: 'What does "deep work" mean according to Cal Newport?', opts: ['Working late at night', 'Focused, distraction-free work on cognitively demanding tasks', 'Working deep underground', 'Emotional labor'], ans: 1 },
        { q: 'What is the 80/20 rule (Pareto Principle)?', opts: ['80% of results come from 20% of efforts', '80% of time should be for work', 'Work 80 hours a week', '20% break time is mandatory'], ans: 0 },
        { q: 'Which tool is commonly used for task management?', opts: ['Photoshop', 'Trello', 'VLC Media Player', 'MS Paint'], ans: 1 },
        { q: 'What is "procrastination"?', opts: ['Finishing tasks early', 'Avoiding tasks until the last minute', 'Planning tasks carefully', 'Delegating tasks'], ans: 1 },
        { q: 'What does SMART goal stand for?', opts: ['Simple, Manageable, Achievable, Real, Timed', 'Specific, Measurable, Achievable, Relevant, Time-bound', 'Smart, Modern, Agile, Realistic, True', 'Strategic, Motivated, Attainable, Researched, Tried'], ans: 1 },
        { q: 'Which practice helps reduce decision fatigue?', opts: ['Making more decisions daily', 'Batching similar tasks together', 'Working without breaks', 'Ignoring low-priority tasks'], ans: 1 },
        { q: 'What is a "weekly review" in productivity?', opts: ['Watching review videos', 'Assessing goals and planning the upcoming week', 'A performance evaluation', 'Reading weekly news'], ans: 1 },
    ],
    'JavaScript Advanced': [
        { q: 'What is a closure in JavaScript?', opts: ['A function with no return', 'A function that retains access to its outer scope', 'A locked object', 'An error handler'], ans: 1 },
        { q: 'What does "async/await" simplify?', opts: ['DOM manipulation', 'Working with Promises', 'CSS animations', 'Event listeners'], ans: 1 },
        { q: 'What does the "this" keyword refer to in an arrow function?', opts: ['The function itself', 'The enclosing lexical context', 'The global object', 'The DOM element'], ans: 1 },
        { q: 'What is a Promise in JavaScript?', opts: ['A guarantee of no errors', 'An object representing eventual completion/failure of async operation', 'A type of loop', 'A DOM event'], ans: 1 },
        { q: 'What is the difference between == and ===?', opts: ['No difference', '=== checks value and type, == only value', '== checks type, === only value', 'Both are assignment operators'], ans: 1 },
        { q: 'What is "hoisting" in JavaScript?', opts: ['Moving elements up the DOM', 'Variable/function declarations moved to top of scope', 'A CSS technique', 'An event bubbling concept'], ans: 1 },
        { q: 'What does Array.prototype.map() return?', opts: ['The original array', 'A new array with transformed elements', 'An object', 'A boolean'], ans: 1 },
        { q: 'What is the purpose of the "spread operator" (...)?', opts: ['Multiply values', 'Expand iterables into individual elements', 'Create a new function', 'Delay execution'], ans: 1 },
        { q: 'What is a "prototype" in JavaScript?', opts: ['The first version of code', 'An object from which others inherit properties', 'A testing environment', 'A class blueprint'], ans: 1 },
        { q: 'What does "event delegation" mean?', opts: ['Assigning events to each element', 'Using a parent element to handle events from children', 'Delegating tasks to async functions', 'Removing event listeners'], ans: 1 },
        { q: 'What is the output of typeof null?', opts: ['"null"', '"undefined"', '"object"', '"boolean"'], ans: 2 },
        { q: 'What is the purpose of "use strict"?', opts: ['Enable dark mode', 'Enforce stricter parsing and error handling', 'Speed up execution', 'Disable console.log'], ans: 1 },
        { q: 'What does Promise.all() do?', opts: ['Runs promises sequentially', 'Runs all promises in parallel and waits for all to resolve', 'Cancels all promises', 'Returns the first resolved promise'], ans: 1 },
        { q: 'What is "destructuring" in JavaScript?', opts: ['Breaking the code intentionally', 'Extracting values from arrays/objects into variables', 'Deleting object properties', 'Converting data types'], ans: 1 },
        { q: 'What is a "generator function"?', opts: ['A function that generates HTML', 'A function that can pause and resume execution', 'A function that creates objects', 'A function without arguments'], ans: 1 },
    ],
    'Web Design': [
        { q: 'What is the primary goal of UI design?', opts: ['Writing code', 'Creating visually appealing and functional interfaces', 'Database management', 'Server configuration'], ans: 1 },
        { q: 'What does UX stand for?', opts: ['User XML', 'User Experience', 'Unified Extension', 'Universal Exchange'], ans: 1 },
        { q: 'What is "white space" in design?', opts: ['White-colored background', 'Empty space between design elements', 'A blank page', 'A CSS property'], ans: 1 },
        { q: 'What is the purpose of a wireframe?', opts: ['A final design', 'A low-fidelity blueprint of a layout', 'An HTML framework', 'A CSS grid system'], ans: 1 },
        { q: 'What is "color theory"?', opts: ['A theory about printing colors', 'The study of how colors interact and affect perception', 'A CSS color system', 'A photography concept'], ans: 1 },
        { q: 'Which color model is used for digital screens?', opts: ['CMYK', 'RGB', 'HSL only', 'Pantone'], ans: 1 },
        { q: 'What is "typography" in web design?', opts: ['Using HTML tables', 'The art of arranging type/fonts', 'Adding images to a layout', 'Writing copy for websites'], ans: 1 },
        { q: 'What tool is commonly used for UI design and prototyping?', opts: ['Excel', 'Figma', 'VLC', 'Photoshop only'], ans: 1 },
        { q: 'What is the "F-pattern" in web design?', opts: ['A type of font', 'Users read content in an F-shaped pattern on screens', 'A CSS flexbox pattern', 'A color scheme'], ans: 1 },
        { q: 'What does "above the fold" mean?', opts: ['Folding paper in design', 'Content visible without scrolling', 'A CSS animation', 'A header design'], ans: 1 },
        { q: 'What principle does "less is more" represent in design?', opts: ['Minimalism', 'Using fewer colors', 'Reducing page size', 'Removing navigation'], ans: 0 },
        { q: 'What is a "call to action" (CTA) button?', opts: ['A contact form button', 'A button that encourages users to take a specific action', 'A login button only', 'A navigation link'], ans: 1 },
        { q: 'What does "contrast" in design achieve?', opts: ['Makes all elements look the same', 'Creates visual hierarchy and improves readability', 'Reduces loading time', 'Adds 3D effects'], ans: 1 },
        { q: 'What is "responsive design"?', opts: ['Design that responds to hover', 'Layouts that adapt to different screen sizes', 'Fast-loading designs', 'Interactive animations'], ans: 1 },
        { q: 'What is the purpose of a "grid system" in design?', opts: ['Making dot patterns', 'Organizing content into consistent columns and rows', 'Adding background images', 'Creating tables'], ans: 1 },
    ],
    'Communication Skills': [
        { q: 'What is "active listening"?', opts: ['Listening while multitasking', 'Fully focusing, understanding and responding thoughtfully', 'Listening to music while working', 'Passive hearing'], ans: 1 },
        { q: 'What does "non-verbal communication" include?', opts: ['Emails and texts', 'Body language, facial expressions and gestures', 'Phone calls', 'Written reports'], ans: 1 },
        { q: 'What is the purpose of an "elevator pitch"?', opts: ['Explaining lift safety', 'A brief, persuasive speech to spark interest in 60 seconds', 'A long business presentation', 'A job interview format'], ans: 1 },
        { q: 'What is "assertive communication"?', opts: ['Being aggressive and demanding', 'Expressing thoughts confidently while respecting others', 'Saying yes to everything', 'Avoiding confrontation always'], ans: 1 },
        { q: 'Which opening is best for a professional email?', opts: ['"Yo, what\'s up"', '"Dear Mr./Ms. [Name],"', '"Hey!!!"', '"To whom it may concern or whatever"'], ans: 1 },
        { q: 'What does "empathy" in communication mean?', opts: ['Feeling sorry for others', 'Understanding and sharing the feelings of others', 'Agreeing with everything', 'Avoiding difficult conversations'], ans: 1 },
        { q: 'What is "paraphrasing" in communication?', opts: ['Copying someone\'s words exactly', 'Restating what was said in your own words', 'Interrupting the speaker', 'Changing the topic'], ans: 1 },
        { q: 'What does body language account for in communication?', opts: ['7% of message', 'Up to 55% of impression', '100% of meaning', 'Only 10% of impact'], ans: 1 },
        { q: 'What is "constructive feedback"?', opts: ['Only positive comments', 'Specific, actionable suggestions for improvement', 'Harsh criticism', 'Vague advice'], ans: 1 },
        { q: 'What makes public speaking effective?', opts: ['Speaking very fast', 'Clear structure, eye contact and confident delivery', 'Reading directly from notes', 'Using complex vocabulary only'], ans: 1 },
        { q: 'What is the purpose of small talk?', opts: ['Wasting time', 'Building rapport and relationships before important discussions', 'Avoiding work topics', 'Gossipping'], ans: 1 },
        { q: 'What is "tone" in written communication?', opts: ['Volume of text', 'The attitude or feeling conveyed through word choice', 'Font style in emails', 'The subject line'], ans: 1 },
        { q: 'Which practice improves professional email writing?', opts: ['Using all capitals', 'Being clear, concise and using proper grammar', 'Adding many emojis', 'Writing very long paragraphs'], ans: 1 },
        { q: 'What is "interpersonal communication"?', opts: ['Communication between companies', 'Communication between individuals', 'Internal thoughts', 'Written communication only'], ans: 1 },
        { q: 'How should you handle a communication conflict?', opts: ['Ignore it completely', 'Listen, acknowledge perspectives and find common ground', 'Always escalate immediately', 'Argue until you win'], ans: 1 },
    ],
    'Railway Group D': [
        { q: 'Which is the largest railway zone in India?', opts: ['Northern Railway', 'Western Railway', 'Southern Railway', 'Eastern Railway'], ans: 0 },
        { q: 'Who is known as the Father of Indian Railways?', opts: ['Lord Dalhousie', 'Lord Curzon', 'Lord Ripon', 'Lord Bentinck'], ans: 0 },
        { q: 'The first train in India ran between?', opts: ['Mumbai to Thane', 'Delhi to Agra', 'Mumbai to Pune', 'Kolkata to Howrah'], ans: 0 }
    ],
    'CTET': [
        { q: 'Who developed the Theory of Multiple Intelligences?', opts: ['Howard Gardner', 'Jean Piaget', 'Lev Vygotsky', 'B.F. Skinner'], ans: 0 },
        { q: 'Which stage of Piaget\'s theory involves "Object Permanence"?', opts: ['Sensorimotor', 'Pre-operational', 'Concrete Operational', 'Formal Operational'], ans: 0 }
    ],
    'Army GD': [
        { q: 'What is the highest gallantry award in India?', opts: ['Param Vir Chakra', 'Bharat Ratna', 'Mahavir Chakra', 'Kirti Chakra'], ans: 0 },
        { q: 'Where is the Indian Military Academy located?', opts: ['Dehradun', 'Pune', 'Chennai', 'Delhi'], ans: 0 }
    ],
    'Bihar Police': [
        { q: 'Who was the first Chief Minister of Bihar?', opts: ['Sri Krishna Singh', 'Nitish Kumar', 'Lalu Prasad Yadav', 'Rabri Devi'], ans: 0 },
        { q: 'Which river is known as the "Sorrow of Bihar"?', opts: ['Kosi', 'Ganga', 'Son', 'Gandak'], ans: 0 }
    ],
    'SSC GD': [
        { q: 'Which article of the Indian Constitution deals with Equality before Law?', opts: ['Article 14', 'Article 17', 'Article 19', 'Article 21'], ans: 0 },
        { q: 'The "Dandi March" was started in which year?', opts: ['1930', '1942', '1920', '1919'], ans: 0 }
    ],
};


// ── PROTECTED ROUTES ────────────────────────────────────────────────

// GET /api/test/daily-challenge/stats
router.get('/daily-challenge/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const User = require('../models/User');
        const user = await User.findById(userId);

        // 1. Calculate Streak with Auto-Reset on missed days
        let streak = 0;
        if (user) {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (user.lastChallengeDate && user.lastChallengeDate !== today && user.lastChallengeDate !== yesterdayStr) {
                user.streak = 0;
                await user.save();
            }
            streak = user.streak || 0;
        }

        // 2. Calculate Global Rank by total points comparison
        let rank = 'N/A';
        if (user) {
            const betterCount = await User.countDocuments({ 
                points: { $gt: user.points || 0 } 
            });
            rank = betterCount + 1;
        }

        // 3. Get User's actual last Daily Challenge result
        const lastResult = await TestResult.findOne({ 
            userId, 
            courseId: { $regex: /^daily_challenge_/ }
        }).sort({ timestamp: -1 });

        res.json({ 
            ok: true, 
            score: lastResult ? lastResult.score : 0,
            correct: lastResult ? lastResult.correctQuestions : 0,
            totalQuestions: lastResult ? lastResult.totalQuestions : 15,
            rank: rank !== 'N/A' ? rank : '--',
            streak
        });
    } catch (err) {
        console.error("Fetch daily challenge stats error:", err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
});

router.get('/questions/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ ok: false, message: 'courseId is required' });

    try {
        const course = await Course.findOne({
            $or: [
                { _id: courseId.match(/^[0-9a-fA-F]{24}$/) ? courseId : null },
                { slug: courseId.toLowerCase().trim() },
                { slug: courseId.toLowerCase().replace(/-/g, ' ').trim() },
                { slug: courseId.toLowerCase().replace(/\s+/g, '-').trim() },
                { title: courseId }
            ].filter(q => q._id !== null || q.slug || q.title)
        });

        if (course && course.quizQuestions && course.quizQuestions.length >= 5) {
            const formattedQuestions = course.quizQuestions.map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.options[q.correctIndex]
            }));
            return res.json(formattedQuestions);
        }

        const bank = QUESTION_BANKS[courseId] || QUESTION_BANKS['default'];
        const formattedQuestions = bank.slice(0, 15).map(q => ({
            question: q.q,
            options: q.opts,
            correctAnswer: q.opts[q.ans]
        }));

        res.json(formattedQuestions);
    } catch (err) {
        console.error('Fetch questions error:', err);
        res.status(500).json({ ok: false, message: 'Server error fetching questions' });
    }
});

// GET /api/test/daily-challenge/all (Admin)
router.get('/daily-challenge/all', requireAdmin, async (req, res) => {
    try {
        const challenges = await DailyChallenge.find()
            .select('date title examType totalQuestions durationMinutes isPremium price pdfUrl solutionsPdfUrl createdAt questions._id')
            .sort({ date: -1 });
        res.json({ ok: true, challenges });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

router.post('/daily-challenge/submit', requireAuth, async (req, res) => {
    try {
        const { challengeId, answers, score, correct, wrong, accuracy, timeTaken } = req.body;
        const userId = req.userId;

        // 1. Save Result
        const result = await TestResult.create({
            userId,
            courseId: `daily_challenge_${challengeId}`,
            score: Number(score),
            passed: true, // required by schema, mark true as completed
            totalQuestions: Number(correct) + Number(wrong),
            correctQuestions: Number(correct),
            timestamp: new Date()
        });

        // 2. Update User Streaks & Points
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user) {
            const today = new Date().toISOString().split('T')[0];
            
            // If they haven't done a challenge today yet
            if (user.lastChallengeDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (user.lastChallengeDate === yesterdayStr) {
                    user.streak += 1;
                } else {
                    user.streak = 1;
                }
                user.lastChallengeDate = today;
                user.points += 50; // Daily reward
            }
            
            user.points += Math.floor(score); // Performance reward
            await user.save();
        }

        res.json({ ok: true, resultId: result._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: 'Submission failed' });
    }
});

module.exports = router;
