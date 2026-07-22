const { Prisma } = require("@prisma/client");

module.exports = (err, req, res, next) => {
    console.error("❌ Unhandled error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002":
                return res.status(409).json({
                    success: false,
                    error: { msg: "Resource already exists." },
                    data: err.meta,
                });

            case "P2025":
                return res.status(404).json({
                    success: false,
                    error: { msg: "Resource not found." },
                    data: err.meta,
                });

            case "P2003":
                return res.status(400).json({
                    success: false,
                    error: { msg: "Invalid reference." },
                    data: err.meta,
                });
        }
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: { msg: err.message || "Internal Server Error" },
        data: err.meta,
    });
};