import dotenv from 'dotenv'
import connectdb from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectdb().then(()=>{
    app.listen(process.env>PORT || 8000),()=>{
        console.log(`Server is running at port:${process.env.PORT}`);
    }})
.catch((err)=>{
    console.log("Mongo Db connection failed",err)
})