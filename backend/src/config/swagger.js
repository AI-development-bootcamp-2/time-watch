const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Time Watch API',
      version: '1.0.0',
      description: 'מערכת דיווחי שעות — REST API',
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        TimerState: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            user_id:    { type: 'integer' },
            start_time: { type: 'string', format: 'date-time' },
            date:       { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        WorkEntry: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            user_id:     { type: 'integer' },
            task_id:     { type: 'integer' },
            date:        { type: 'string', format: 'date' },
            location:    { type: 'string', enum: ['משרד', 'לקוח', 'בית'] },
            start_time:  { type: 'string', example: '09:00' },
            end_time:    { type: 'string', example: '18:00' },
            description: { type: 'string' },
            created_at:  { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)
