const express = require('express');
const router = express.Router();

router.post('/ai-chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, message: 'Message is required' });

    try {
        // Master Prompt for Community AI Doubt Solver
        const masterPrompt = `You are the RENVOX Community AI Doubt Assistant. 
        Your goal is to help students with programming, DSA, Web Development, and AI doubts.
        Provide clear, concise explanations and code examples where possible.
        The current user's question is: "${message}"`;

        /*
        // TODO: Real OpenAI integration
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: masterPrompt }, { role: "user", content: message }],
        });
        const reply = completion.choices[0].message.content;
        */

        // For now, simple mock logic
        const lowerMsg = message.toLowerCase();
        let reply = "I'm your RENVOX AI Assistant. How can I help you today?";

        if (lowerMsg.includes('recursion')) {
            reply = "Recursion is a process where a function calls itself. It needs a **Base Case** (to stop calling itself) and a **Recursive Case**. For example, calculating factorial(n) as n * factorial(n-1).";
        } else if (lowerMsg.includes('binary search')) {
            reply = "Binary Search is an efficient O(log n) algorithm for finding an item in a **sorted list**. It repeatedly divides the range in half until the item is found.";
        } else if (lowerMsg.includes('linked list')) {
            reply = "A Linked List is a linear data structure where elements are not stored at contiguous memory locations. Instead, each element points to the next one. Reversing a linked list involves changing the 'next' pointer of each node to point to its predecessor.";
        } else if (lowerMsg.includes('big-o') || lowerMsg.includes('time complexity')) {
            reply = "Big-O notation describes the performance or complexity of an algorithm. O(1) is constant time, O(n) is linear time, and O(log n) is logarithmic time (like binary search).";
        } else {
            reply = "That's a great question about " + message + "! As a programming assistant, I'd recommend checking out the 'Practice' section for more hands-on learning, or exploring our 'DSA' courses for deep dives.";
        }

        res.json({ ok: true, reply });
    } catch (err) {
        console.error('Community AI error:', err);
        res.status(500).json({ ok: false, message: 'AI failed to respond' });
    }
});

module.exports = router;
