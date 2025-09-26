import express, { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const app = express();
import { ENVIRONMENT } from "./common/config/environment.js";
import cors from "cors";
import { ipfsRouter } from "./modules/IPFS/routes.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "",
    methods: ["GET", "POST"],
  },
});


// App Security Configurations
app.use(cors());

// Body parsing middleware - skip for multipart routes
app.use((req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    return next();
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.disable("x-powered-by");
app.set("trust proxy", true);

// Routes

app.use("/api/ipfs", ipfsRouter);



// Static Files
app.use(express.static("public"));

// Welcome Message
app.get("/", (req: Request, res: Response) => {
  res.send({
    message: `Welcome to ${ENVIRONMENT.APP.NAME} API`,
  });
});

// status check
app.get("*", (req: Request, res: Response) => {
  res.send({
    status: true,
    Time: new Date(),
    message: "running",
    version: "1.0.0",
    timestamp: new Date(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  });
});

// error check
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    status: false,
    message: "An unexpected error occurred",
    error: err instanceof Error ? err.message : "Unknown error",
  });
});

httpServer.listen(ENVIRONMENT.APP.PORT, async () => {
  console.log(
    `${ENVIRONMENT.APP.NAME} Running on http://localhost:${ENVIRONMENT.APP.PORT}`
  );


});
