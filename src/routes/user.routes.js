import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetail, updateUserAvatar } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured route
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh_token").post(refreshAccessToken)
router.route("/refresh_token").post(changeCurrentPassword)
router.route("/refresh_token").post(getCurrentUser)
router.route("/refresh_token").post(updateAccountDetail)
router.route("/refresh_token").post(
    upload.fields([
        {
            name: "avatar"
        }
    ]),
    updateUserAvatar)

export default router