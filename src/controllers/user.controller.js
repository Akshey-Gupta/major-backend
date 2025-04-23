import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiErrors } from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import deleteFromCloudinary from '../utils/deleteFromCloudinary.js';
import mongoose from 'mongoose';

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

const refreshAccessToken=asyncHandler(async(req,res)=>{
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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new ApiErrors(400,"Old Password is incorrect")
    }
    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUSer=asyncHandler(async(req,res)=>{
    res.status(200).json(new ApiResponse(200,req.user,"User fetched Successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,username,email}=req.body

    if(!fullname && !username && !email){
        throw new ApiErrors(400,"Fields are required")
    }
    
    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                username:username.toLowerCase(),
                email
            }
        },{new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200,user,"User updated Successfully"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiErrors(400,"Avatar file upload failed")
    }

    const existingUser=await User.findById(req.user?._id)
    if(existingUser?.avatar){
        await deleteFromCloudinary(existingUser.avatar)
    }

    const updateduser=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar:avatar.url
        }
    },
        {new:true}
    ).select("-password -refreshToken")
    return res.status(200).json(ApiResponse(200,updateduser,"User Avatar updated Successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiErrors(400,"Cover Image file is required")
    }
    const coverimage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverimage.url){
        throw new ApiErrors(400,"Cover Image File upload Failed")
    }

    const existingUser=await User.findById(req.user?._id)
    if(existingUser?.coverimage){
        await deleteFromCloudinary(existingUser.coverimage)
    }
    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverimage:coverimage.url
        }
    },{
        new:true
    }).select("-password -refreshToken")
    return res.status(200).json(ApiResponse(200,user,"Cover image File updated Successfully"))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params
    if(!username){
        throw new ApiErrors(400,"Username is Missing")
    }
    const channel=await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },{
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },{
        $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
])

if(!channel?.length){
    throw new ApiErrors(404,"channel does not exists")
}
console.log(channel)
return res.status(200).json(new ApiResponse(200,channel[0],"User channel responed successfully"))

})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([{
        $match:{
            _id:new mongoose.Types.ObjectId(req.user._id)
        }
    },{
        $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },{
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ]
        }
    }
]);
    
    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"));
})

export { registerUser, 
         loginUser,
         logoutUser,
         refreshAccessToken,
         getCurrentUSer,
         changeCurrentPassword,
         updateAccountDetails,
         updateUserAvatar,
         updateUserCoverImage ,
         getUserChannelProfile,
         getWatchHistory
};