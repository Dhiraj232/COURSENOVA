/**
 * catchAsync - Helper function to eliminate the need for try...catch 
 * blocks in Express asynchronous controller functions.
 */
module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
