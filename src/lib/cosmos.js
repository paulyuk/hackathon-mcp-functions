const { CosmosClient } = require("@azure/cosmos");
const { DefaultAzureCredential } = require("@azure/identity");

let cached = null;

function createClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) throw new Error("COSMOS_ENDPOINT not set");

  const key = process.env.COSMOS_KEY;
  if (key) {
    return new CosmosClient({ endpoint, key });
  }

  // Use Azure AD (Managed Identity/DefaultAzureCredential)
  const credential = new DefaultAzureCredential();
  return new CosmosClient({ endpoint, tokenCredential: credential });
}

async function getContainer() {
  if (cached) return cached;
  const client = createClient();
  const databaseId = process.env.COSMOS_DATABASE || "hackathon";
  const containerId = process.env.COSMOS_CONTAINER || "submissions";

  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  const { container } = await database.containers.createIfNotExists({ id: containerId, partitionKey: "/email" });
  cached = container;
  return container;
}

module.exports = { getContainer };
