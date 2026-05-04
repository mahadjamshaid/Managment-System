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

app.use(cors({
  origin:"http://localhost:5173",
  credentials:true,
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

