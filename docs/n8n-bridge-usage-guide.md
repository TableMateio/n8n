# N8N-Bridge Usage Guide

## Setup Summary
We've successfully configured the N8N Bridge in Cursor, allowing us to interact with our n8n instance directly through Cursor's AI interface. Here's how we did it:

1. Installed the n8n-mcp-server package globally:
   ```bash
   npm install -g @illuminaresolutions/n8n-mcp-server
   ```

2. Created a shell script (`run-mcp.sh`) that properly executes the MCP server with our environment variables:
   ```bash
   #!/bin/bash
   export N8N_HOST="https://localhost:5678"
   export N8N_API_KEY="YOUR_API_KEY"

   MCP_SERVER_PATH=$(which n8n-mcp-server)

   # Install if needed
   if [ -z "$MCP_SERVER_PATH" ]; then
       npm install -g @illuminaresolutions/n8n-mcp-server
       MCP_SERVER_PATH=$(which n8n-mcp-server)
   fi

   # Run with Node directly (critical for ES modules)
   exec node $MCP_SERVER_PATH
   ```

3. Made the script executable:
   ```bash
   chmod +x run-mcp.sh
   ```

4. Configured Cursor's MCP server settings:
   - Name: N8N-Bridge
   - Type: command
   - Command: /Users/scottbergman/Dropbox/TaxSurplus/Technology/n8n/run-mcp.sh

## Available Commands

Now that the N8N-Bridge is configured, you can use the following commands by asking Cursor to perform these actions:

### Initialization
- **Initialize connection**: Always start with this
  ```
  Please connect to my n8n instance
  ```

### Workflows
- **List workflows**:
  ```
  List all my n8n workflows
  ```
- **Get workflow details**:
  ```
  Show me details for workflow ID [id]
  ```
- **Create workflow**:
  ```
  Create a new workflow named [name]
  ```
- **Update workflow**:
  ```
  Update workflow [id] by changing [property] to [value]
  ```
- **Delete workflow**:
  ```
  Delete workflow [id]
  ```
- **Activate/Deactivate workflow**:
  ```
  Activate workflow [id]
  Deactivate workflow [id]
  ```

### Tags
- **Create and manage tags**:
  ```
  Create a tag named [name]
  List all tags
  Update tag [id] to [new name]
  Delete tag [id]
  ```
- **Workflow tags**:
  ```
  Show tags for workflow [id]
  Add tag [tag_id] to workflow [workflow_id]
  ```

### Executions
- **Manage workflow executions**:
  ```
  Show recent executions
  Show executions for workflow [id]
  Show execution details for [execution_id]
  Delete execution [id]
  ```

### Credentials
- **Manage credentials**:
  ```
  Show credential schema for [credential_type]
  Create credential for [type] named [name]
  Delete credential [id]
  ```

### Enterprise Features
These require an n8n Enterprise license:

- **Projects**:
  ```
  List all projects
  Create project [name]
  Update project [id] to [name]
  Delete project [id]
  ```

- **Variables**:
  ```
  List all variables
  Create variable [key] with value [value]
  Delete variable [id]
  ```

- **Users**:
  ```
  List all users
  Get user [email/id]
  Create user with email [email]
  Delete user [email/id]
  ```

- **Security**:
  ```
  Generate a security audit
  ```

## Best Practices

1. **Always initialize first**: Before using any other command, always initialize the connection.

2. **Use workflow IDs carefully**: When updating or deleting workflows, double-check the ID to avoid unintended changes.

3. **Keep your API key secure**: The API key in our setup script grants full access to your n8n instance.

4. **Error handling**: If you encounter an error like "Client not initialized", try reinitializing the connection.

## Maintenance

If you need to update the configuration:

1. Edit the `run-mcp.sh` script to update API keys or host URL
2. Restart Cursor to apply changes
3. If needed, update the n8n-mcp-server package with:
   ```bash
   npm update -g @illuminaresolutions/n8n-mcp-server
   ```

This setup provides a powerful way to manage your n8n workflows through natural language in Cursor!
