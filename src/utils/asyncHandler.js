const asyncHandler = (requestHandler) => {
    return (req, res, next) => {  // ✅ Return the function
        Promise.resolve(requestHandler(req, res, next)).catch((err)=>next(err));
    };
};

export { asyncHandler };

/*so it moves on instead being stuck on one error?
ChatGPT said:
ChatGPT
Yes, exactly! 🚀

Without asyncHandler, if an error occurs inside an asynchronous route handler, Express doesn't catch it, and the request might hang or crash the app.

With asyncHandler, the error is immediately caught and forwarded to the next middleware (which is usually an error-handling function). This means the app doesn’t get stuck—it just moves on to the next appropriate step.

🔹 Example Without asyncHandler (App Might Hang)
js
Copy
Edit
app.get('/user', async (req, res) => {
    const user = await User.findById(req.params.id); // If this throws an error...
    res.json(user); // This never runs, and Express doesn’t catch the error!
});
🔴 If User.findById fails, the request hangs because Express doesn’t know an error occurred in an async function.

🔹 Example With asyncHandler (App Moves On)
js
Copy
Edit
app.get('/user', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id); // If this throws an error...
    res.json(user); // This will be skipped, and Express moves to error-handling!
}));
✅ Now, if User.findById fails, asyncHandler catches the error and calls next(err), which means Express knows an error happened and moves on to the error-handling middleware.

🔹 What Happens When an Error Occurs?
When an error is caught, it moves to this middleware:

js
Copy
Edit
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message }); // Sends an error response
});
Instead of hanging or crashing, Express immediately moves here and returns a 500 Internal Server Error response.

🔹 Final Answer
Yes! asyncHandler makes sure that if an error happens, Express doesn’t get stuck—it catches the error and moves on to the error-handling middleware. This keeps your app running smoothly. 🚀
*/