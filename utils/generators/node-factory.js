/**
 * NodeFactory
 *
 * A utility for creating common n8n node configurations.
 */

class NodeFactory {
	/**
	 * Create a basic node configuration with common properties
	 *
	 * @param {string} name The name of the node
	 * @param {string} type The type of the node (e.g., 'n8n-nodes-base.function')
	 * @param {number} typeVersion The version of the node type
	 * @param {Array<number>} position The position [x, y] of the node in the UI
	 * @param {Object} parameters The node parameters
	 * @returns {Object} The node configuration
	 */
	static createBaseNode(name, type, typeVersion, position, parameters) {
		return {
			id: `${type.split('.')[1]}-${Date.now()}`,
			name,
			type,
			typeVersion,
			position,
			parameters,
		};
	}

	/**
	 * Create a manual trigger node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createManualTrigger(options = {}) {
		return this.createBaseNode(
			options.name || 'Manual Trigger',
			'n8n-nodes-base.manualTrigger',
			options.typeVersion || 1,
			options.position || [250, 300],
			options.parameters || {},
		);
	}

	/**
	 * Create a schedule trigger node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createScheduleTriggerNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Schedule Trigger',
			'n8n-nodes-base.scheduleTrigger',
			options.typeVersion || 1,
			options.position || [250, 300],
			{
				interval: options.interval || 1,
				intervalUnit: options.intervalUnit || 'hours',
				...options.parameters,
			},
		);
	}

	/**
	 * Create a function node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createFunctionNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Function',
			'n8n-nodes-base.function',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				functionCode: options.functionCode || 'return items;',
				...options.parameters,
			},
		);
	}

	/**
	 * Create a code node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createCodeNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Code',
			'n8n-nodes-base.code',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				mode: options.mode || 'jsObject',
				jsCode: options.jsCode || 'return items;',
				...options.parameters,
			},
		);
	}

	/**
	 * Create an HTTP request node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createHttpRequestNode(options = {}) {
		return this.createBaseNode(
			options.name || 'HTTP Request',
			'n8n-nodes-base.httpRequest',
			options.typeVersion || 4.1,
			options.position || [500, 300],
			{
				url: options.url || 'https://example.com',
				method: options.method || 'GET',
				authentication: options.authentication || 'none',
				responseFormat: options.responseFormat || 'json',
				sendBody: options.sendBody || false,
				bodyParameters: options.bodyParameters || {},
				bodyParametersUi: options.bodyParametersUi || {},
				options: options.options || {},
				...options.parameters,
			},
		);
	}

	/**
	 * Create a set node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createSetNode(options = {}) {
		// Handle both v1 and v3.4 formats
		let parameters;

		if (options.typeVersion && options.typeVersion >= 3) {
			// New format (v3.4+)
			parameters = {
				mode: options.mode || 'manual',
				includeOtherFields: options.includeOtherFields !== false,
				include: options.include || 'all',
				assignments: {
					assignments: options.assignments || [],
				},
				...options.parameters,
			};
		} else {
			// Legacy format (v1)
			parameters = {
				values: options.values || {},
				...options.parameters,
			};
		}

		return this.createBaseNode(
			options.name || 'Set',
			'n8n-nodes-base.set',
			options.typeVersion || 3.4,
			options.position || [500, 300],
			parameters,
		);
	}

	/**
	 * Create a switch node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createSwitchNode(options = {}) {
		// Handle both v1 and v3.2 formats
		let parameters;

		if (options.typeVersion && options.typeVersion >= 3) {
			// New format (v3.2+)
			parameters = {
				rules: {
					values: options.rules || [],
				},
				options: options.switchOptions || {},
				...options.parameters,
			};
		} else {
			// Legacy format (v1)
			parameters = {
				conditions: options.conditions || {},
				...options.parameters,
			};
		}

		return this.createBaseNode(
			options.name || 'Switch',
			'n8n-nodes-base.switch',
			options.typeVersion || 3.2,
			options.position || [500, 300],
			parameters,
		);
	}

	/**
	 * Create an If node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createIfNode(options = {}) {
		return this.createBaseNode(
			options.name || 'IF',
			'n8n-nodes-base.if',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				conditions: options.conditions || {
					number: [
						{
							value1: options.condition?.leftValue || '={{ $json["value"] }}',
							operation: options.condition?.operator || 'equal',
							value2: options.condition?.rightValue || 0,
						},
					],
				},
				...options.parameters,
			},
		);
	}

	/**
	 * Create an Airtable node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createAirtableNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Airtable',
			'n8n-nodes-base.airtable',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				application: options.application || process.env.AIRTABLE_APP_ID,
				operation: options.operation || 'list',
				table: options.table || '',
				...options.parameters,
			},
		);
	}

	/**
	 * Create a PDF Extract node (Read PDF)
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createPdfExtractNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Extract PDF Text',
			'n8n-nodes-base.readPDF',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				sourceData: options.sourceData || 'binaryData',
				...options.parameters,
			},
		);
	}

	/**
	 * Create a Send Email node
	 *
	 * @param {Object} options Configuration options
	 * @returns {Object} The node configuration
	 */
	static createEmailSendNode(options = {}) {
		return this.createBaseNode(
			options.name || 'Send Email',
			'n8n-nodes-base.emailSend',
			options.typeVersion || 1,
			options.position || [500, 300],
			{
				authentication: options.authentication || 'smtp',
				fromEmail: options.fromEmail || '',
				toEmail: options.toEmail || '',
				subject: options.subject || '',
				text: options.text || '',
				html: options.html || '',
				...options.parameters,
			},
		);
	}
}

module.exports = NodeFactory;
