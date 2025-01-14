require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const { createLogger, transports, format } = require('winston');
const { Client } = require('@elastic/elasticsearch');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración del cliente Elasticsearch
const esClient = new Client({
    node: process.env.ELASTIC_URL || 'http://localhost:9200',
});

// Configuración del logger
const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

// Método personalizado para enviar logs a Elasticsearch
logger.logToElastic = async (level, message, meta = {}) => {
    try {
        await esClient.index({
            index: 'backend-logs',
            body: {
                timestamp: new Date().toISOString(),
                level,
                message,
                ...meta,
            },
        });
    } catch (error) {
        console.error('Error sending log to Elasticsearch:', error);
    }
};

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Swagger setup
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Hotel Reservation API',
            version: '1.0.0',
            description: 'API for reserving and paying for hotel rooms',
        },
    },
    apis: ['./reserva.js'], 
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// MongoDB connection
mongoose
    .connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        logger.info('Connected to MongoDB');
        logger.logToElastic('info', 'Connected to MongoDB');
        preloadRooms();
        app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
            logger.logToElastic('info', `Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        logger.error('Error connecting to MongoDB:', err);
        logger.logToElastic('error', 'Error connecting to MongoDB', { error: err.message });
    });

// Define schemas and models
const RoomSchema = new mongoose.Schema({
    number: Number,
    type: String,
    description: String,
    price: Number,
    capacity: Number,
    status: { type: String, enum: ['free', 'reserved'], default: 'free' },
});

const PaymentSchema = new mongoose.Schema({
    roomId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    date: { type: Date, default: Date.now },
});

const Room = mongoose.model('Room', RoomSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// Preload predefined rooms



// Routes
/**
 * @swagger

 */
app.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (err) {
        logger.error('Error fetching rooms:', err);
        logger.logToElastic('error', 'Error fetching rooms', { error: err.message });
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /rooms/{id}/reserve:

 */
app.post('/rooms/:id/reserve', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });
        if (room.status !== 'free') return res.status(400).json({ message: 'Room is not available' });

        room.status = 'reserved';
        await room.save();
        logger.info('Room reserved', { roomId: room._id });
        logger.logToElastic('info', 'Room reserved', { roomId: room._id });
        res.json({ message: 'Room reserved successfully', room });
    } catch (err) {
        logger.error('Error reserving room:', err);
        logger.logToElastic('error', 'Error reserving room', { error: err.message });
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 
 */
app.post('/rooms/:id/pay', async (req, res) => {
    try {
        const { amount } = req.body;
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const payment = new Payment({ roomId: room._id, amount });
        await payment.save();

        room.status = 'free';
        await room.save();

        logger.info('Payment processed', { roomId: room._id, amount });
        logger.logToElastic('info', 'Payment processed', { roomId: room._id, amount });
        res.json({ message: 'Payment successful', payment });
    } catch (err) {
        logger.error('Error processing payment:', err);
        logger.logToElastic('error', 'Error processing payment', { error: err.message });
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 
 */
app.post('/rooms', async (req, res) => {
    try {
        const { number, type, description, price, capacity, status } = req.body;
        const room = new Room({ number, type, description, price, capacity, status });
        await room.save();
        logger.info('Room created', { roomId: room._id });
        logger.logToElastic('info', 'Room created', { roomId: room._id });
        res.status(201).json({ message: 'Room created successfully', room });
    } catch (err) {
        logger.error('Error creating room:', err);
        logger.logToElastic('error', 'Error creating room', { error: err.message });
        res.status(500).json({ message: err.message });
    }
});
