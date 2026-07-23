require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parsePDF } = require('./services/pdfParsingService');

async function main() {
    const pdfPath = 'C:\\Users\\dhira\\Downloads\\SSC GD 30th March 2024 Shift 1 by Cracku.pdf';
    const logFilePath = './verify_results.txt';
    
    // Clear old logs
    if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
    }
    
    const writeLog = (msg) => {
        fs.appendFileSync(logFilePath, msg + '\n');
        console.log(msg);
    };

    if (!fs.existsSync(pdfPath)) {
        writeLog(`PDF file not found at ${pdfPath}. Please verify the path.`);
        return;
    }
    
    const buffer = fs.readFileSync(pdfPath);
    writeLog('PDF loaded. Starting parser...');
    
    try {
        const questions = await parsePDF(buffer, { category: 'SSC GD', subject: 'General' }, 80, (progress, stage, log) => {
            writeLog(`[Progress ${progress}%] Stage: ${stage} | Log: ${log || ''}`);
        });
        
        writeLog('\n=======================================');
        writeLog(`Parser complete! Total questions extracted: ${questions.length}`);
        writeLog('=======================================');
        
        // Print parser logs summary
        const logs = questions.parserLogs || [];
        writeLog(`\nParser Logs Summary (all ${logs.length} items):`);
        logs.forEach(l => writeLog('  ' + l));

        if (questions.length > 0) {
            writeLog('\n--- Sample Question 1 ---');
            writeLog(JSON.stringify(questions[0], null, 2));
            
            writeLog('\n--- Sample Question 2 ---');
            if (questions[1]) {
                writeLog(JSON.stringify(questions[1], null, 2));
            }
            
            // Count languages
            const langs = questions.reduce((acc, q) => {
                acc[q.language] = (acc[q.language] || 0) + 1;
                return acc;
            }, {});
            writeLog(`\nLanguages distribution: ${JSON.stringify(langs)}`);
            
            // Count questions with correct answers
            const withAns = questions.filter(q => q.answer).length;
            writeLog(`Questions with correct answers detected: ${withAns} / ${questions.length}`);
            
            // Check for corrupted encoding
            const corrupted = questions.filter(q => {
                const hasQ = q.question.includes('\uFFFD');
                const hasOpt = q.options.some(o => o && o.includes('\uFFFD'));
                return hasQ || hasOpt;
            });
            writeLog(`Questions with corrupted unicode (\\uFFFD): ${corrupted.length}`);
        }
    } catch (err) {
        writeLog(`[CRITICAL ERROR] Parser crashed: ${err.stack}`);
    }
}

main().catch(console.error);
