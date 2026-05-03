require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const MockTestPack = require('../models/MockTestPack');
  const PracticeQuestion = require('../models/PracticeQuestion');
  const packs = await MockTestPack.find({ title: /forest/i }).populate('tests.questions');
  if (!packs.length) { console.log('No forest guard pack found'); process.exit(); }
  const pack = packs[0];
  console.log('Pack:', pack.title, '| isFree:', pack.isFree, '| price:', pack.price, '| id:', pack.id);
  console.log('Tests count:', pack.tests.length);
  pack.tests.forEach((t, i) => {
    console.log(`\nTest[${i}]: "${t.testTitle}" | questions:`, t.questions.length);
    if (t.questions[0]) {
      const q = t.questions[0];
      console.log('  Sample Q type:', typeof q);
      console.log('  Sample Q keys:', q && typeof q === 'object' ? Object.keys(q._doc || q) : 'primitive');
      console.log('  question field:', q.question ? q.question.substring(0,60) : 'MISSING');
      console.log('  correctAnswer:', q.correctAnswer);
      console.log('  options:', q.options);
    }
  });
  process.exit();
}).catch(e => { console.error(e.message); process.exit(1); });
