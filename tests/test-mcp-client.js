#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_URL = 'http://localhost:7071/mcp';

async function testMCPServer() {
  console.log('🧪 Starting MCP Client SDK Test');
  console.log(`📡 Connecting to: ${SERVER_URL}`);

  let client;
  let transport;

  let aliceSubmissionId = null;
  let bobSubmissionId = null;

  try {
    // Create transport and client
    transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
    client = new Client(
      {
        name: "test-client",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );

    // Connect to server
    console.log('🔌 Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ Connected successfully!');

    // List available tools
    console.log('\n📋 Listing available tools...');
    const listResult = await client.listTools();
    console.log('Available tools:', listResult.tools.map(t => t.name));

    // Test 1: List users (should be empty initially)
    console.log('\n🧪 Test 1: List Users');
    try {
      const listUsersResult = await client.callTool({
        name: 'list_users',
        arguments: {}
      });
      console.log('✅ list_users result:', JSON.stringify(listUsersResult, null, 2));
    } catch (error) {
      console.log('❌ list_users failed:', error.message);
    }

    // Test 2: Create a user and save submission (creates session implicitly)
    console.log('\n🧪 Test 2: Save Submission (creates user and session)');
    try {
      const saveSubmissionResult = await client.callTool({
        name: 'save_submission',
        arguments: {
          sessionId: 'hackathon-aug-2025',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          title: 'Smart Learning Platform',
          description: 'An AI-powered platform that adapts learning content to individual student needs and learning styles'
        }
      });
      console.log('✅ save_submission result:', JSON.stringify(saveSubmissionResult, null, 2));
      
      // Extract submission ID from response
      const responseText = saveSubmissionResult.content[0].text;
      const submissionData = JSON.parse(responseText);
      aliceSubmissionId = submissionData.id;
      console.log('📝 Saved Alice\'s submission ID:', aliceSubmissionId);
      
    } catch (error) {
      console.log('❌ save_submission failed:', error.message);
      console.log('Error details:', error);
    }

    // Test 3: Get user sessions
    console.log('\n🧪 Test 3: Get User Sessions');
    try {
      const sessionsResult = await client.callTool({
        name: 'get_user_sessions',
        arguments: {
          userId: 'alice@example.com'
        }
      });
      console.log('✅ get_user_sessions result:', JSON.stringify(sessionsResult, null, 2));
    } catch (error) {
      console.log('❌ get_user_sessions failed:', error.message);
    }

    // Test 4: Add another submission to same session
    console.log('\n🧪 Test 4: Add Second Submission');
    try {
      const saveSubmission2Result = await client.callTool({
        name: 'save_submission',
        arguments: {
          sessionId: 'hackathon-aug-2025',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          title: 'Eco Tracker App',
          description: 'Mobile app to track personal carbon footprint and suggest eco-friendly alternatives'
        }
      });
      console.log('✅ Second save_submission result:', JSON.stringify(saveSubmission2Result, null, 2));
    } catch (error) {
      console.log('❌ Second save_submission failed:', error.message);
    }

    // Test 5: List submissions in session
    console.log('\n🧪 Test 5: List Submissions in Session');
    try {
      const listSubmissionsResult = await client.callTool({
        name: 'list_submissions',
        arguments: {
          sessionId: 'hackathon-aug-2025'
        }
      });
      console.log('✅ list_submissions result:', JSON.stringify(listSubmissionsResult, null, 2));
    } catch (error) {
      console.log('❌ list_submissions failed:', error.message);
    }

    // Test 6: List all users (should now show Alice and Bob)
    console.log('\n🧪 Test 6: List All Users After Submissions');
    try {
      const listUsersResult2 = await client.callTool({
        name: 'list_users',
        arguments: {}
      });
      console.log('✅ Final list_users result:', JSON.stringify(listUsersResult2, null, 2));
    } catch (error) {
      console.log('❌ Final list_users failed:', error.message);
    }

    // Test 8: List all submissions (admin tool)
    console.log('\n🧪 Test 8: List All Submissions (Admin)');
    try {
      const listAllResult = await client.callTool({
        name: 'list_all_submissions',
        arguments: {}
      });
      console.log('✅ list_all_submissions result:', JSON.stringify(listAllResult, null, 2));
    } catch (error) {
      console.log('❌ list_all_submissions failed:', error.message);
    }

    // Test 9: Save a vote
    console.log('\n🧪 Test 9: Save Vote');
    try {
      if (aliceSubmissionId) {
        const voteResult = await client.callTool({
          name: 'save_vote',
          arguments: {
            submissionId: aliceSubmissionId,
            voterEmail: 'judge@example.com',
            voteType: 'like'
          }
        });
        console.log('✅ save_vote result:', JSON.stringify(voteResult, null, 2));
      } else {
        console.log('❌ Cannot vote - no submission ID available');
      }
    } catch (error) {
      console.log('❌ save_vote failed:', error.message);
    }

    // Test 10: List votes
    console.log('\n🧪 Test 10: List Votes');
    try {
      const listVotesResult = await client.callTool({
        name: 'list_votes',
        arguments: {
          sessionId: 'hackathon-aug-2025'
        }
      });
      console.log('✅ list_votes result:', JSON.stringify(listVotesResult, null, 2));
    } catch (error) {
      console.log('❌ list_votes failed:', error.message);
    }

    console.log('\n🎉 Test suite completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Clean up
    if (client) {
      try {
        await client.close();
        console.log('🔌 Disconnected from server');
      } catch (error) {
        console.log('⚠️  Error during disconnect:', error.message);
      }
    }
  }
}

// Run the test
testMCPServer().catch(console.error);
