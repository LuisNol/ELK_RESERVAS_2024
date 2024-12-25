const { createLogger, transports, format } = require('winston');
const { Client } = require('@elastic/elasticsearch');


const esClient = new Client({
  node: process.env.ELASTIC_URL || 'http://localhost:9200',
  auth: {
    user: 'elastic',          
    password: 'admin123',         
  },
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(), 
  ],
});


logger.logToElastic = async (level, message, meta) => {
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

module.exports = logger;
