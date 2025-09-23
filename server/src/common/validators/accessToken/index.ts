import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { HttpException } from "../../resources/exception/httpException";
import { UNAUTHORIZED } from "../../resources/constants/statusCodes";
// import User from "../../../modules/schemas/user.collection";
import { JwtPayload } from "jsonwebtoken";
import logger from "../../resources/logger";

export const validateAccessToken = async (token: string) => {
  if (!token) {
    throw new HttpException(UNAUTHORIZED, "No token provided");
  }

  const {JWT_SECRET} = process.env;
  if (!JWT_SECRET) {
    throw new HttpException(UNAUTHORIZED, "JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    if (!decoded.id) {
      throw new HttpException(UNAUTHORIZED, "Invalid token payload");
    }

    // const user = await User.findOne({ _id: decoded.id });
    // if (!user) {
    //   throw new HttpException(UNAUTHORIZED, "User not found");
    // }

    // return user;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpException(UNAUTHORIZED, "Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpException(UNAUTHORIZED, "Invalid token");
    }
    throw new HttpException(UNAUTHORIZED, "Invalid access token");
  }
};
