try {
    const { createCanvas } = require('canvas');
    console.log("createCanvas loaded:", typeof createCanvas);
    const canvas = createCanvas(100, 100);
    console.log("canvas created successfully");
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    const buf = canvas.toBuffer('image/png');
    console.log("canvas toBuffer success. Buffer size:", buf.length);
} catch (err) {
    console.error("CANVAS ERROR:", err.message);
    console.error(err.stack);
}
