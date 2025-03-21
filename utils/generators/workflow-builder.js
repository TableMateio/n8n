/**
 * WorkflowBuilder
 *
 * A utility class for building complete n8n workflows with proper connections.
 * Focuses on creating entire workflows from scratch, handling proper node
 * connection structures, and managing both ID-based and name-based references.
 */

// Load WorkflowManager from utilities
const WorkflowManager = require('../managers/workflow-manager');
const NodeFactory = require('./node-factory');
const { v4: uuidv4 } = require('uuid');

class WorkflowBuilder {
	/**
	 * Create a new WorkflowBuilder instance
	 *
	 * @param {Object} options Configuration options
	 * @param {string} options.n8nUrl The URL of the n8n instance (defaults to environment variable)
	 * @param {string} options.apiKey The API key for authentication (defaults to environment variable)
	 * @param {boolean} options.useStaticIds Whether to use static IDs for nodes (default: false)
	 */
	constructor(options = {}) {
		const n8nUrl = options.n8nUrl || process.env.N8N_URL || 'http://localhost:5678';
		const apiKey = options.apiKey || process.env.N8N_API_KEY;

		if (!apiKey) {
			console.warn(
				'No API key provided. Please set N8N_API_KEY environment variable or provide it in the options.',
			);
		}

		this.manager = new WorkflowManager(n8nUrl, apiKey);
		this.useStaticIds = options.useStaticIds || false;
		this.nodes = [];
		this.connections = {};
		this.workflowName = '';
		this.tags = [];
		this.active = false;
		this.idMap = new Map(); // Maps friendly names to IDs

		// Preserve references to node IDs for both ID and name-based connections
		this.nodeIds = {};
	}

	/**
	 * Set the workflow name
	 *
	 * @param {string} name The name for the workflow
	 * @returns {WorkflowBuilder} The builder instance for chaining
	 */
	setName(name) {
		this.workflowName = name;
		return this;
	}

	/**
	 * Set the active state of the workflow
	 *
	 * @param {boolean} active Whether the workflow should be active
	 * @returns {WorkflowBuilder} The builder instance for chaining
	 */
	setActive(active) {
		this.active = active;
		return this;
	}

	/**
	 * Add tags to the workflow
	 *
	 * @param {string[]} tags Array of tag names to add
	 * @returns {WorkflowBuilder} The builder instance for chaining
	 */
	addTags(tags) {
		this.tags = [...this.tags, ...tags];
		return this;
	}

