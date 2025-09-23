import { Request } from "express";
import { UNAUTHORIZED } from "../constants/statusCodes";
import { HttpException } from "../exception/httpException";

const requestUser = (req: Request) => {
  const {user} = req;

  if (!user) {throw new HttpException(UNAUTHORIZED, "User is not authorized");}

  return user;
};

export { requestUser };
