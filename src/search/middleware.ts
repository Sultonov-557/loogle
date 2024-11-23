import { env } from "../config";
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";

export async function Auth(req: Request & { user?: number }, res: Response, next: NextFunction) {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    next();
    return;
  }
  try {
    let user: any = verify(token, env.TOKEN_SECRET);
    req.user = user.id;
  } catch (e) {
    res.send(e);
  }

  next();
}
