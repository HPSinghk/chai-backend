import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import  jwt  from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessAndRefreshToken = async(userId) => {
     try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
     } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refrsh and access token")
     }
}

const registerUser = asyncHandler( async (req, res) => { 
     //get user detail from frontend
     //validation - not empty
     //check if user already exists : username email
     //check for images ,check for avatar
     //upload them to cloudinary
     //create user object - create entry in db
     //remove password and refresh token fields from response 
     //check for user creation
     //return res

     const {fullName, email, username, password} = req.body

        if(
            [fullName, email, username, password].some((field) =>
            field?.trim()==="")
        ){
            throw new ApiError(400, "All fields are required")
        }

        const existedUser = await User.findOne({
            $or: [{ username },{ email }]
        })
        if(existedUser){
            throw new ApiError(409, "User with email or username already exist")
        }


       const avatarLocalPath = req.files?.avatar[0]?.path ;
      /*  const coverImageLocalPath = req.files?.coverImage[0]?.path; */
        
        let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
            coverImageLocalPath = req.files.coverImage[0].path
        }

    if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required")
       }

       const avatar = await uploadOnCloudinary(avatarLocalPath)
       const coverImage = await uploadOnCloudinary(coverImageLocalPath)
       if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
       }

       const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "" ,
        email,
        password,
        username:username.toLowerCase()
       })

       const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
       )
        
       if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user" )
       }

       return res.status(201).json(
        new ApiResponse(200, createdUser,"User registered successfully")
       )
})

const loginUser = asyncHandler( async (req, res) =>{
    //take email or username
    //take password 
    //if email or username not there show the message something wrong
    //if email or username was there dycrypt corresponding password
    //if password matches let login
    //else return wrong password

    const {email, username, password} = req.body

    console.log(username)
    console.log(email)
    console.log(password)

    if(!username && !email){
        throw new ApiError(400, "email or username is required")
    }

    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "invalid user credential")
    }

    const {accessToken, refreshToken } = await  generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    /* console.log(loggedInUser) */
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )

})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $unset: {
                refreshToken:1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

try {
        const decodedToken =  jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options ={
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken,options)
        .cookie("refreshToken", newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newrefreshToken },
                "Access token refresh"
            )
        )
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
}
    
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPasword} = req.body
    const user = await User.findById(req.user._id)
    isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(201, "Invalid old password")
    }

    user.password = newPasword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetail = asyncHandler(async(req, res) => {
    const {fullName,email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields aare required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new:true}

        ).select("-password")

        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        )
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path 

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar")
}

   const user = await User.findByIdAndUpdate( 
    req.user?._id,
    {
        $set: {
            avatar:avatar.url
        }
    },
    {new:true}

    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar changed successfully")
    )
      
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path 

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!coverImage.url) {
    throw new ApiError(400, "erroe while uploading on cover image")
}

   const user = await User.findByIdAndUpdate( 
    req.user?._id,
    {
        $set: {
            coverImage:coverImage.url
        }
    },
    {new:true}

    ).select("-password")

    return res
    .status(200) 
    .json(
        new ApiResponse(200, user, "Cover image changed successfully")
    )
      
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in: [req.user?._id, "$subscriber.subscriber"]},
                        then:true,
                        else: false
                    }
                }
            } 
        },
        {
            $project:{
                fullName: 1,
                usernmame: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})  

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from:"videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField:"owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )
})

export { 
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetail,
     updateUserAvatar,
     updateUserCoverImage,
     getUserChannelProfile,
     getWatchHistory
 }