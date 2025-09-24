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
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f3e2b6b6c5a00123abcd1' },
            walletAddress: { type: 'string', example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
            profile: {
              type: 'object',
              properties: {
                displayName: { type: 'string', example: 'Ada Lovelace' },
                avatar: { type: 'string', example: 'https://example.com/avatar.png' },
              },
            },
            ensName: { type: 'string', example: 'ada.eth' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Hackathon: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f3e2b6b6c5a00123abcd2' },
            ipfsCid: { type: 'string', example: 'bafybeigdyrzt...' },
            organiserAddress: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
            identifier: { type: 'string', description: 'bytes32 hex string', example: '0xabc...def' },
            escrowContract: { type: 'string', example: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
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
    './src/modules/Hackathon/routes/*.ts',
    './src/modules/User/routes/*.ts',
  ],
};

export const specs = swaggerJsdoc(options);

