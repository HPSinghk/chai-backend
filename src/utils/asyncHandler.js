import { json } from "express";

const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).
    catch((err) => next(err));
  };
};

// try catch method of async handler
/* const asyncHandler = (fn) => async (req,res,next) => {
    try {
        await fn(req,res,next)
    } catch (error) {
        res.status(err.code || 500),json({
            success: false,
            message:err.message
        })

    }
} */

export { asyncHandler };
