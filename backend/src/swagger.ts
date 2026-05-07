import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Time Watch API',
      version: '1.0.0',
      description: 'REST API for employee time reporting and absence management (מערכת דיווחי שעות)',
    },
    servers: [
      { url: '/api', description: 'Default server' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
}

export default swaggerJsdoc(options)
