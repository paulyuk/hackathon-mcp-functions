import { Server } from "@modelcontextprotocol/sdk/server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as storage from './shared/storage.js';

// Define schemas for our tools
const ListUsersSchema = z.object({});

const GetUserSessionsSchema = z.object({
  userId: z.string(),
});

const SaveSubmissionSchema = z.object({
  sessionId: z.string(),
  name: z.string(),
  email: z.string(),
  title: z.string(),
  description: z.string(),
});

const ListSubmissionsSchema = z.object({
  sessionId: z.string(),
  email: z.string().optional(),
});

const SaveVoteSchema = z.object({
  submissionId: z.string(),
  voterEmail: z.string(),
  voteType: z.enum(['like', 'dislike']),
});

const ListVotesSchema = z.object({
  submissionId: z.string().optional(),
});

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string(),
});

export function createServer(): Server {
  const server = new Server(
    {
      name: "hackathon-submissions-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_users",
          description: "List all unique users in the system",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_user_sessions", 
          description: "Get all sessions for a specific user",
          inputSchema: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "The user ID to get sessions for",
              },
            },
            required: ["userId"],
          },
        },
        {
          name: "save_submission",
          description: "Save a new hackathon submission",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Submitter's name",
              },
              email: {
                type: "string",
                description: "Submitter's email",
              },
              ideaTitle: {
                type: "string",
                description: "Title of the hackathon idea",
              },
              ideaDescription: {
                type: "string",
                description: "Description of the hackathon idea",
              },
            },
            required: ["name", "email", "ideaTitle", "ideaDescription"],
          },
        },
        {
          name: "list_submissions",
          description: "List all hackathon submissions",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "save_vote",
          description: "Save a vote for a submission",
          inputSchema: {
            type: "object",
            properties: {
              submissionId: {
                type: "string", 
                description: "ID of the submission to vote on",
              },
              voterEmail: {
                type: "string",
                description: "Email of the voter",
              },
              voteType: {
                type: "string",
                enum: ["like", "dislike"],
                description: "Type of vote",
              },
            },
            required: ["submissionId", "voterEmail", "voteType"],
          },
        },
        {
          name: "list_votes",
          description: "List votes for a submission or all votes",
          inputSchema: {
            type: "object",
            properties: {
              submissionId: {
                type: "string",
                description: "Optional submission ID to filter votes",
              },
            },
          },
        },
        {
          name: "create_user",
          description: "Create a new user for testing",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Full name of the user",
              },
              email: {
                type: "string",
                description: "Email address of the user",
              },
            },
            required: ["name", "email"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_users": {
          const validated = ListUsersSchema.parse(args);
          const users = await storage.listUsers();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(users, null, 2),
              },
            ],
          };
        }

        case "get_user_sessions": {
          const validated = GetUserSessionsSchema.parse(args);
          const sessions = await storage.getUserSessions(validated.userId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(sessions, null, 2),
              },
            ],
          };
        }

        case "save_submission": {
          const validated = SaveSubmissionSchema.parse(args);
          const submission = await storage.saveSubmission(
            validated.sessionId,
            validated.name,
            validated.email,
            validated.title,
            validated.description
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(submission, null, 2),
              },
            ],
          };
        }

        case "list_submissions": {
          const validated = ListSubmissionsSchema.parse(args);
          const submissions = await storage.listSubmissions(validated.sessionId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(submissions, null, 2),
              },
            ],
          };
        }

        case "save_vote": {
          const validated = SaveVoteSchema.parse(args);
          const vote = await storage.saveVote(
            validated.submissionId,
            validated.voterEmail,
            validated.voteType
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(vote, null, 2),
              },
            ],
          };
        }

        case "list_votes": {
          const validated = ListVotesSchema.parse(args);
          const votes = await storage.listVotes(validated.submissionId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(votes, null, 2),
              },
            ],
          };
        }

        case "create_user": {
          const validated = CreateUserSchema.parse(args);
          const user = await storage.createUser(validated.email, validated.name);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(user, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
