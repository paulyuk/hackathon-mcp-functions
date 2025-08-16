#!/usr/bin/env node

/**
 * Test script to verify Azure OpenAI connection setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Azure OpenAI Connection Setup...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);
console.log(`📁 .env file exists: ${envExists ? '✅' : '❌'}`);

if (envExists) {
  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const hasAzureEndpoint = envContent.includes('AZURE_OPENAI_ENDPOINT=') && 
                          !envContent.includes('your-ai-foundry-endpoint');
  const hasAzureDeployment = envContent.includes('AZURE_OPENAI_DEPLOYMENT=') && 
                            !envContent.includes('your-gpt4o-mini-deployment-name');
  const useAzureIdentity = envContent.includes('USE_AZURE_IDENTITY=true');
  
  console.log(`� Azure OpenAI Endpoint configured: ${hasAzureEndpoint ? '✅' : '❌'}`);
  console.log(`🤖 Azure OpenAI Deployment configured: ${hasAzureDeployment ? '✅' : '❌'}`);
  console.log(`🔐 Azure Identity authentication enabled: ${useAzureIdentity ? '✅' : '❌'}`);
  
  if (!hasAzureEndpoint || !hasAzureDeployment) {
    console.log('\n💡 To configure Azure OpenAI:');
    console.log('1. Update AZURE_OPENAI_ENDPOINT in .env with your Azure AI Foundry endpoint');
    console.log('2. Update AZURE_OPENAI_DEPLOYMENT in .env with your GPT-4.1 mini deployment name');
    console.log('3. Ensure you are logged in to Azure CLI: az login');
    console.log('4. Start the MCP server: func start (in parent directory)');
    console.log('5. Start the agent: npm run dev');
    console.log('6. Test: POST to http://localhost:3000/test');
  }
  
  // Check Azure CLI authentication
  console.log('\n🔑 Azure CLI Status:');
  try {
    const { execSync } = require('child_process');
    const azAccount = execSync('az account show --query "user.name" -o tsv 2>/dev/null', { encoding: 'utf-8' });
    if (azAccount.trim()) {
      console.log(`✅ Logged in as: ${azAccount.trim()}`);
    }
  } catch (error) {
    console.log('❌ Not logged in to Azure CLI');
    console.log('💡 Run: az login');
  }
} else {
  console.log('\n💡 Create .env file by copying .env.example and adding your Azure OpenAI configuration');
}

// Check if the built files exist
const distExists = fs.existsSync(path.join(__dirname, 'dist'));
const indexExists = fs.existsSync(path.join(__dirname, 'dist', 'index.js'));

console.log(`📦 Built files exist: ${distExists && indexExists ? '✅' : '❌'}`);

if (!distExists || !indexExists) {
  console.log('🔨 Run: npm run build');
}

console.log('\n🏗️  Azure OpenAI Integration Architecture:');
console.log('┌─ Agent Service (Express + OpenAI Agents SDK)');
console.log('│  ├─ Loads instructions from .github/agent_prompt.md');
console.log('│  ├─ Uses DefaultAzureCredential for Entra identity auth');
console.log('│  ├─ Connects to Azure OpenAI via cognitive services token');
console.log('│  └─ Uses MCP tools via MCPServerStreamableHttp');
console.log('├─ Azure OpenAI Configuration');
console.log('│  ├─ Endpoint: Azure AI Foundry endpoint');
console.log('│  ├─ Deployment: GPT-4.1 mini deployment');
console.log('│  ├─ Authentication: Entra identity (no API keys!)');
console.log('│  └─ Token scope: https://cognitiveservices.azure.com/.default');
console.log('├─ MCP Server (Azure Functions)');
console.log('│  └─ Provides 8 tools for hackathon management');
console.log('└─ Authentication Flow');
console.log('   ├─ Azure CLI login provides credentials');
console.log('   ├─ DefaultAzureCredential gets token');
console.log('   ├─ Token used for OpenAI SDK authentication');
console.log('   └─ Agent processes user messages with Azure OpenAI');

console.log('\n✅ Azure OpenAI agent setup verification complete!');
