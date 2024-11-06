import mongoose from "mongoose";
import { db_name } from "../constants.js";

const connectdb=async()=>{
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONODB_URL}/${db_name}`)
        console.log(`\n Connection to DB successful!! ${connectionInstance.connection.host}`)
    }catch(error){
        console.error("Error:",error)
        throw error
        process.exit(1)
    }
}

export default connectdb;