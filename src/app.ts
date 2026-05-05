import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoute.js";
import employeeRoutes from "./routes/employeeRoute.js";
import attendanceRoutes from "./routes/attendanceRoute.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HR Management System API",
      version: "1.0.0",
      description: "A comprehensive API for managing employees and attendance.",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.LOCAL_FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin))
 .map(origin => origin.replace(/['"]/g, '').replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow if no origin (like mobile apps or curl) or if it's in our allowed list
    if (!origin) return callback(null, true);
    
    const isVercel = origin.endsWith('.vercel.app');
    const isLocal = origin.startsWith('http://localhost');
    const isAllowed = allowedOrigins.includes(origin);

    if (isAllowed || isVercel || isLocal) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/departments", departmentRoutes);

// Simple health check
app.get("/", (req, res) => {
  res.json({ message: "HR Management System API is running!" });
});

// Error Handling
app.use(errorHandler);

export default app;

