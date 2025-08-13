@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'hackathonmcp'

@description('Cosmos DB database name')
param cosmosDbName string = 'hackathon'

@description('Cosmos DB container name')
param cosmosContainerName string = 'submissions'

var suffix = uniqueString(resourceGroup().id)
var namePrefix = toLower('${baseName}${suffix}')

resource stg 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take('${namePrefix}stg', 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-02-15' = {
  name: '${namePrefix}-cosmos'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: false
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15' = {
  parent: cosmos
  name: cosmosDbName
  properties: {
    resource: { id: cosmosDbName }
    options: { }
  }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15' = {
  parent: cosmosDb
  name: cosmosContainerName
  properties: {
    resource: {
      id: cosmosContainerName
      partitionKey: { paths: [ '/email' ], kind: 'Hash' }
    }
    options: { }
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${namePrefix}-plan'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  kind: 'functionapp'
}

resource func 'Microsoft.Web/sites@2023-12-01' = {
  name: '${namePrefix}-func'
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    httpsOnly: true
    serverFarmId: plan.id
    siteConfig: {
      linuxFxVersion: 'Node|18'
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' },
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' },
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${stg.name};AccountKey=${listKeys(stg.id, '2023-05-01').keys[0].value};EndpointSuffix=${environment().suffixes.storage}' },
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString },
        { name: 'COSMOS_ENDPOINT', value: cosmos.properties.documentEndpoint },
        { name: 'COSMOS_DATABASE', value: cosmosDbName },
        { name: 'COSMOS_CONTAINER', value: cosmosContainerName }
      ]
    }
  }
}

output functionAppName string = func.name
output functionAppUrl string = 'https://${func.name}.azurewebsites.net'
output cosmosEndpoint string = cosmos.properties.documentEndpoint
