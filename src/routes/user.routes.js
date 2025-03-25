import {Router} from 'express';
import { loginUser, logoutUser, refreshAcessToken, registerUser } from '../controllers/user.controller.js';
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

export default router