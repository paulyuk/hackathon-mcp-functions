import { TableClient, TableServiceClient, odata } from "@azure/data-tables";
import { v4 as uuidv4 } from 'uuid';

let clients: { [key: string]: TableClient } = {};
let serviceClient: TableServiceClient | null = null;

function getServiceClient(): TableServiceClient {
  if (serviceClient) return serviceClient;
  
  // Use the explicit connection string for Azurite
  const connectionString = process.env.AzureWebJobsStorage || 
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;";
  
  console.log('Creating TableServiceClient with connection string');
  
  serviceClient = TableServiceClient.fromConnectionString(connectionString, {
    allowInsecureConnection: true
  });
  
  console.log('TableServiceClient created successfully');
  return serviceClient;
}

function createClient(tableName: string): TableClient {
  if (clients[tableName]) return clients[tableName];
  
  // Try creating via service client to see if that works better
  const service = getServiceClient();
  
  console.log(`Creating TableClient for table: ${tableName} via service client`);
  
  // Use the same connection string approach but via service client
  const connectionString = process.env.AzureWebJobsStorage || 
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;";
  
  const client = TableClient.fromConnectionString(connectionString, tableName, {
    allowInsecureConnection: true
  });
  
  clients[tableName] = client;
  console.log(`Successfully created TableClient for: ${tableName}`);
  return client;
}

async function initializeTable(tableName: string): Promise<TableClient> {
  const client = createClient(tableName);
  
  // Since tables already exist in Azurite, just return the client
  console.log(`Using existing table: ${tableName}`);
  return client;
}

// Entity interfaces (plain objects with partitionKey and rowKey)
interface User {
  partitionKey: string;
  rowKey: string;
  email: string;
  name: string;
  createdAt: string;
}

interface UserSession {
  partitionKey: string;
  rowKey: string;
  sessionId: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
}

