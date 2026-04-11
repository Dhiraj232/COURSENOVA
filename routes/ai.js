const express = require('express');
const router = express.Router();

router.post('/ai-chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, message: 'Message is required' });

    try {
        // Master Prompt for COURSENOVA Doubt Assistant
        const masterPrompt = `You are the COURSENOVA Doubt Assistant. 
        Your goal is to help students with programming, DSA, Web Development, and AI doubts.
        Provide clear, concise explanations and code examples where possible.`;

        // For now, simple mock logic as a placeholder for LLM integration
        const lowerMsg = message.toLowerCase();
        let reply = "I'm your COURSENOVA Assistant. How can I help you today?";

        if (lowerMsg.includes('recursion')) {
            reply = "Recursion is a process in which a function calls itself directly or indirectly. It consists of two main parts: a **Base Case** (to stop calling itself) and a **Recursive Case** (where the function calls itself). For example, finding the factorial of a number: `fact(n) = n * fact(n-1)` with base case `n <= 1`.";
        } else if (lowerMsg.includes('binary search')) {
            reply = "Binary Search is an efficient O(log n) algorithm for finding an item from a **sorted list**. It works by repeatedly dividing the search range in half. If the target value is less than the middle element, it narrows the search to the lower half; otherwise, it searches the upper half.";
        } else if (lowerMsg.includes('armstrong number')) {
            reply = "An Armstrong number is a number that is equal to the sum of its own digits each raised to the power of the number of digits. For example, 153 is an Armstrong number because 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153.";
        } else if (lowerMsg.includes('linked list')) {
            reply = "A Linked List is a linear data structure where elements (nodes) are stored in nodes that point to the next node. To reverse a linked list, you need to iterate through the list and flip the 'next' pointer of each node to point to the previous node instead of the next one.";
        } else if (lowerMsg.includes('big-o') || lowerMsg.includes('time complexity')) {
            reply = "Big-O notation describes the worst-case performance of an algorithm. Common complexities include: \n- **O(1)**: Constant time (e.g., array access)\n- **O(log n)**: Logarithmic time (e.g., binary search)\n- **O(n)**: Linear time (e.g., simple loop)\n- **O(n log n)**: Linearithmic time (e.g., merge sort)\n- **O(n²)**: Quadratic time (e.g., nested loops).";
        } else if (lowerMsg.includes('mern') || lowerMsg.includes('full stack')) {
            reply = "MERN stands for MongoDB, Express.js, React, and Node.js. It's a popular JavaScript stack for building modern web applications. You should start by mastering HTML/CSS, then move to JavaScript, and finally learn the backend (Node/Express/MongoDB) and frontend (React) components.";
        } else {
            reply = "That's a great question about " + message + "! As your programming assistant, I recommend checking out our **Practice** section for hands-on challenges, or searching for specific courses on this topic in our catalog.";
        }

        res.json({ ok: true, reply });
    } catch (err) {
        console.error('AI error:', err);
        res.status(500).json({ ok: false, message: 'AI failed to respond' });
    }
});

module.exports = router;
