const express = require('express');
const router = express.Router();

router.post('/ai-chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, message: 'Message is required' });

    try {
        // This is a placeholder for real AI interaction.
        // In a production app, you'd use the openai package:
        /*
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: message }],
        });
        const reply = completion.choices[0].message.content;
        */

        // For demo purposes, we'll provide a helpful mock response.
        const lowerMsg = message.toLowerCase();
        let reply = "I'm your RENVOX AI Assistant. How can I help you today?";

        if (lowerMsg.includes('recursion')) {
            reply = "Recursion is a process in which a function calls itself directly or indirectly. It consists of two main parts: a **Base Case** (to stop calling itself) and a **Recursive Case** (where the function calls itself).";
        } else if (lowerMsg.includes('binary search')) {
            reply = "Binary Search is an efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list that could contain the item, until you've narrowed down the possible locations to just one.";
        } else if (lowerMsg.includes('armstrong number')) {
            reply = "An Armstrong number is a number that is equal to the sum of cubes of its digits. For example 153 is an Armstrong number because (1^3)+(5^3)+(3^3) = 1 + 125 + 27 = 153.";
        } else if (lowerMsg.includes('linked list')) {
            reply = "To reverse a linked list, you need three pointers: `prev`, `curr`, and `next`. Iterate through the list, setting `next = curr.next`, then `curr.next = prev`, then `prev = curr`, and finally `curr = next`.";
        }

        res.json({ ok: true, reply });
    } catch (err) {
        console.error('AI chat error:', err);
        res.status(500).json({ ok: false, message: 'AI logic failed' });
    }
});

module.exports = router;
