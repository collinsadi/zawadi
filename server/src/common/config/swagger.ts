import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zawadi API',
      version: '1.0.0',
      description: 'API documentation for Zawadi application - The Stripe for Hackathon Payouts',
      contact: {
        name: 'Zawadi Team',
        url: 'https://zawadi.xyz',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-lazer.zawadi.xyz',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message here',
            },
          },
        },
        Mission: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            missionTitle: {
              type: 'string',
              example: 'Mars Colony Mission',
            },
            missionType: {
              type: 'string',
              example: 'exploration',
            },
            organisation: {
              type: 'string',
              example: 'NASA',
            },
            status: {
              type: 'string',
              enum: ['ended', 'active', 'pending', 'cancelled'],
              example: 'active',
            },
          },
        },
        Stream: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            mission: {
              $ref: '#/components/schemas/Mission',
            },
            streamUrl: {
              type: 'string',
              example: 'https://example.com/video.mp4',
            },
            streamCount: {
              type: 'number',
              example: 150,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Gallery: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            mission: {
              $ref: '#/components/schemas/Mission',
            },
            mediaUrls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['image', 'video'],
                    example: 'image',
                  },
                  url: {
                    type: 'string',
                    example: 'https://example.com/image.jpg',
                  },
                },
              },
            },
            viewsCount: {
              type: 'number',
              example: 75,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              example: 'user@example.com',
            },
            username: {
              type: 'string',
              example: 'zawadi',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/Auth/routes/*.ts',
    './src/modules/Missions/routes/*.ts',
    './src/modules/Streams/routes/*.ts',
    './src/modules/Gallery/routes/*.ts',
    './src/modules/NFT/routes/*.ts',
  ],
};

export const specs = swaggerJsdoc(options);
