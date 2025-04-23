import {Router} from 'express';
import { changeCurrentPassword, getCurrentUSer, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAcessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from '../controllers/user.controller.js';
import {upload} from '../middlewares/multure.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:'avatar',
            maxCount:1
        },{
            name:'coverimage',
            maxCount:1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAcessToken)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/me").get(verifyJWT,getCurrentUSer)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

router.route("/update-cover-image").patch(
    verifyJWT,
    upload.single("coverimage"),
    updateUserCoverImage
)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)
export default router