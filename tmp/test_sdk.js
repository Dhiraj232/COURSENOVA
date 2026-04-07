const { Cashfree } = require('cashfree-pg');
console.log('Keys in Cashfree:', Object.keys(Cashfree));
if (Cashfree.Environment) {
    console.log('Cashfree.Environment keys:', Object.keys(Cashfree.Environment));
} else {
    console.log('Cashfree.Environment is UNDEFINED');
}
process.exit(0);
