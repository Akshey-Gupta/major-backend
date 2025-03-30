import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiErrors } from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessandRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiErrors(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new ApiErrors(500, "Something went wrong while generating tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {

    console.log("Received Body:", req.body);
    console.log("Received Files:", req.files);
    // get user details from frontend
    const { fullname, email, username, password } = req.body;
    console.log(fullname, email, username, password);

    // validation - not empty
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiErrors(400, 'All fields are required');
    }

    // check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (existedUser) {
        throw new ApiErrors(409, "Username or email already exists");
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiErrors(400, "Avatar file is required");
    }

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage =await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiErrors(400, "Avatar file upload failed");
    }

    // create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // check for user creation
    if (!createdUser) {
        throw new ApiErrors(500, "Something went wrong while registering the user");
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
});

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username or email
    //find the user
    //password check
    //acess and refresh token 
    //send cookie

    const{email,username,password}=req.body
    if(!username && !email){
        throw new ApiErrors(400,"username or password is required")
    }

    const user =await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiErrors(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiErrors(404,"InValid User Credentials")
    }

    const {accessToken,refreshToken}=await generateAccessandRefreshTokens(user._id)
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new ApiResponse(200,{
        user:loggedInUser,accessToken,refreshToken
    },
    "User logged in Successfully"
))
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },{
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User LoggedOut Successfully"))
})

const refreshAcessToken=asyncHandler(async(req,res)=>{
    const incomingrequestToken= req.cookies.refreshToken || req.body.refreshToken

    if(!incomingrequestToken){
        throw new ApiErrors(401,"Unauthorized request")
    }

try {
    const decodedToken=jwt.verify(
        incomingrequestToken, process.env.REFRESH_TOKEN_SECRET
    )
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiErrors(401,"Invalid Refresh Token")
        }
    
        if(incomingrequestToken !==user?.refreshToken){
            throw new ApiErrors(401,"Refresh Token is Expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}=await generateAccessandRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newrefreshToken,options).json(
            new ApiResponse(200,{
                accessToken,refreshToken:newrefreshToken
            },"Access Token Refreshed")
        )
} catch (error) {
    throw new ApiErrors(401,error?.message || "Invalid Refresh Token")
}
})

export { registerUser, 
         loginUser,
         logoutUser,
         refreshAcessToken 
};