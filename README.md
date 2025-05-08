# Metis The Graph Template

This is a template for creating a custom subgraph for Metis contracts. Follow this guide to create and deploy your own subgraph.

## Prerequisites

- Node.js version 20 (as specified in .nvmrc)
- Yarn package manager
- A deployed smart contract on Metis network (follow the [docs](https://docs.metis.io/andromeda/dapp/start/deploy/foundry))

## Step-by-Step Guide

### 1. Create a Subgraph in The Graph Studio

1. Go to [The Graph Studio](https://thegraph.com/studio)
2. Connect your wallet
3. Click "Create a Subgraph"
4. Name your subgraph (e.g., "My Metis Subgraph")
5. Note down the deployment key provided

### 2. Install Dependencies

```bash
# Install project dependencies
yarn install
```

### 3. Add Contract ABIs

Add your contract ABIs as JSON files in the `abis` directory and delete redundant files. For example:
```bash
# Example: Copy your contract ABI to the abis directory
cp path/to/your/contract.json ./abis/
rm ./abis/StakeAndLock.json
```

### 4. Update Schema

1. Open [`schema.graphql`](./schema.graphql)
2. Define your entities based on the data you want to index
3. Each entity should have:
   - Required fields (ID, timestamps)
   - Fields matching your contract events
   - Proper relationships between entities

Example:
```graphql
type Entity @entity {
  id: ID!
  field1: String!
  field2: BigInt!
  timestamp: BigInt!
}
```

### 5. Update Subgraph Configuration (subgraph.yaml)

1. Open `subgraph.yaml`
2. Update the following fields:
   - `dataSources[].source.address`: Your contract address
   - `dataSources[].source.abi`: Your contract ABI name
   - `dataSources[].source.startBlock`: The block number where your contract was deployed
   - `dataSources[].mapping.entities`: Your defined entities from schema.graphql
   - `dataSources[].mapping.abis[].name`: Your contract ABI name
   - `dataSources[].mapping.abis[].file`: Path to your ABI file
   - `dataSources[].mapping.eventHandlers`: Events you want to index and their handlers

Example configuration:
```yaml
dataSources:
  - kind: ethereum
    name: YourContract
    network: andromeda
    source:
      address: "0x..." # Your contract address
      abi: YourContract # Your contract ABI name
      startBlock: 12345678 # Your contract deployment block
    mapping:
      entities:
        - YourEntity
      abis:
        - name: YourContract
          file: ./abis/YourContract.json
      eventHandlers:
        - event: YourEvent(indexed uint256,address)
          handler: handleYourEvent
```

### 6. Update Mappings (mapping.ts)

1. Open [`mapping.ts`](./mapping.ts)
2. Implement event handlers for each event you want to index
3. Create/update entities based on event data
4. Save entities using `entity.save()`

Example:
```typescript
export function handleEvent(event: Event): void {
  let entity = new Entity(event.transaction.hash.toHex())
  entity.field1 = event.params.value
  entity.timestamp = event.block.timestamp
  entity.save()
}
```
> Note: every time you update the schema or the events or the subgraph configuration, you need to run `yarn codegen` to update the types.

### 7. Update Package Configuration

1. Open [`package.json`](./package.json)
2. Update the `name` field to match your subgraph name
3. Update any other relevant fields

### 8. Build and Deploy

```bash
yarn codegen
yarn build
```
Authenticate with The Graph Studio and cli will prompt you to paste the deployment key:
```bash
yarn auth
```
Deploy the subgraph:
```bash
yarn deploy
```

## Testing Your Subgraph

1. Go to The Graph Studio
2. Select your subgraph
3. Use the GraphQL playground to test queries
4. Check the logs for any indexing issues

## Common Issues and Solutions

- If you get ABI errors, ensure your ABI file is valid JSON
- If events aren't being indexed, verify the event names match exactly
- If entities aren't saving, check your mapping logic and entity definitions

## Resources

- [The Graph Documentation](https://thegraph.com/docs/)
- [AssemblyScript Documentation](https://www.assemblyscript.org/)
- [GraphQL Documentation](https://graphql.org/learn/)

