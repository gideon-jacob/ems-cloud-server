import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { fetchAndGroupData, sliceGroupedData } from "./data-service";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Security Middleware
app.use(express.json());
app.use(helmet());
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "*"], //! Specific origins
    methods: ["GET", "POST"]
}));

// Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role key
const PORT = process.env.PORT || 3000;
const TABLE_NAME = process.env.TABLE_NAME || "Invalid_Table";

const MIN_LIMIT = 60;
const MAX_LIMIT = 3600;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

// Supabase Request
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
});

// Socket.IO Setup
const io = new Server(httpServer, {
    cors: {
        origin: "*", //! Adjust for production
        methods: ["GET", "POST"]
    }
});

// 2. PER-SOCKET Limit Tracking
const socketLimits = new Map<string, number>(); // socket.id -> limit

// Health Check
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// 1. Socket.IO Connection Handler
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Default limit
    socketLimits.set(socket.id, MIN_LIMIT);

    // Send initial data
    fetchAndGroupData(supabase, MAX_LIMIT).then((groupedData) => {
        if (groupedData) {
            const customizedData = sliceGroupedData(groupedData, MIN_LIMIT);
            socket.emit("table:topN", { rows: customizedData, limit: MIN_LIMIT });
        }
    });

    socket.on("set-row-limit", (limit: number) => {
        // Enforce 60-3600 limit
        const safeLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);
        socketLimits.set(socket.id, safeLimit);

        // Fetch and emit immediately with new limit
        fetchAndGroupData(supabase, MAX_LIMIT).then((groupedData) => {
            if (groupedData) {
                const customizedData = sliceGroupedData(groupedData, safeLimit);
                socket.emit("table:topN", { rows: customizedData, limit: safeLimit });
            }
        });
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        socketLimits.delete(socket.id);
    });
});

// Webhook to Trigger Update
app.post("/db-trigger-hook", async (req, res) => {
    console.log("DB Trigger Hook received");

    try {
        const groupedData = await fetchAndGroupData(supabase, MAX_LIMIT);

        if (groupedData) {
            // Emit PER-SOCKET with THEIR limit
            socketLimits.forEach((limit, socketId) => {
                const customizedData = sliceGroupedData(groupedData, limit);

                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit("table:topN", { rows: customizedData, limit });
                }
            });
        }

        res.status(200).json({ status: "success", message: "Broadcast triggered" });
    } catch (error) {
        console.error("Error in db trigger hook:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

// Start Server
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
