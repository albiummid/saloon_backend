import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { connectDB } from "./db";
import rootRouter from "./router/http-router";
import ErrorHandler from "./middleware/errorHandler";
import { errorMiddleware } from "./middleware/errorMiddleware";
import { serverConfigs, serverENV } from "./env";

const server = express();
const httpServer = createServer(server);
const socketServer = new Server(httpServer, serverConfigs.socket);
// middleware
server.use(cors(serverConfigs.cors));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(morgan("dev"));

// initializing router
server.use(rootRouter);
server.use(errorMiddleware);

// initializing socket events

async function startServer() {
    try {
        await connectDB();
        httpServer.listen(serverENV.PORT, () => {
            console.log(
                `⚡ Server ::  running on PORT:${serverENV.PORT} in ${serverENV.NODE_ENV} mode`
            );
        });
    } catch (error) {}
}
startServer();
