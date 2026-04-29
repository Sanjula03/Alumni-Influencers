// swagger documentation setup for API endpoints
var swaggerJsdoc = require('swagger-jsdoc');

var options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alumni Influencers API',
      version: '1.0.0',
      description: 'REST API for the Alumni Influencers platform. Alumni bid for daily featured slots and their profiles are served to the AR client.',
      contact: {
        name: 'Sanjula Sunath'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API token obtained from /api/client endpoint'
        },
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie set after login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', example: 'w1234567@my.eastminster.ac.uk' },
            is_verified: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Smith' },
            biography: { type: 'string', example: 'Software engineering graduate from University of Eastminster' },
            linkedin_url: { type: 'string', example: 'https://linkedin.com/in/sanjula' },
            profile_image: { type: 'string', example: '/uploads/1-1711600000.jpg' },
            degrees: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Degree' }
            },
            certifications: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Certification' }
            },
            licences: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Licence' }
            },
            courses: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Course' }
            },
            employmentHistory: {
              type: 'array',
              items: { '$ref': '#/components/schemas/Employment' }
            }
          }
        },
        Degree: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'BSc Software Engineering' },
            institution: { type: 'string', example: 'University of Eastminster' },
            url: { type: 'string', example: 'https://eastminster.ac.uk/courses/se' },
            completion_date: { type: 'string', format: 'date', example: '2026-06-30' }
          }
        },
        Certification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'AWS Cloud Practitioner' },
            issuing_body: { type: 'string', example: 'Amazon Web Services' },
            url: { type: 'string', example: 'https://aws.amazon.com/certification' },
            completion_date: { type: 'string', format: 'date', example: '2025-03-15' }
          }
        },
        Licence: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'Chartered Engineer' },
            awarding_body: { type: 'string', example: 'Engineering Council UK' },
            url: { type: 'string', example: 'https://engc.org.uk' },
            completion_date: { type: 'string', format: 'date', example: '2025-01-10' }
          }
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'React Masterclass' },
            provider: { type: 'string', example: 'Udemy' },
            url: { type: 'string', example: 'https://udemy.com/react' },
            completion_date: { type: 'string', format: 'date', example: '2024-11-20' }
          }
        },
        Employment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            company: { type: 'string', example: 'Google' },
            role: { type: 'string', example: 'Software Engineer' },
            start_date: { type: 'string', format: 'date', example: '2024-07-01' },
            end_date: { type: 'string', format: 'date', nullable: true },
            is_current: { type: 'boolean', example: true }
          }
        },
        Bid: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            amount: { type: 'number', format: 'decimal', example: 25.50 },
            bid_date: { type: 'string', format: 'date', example: '2026-03-28' },
            status: { type: 'string', enum: ['pending', 'won', 'lost'], example: 'pending' }
          }
        },
        FeaturedAlumni: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            bid_id: { type: 'integer' },
            featured_date: { type: 'string', format: 'date' },
            winning_bid_amount: { type: 'number', format: 'decimal' }
          }
        },
        ApiClient: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            client_name: { type: 'string', example: 'AR Mobile App' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['read:alumni_of_day'],
              description: 'Scoped permission list. Available: read:alumni, read:analytics, read:alumni_of_day, write:bids'
            },
            is_revoked: { type: 'boolean', example: false },
            last_used_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        ApiUsageLog: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            client_id: { type: 'integer' },
            endpoint: { type: 'string', example: '/api/v1/featured' },
            method: { type: 'string', example: 'GET' },
            ip_address: { type: 'string', example: '192.168.1.1' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' }
          }
        }
      }
    },
    paths: {
      // ---- AUTH ----
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new alumni account',
          description: 'Creates a new user account. Only eastminster.ac.uk emails are allowed. Sends a verification email with a token.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'confirmPassword'],
                  properties: {
                    email: { type: 'string', example: 'alumni@eastminster.ac.uk' },
                    password: { type: 'string', minLength: 8, example: 'securePass123' },
                    confirmPassword: { type: 'string', example: 'securePass123' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Registration successful',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Registration successful. Please verify your email.' },
                  userId: { type: 'integer', example: 1 }
                }
              }}}
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            '409': { description: 'Email already registered', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login to an existing account',
          description: 'Authenticates user and creates a session. Email must be verified first.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'alumni@eastminster.ac.uk' },
                    password: { type: 'string', example: 'securePass123' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Logged in successfully' },
                  userId: { type: 'integer', example: 1 }
                }
              }}}
            },
            '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            '403': { description: 'Email not verified', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'Logout and destroy session',
          responses: {
            '200': { description: 'Logged out', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } }
          }
        }
      },
      '/auth/verify': {
        get: {
          tags: ['Authentication'],
          summary: 'Verify email address',
          description: 'Verifies user email using the token sent during registration. Token expires after 24 hours.',
          parameters: [
            { name: 'token', in: 'query', required: true, schema: { type: 'string' }, description: 'Verification token from email' }
          ],
          responses: {
            '200': { description: 'Email verified', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } },
            '400': { description: 'Invalid or expired token', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/auth/forgot-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Request password reset email',
          description: 'Sends a password reset link to the email. Always returns success to prevent email enumeration.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', example: 'alumni@eastminster.ac.uk' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Reset link sent (if email exists)', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } }
          }
        }
      },
      '/auth/reset-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Reset password using token',
          description: 'Resets the password using a token from the reset email. Token expires after 1 hour.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password', 'confirmPassword'],
                  properties: {
                    token: { type: 'string', description: 'Reset token from email' },
                    password: { type: 'string', minLength: 8, example: 'newSecurePass456' },
                    confirmPassword: { type: 'string', example: 'newSecurePass456' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Password reset successful', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } },
            '400': { description: 'Invalid token or validation error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },

      // ---- PROFILES ----
      '/profiles': {
        get: {
          tags: ['Profiles'],
          summary: 'List all alumni profiles',
          description: 'Returns all profiles with degrees, certifications, licences, courses and employment history.',
          responses: {
            '200': {
              description: 'List of profiles',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { '$ref': '#/components/schemas/Profile' } }
                }
              }}}
            }
          }
        }
      },
      '/profile/me': {
        get: {
          tags: ['Profiles'],
          summary: 'Get my profile with completion status',
          description: 'Returns the logged in users profile with all sub-entries and a completion status showing percentage filled and missing fields.',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': {
              description: 'Profile data with completion status',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { '$ref': '#/components/schemas/Profile' },
                  completionStatus: {
                    type: 'object',
                    properties: {
                      percentage: { type: 'integer', example: 56, description: 'Profile completion percentage' },
                      missingFields: { type: 'array', items: { type: 'string' }, example: ['biography', 'linkedInUrl', 'profileImage'] },
                      isComplete: { type: 'boolean', example: false }
                    }
                  }
                }
              }}}
            },
            '404': { description: 'Profile not found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/profile/{profile_id}': {
        get: {
          tags: ['Profiles'],
          summary: 'Get profile by user ID',
          parameters: [
            { name: 'profile_id', in: 'path', required: true, schema: { type: 'integer' }, description: 'User ID' }
          ],
          responses: {
            '200': {
              description: 'Profile data',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { '$ref': '#/components/schemas/Profile' }
                }
              }}}
            },
            '404': { description: 'Profile not found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/profile': {
        post: {
          tags: ['Profiles'],
          summary: 'Create or update my profile',
          description: 'Creates a new profile or updates existing one. Supports degrees, certifications, licences, courses and employment as arrays.',
          security: [{ SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName'],
                  properties: {
                    firstName: { type: 'string', example: 'Sanjula' },
                    lastName: { type: 'string', example: 'Sunath' },
                    biography: { type: 'string', example: 'SE graduate from University of Eastminster' },
                    linkedInUrl: { type: 'string', example: 'https://linkedin.com/in/sanjula' },
                    degrees: { type: 'array', items: {
                      type: 'object', properties: {
                        name: { type: 'string', example: 'BSc Software Engineering' },
                        institution: { type: 'string', example: 'University of Eastminster' },
                        url: { type: 'string' },
                        completionDate: { type: 'string', format: 'date' }
                      }
                    }},
                    certifications: { type: 'array', items: {
                      type: 'object', properties: {
                        name: { type: 'string' }, issuingBody: { type: 'string' },
                        url: { type: 'string' }, completionDate: { type: 'string', format: 'date' }
                      }
                    }},
                    licences: { type: 'array', items: {
                      type: 'object', properties: {
                        name: { type: 'string' }, awardingBody: { type: 'string' },
                        url: { type: 'string' }, completionDate: { type: 'string', format: 'date' }
                      }
                    }},
                    courses: { type: 'array', items: {
                      type: 'object', properties: {
                        name: { type: 'string' }, provider: { type: 'string' },
                        url: { type: 'string' }, completionDate: { type: 'string', format: 'date' }
                      }
                    }},
                    employmentHistory: { type: 'array', items: {
                      type: 'object', properties: {
                        company: { type: 'string' }, role: { type: 'string' },
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date', nullable: true },
                        isCurrent: { type: 'boolean' }
                      }
                    }}
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Profile saved', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Profile saved' },
                data: { '$ref': '#/components/schemas/Profile' }
              }
            }}}},
            '400': { description: 'Validation error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/profile/entry/{type}/{entry_id}': {
        delete: {
          tags: ['Profiles'],
          summary: 'Delete a profile sub-entry',
          description: 'Deletes a specific degree, certification, licence, course or employment entry.',
          security: [{ SessionAuth: [] }],
          parameters: [
            { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['degree', 'certification', 'licence', 'course', 'employment'] } },
            { name: 'entry_id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Entry deleted', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } },
            '404': { description: 'Entry not found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },

      // ---- BIDS ----
      '/bids': {
        get: {
          tags: ['Bidding'],
          summary: 'Get bidding page data',
          description: 'Returns todays bid status, monthly stats, remaining slots, bid history and featured alumnus. Bid amounts from other users are never revealed (blind bidding).',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': {
              description: 'Bidding data',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      todaysBid: { '$ref': '#/components/schemas/Bid', nullable: true },
                      bidStatus: { type: 'string', enum: ['winning', 'losing', null], description: 'Current position without revealing amounts' },
                      monthlyWins: { type: 'integer', example: 1 },
                      maxWins: { type: 'integer', example: 3, description: '3 normally, 4 if attended an event' },
                      remainingSlots: { type: 'integer', example: 2 },
                      totalAppearances: { type: 'integer', example: 5, description: 'Total all-time featured appearances' },
                      tomorrowSlot: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          status: { type: 'string', enum: ['available', 'taken'] },
                          winner: { type: 'string', nullable: true },
                          message: { type: 'string', nullable: true }
                        },
                        description: 'Tomorrows featured slot availability'
                      },
                      history: { type: 'array', items: { '$ref': '#/components/schemas/Bid' } },
                      featuredToday: { '$ref': '#/components/schemas/FeaturedAlumni', nullable: true },
                      featuredProfile: { '$ref': '#/components/schemas/Profile', nullable: true }
                    }
                  }
                }
              }}}
            }
          }
        }
      },
      '/bid': {
        post: {
          tags: ['Bidding'],
          summary: 'Place or update a bid',
          description: 'Places a new bid for today or updates an existing one. Bids can only be increased, never decreased. Monthly win limit is enforced (3 max, 4 with event attendance).',
          security: [{ SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', format: 'decimal', minimum: 0.01, example: 25.50 }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Bid placed', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Bid placed: 25.50' },
                data: { '$ref': '#/components/schemas/Bid' }
              }
            }}}},
            '200': { description: 'Bid updated (increased)', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Bid updated to 30.00' },
                data: { '$ref': '#/components/schemas/Bid' }
              }
            }}}},
            '400': { description: 'Invalid amount or bid decrease attempt', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            '403': { description: 'Monthly limit reached', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        },
        delete: {
          tags: ['Bidding'],
          summary: 'Cancel todays bid',
          description: 'Cancels the current pending bid for today. Only works if the bid status is still pending.',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': { description: 'Bid cancelled', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } },
            '404': { description: 'No active bid found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/bid/history': {
        get: {
          tags: ['Bidding'],
          summary: 'Get full bid history',
          description: 'Returns all bids placed by the logged in user, sorted by date descending.',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': { description: 'Bid history', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'array', items: { '$ref': '#/components/schemas/Bid' } }
              }
            }}}}
          }
        }
      },

      // ---- API CLIENTS ----
      '/api/clients': {
        get: {
          tags: ['API Client Management'],
          summary: 'List my API clients',
          description: 'Returns all API clients created by the logged in user with their status and last used timestamps.',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': { description: 'List of clients', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'array', items: { '$ref': '#/components/schemas/ApiClient' } }
              }
            }}}}
          }
        }
      },
      '/api/client': {
        post: {
          tags: ['API Client Management'],
          summary: 'Generate a new API token',
          description: 'Creates a new API client and returns the bearer token. The raw token is only shown once and cannot be retrieved again. The token hash is stored in the database.',
          security: [{ SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['clientName'],
                  properties: {
                    clientName: { type: 'string', example: 'AR Mobile App' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Token generated', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                data: {
                  type: 'object', properties: {
                    clientId: { type: 'integer', example: 1 },
                    clientName: { type: 'string', example: 'AR Mobile App' },
                    token: { type: 'string', description: 'Raw bearer token - shown only once' }
                  }
                }
              }
            }}}}
          }
        }
      },
      '/api/client/{client_id}/revoke': {
        put: {
          tags: ['API Client Management'],
          summary: 'Revoke an API token',
          description: 'Revokes an API client token so it can no longer be used for authentication.',
          security: [{ SessionAuth: [] }],
          parameters: [
            { name: 'client_id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Token revoked', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Success' } } } },
            '404': { description: 'Client not found', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/api/client/{client_id}/usage': {
        get: {
          tags: ['API Client Management'],
          summary: 'Get usage statistics for a client',
          description: 'Returns usage logs including endpoints accessed, methods, IP addresses and timestamps.',
          security: [{ SessionAuth: [] }],
          parameters: [
            { name: 'client_id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Usage statistics', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object', properties: {
                    client: { '$ref': '#/components/schemas/ApiClient' },
                    logs: { type: 'array', items: { '$ref': '#/components/schemas/ApiUsageLog' } },
                    totalRequests: { type: 'integer', example: 42 }
                  }
                }
              }
            }}}}
          }
        }
      },

      // ---- PUBLIC API ----
      '/api/v1/featured': {
        get: {
          tags: ['Public API'],
          summary: 'Get todays featured alumnus',
          description: 'Returns the profile of todays featured alumnus. **Requires `read:alumni_of_day` permission scope.** A token with only `read:alumni` or `read:analytics` will receive a 403 Forbidden response. This enforces the scoping table: Analytics Dashboard keys (read:alumni, read:analytics) cannot access this endpoint; only Mobile AR App keys (read:alumni_of_day) can.',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': { description: 'Featured alumnus data', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object', properties: {
                    featuredDate: { type: 'string', format: 'date' },
                    alumnus: {
                      type: 'object', properties: {
                        name: { type: 'string', example: 'Sanjula Sumanth' },
                        biography: { type: 'string' },
                        linkedInUrl: { type: 'string' },
                        profileImage: { type: 'string' },
                        degrees: { type: 'array', items: { '$ref': '#/components/schemas/Degree' } },
                        certifications: { type: 'array', items: { '$ref': '#/components/schemas/Certification' } },
                        licences: { type: 'array', items: { '$ref': '#/components/schemas/Licence' } },
                        courses: { type: 'array', items: { '$ref': '#/components/schemas/Course' } },
                        employmentHistory: { type: 'array', items: { '$ref': '#/components/schemas/Employment' } }
                      }
                    }
                  }
                }
              }
            }}}},
            '401': { description: 'Missing or invalid bearer token', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
            '403': {
              description: 'Token revoked OR insufficient permissions',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: "Access denied. This token does not have the 'read:alumni_of_day' permission." },
                  requiredPermission: { type: 'string', example: 'read:alumni_of_day' },
                  yourPermissions: { type: 'array', items: { type: 'string' }, example: ['read:alumni', 'read:analytics'] }
                }
              }}}
            },
            '404': { description: 'No featured alumnus today', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      },
      '/api/v1/analytics/charts-data': {
        get: {
          tags: ['Analytics'],
          summary: 'Get dashboard chart data',
          description: 'Returns aggregated analytics data for the dashboard charts.',
          security: [{ SessionAuth: [] }],
          parameters: [
            { name: 'programme', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'year', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'sector', in: 'query', required: false, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Analytics data payload', content: { 'application/json': { schema: {
              type: 'object', properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object', properties: {
                    skillsGap: { type: 'array', items: { type: 'object' } },
                    sector: { type: 'array', items: { type: 'object' } },
                    jobs: { type: 'array', items: { type: 'object' } },
                    employers: { type: 'array', items: { type: 'object' } },
                    geo: { type: 'array', items: { type: 'object' } },
                    grads: { type: 'array', items: { type: 'object' } },
                    certTrends: { type: 'array', items: { type: 'object' } },
                    programmes: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }}}},
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
          }
        }
      }
    }
  },
  apis: [] // paths defined inline above
};

var swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
