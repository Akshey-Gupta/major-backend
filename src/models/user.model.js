import mongoose,{Schema} from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt"

//bcrypt helps hash/encrypt your password
//same with jsonwebtoken

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        trim:true,
        index:true,
        unique:true,
        lowercase:true
    },
    fullname:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, //cloudinary url
        required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Video"
        }
    ],password:{
        type:String,
        required:[true, 'Password is required']
    },
    refreshToken:{
        type:String
    }
},{
    timestamps:true
}
)

userSchema.pre("save",async function(next){//encrypting data before saving
    if(!this.isModified("password")){
        return next()
    }
    this.password=await bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect=async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign( /*method to generate tokens*/ 
    {
    _id:this._id,
    email:this.email,
    username:this.username,
    fullname:this.fullname
    },process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign( /*method to generate tokens*/ 
        {
        _id:this._id,
        },process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
    }

export const User=mongoose.model("User",userSchema)