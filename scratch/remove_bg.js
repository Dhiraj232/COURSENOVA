const Jimp = require('jimp');
const path = require('path');

const imagePath = path.join(__dirname, '../public/images/coursenova-logo.png');

async function removeWhiteBackground() {
    try {
        const image = await Jimp.read(imagePath);
        
        // Define tolerance for "white"
        const tolerance = 20;
        
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            // Get RGBA values
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            const alpha = this.bitmap.data[idx + 3];

            // Check if pixel is close to white
            if (red > 255 - tolerance && green > 255 - tolerance && blue > 255 - tolerance) {
                // Set alpha to 0 (transparent)
                this.bitmap.data[idx + 3] = 0;
            }
        });

        await image.writeAsync(imagePath);
        console.log('Background removed successfully!');
    } catch (err) {
        console.error('Error processing image:', err);
    }
}

removeWhiteBackground();