	/**
	 * Generate a node ID
	 *
	 * @param {string} name The node name (used for deterministic IDs in static mode)
	 * @returns {string} A UUID for the node
	 */
	generateNodeId(name) {
		if (this.useStaticIds && name) {
			// Create a deterministic ID based on the name for static mode
			// This is useful for testing and debugging
			return `node-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
		}
		return uuidv4();
	}

	/**
	 * Add a node to the workflow
	 *
	 * @param {Object} nodeConfig The node configuration
	 * @param {string} [nodeConfig.id] Optional ID (generated if not provided)
	 * @param {string} nodeConfig.name Node name
	 * @param {string} nodeConfig.type Node type
	 * @param {number} nodeConfig.typeVersion Type version
	 * @param {number[]} [nodeConfig.position] Position coordinates [x, y]
	 * @param {Object} nodeConfig.parameters Node parameters
	 * @returns {string} The ID of the added node
	 */
	addNode(nodeConfig) {
		// Generate ID if not provided
		const id = nodeConfig.id || this.generateNodeId(nodeConfig.name);

		// Create a copy of the configuration with the ID
		const node = {
			...nodeConfig,
			id,
		};

		// Add default position if not provided
		if (!node.position) {
			// Position based on current node count for simple layouts
			const x = 250 + (this.nodes.length % 4) * 200;
			const y = 300 + Math.floor(this.nodes.length / 4) * 150;
			node.position = [x, y];
		}

		// Store the node
		this.nodes.push(node);

		// Map name to ID for connection references
		this.nodeIds[node.name] = id;

		return id;
	}

	/**
	 * Connect two nodes in the workflow
	 *
	 * @param {Object} connection Connection configuration
	 * @param {string} connection.sourceNode Source node name or ID
	 * @param {string} connection.targetNode Target node name or ID
	 * @param {number} [connection.sourceOutput=0] Output index from source
	 * @param {number} [connection.targetInput=0] Input index on target
	 * @returns {WorkflowBuilder} The builder instance for chaining
	 */
	connectNodes(connection) {
		// Extract connection details with defaults
		const { sourceNode, targetNode, sourceOutput = 0, targetInput = 0 } = connection;

		// Resolve source and target node IDs
		const sourceId = this.resolveNodeId(sourceNode);
		const targetId = this.resolveNodeId(targetNode);

		// Get source and target node names
		const sourceName = this.findNodeNameById(sourceId);
		const targetName = this.findNodeNameById(targetId);

		if (!sourceId || !targetId) {
			throw new Error(
				`Cannot connect nodes: ${sourceNode} -> ${targetNode}. One or both nodes not found.`,
			);
		}

		// Initialize connection arrays if they don't exist
		if (!this.connections[sourceId]) {
			this.connections[sourceId] = { main: [] };
		}
		if (!this.connections[sourceId].main) {
			this.connections[sourceId].main = [];
		}

		// Ensure the output array exists
		while (this.connections[sourceId].main.length <= sourceOutput) {
			this.connections[sourceId].main.push([]);
		}

		// Add ID-based connection
		this.connections[sourceId].main[sourceOutput].push({
			node: targetId,
			type: 'main',
			index: targetInput,
		});

		// Add name-based connection
		if (sourceName && targetName) {
			if (!this.connections[sourceName]) {
				this.connections[sourceName] = { main: [] };
			}
			if (!this.connections[sourceName].main) {
				this.connections[sourceName].main = [];
			}

			// Ensure the output array exists
			while (this.connections[sourceName].main.length <= sourceOutput) {
				this.connections[sourceName].main.push([]);
			}

			// Add the name-based connection
			this.connections[sourceName].main[sourceOutput].push({
				node: targetName,
				type: 'main',
				index: targetInput,
			});
		}

		return this;
	}

	/**
	 * Resolve a node reference to an ID
	 *
	 * @private
	 * @param {string} nodeRef Node name or ID
	 * @returns {string} The node ID
	 */
	resolveNodeId(nodeRef) {
		// If it's an ID reference (matches a node id)
		const matchById = this.nodes.find((node) => node.id === nodeRef);
		if (matchById) {
			return nodeRef;
		}

		// If it's a name reference
		return this.nodeIds[nodeRef];
	}

	/**
	 * Find a node name by its ID
	 *
	 * @private
	 * @param {string} id Node ID
	 * @returns {string|null} The node name or null if not found
	 */
	findNodeNameById(id) {
		const node = this.nodes.find((n) => n.id === id);
		return node ? node.name : null;
	}

	/**
	 * Create a basic workflow with a trigger and one action node
	 *
	 * @param {Object} options Configuration options
	 * @param {string} options.name Workflow name
	 * @param {string} options.triggerType Type of trigger node
	 * @param {Object} options.triggerParameters Parameters for the trigger
	 * @param {string} options.actionType Type of action node
	 * @param {Object} options.actionParameters Parameters for the action
	 * @returns {Promise<Object>} The created workflow
	 */
	async createBasicWorkflow(options) {
		const {
			name,
			triggerType = 'n8n-nodes-base.manualTrigger',
			triggerParameters = {},
			actionType = 'n8n-nodes-base.httpRequest',
			actionParameters = {
				url: 'https://jsonplaceholder.typicode.com/todos/1',
			},
		} = options;

		// Reset the builder state
		this.nodes = [];
		this.connections = {};
		this.workflowName = name;
		this.nodeIds = {};

		// Add trigger node
		const triggerId = this.addNode({
			name: 'Start',
			type: triggerType,
			typeVersion: 1,
			position: [250, 300],
			parameters: triggerParameters,
		});

		// Add action node
		const actionId = this.addNode({
			name: 'Action',
			type: actionType,
			typeVersion: 1,
			position: [450, 300],
			parameters: actionParameters,
		});

		// Connect the nodes
		this.connectNodes({
			sourceNode: triggerId,
			targetNode: actionId,
		});

		// Create the workflow
		return this.createWorkflow();
	}

	/**
	 * Create a switch-based workflow with branching logic
	 *
	 * @param {Object} options Configuration options
	 * @param {string} options.name Workflow name
	 * @param {Object} options.triggerConfig Trigger node configuration
	 * @param {Object} options.switchConfig Switch node configuration
	 * @param {Object[]} options.branches Array of branch configurations
	 * @returns {Promise<Object>} The created workflow
	 */
	async createSwitchWorkflow(options) {
		const { name, triggerConfig, switchConfig, branches } = options;

		// Reset the builder state
		this.nodes = [];
		this.connections = {};
		this.workflowName = name;
		this.nodeIds = {};

		// Add trigger node
		const triggerId = this.addNode(triggerConfig);

		// Add switch node
		const switchId = this.addNode(switchConfig);

		// Connect trigger to switch
		this.connectNodes({
			sourceNode: triggerId,
			targetNode: switchId,
		});

		// Add branch nodes and connect them
		branches.forEach((branch, index) => {
			const branchNodeId = this.addNode(branch.node);

			// Connect switch to branch node
			this.connectNodes({
				sourceNode: switchId,
				targetNode: branchNodeId,
				sourceOutput: index,
			});
		});

		// Create the workflow
		return this.createWorkflow();
	}

	/**
	 * Create the workflow in n8n
	 *
	 * @returns {Promise<Object>} The created workflow
	 */
	async createWorkflow() {
		if (!this.workflowName) {
			throw new Error('Workflow name is required. Use setName() to set it.');
		}

		// Create the workflow definition
		const workflowDefinition = {
			name: this.workflowName,
			nodes: this.nodes,
			connections: this.connections,
			active: this.active,
			tags: this.tags,
		};

		// Call the workflow manager to create the workflow
		return this.manager.createWorkflow(
			workflowDefinition.name,
			workflowDefinition.nodes,
			workflowDefinition.connections,
			workflowDefinition.active,
			workflowDefinition.tags,
		);
	}
}

module.exports = WorkflowBuilder;
