const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());


const lessonsRoute = require("./routes/lessons.route");
app.use("/api/lessons", lessonsRoute);
const batchRoute = require("./routes/batch.route");
app.use("/api/batches", batchRoute);
const studentRoute = require("./routes/student.route");
app.use("/api/students", studentRoute);
const attendanceRoute = require("./routes/attendance.route");
app.use("/api/attendance", attendanceRoute);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API Running"
    });
});

// Global error handler — must be registered AFTER all routes
const errorMiddleware = require("./middlewares/error.middleware");
app.use(errorMiddleware);

module.exports = app;