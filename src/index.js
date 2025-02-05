import dotenv from 'dotenv';
import connectdb from "./db/index.js";
import { app } from './app.js';  // Import 'app' from 'app.js'

dotenv.config({
    path: './env'
});

connectdb()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.log("Mongo DB connection failed", err);
    });
