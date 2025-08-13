const { CosmosClient } = require("@azure/cosmos");
const { DefaultAzureCredential, ManagedIdentityCredential } = require("@azure/identity");

let cached = null;

function createClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) throw new Error("COSMOS_ENDPOINT not set");

  const key = process.env.COSMOS_KEY;
  if (key) {
    return new CosmosClient({ endpoint, key });
  }

  // Try AAD (Managed Identity / Default Credential)
  // Note: Newer Cosmos SDK supports AAD via 'aadCredentials' or 'tokenCredential' depending on version.
  // This uses the 'aadCredentials' field supported in v4.
  const credential = new ManagedIdentityCredential()
    || new DefaultAzureCredential();
  return new CosmosClient({ endpoint, aadCredentials: credential });
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
