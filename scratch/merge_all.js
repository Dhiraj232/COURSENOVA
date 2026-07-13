const fs = require('fs');
const path = require('path');

const p1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_questions_page1.json'), 'utf8'));
const p2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_questions_page2.json'), 'utf8'));
const p3 = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_questions_page3.json'), 'utf8'));

const combined = [...p1, ...p2, ...p3];
combined.sort((a, b) => a.questionNo - b.questionNo);

const finalObj = {
  "success": true,
  "subject": "Physics",
  "chapter": "Model Paper 1",
  "questions": combined
};

fs.writeFileSync(path.join(__dirname, 'final_output.json'), JSON.stringify(finalObj, null, 2), 'utf8');
console.log('Saved final_output.json. Total questions:', combined.length);
