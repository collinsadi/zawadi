import express, { NextFunction, Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const app = express();
import { ENVIRONMENT } from "./common/config/environment";
import cors from "cors";
import { connectDb } from "./common/config/database";
import dotenv from "dotenv";
import { authRoutes } from "./modules/Auth";
import swaggerUi from "swagger-ui-express";
import { specs } from "./common/config/swagger";
import { startFactoryEventListener } from "./common/services/blockchainService";
import { hackathonRouter } from "./modules/Hackathon/routes"

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "",
    methods: ["GET", "POST"],
  },
});

dotenv.config();

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

// View Engine
app.set("view engine", "ejs");
app.set("views", "./src/common/views");

// Static Files
app.use(express.static("./src/common/public"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/hackathons", hackathonRouter);

// API Documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Zawadi API Documentation",
    customfavIcon: "/favicon.ico",
  })
);

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

  try {
    // Connect to database
    await connectDb();
    console.log("✅ Database connected successfully");

    // Start blockchain event listener
    startFactoryEventListener();
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    process.exit(1);
  }
});
