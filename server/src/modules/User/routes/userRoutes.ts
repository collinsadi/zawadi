import { Router } from "express";
import { UserController } from "../controllers/userController";
import { verifyToken } from "../../../middlewares/verifyAccessToken";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/update-profile", verifyToken, userController.updateUserProfile);

export { userRouter };