interface Submission {
  partitionKey: string;
  rowKey: string;
  id: string;
  sessionId: string;
  name: string;
  email: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Vote {
  partitionKey: string;
  rowKey: string;
  id: string;
  sessionId: string;
  voterEmail: string;
  submissionId: string;
  voteType: string;
  createdAt: string;
}

// DTO interfaces for API responses (no TableEntity)
interface UserDTO {
  email: string;
  name: string;
  createdAt: string;
}

interface UserSessionDTO {
  sessionId: string;
  email: string;
  name: string;
  status: string;
  createdAt: string;
}

interface SubmissionDTO {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface VoteDTO {
  id: string;
  sessionId: string;
  voterEmail: string;
  submissionId: string;
  voteType: string;
  createdAt: string;
}

// Helper function to encode email for use as Azure Table Storage key
function encodeEmailForKey(email: string): string {
  return email.toLowerCase().replace('@', '_at_').replace(/\./g, '_dot_');
}

// User operations
export async function listUsers(): Promise<UserDTO[]> {
  try {
    console.log('Starting listUsers operation');
    const client = await initializeTable('users');
    
    // Use the pattern from official samples
    const entities = client.listEntities<User>();
    
    const users: UserDTO[] = [];
    for await (const entity of entities) {
      users.push({
        email: entity.email,
        name: entity.name,
        createdAt: entity.createdAt
      });
    }
    
    console.log(`Found ${users.length} users`);
    return users;
  } catch (error: any) {
    console.error('Error in listUsers:', error.message);
    console.error('Error details:', {
      name: error.name,
      statusCode: error.statusCode,
      code: error.code
    });
    
    // If table doesn't exist, return empty array
    if (error.statusCode === 404) {
      console.log('Table does not exist, returning empty array');
      return [];
    }
    
    throw error;
  }
}

export async function createUser(email: string, name: string): Promise<UserDTO> {
  try {
    console.log('createUser: Starting user creation for', email);
    const client = await initializeTable('users');
    
    const now = new Date().toISOString();
    const encodedEmail = encodeEmailForKey(email);
    
    const entity: User = {
      partitionKey: encodedEmail,
      rowKey: encodedEmail,
      email: email.toLowerCase(),
      name: name.trim(),
      createdAt: now
    };
    
    console.log('createUser: Creating entity:', JSON.stringify(entity, null, 2));
    await client.createEntity(entity);
    console.log('createUser: Entity created successfully');
    
    return {
      email: entity.email,
      name: entity.name,
      createdAt: entity.createdAt
    };
  } catch (error: any) {
    console.log('createUser: Error:', error.statusCode, error.message);
    
    if (error.statusCode === 409) {
      // User already exists, fetch and return existing
      console.log('createUser: User already exists, fetching existing');
      const client = await initializeTable('users');
      const encodedEmail = encodeEmailForKey(email);
      const existing = await client.getEntity(encodedEmail, encodedEmail);
      return {
        email: existing.email as string,
        name: existing.name as string,
        createdAt: existing.createdAt as string
      };
    }
    
    throw error;
  }
}

// Session operations (getUserSessions expects userId which maps to email)
export async function getUserSessions(userId: string): Promise<UserSessionDTO[]> {
  const email = userId; // In our system, userId is the email
  const encodedEmail = encodeEmailForKey(email);
  const client = await initializeTable('sessions');
  
  const entities = client.listEntities<UserSession>({
    queryOptions: { filter: odata`PartitionKey eq ${encodedEmail}` }
  });
  
  const sessions: UserSessionDTO[] = [];
  for await (const entity of entities) {
    sessions.push({
      sessionId: entity.sessionId,
      email: entity.email,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt
    });
  }
  
  return sessions;
}

// Submission operations (simplified interface matching server.ts)
export async function saveSubmission(
  sessionId: string,
  name: string,
  email: string,
  title: string,
  description: string
): Promise<SubmissionDTO> {
  try {
    console.log('saveSubmission: Creating user...');
    await createUser(email, name); // Ensure user exists
    
    const client = await initializeTable('submissions');
    const submissionId = uuidv4();
    const now = new Date().toISOString();
    
    // Also create a session for this submission if it doesn't exist
    const sessionClient = await initializeTable('sessions');
    const sessionEntity: UserSession = {
      partitionKey: encodeEmailForKey(email),
      rowKey: sessionId,
      sessionId: sessionId,
      email: email.toLowerCase(),
      name: `Session for ${title}`,
      status: 'active',
      createdAt: now
    };
    
    try {
      await sessionClient.createEntity(sessionEntity);
      console.log('saveSubmission: Session entity created');
    } catch (error: any) {
      if (error.statusCode !== 409) { // Ignore if session already exists
        throw error;
      }
      console.log('saveSubmission: Session already exists, continuing');
    }
    
    const entity: Submission = {
      partitionKey: sessionId,
      rowKey: submissionId,
      id: submissionId,
      sessionId: sessionId,
      name: name.trim(),
      email: email.toLowerCase(),
      title: title.trim(),
      description: description.trim(),
      createdAt: now,
      updatedAt: now
    };
    
    await client.createEntity(entity);
    console.log('saveSubmission: Submission entity created successfully');
    
    return {
      id: entity.id,
      sessionId: entity.sessionId,
      name: entity.name,
      email: entity.email,
      title: entity.title,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  } catch (error: any) {
    console.error('saveSubmission: Error occurred:', error.message);
    throw error;
  }
}

export async function listSubmissions(sessionId?: string): Promise<SubmissionDTO[]> {
  try {
    console.log('Starting listSubmissions operation for sessionId:', sessionId);
    const client = await initializeTable('submissions');
    
    // If sessionId is provided, filter by it using odata helper
    const entities = sessionId 
      ? client.listEntities<Submission>({ queryOptions: { filter: odata`PartitionKey eq ${sessionId}` } })
      : client.listEntities<Submission>();
    
    const submissions: SubmissionDTO[] = [];
    for await (const entity of entities) {
      submissions.push({
        id: entity.id,
        sessionId: entity.sessionId,
        name: entity.name,
        email: entity.email,
        title: entity.title,
        description: entity.description,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      });
    }
    
    console.log(`Found ${submissions.length} submissions`);
    return submissions;
  } catch (error: any) {
    console.error('Error in listSubmissions:', error.message);
    
    // If table doesn't exist, return empty array
    if (error.statusCode === 404) {
      console.log('Submissions table does not exist, returning empty array');
      return [];
    }
    
    throw error;
  }
}

// Vote operations
export async function saveVote(
  submissionId: string,
  voterEmail: string,
  voteType: string
): Promise<VoteDTO> {
  // First, find the submission to get its sessionId
  const submissionClient = await initializeTable('submissions');
  const submissions = submissionClient.listEntities<Submission>({
    queryOptions: { filter: odata`id eq ${submissionId}` }
  });
  
  let sessionId = '';
  for await (const entity of submissions) {
    sessionId = entity.sessionId;
    break;
  }
  
  if (!sessionId) {
    throw new Error(`Submission ${submissionId} not found`);
  }
  
  const client = await initializeTable('votes');
  const voteId = uuidv4();
  const rowKey = `${encodeEmailForKey(voterEmail)}_${submissionId}`;
  const now = new Date().toISOString();
  
  const entity: Vote = {
    partitionKey: sessionId,
    rowKey: rowKey,
    id: voteId,
    sessionId: sessionId,
    voterEmail: voterEmail.toLowerCase(),
    submissionId: submissionId,
    voteType: voteType,
    createdAt: now
  };
  
  await client.upsertEntity(entity, "Replace");
  return {
    id: entity.id,
    sessionId: entity.sessionId,
    voterEmail: entity.voterEmail,
    submissionId: entity.submissionId,
    voteType: entity.voteType,
    createdAt: entity.createdAt
  };
}

export async function listVotes(submissionId?: string): Promise<VoteDTO[]> {
  const client = await initializeTable('votes');
  
  const entities = submissionId
    ? client.listEntities<Vote>({ queryOptions: { filter: odata`submissionId eq ${submissionId}` } })
    : client.listEntities<Vote>();
  
  const votes: VoteDTO[] = [];
  for await (const entity of entities) {
    votes.push({
      id: entity.id,
      sessionId: entity.sessionId,
      voterEmail: entity.voterEmail,
      submissionId: entity.submissionId,
      voteType: entity.voteType,
      createdAt: entity.createdAt
    });
  }
  
  return votes;
}
