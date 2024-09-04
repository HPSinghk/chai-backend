//require('dotenv').config({path:'./env'})

import dotenv from 'dotenv'
//import mongoose from "mongoose";
//import { DB_NAME } from "./constants";
import express from "express";
import connectDB from "./db/index.js";
import { app } from './app.js';
//const app = express()

dotenv.config({
    path:'./.env'
})
  /* function connectDB(){}
connectDB() */

/* app.get('/',(req,res)=>{
  res.send("hello")
}) */

connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
      console.log(`Server is running at port : ${process.env.PORT}`)
  })
})
.catch((err)=>{
  console.log("MONGO db connection failed!! ",err)
})











/* ( async () => {
    try {
      await mongoose.connect(`${process.env.MONGODB_URI}/${B_NAME}`);
      app.on("error", (error) => {
        console.log("ERRR: ", error);
        throw error;
      });
      app.listen(process.env.PORT, () => {
        console.log(`App is listening on port ${process.env.PORT}`);
      });
    } catch (error) {
      console.error("ERROR: ", error);
      throw err;
    }
  }
)(); */
