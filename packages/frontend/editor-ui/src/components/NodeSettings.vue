<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
	INodeTypeDescription,
	INodeParameters,
	INodeProperties,
	NodeConnectionType,
	NodeParameterValue,
	INodeCredentialDescription,
	IDisplayOptions,
} from 'n8n-workflow';
import {
	NodeHelpers,
	NodeConnectionTypes,
	deepCopy,
	isINodePropertyCollectionList,
	isINodePropertiesList,
	isINodePropertyOptionsList,
	displayParameter,
} from 'n8n-workflow';
import type {
	CurlToJSONResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
} from '@/Interface';

import { COMMUNITY_NODES_INSTALLATION_DOCS_URL, CUSTOM_NODES_DOCS_URL } from '@/constants';

import NodeTitle from '@/components/NodeTitle.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import NodeWebhooks from '@/components/NodeWebhooks.vue';
import NDVSubConnections from '@/components/NDVSubConnections.vue';
import { get, set, unset } from 'lodash-es';

import NodeExecuteButton from './NodeExecuteButton.vue';
import { isCommunityPackageName } from '@/utils/nodeTypesUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useHistoryStore } from '@/stores/history.store';
import { RenameNodeCommand } from '@/models/history';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { EventBus } from '@n8n/utils/event-bus';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { importCurlEventBus, ndvEventBus } from '@/event-bus';
import { ProjectTypes } from '@/types/projects.types';
import { updateDynamicConnections } from '@/utils/nodeSettingsUtils';
import FreeAiCreditsCallout from '@/components/FreeAiCreditsCallout.vue';

const props = withDefaults(
	defineProps<{
		eventBus: EventBus;
		dragging: boolean;
		pushRef: string;
		nodeType: INodeTypeDescription | null;
		readOnly: boolean;
		foreignCredentials: string[];
		blockUI: boolean;
		executable: boolean;
		inputSize: number;
	}>(),
	{
		foreignCredentials: () => [],
		readOnly: false,
		executable: true,
		inputSize: 0,
		blockUI: false,
	},
);

const emit = defineEmits<{
	stopExecution: [];
	redrawRequired: [];
	valueChanged: [value: IUpdateInformation];
	switchSelectedNode: [nodeName: string];
	openConnectionNodeCreator: [nodeName: string, connectionType: NodeConnectionType];
	activate: [];
	execute: [];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const historyStore = useHistoryStore();

const telemetry = useTelemetry();
const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const i18n = useI18n();

const nodeValid = ref(true);
const openPanel = ref<'params' | 'settings'>('params');
const nodeValues = ref<INodeParameters>({
	color: '#ff0000',
	alwaysOutputData: false,
	executeOnce: false,
	notesInFlow: false,
	onError: 'stopWorkflow',
	retryOnFail: false,
	maxTries: 3,
	waitBetweenTries: 1000,
	notes: '',
	parameters: {},
});

// Used to prevent nodeValues from being overwritten by defaults on reopening ndv
const nodeValuesInitialized = ref(false);

const hiddenIssuesInputs = ref<string[]>([]);
const nodeSettings = ref<INodeProperties[]>([]);
const subConnections = ref<InstanceType<typeof NDVSubConnections> | null>(null);

const currentWorkflowInstance = computed(() => workflowsStore.getCurrentWorkflow());
const currentWorkflow = computed(() =>
	workflowsStore.getWorkflowById(currentWorkflowInstance.value.id),
);
const hasForeignCredential = computed(() => props.foreignCredentials.length > 0);
const isHomeProjectTeam = computed(
	() => currentWorkflow.value?.homeProject?.type === ProjectTypes.Team,
);
const isReadOnly = computed(
	() => props.readOnly || (hasForeignCredential.value && !isHomeProjectTeam.value),
);
const node = computed(() => ndvStore.activeNode);

const isTriggerNode = computed(() => !!node.value && nodeTypesStore.isTriggerNode(node.value.type));

const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const isExecutable = computed(() => {
	if (props.nodeType && node.value) {
		const workflowNode = currentWorkflowInstance.value.getNode(node.value.name);
		const inputs = NodeHelpers.getNodeInputs(
			currentWorkflowInstance.value,
			workflowNode!,
			props.nodeType,
		);
		const inputNames = NodeHelpers.getConnectionTypes(inputs);

		if (
			!inputNames.includes(NodeConnectionTypes.Main) &&
			!isToolNode.value &&
			!isTriggerNode.value
		) {
			return false;
		}
	}

	return props.executable || props.foreignCredentials.length > 0;
});

const nodeTypeVersions = computed(() => {
	if (!node.value) return [];
	return nodeTypesStore.getNodeVersions(node.value.type);
});

const latestVersion = computed(() => Math.max(...nodeTypeVersions.value));

const isLatestNodeVersion = computed(
	() => !node.value?.typeVersion || latestVersion.value === node.value.typeVersion,
);

const executeButtonTooltip = computed(() => {
	if (
		node.value &&
		isLatestNodeVersion.value &&
		props.inputSize > 1 &&
		!nodeHelpers.isSingleExecution(node.value.type, node.value.parameters)
	) {
		return i18n.baseText('nodeSettings.executeButtonTooltip.times', {
			interpolate: { inputSize: props.inputSize },
		});
	}
	return '';
});

const nodeVersionTag = computed(() => {
	if (!props.nodeType || props.nodeType.hidden) {
		return i18n.baseText('nodeSettings.deprecated');
	}

	if (isLatestNodeVersion.value) {
		return i18n.baseText('nodeSettings.latest');
	}

	return i18n.baseText('nodeSettings.latestVersion', {
		interpolate: { version: latestVersion.value.toString() },
	});
});

const parameters = computed(() => {
	if (props.nodeType === null) {
		return [];
	}

	return props.nodeType?.properties ?? [];
});

const parametersSetting = computed(() => parameters.value.filter((item) => item.isNodeSetting));

const parametersNoneSetting = computed(() =>
	// The connection hint notice is visually hidden via CSS in NodeDetails.vue when the node has output connections
	parameters.value.filter((item) => !item.isNodeSetting),
);

const isDisplayingCredentials = computed(
	() =>
		credentialsStore
			.getCredentialTypesNodeDescriptions('', props.nodeType)
			.filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription)).length >
		0,
);

const showNoParametersNotice = computed(
	() =>
		!isDisplayingCredentials.value &&
		parametersNoneSetting.value.filter((item) => item.type !== 'notice').length === 0,
);

const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

const isCommunityNode = computed(() => !!node.value && isCommunityPackageName(node.value.type));

const usedCredentials = computed(() =>
	Object.values(workflowsStore.usedCredentials).filter((credential) =>
		Object.values(node.value?.credentials || []).find(
			(nodeCredential) => nodeCredential.id === credential.id,
		),
	),
);

const credentialOwnerName = computed(() => {
	const credential = usedCredentials.value
		? Object.values(usedCredentials.value).find(
				(credential) => credential.id === props.foreignCredentials[0],
			)
		: undefined;

	return credentialsStore.getCredentialOwnerName(credential);
});

const setValue = (name: string, value: NodeParameterValue) => {
	const nameParts = name.split('.');
	let lastNamePart: string | undefined = nameParts.pop();

	let isArray = false;
	if (lastNamePart !== undefined && lastNamePart.includes('[')) {
		// It includes an index so we have to extract it
		const lastNameParts = lastNamePart.match(/(.*)\[(\d+)\]$/);
		if (lastNameParts) {
			nameParts.push(lastNameParts[1]);
			lastNamePart = lastNameParts[2];
			isArray = true;
		}
	}

	// Set the value so that everything updates correctly in the UI
	if (nameParts.length === 0) {
		// Data is on top level
		if (value === null) {
			// Property should be deleted
			if (lastNamePart) {
				const { [lastNamePart]: removedNodeValue, ...remainingNodeValues } = nodeValues.value;
				nodeValues.value = remainingNodeValues;
			}
		} else {
			// Value should be set
			nodeValues.value = {
				...nodeValues.value,
				[lastNamePart as string]: value,
			};
		}
	} else {
		// Data is on lower level
		if (value === null) {
			// Property should be deleted
			let tempValue = get(nodeValues.value, nameParts.join('.')) as
				| INodeParameters
				| INodeParameters[];

			if (lastNamePart && !Array.isArray(tempValue)) {
				const { [lastNamePart]: removedNodeValue, ...remainingNodeValues } = tempValue;
				tempValue = remainingNodeValues;
			}

			if (isArray && Array.isArray(tempValue) && tempValue.length === 0) {
				// If a value from an array got delete and no values are left
				// delete also the parent
				lastNamePart = nameParts.pop();
				tempValue = get(nodeValues.value, nameParts.join('.')) as INodeParameters;
				if (lastNamePart) {
					const { [lastNamePart]: removedArrayNodeValue, ...remainingArrayNodeValues } = tempValue;
					tempValue = remainingArrayNodeValues;
				}
			}
		} else {
			// Value should be set
			if (typeof value === 'object') {
				set(
					get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
					lastNamePart as string,
					deepCopy(value),
				);
			} else {
				set(
					get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
					lastNamePart as string,
					value,
				);
			}
		}
	}

	nodeValues.value = { ...nodeValues.value };
};

/**
 * Simple Shadow Store for Field Value Preservation
 *
 * Preserves dependent field values when they become hidden due to displayOptions changes.
 * Simple approach: field_path -> { controlling_field_value: stored_dependent_value }
 */
const getShadowStore = () => {
	if (!node.value?.id) return null;

	const shadowStore = ndvStore.shadowParameterStore;
	if (!shadowStore.has(node.value.id)) {
		shadowStore.set(node.value.id, new Map());
	}
	return shadowStore.get(node.value.id)!;
};

/**
 * Create a composite key for complex displayOptions that depend on multiple controlling fields
 * This handles cases like {hide: {condition: ["exists"], extractionType: ["exists"]}}
 */
const createCompositeKey = (
	displayOptions: IDisplayOptions,
	nodeParameters: INodeParameters,
	changedFieldName: string,
	changedFieldValue: NodeParameterValue,
): string => {
	const allControllingFields = new Set<string>();

	// Collect all controlling field names from show and hide options
	if (displayOptions.show) {
		Object.keys(displayOptions.show).forEach((field) => allControllingFields.add(field));
	}
	if (displayOptions.hide) {
		Object.keys(displayOptions.hide).forEach((field) => allControllingFields.add(field));
	}

	// Build composite key with field=value pairs
	const keyParts: string[] = [];

	for (const fieldName of allControllingFields) {
		let fieldValue: NodeParameterValue;

		if (fieldName === changedFieldName) {
			// Use the provided changed value
			fieldValue = changedFieldValue;
		} else {
			// Get current value - nodeParameters should already be the right context
			fieldValue = nodeParameters[fieldName] || get(nodeParameters, fieldName);
		}

		// Normalize the value for the key
		const normalizedValue =
			fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '';
		keyParts.push(`${fieldName}=${normalizedValue}`);
	}

	const compositeKey = keyParts.sort().join('|');
	console.log(
		`[Shadow] Created composite key: "${compositeKey}" for field controlling fields: [${Array.from(allControllingFields).join(', ')}]`,
	);
	return compositeKey;
};

const saveFieldValue = (
	fieldPath: string,
	controllingFieldValue: string,
	value: NodeParameterValue,
	fullNodeParameters?: INodeParameters,
) => {
	const store = getShadowStore();
	if (!store || !value) return;

	// CRITICAL FIX: Include collection item context in the key
	// For fields like "extractionItems.items[0].tableOptions",
	// we need the key to be unique per collection item
	let storageKey = fieldPath;

	// If this is a collection item field, include the item path in the key
	const collectionMatch = fieldPath.match(/^(.+\[[0-9]+\])/);
	if (collectionMatch) {
		const collectionItemPath = collectionMatch[1]; // e.g., "extractionItems.items[0]"
		storageKey = `${collectionItemPath}::${fieldPath}`;
		console.log(`[Shadow] Using collection-aware key: "${storageKey}" for field "${fieldPath}"`);
	}

	if (!store.has(storageKey)) {
		store.set(storageKey, new Map());
	}

	// For complex objects (like fixedCollection), we need to save all related collection items
	if (typeof value === 'object' && value !== null && fullNodeParameters) {
		const savedData = {
			mainValue: value,
			relatedCollections: {} as Record<string, any>,
		};

		// Look for any collection items that might be related to this field
		// For example, if saving tableOptions, look for tableOptions.* paths
		const baseFieldPath = fieldPath.replace(/\[\d+\]/, ''); // Remove array indices
		const pathPattern = new RegExp(`^${baseFieldPath.replace(/\./g, '\\.')}\\[\\d+\\]`);

		// Find all parameter paths that match this collection pattern
		const findMatchingPaths = (obj: any, currentPath: string = ''): string[] => {
			const paths: string[] = [];

			for (const [key, val] of Object.entries(obj)) {
				const fullPath = currentPath ? `${currentPath}.${key}` : key;

				if (pathPattern.test(fullPath)) {
					paths.push(fullPath);
				}

				if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
					paths.push(...findMatchingPaths(val, fullPath));
				}
			}

			return paths;
		};

		const relatedPaths = findMatchingPaths(fullNodeParameters);

		// Save all related collection items
		for (const relatedPath of relatedPaths) {
			const relatedValue = get(fullNodeParameters, relatedPath);
			if (relatedValue !== undefined) {
				savedData.relatedCollections[relatedPath] = relatedValue;
				console.log(
					`[Shadow] Including related collection item: ${relatedPath} = ${JSON.stringify(relatedValue)}`,
				);
			}
		}

		store.get(storageKey)!.set(controllingFieldValue, savedData);
		console.log(
			`[Shadow] Saved complex field ${fieldPath} with ${Object.keys(savedData.relatedCollections).length} related items for controlling value "${controllingFieldValue}" using key "${storageKey}"`,
		);
	} else {
		// Simple value, save as before
		store.get(storageKey)!.set(controllingFieldValue, value);
		console.log(
			`[Shadow] Saved ${fieldPath} = ${JSON.stringify(value)} for controlling value "${controllingFieldValue}" using key "${storageKey}"`,
		);
	}
};

const restoreFieldValue = (
	storageKey: string,
	controllingFieldValue: string,
	nodeParameters: INodeParameters,
) => {
	const store = getShadowStore();
	if (!store) return null;

	// Extract the actual field path from the storage key
	// Storage key format: "collectionPath::fieldPath" or just "fieldPath"
	const actualFieldPath = storageKey.includes('::') ? storageKey.split('::')[1] : storageKey;

	console.log(
		`[Shadow] Attempting restoration with storage key: "${storageKey}" for field: "${actualFieldPath}"`,
	);

	if (!store.has(storageKey)) return null;

	const fieldStore = store.get(storageKey)!;
	if (!fieldStore.has(controllingFieldValue)) return null;

	const storedData = fieldStore.get(controllingFieldValue);
	const currentValue = get(nodeParameters, actualFieldPath);

	// Only restore if field is currently empty
	if ((currentValue === undefined || currentValue === null || currentValue === '') && storedData) {
		// Check if this is enhanced saved data with related collections
		if (
			typeof storedData === 'object' &&
			storedData !== null &&
			'mainValue' in storedData &&
			'relatedCollections' in storedData
		) {
			// Restore main value
			set(nodeParameters, actualFieldPath, storedData.mainValue);
			console.log(
				`[Shadow] Restored complex field ${actualFieldPath} = ${JSON.stringify(storedData.mainValue)} for controlling value "${controllingFieldValue}" using key "${storageKey}"`,
			);

			// Restore all related collection items
			for (const [relatedPath, relatedValue] of Object.entries(storedData.relatedCollections)) {
				const currentRelatedValue = get(nodeParameters, relatedPath);
				// Only restore if the related field is currently empty
				if (
					currentRelatedValue === undefined ||
					currentRelatedValue === null ||
					currentRelatedValue === ''
				) {
					set(nodeParameters, relatedPath, relatedValue);
					console.log(
						`[Shadow] Restored related collection item ${relatedPath} = ${JSON.stringify(relatedValue)}`,
					);
				}
			}

			return storedData.mainValue;
		} else {
			// Simple value, restore as before
			set(nodeParameters, actualFieldPath, storedData);
			console.log(
				`[Shadow] Restored ${actualFieldPath} = "${storedData}" for controlling value "${controllingFieldValue}" using key "${storageKey}"`,
			);
			return storedData;
		}
	}

	return null;
};

/**
 * N8N's original function to remove parameter values that have invalid options
 * This ensures parameters are cleared when their displayOptions conditions are no longer met
 */
const removeMismatchedOptionValues = (
	nodeType: INodeTypeDescription,
	nodeParameterValues: INodeParameters | null,
	updatedParameter: { name: string; value: NodeParameterValue; oldValue?: NodeParameterValue },
) => {
	if (!nodeParameterValues || !nodeType.properties) return;

	console.log(
		`[DEBUG] removeMismatchedOptionValues called with parameter: "${updatedParameter.name}" = "${updatedParameter.value}"`,
	);

	// Recursively find all properties including those nested in fixedCollection, collection, etc.
	const findAllPropertiesWithPaths = (
		properties: INodeProperties[],
		basePath: string = '',
	): Array<{ property: INodeProperties; path: string }> => {
		const allProps: Array<{ property: INodeProperties; path: string }> = [];

		properties.forEach((prop) => {
			const currentPath = basePath ? `${basePath}.${prop.name}` : prop.name;
			allProps.push({ property: prop, path: currentPath });

			// Handle fixedCollection - look inside options[].values[]
			if (prop.type === 'fixedCollection' && prop.options) {
				prop.options.forEach((option) => {
					if (option.values) {
						const nestedProps = findAllPropertiesWithPaths(option.values, currentPath);
						allProps.push(...nestedProps);
					}
				});
			}

			// Handle collection - look inside options[]
			if (prop.type === 'collection' && prop.options) {
				const nestedProps = findAllPropertiesWithPaths(prop.options, currentPath);
				allProps.push(...nestedProps);
			}
		});

		return allProps;
	};

	// Get all properties including nested ones
	const allProperties = findAllPropertiesWithPaths(nodeType.properties);
	console.log(`[DEBUG] Found ${allProperties.length} total properties including nested ones`);

	// Log some examples of found properties
	allProperties.slice(0, 10).forEach((prop, i) => {
		console.log(`[DEBUG] Property ${i}: "${prop.path}" (type: ${prop.property.type})`);
		if (prop.property.displayOptions) {
			console.log(`[DEBUG]   - Has displayOptions:`, prop.property.displayOptions);
		}
	});

	// Specifically look for filterCriteria related properties
	const filterProperties = allProperties.filter((p) => p.path.includes('filterCriteria'));
	console.log(`[DEBUG] Found ${filterProperties.length} filterCriteria-related properties:`);
	filterProperties.slice(0, 10).forEach((prop, i) => {
		console.log(`[DEBUG] FilterProp ${i}: "${prop.path}" (type: ${prop.property.type})`);
		if (prop.property.displayOptions) {
			console.log(`[DEBUG]   - Has displayOptions:`, prop.property.displayOptions);
		}
	});

	// Only clear fields that are actually dependent on the parameter that changed
	const changedParamName = updatedParameter.name;
	// Extract just the field name from the full path (e.g., "extractionType" from "filterCriteria.criteria[0].extractionType")
	const changedFieldName = changedParamName.split('.').pop() || changedParamName;
	console.log(
		`[DEBUG] Looking for fields that depend on changed parameter: "${changedParamName}" (field name: "${changedFieldName}")`,
	);

	let dependentFieldsFound = 0;

	allProperties.forEach(({ property: prop, path: propPath }) => {
		if (!prop.displayOptions) return;

		// Check if this field depends on the parameter that changed
		// For nested fields, displayOptions use just the field name, not the full path
		const dependsOnChangedParam =
			(prop.displayOptions.show &&
				Object.keys(prop.displayOptions.show).includes(changedFieldName)) ||
			(prop.displayOptions.hide &&
				Object.keys(prop.displayOptions.hide).includes(changedFieldName));

		if (dependsOnChangedParam) {
			dependentFieldsFound++;
			console.log(`[DEBUG] Found dependent field: "${propPath}" depends on "${changedFieldName}"`);
			console.log(`[DEBUG]   - displayOptions:`, prop.displayOptions);

			// CRITICAL FIX: For nested collections, we need to check the field at the same collection item level
			// If the changed parameter is filterCriteria.criteria[0].extractionType,
			// then the dependent field should be filterCriteria.criteria[0].attributeName, not filterCriteria.attributeName
			let actualDependentFieldPath = propPath;

			// Extract the collection item path from the changed parameter
			// E.g., "filterCriteria.criteria[0].extractionType" -> "filterCriteria.criteria[0]"
			const collectionItemMatch = changedParamName.match(/^(.+\[[0-9]+\])\.[^.]+$/);
			if (collectionItemMatch) {
				const collectionItemPath = collectionItemMatch[1]; // "filterCriteria.criteria[0]"

				// If the dependent field path starts with the collection name but isn't at the item level,
				// we need to adjust it to be at the same item level
				const collectionName = collectionItemPath.split('[')[0]; // "filterCriteria.criteria"
				if (
					propPath.startsWith(collectionName.split('.').slice(0, -1).join('.')) &&
					!propPath.includes('[')
				) {
					// Convert "filterCriteria.attributeName" to "filterCriteria.criteria[0].attributeName"
					const fieldName = propPath.split('.').pop(); // "attributeName"
					actualDependentFieldPath = `${collectionItemPath}.${fieldName}`;
					console.log(
						`[DEBUG]   - Adjusted path from "${propPath}" to "${actualDependentFieldPath}"`,
					);
				}
			}

			// Check if this property should be visible with current parameter values
			// CRITICAL FIX: displayParameter needs the updated parameter values to check visibility correctly
			// Create a temporary parameter state that includes the new value
			const tempParameterValues = { ...nodeParameterValues };
			set(tempParameterValues, changedParamName, updatedParameter.value);

			console.log(`[DEBUG]   - Calling displayParameter with:`);
			console.log(
				`[DEBUG]     - tempParameterValues:`,
				JSON.stringify(tempParameterValues, null, 2),
			);
			console.log(`[DEBUG]     - prop.displayOptions:`, prop.displayOptions);
			console.log(
				`[DEBUG]     - Looking for "${Object.keys(prop.displayOptions?.show || prop.displayOptions?.hide || {}).join('", "')}" in tempParameterValues`,
			);

			// For nested collection fields, we need context-aware visibility checking
			let isVisible;
			if (
				(actualDependentFieldPath.includes('.criteria[') &&
					changedParamName.includes('.criteria[')) ||
				(actualDependentFieldPath.includes('.items[') && changedParamName.includes('.items['))
			) {
				// Both fields are in the same collection item - create a context for the specific item
				const collectionMatch = actualDependentFieldPath.match(/^(.+\.(criteria|items)\[\d+\])/);
				if (collectionMatch) {
					const collectionItemPath = collectionMatch[1];
					const collectionItemValues = get(tempParameterValues, collectionItemPath);
					console.log(
						`[DEBUG]   - Using collection context for visibility check at "${collectionItemPath}":`,
						collectionItemValues,
					);

					// Create a temporary property with the collection item as the context
					const contextProp = { ...prop };
					isVisible = displayParameter(
						collectionItemValues || {},
						contextProp,
						node.value,
						nodeType,
					);
				} else {
					isVisible = displayParameter(tempParameterValues, prop, node.value, nodeType);
				}
			} else {
				isVisible = displayParameter(tempParameterValues, prop, node.value, nodeType);
			}

			console.log(
				`[DEBUG]   - isVisible: ${isVisible} (checking with updated ${changedParamName} = ${updatedParameter.value})`,
			);

			if (!isVisible) {
				// Field should be hidden and depends on the changed parameter, clear its value
				// Use the adjusted path for nested fields
				const currentValue = get(nodeParameterValues, actualDependentFieldPath);
				console.log(`[DEBUG]   - currentValue:`, currentValue);

				if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
					// SAVE VALUE TO SHADOW STORE before clearing
					// For complex displayOptions with multiple controlling fields, create a composite key
					const controllingKey = createCompositeKey(
						prop.displayOptions,
						nodeParameterValues,
						changedFieldName,
						updatedParameter.oldValue,
					);
					saveFieldValue(
						actualDependentFieldPath,
						controllingKey,
						currentValue,
						nodeParameterValues,
					);

					unset(nodeParameterValues as object, actualDependentFieldPath);
					console.log(
						`[N8N] Cleared dependent field: ${actualDependentFieldPath} (depends on ${changedFieldName})`,
					);
				}
			} else {
				// Field is visible - check if we should restore a saved value
				const currentValue = get(nodeParameterValues, actualDependentFieldPath);
				console.log(`[DEBUG]   - Field is visible, currentValue:`, currentValue);

				if (currentValue === undefined || currentValue === null || currentValue === '') {
					// For complex displayOptions, create composite key for current state
					// CRITICAL FIX: Use the correct context for creating the composite key
					let contextParameters = tempParameterValues;

					// For nested collection fields, we need to use the collection item context
					if (actualDependentFieldPath.includes('.items[')) {
						const collectionMatch = actualDependentFieldPath.match(/^(.+\.items\[\d+\])/);
						if (collectionMatch) {
							const collectionItemPath = collectionMatch[1];
							contextParameters = get(tempParameterValues, collectionItemPath) || {};
							console.log(
								`[DEBUG]   - Using collection context for restoration at "${collectionItemPath}":`,
								contextParameters,
							);
						}
					}

					const currentControllingKey = createCompositeKey(
						prop.displayOptions,
						{ [changedFieldName]: updatedParameter.value, ...contextParameters },
						changedFieldName,
						updatedParameter.value,
					);

					console.log(
						`[DEBUG]   - Attempting restoration with composite key: "${currentControllingKey}"`,
					);

					// CRITICAL FIX: Use the same collection-aware key logic as saveFieldValue
					// We need to create the collection-aware storage key for restoration
					let storageKeyForRestore = actualDependentFieldPath;
					const collectionMatch = actualDependentFieldPath.match(/^(.+\[[0-9]+\])/);
					if (collectionMatch) {
						const collectionItemPath = collectionMatch[1]; // e.g., "extractionItems.items[0]"
						storageKeyForRestore = `${collectionItemPath}::${actualDependentFieldPath}`;
						console.log(
							`[Shadow] Using collection-aware key for restoration: "${storageKeyForRestore}" for field "${actualDependentFieldPath}"`,
						);
					}

					const restoredValue = restoreFieldValue(
						storageKeyForRestore,
						currentControllingKey,
						nodeParameterValues,
					);
					if (restoredValue) {
						console.log(`[Shadow] Successfully restored value:`, restoredValue);
					} else {
						console.log(`[DEBUG]   - No saved value found for key: "${currentControllingKey}"`);
					}
				}
			}
		}
	});

	console.log(`[DEBUG] Total dependent fields found: ${dependentFieldsFound}`);
};

const valueChanged = (parameterData: IUpdateInformation) => {
	let newValue: NodeParameterValue;

	if (parameterData.hasOwnProperty('value')) {
		// New value is given
		newValue = parameterData.value as string | number;
	} else {
		// Get new value from nodeData where it is set already
		newValue = get(nodeValues.value, parameterData.name) as NodeParameterValue;
	}

	// Save the node name before we commit the change because
	// we need the old name to rename the node properly
	const nodeNameBefore = parameterData.node || node.value?.name;

	if (!nodeNameBefore) {
		return;
	}

	const _node = workflowsStore.getNodeByName(nodeNameBefore);

	if (_node === null) {
		return;
	}

	if (parameterData.name === 'onError') {
		// If that parameter changes, we need to redraw the connections, as the error output may need to be added or removed
		emit('redrawRequired');
	}

	if (parameterData.name === 'name') {
		// Name of node changed so we have to set also the new node name as active

		// Update happens in NodeView so emit event
		const sendData = {
			value: newValue,
			oldValue: nodeNameBefore,
			name: parameterData.name,
		};
		emit('valueChanged', sendData);
	} else if (parameterData.name === 'parameters') {
		const nodeType = nodeTypesStore.getNodeType(_node.type, _node.typeVersion);
		if (!nodeType) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			_node.parameters,
			false,
			false,
			_node,
			nodeType,
		);

		const oldNodeParameters = Object.assign({}, nodeParameters);

		// Copy the data because it is the data of vuex so make sure that
		// we do not edit it directly
		nodeParameters = deepCopy(nodeParameters);

		if (parameterData.value && typeof parameterData.value === 'object') {
			for (const parameterName of Object.keys(parameterData.value)) {
				//@ts-ignore
				newValue = parameterData.value[parameterName];

				// Remove the 'parameters.' from the beginning to just have the
				// actual parameter name
				const parameterPath = parameterName.split('.').slice(1).join('.');

				// Check if the path is supposed to change an array and if so get
				// the needed data like path and index
				const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

				// Apply the new value
				//@ts-ignore
				if (parameterData[parameterName] === undefined && parameterPathArray !== null) {
					// Delete array item
					const path = parameterPathArray[1];
					const index = parameterPathArray[2];
					const data = get(nodeParameters, path);

					if (Array.isArray(data)) {
						data.splice(parseInt(index, 10), 1);
						set(nodeParameters as object, path, data);
					}
				} else {
					if (newValue === undefined) {
						unset(nodeParameters as object, parameterPath);
					} else {
						set(nodeParameters as object, parameterPath, newValue);
					}
				}

				void externalHooks.run('nodeSettings.valueChanged', {
					parameterPath,
					newValue,
					parameters: parameters.value,
					oldNodeParameters,
				});
			}
		}

		// Get the parameters with the now new defaults according to the
		// from the user actually defined parameters
		nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			_node,
			nodeType,
		);

		for (const key of Object.keys(nodeParameters as object)) {
			if (nodeParameters && nodeParameters[key] !== null && nodeParameters[key] !== undefined) {
				setValue(`parameters.${key}`, nodeParameters[key] as string);
			}
		}

		if (nodeParameters) {
			const updateInformation: IUpdateInformation = {
				name: _node.name,
				value: nodeParameters,
			};

			workflowsStore.setNodeParameters(updateInformation);

			nodeHelpers.updateNodeParameterIssuesByName(_node.name);
			nodeHelpers.updateNodeCredentialIssuesByName(_node.name);
		}
	} else if (parameterData.name.startsWith('parameters.')) {
		// A node parameter changed

		const nodeType = nodeTypesStore.getNodeType(_node.type, _node.typeVersion);
		if (!nodeType) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			_node.parameters,
			false,
			false,
			_node,
			nodeType,
		);

		const oldNodeParameters = Object.assign({}, nodeParameters);

		// Copy the data because it is the data of vuex so make sure that
		// we do not edit it directly
		nodeParameters = deepCopy(nodeParameters);

		// Remove the 'parameters.' from the beginning to just have the
		// actual parameter name
		const parameterPath = parameterData.name.split('.').slice(1).join('.');

		// Check if the path is supposed to change an array and if so get
		// the needed data like path and index
		const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

		// Apply the new value
		if (parameterData.value === undefined && parameterPathArray !== null) {
			// Delete array item
			const path = parameterPathArray[1];
			const index = parameterPathArray[2];
			const data = get(nodeParameters, path);

			if (Array.isArray(data)) {
				data.splice(parseInt(index, 10), 1);
				set(nodeParameters as object, path, data);
			}
		} else {
			// CRITICAL: Capture the old value BEFORE updating the parameter
			const oldValue = get(nodeParameters, parameterPath);

			if (newValue === undefined) {
				unset(nodeParameters as object, parameterPath);
			} else {
				set(nodeParameters as object, parameterPath, newValue);
			}

			// If value is updated, remove parameter values that have invalid options
			// so getNodeParameters checks don't fail
			// Pass the old value so the shadow store can save with the correct key
			removeMismatchedOptionValues(nodeType, nodeParameters, {
				name: parameterPath,
				value: newValue,
				oldValue: oldValue, // Add the old value to the function call
			});
		}

		// Get the parameters with the now new defaults according to the
		// from the user actually defined parameters
		nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			_node,
			nodeType,
		);

		if (isToolNode.value) {
			const updatedDescription = NodeHelpers.getUpdatedToolDescription(
				props.nodeType,
				nodeParameters,
				node.value?.parameters,
			);

			if (updatedDescription && nodeParameters) {
				nodeParameters.toolDescription = updatedDescription;
			}
		}

		for (const key of Object.keys(nodeParameters as object)) {
			if (nodeParameters && nodeParameters[key] !== null && nodeParameters[key] !== undefined) {
				setValue(`parameters.${key}`, nodeParameters[key] as string);
			}
		}

		// Update the data in vuex
		const updateInformation: IUpdateInformation = {
			name: _node.name,
			value: nodeParameters,
		};

		const connections = workflowsStore.allConnections;

		const updatedConnections = updateDynamicConnections(_node, connections, parameterData);

		if (updatedConnections) {
			workflowsStore.setConnections(updatedConnections, true);
		}

		workflowsStore.setNodeParameters(updateInformation);

		void externalHooks.run('nodeSettings.valueChanged', {
			parameterPath,
			newValue,
			parameters: parameters.value,
			oldNodeParameters,
		});

		nodeHelpers.updateNodeParameterIssuesByName(_node.name);
		nodeHelpers.updateNodeCredentialIssuesByName(_node.name);
		telemetry.trackNodeParametersValuesChange(nodeType.name, parameterData);
	} else {
		// A property on the node itself changed

		// Update data in settings
		nodeValues.value = {
			...nodeValues.value,
			[parameterData.name]: newValue,
		};

		// Update data in vuex
		const updateInformation = {
			name: _node.name,
			key: parameterData.name,
			value: newValue,
		};

		workflowsStore.setNodeValue(updateInformation);
	}
};

const setHttpNodeParameters = (parameters: CurlToJSONResponse) => {
	try {
		valueChanged({
			node: node.value?.name,
			name: 'parameters',
			value: parameters as unknown as INodeParameters,
		});
	} catch {}
};

const onSwitchSelectedNode = (node: string) => {
	emit('switchSelectedNode', node);
};

const onOpenConnectionNodeCreator = (nodeName: string, connectionType: NodeConnectionType) => {
	emit('openConnectionNodeCreator', nodeName, connectionType);
};

const populateHiddenIssuesSet = () => {
	if (!node.value || !workflowsStore.isNodePristine(node.value.name)) return;
	hiddenIssuesInputs.value.push('credentials');
	parametersNoneSetting.value.forEach((parameter) => {
		hiddenIssuesInputs.value.push(parameter.name);
	});
	workflowsStore.setNodePristine(node.value.name, false);
};

const populateSettings = () => {
	if (isExecutable.value && !isTriggerNode.value) {
		nodeSettings.value.push(
			...([
				{
					displayName: i18n.baseText('nodeSettings.alwaysOutputData.displayName'),
					name: 'alwaysOutputData',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.alwaysOutputData.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.executeOnce.displayName'),
					name: 'executeOnce',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.executeOnce.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.retryOnFail.displayName'),
					name: 'retryOnFail',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.retryOnFail.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.maxTries.displayName'),
					name: 'maxTries',
					type: 'number',
					typeOptions: {
						minValue: 2,
						maxValue: 5,
					},
					default: 3,
					displayOptions: {
						show: {
							retryOnFail: [true],
						},
					},
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.maxTries.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.waitBetweenTries.displayName'),
					name: 'waitBetweenTries',
					type: 'number',
					typeOptions: {
						minValue: 0,
						maxValue: 5000,
					},
					default: 1000,
					displayOptions: {
						show: {
							retryOnFail: [true],
						},
					},
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.waitBetweenTries.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.onError.displayName'),
					name: 'onError',
					type: 'options',
					options: [
						{
							name: i18n.baseText('nodeSettings.onError.options.stopWorkflow.displayName'),
							value: 'stopWorkflow',
							description: i18n.baseText('nodeSettings.onError.options.stopWorkflow.description'),
						},
						{
							name: i18n.baseText('nodeSettings.onError.options.continueRegularOutput.displayName'),
							value: 'continueRegularOutput',
							description: i18n.baseText(
								'nodeSettings.onError.options.continueRegularOutput.description',
							),
						},
						{
							name: i18n.baseText('nodeSettings.onError.options.continueErrorOutput.displayName'),
							value: 'continueErrorOutput',
							description: i18n.baseText(
								'nodeSettings.onError.options.continueErrorOutput.description',
							),
						},
					],
					default: 'stopWorkflow',
					description: i18n.baseText('nodeSettings.onError.description'),
					noDataExpression: true,
				},
			] as INodeProperties[]),
		);
	}
	nodeSettings.value.push(
		...([
			{
				displayName: i18n.baseText('nodeSettings.notes.displayName'),
				name: 'notes',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				noDataExpression: true,
				description: i18n.baseText('nodeSettings.notes.description'),
			},
			{
				displayName: i18n.baseText('nodeSettings.notesInFlow.displayName'),
				name: 'notesInFlow',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: i18n.baseText('nodeSettings.notesInFlow.description'),
			},
		] as INodeProperties[]),
	);
};

const onParameterBlur = (parameterName: string) => {
	hiddenIssuesInputs.value = hiddenIssuesInputs.value.filter((name) => name !== parameterName);
};

const onWorkflowActivate = () => {
	hiddenIssuesInputs.value = [];
	emit('activate');
};

const onNodeExecute = () => {
	hiddenIssuesInputs.value = [];
	subConnections.value?.showNodeInputsIssues();
	emit('execute');
};

const credentialSelected = (updateInformation: INodeUpdatePropertiesInformation) => {
	// Update the values on the node
	workflowsStore.updateNodeProperties(updateInformation);

	const node = workflowsStore.getNodeByName(updateInformation.name);

	if (node) {
		// Update the issues
		nodeHelpers.updateNodeCredentialIssues(node);
	}

	void externalHooks.run('nodeSettings.credentialSelected', { updateInformation });
};

const nameChanged = (name: string) => {
	if (node.value) {
		historyStore.pushCommandToUndo(new RenameNodeCommand(node.value.name, name, Date.now()));
	}
	valueChanged({
		value: name,
		name: 'name',
	});
};

const setNodeValues = () => {
	// No node selected
	if (!node.value) {
		nodeValuesInitialized.value = true;
		return;
	}

	if (props.nodeType !== null) {
		nodeValid.value = true;

		const foundNodeSettings = [];
		if (node.value.color) {
			foundNodeSettings.push('color');
			nodeValues.value = {
				...nodeValues.value,
				color: node.value.color,
			};
		}

		if (node.value.notes) {
			foundNodeSettings.push('notes');
			nodeValues.value = {
				...nodeValues.value,
				notes: node.value.notes,
			};
		}

		if (node.value.alwaysOutputData) {
			foundNodeSettings.push('alwaysOutputData');
			nodeValues.value = {
				...nodeValues.value,
				alwaysOutputData: node.value.alwaysOutputData,
			};
		}

		if (node.value.executeOnce) {
			foundNodeSettings.push('executeOnce');
			nodeValues.value = {
				...nodeValues.value,
				executeOnce: node.value.executeOnce,
			};
		}

		if (node.value.continueOnFail) {
			foundNodeSettings.push('onError');
			nodeValues.value = {
				...nodeValues.value,
				onError: 'continueRegularOutput',
			};
		}

		if (node.value.onError) {
			foundNodeSettings.push('onError');
			nodeValues.value = {
				...nodeValues.value,
				onError: node.value.onError,
			};
		}

		if (node.value.notesInFlow) {
			foundNodeSettings.push('notesInFlow');
			nodeValues.value = {
				...nodeValues.value,
				notesInFlow: node.value.notesInFlow,
			};
		}

		if (node.value.retryOnFail) {
			foundNodeSettings.push('retryOnFail');
			nodeValues.value = {
				...nodeValues.value,
				retryOnFail: node.value.retryOnFail,
			};
		}

		if (node.value.maxTries) {
			foundNodeSettings.push('maxTries');
			nodeValues.value = {
				...nodeValues.value,
				maxTries: node.value.maxTries,
			};
		}

		if (node.value.waitBetweenTries) {
			foundNodeSettings.push('waitBetweenTries');
			nodeValues.value = {
				...nodeValues.value,
				waitBetweenTries: node.value.waitBetweenTries,
			};
		}

		// Set default node settings
		for (const nodeSetting of nodeSettings.value) {
			if (!foundNodeSettings.includes(nodeSetting.name)) {
				// Set default value
				nodeValues.value = {
					...nodeValues.value,
					[nodeSetting.name]: nodeSetting.default,
				};
			}
		}

		nodeValues.value = {
			...nodeValues.value,
			parameters: deepCopy(node.value.parameters),
		};
	} else {
		nodeValid.value = false;
	}

	nodeValuesInitialized.value = true;
};

const onMissingNodeTextClick = (event: MouseEvent) => {
	if ((event.target as Element).localName === 'a') {
		telemetry.track('user clicked cnr browse button', {
			source: 'cnr missing node modal',
		});
	}
};

const onMissingNodeLearnMoreLinkClick = () => {
	telemetry.track('user clicked cnr docs link', {
		source: 'missing node modal source',
		package_name: node.value?.type.split('.')[0],
		node_type: node.value?.type,
	});
};

const onStopExecution = () => {
	emit('stopExecution');
};

const openSettings = () => {
	openPanel.value = 'settings';
};

const onTabSelect = (tab: 'params' | 'settings') => {
	openPanel.value = tab;
};

watch(node, () => {
	setNodeValues();
});

onMounted(() => {
	populateHiddenIssuesSet();
	populateSettings();
	setNodeValues();
	props.eventBus?.on('openSettings', openSettings);
	nodeHelpers.updateNodeParameterIssues(node.value as INodeUi, props.nodeType);
	importCurlEventBus.on('setHttpNodeParameters', setHttpNodeParameters);
	ndvEventBus.on('updateParameterValue', valueChanged);
});

onBeforeUnmount(() => {
	props.eventBus?.off('openSettings', openSettings);
	importCurlEventBus.off('setHttpNodeParameters', setHttpNodeParameters);
	ndvEventBus.off('updateParameterValue', valueChanged);
});

function displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
	if (credentialTypeDescription.displayOptions === undefined) {
		// If it is not defined no need to do a proper check
		return true;
	}

	return (
		!!node.value &&
		nodeHelpers.displayParameter(node.value.parameters, credentialTypeDescription, '', node.value)
	);
}
</script>

<template>
	<div
		:class="{
			'node-settings': true,
			dragging: dragging,
		}"
		@keydown.stop
	>
		<div :class="$style.header">
			<div class="header-side-menu">
				<NodeTitle
					v-if="node"
					class="node-name"
					:model-value="node.name"
					:node-type="nodeType"
					:read-only="isReadOnly"
					@update:model-value="nameChanged"
				></NodeTitle>
				<div v-if="isExecutable">
					<NodeExecuteButton
						v-if="!blockUI && node && nodeValid"
						data-test-id="node-execute-button"
						:node-name="node.name"
						:disabled="outputPanelEditMode.enabled && !isTriggerNode"
						:tooltip="executeButtonTooltip"
						size="small"
						telemetry-source="parameters"
						@execute="onNodeExecute"
						@stop-execution="onStopExecution"
						@value-changed="valueChanged"
					/>
				</div>
			</div>
			<NodeSettingsTabs
				v-if="node && nodeValid"
				:model-value="openPanel"
				:node-type="nodeType"
				:push-ref="pushRef"
				@update:model-value="onTabSelect"
			/>
		</div>
		<div v-if="node && !nodeValid" class="node-is-not-valid">
			<p :class="$style.warningIcon">
				<font-awesome-icon icon="exclamation-triangle" />
			</p>
			<div class="missingNodeTitleContainer mt-s mb-xs">
				<n8n-text size="large" color="text-dark" bold>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.title') }}
				</n8n-text>
			</div>
			<div v-if="isCommunityNode" :class="$style.descriptionContainer">
				<div class="mb-l">
					<i18n-t
						keypath="nodeSettings.communityNodeUnknown.description"
						tag="span"
						@click="onMissingNodeTextClick"
					>
						<template #action>
							<a
								:href="`https://www.npmjs.com/package/${node.type.split('.')[0]}`"
								target="_blank"
								>{{ node.type.split('.')[0] }}</a
							>
						</template>
					</i18n-t>
				</div>
				<n8n-link
					:to="COMMUNITY_NODES_INSTALLATION_DOCS_URL"
					@click="onMissingNodeLearnMoreLinkClick"
				>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.installLink.text') }}
				</n8n-link>
			</div>
			<i18n-t v-else keypath="nodeSettings.nodeTypeUnknown.description" tag="span">
				<template #action>
					<a
						:href="CUSTOM_NODES_DOCS_URL"
						target="_blank"
						v-text="i18n.baseText('nodeSettings.nodeTypeUnknown.description.customNode')"
					/>
				</template>
			</i18n-t>
		</div>
		<div v-if="node && nodeValid" class="node-parameters-wrapper" data-test-id="node-parameters">
			<n8n-notice
				v-if="hasForeignCredential && !isHomeProjectTeam"
				:content="
					i18n.baseText('nodeSettings.hasForeignCredential', {
						interpolate: { owner: credentialOwnerName },
					})
				"
			/>
			<FreeAiCreditsCallout />
			<div v-show="openPanel === 'params'">
				<NodeWebhooks :node="node" :node-type-description="nodeType" />

				<ParameterInputList
					v-if="nodeValuesInitialized"
					:parameters="parametersNoneSetting"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					@value-changed="valueChanged"
					@activate="onWorkflowActivate"
					@parameter-blur="onParameterBlur"
				>
					<NodeCredentials
						:node="node"
						:readonly="isReadOnly"
						:show-all="true"
						:hide-issues="hiddenIssuesInputs.includes('credentials')"
						@credential-selected="credentialSelected"
						@value-changed="valueChanged"
						@blur="onParameterBlur"
					/>
				</ParameterInputList>
				<div v-if="showNoParametersNotice" class="no-parameters">
					<n8n-text>
						{{ i18n.baseText('nodeSettings.thisNodeDoesNotHaveAnyParameters') }}
					</n8n-text>
				</div>

				<div
					v-if="nodeHelpers.isCustomApiCallSelected(nodeValues)"
					class="parameter-item parameter-notice"
					data-test-id="node-parameters-http-notice"
				>
					<n8n-notice
						:content="
							i18n.baseText('nodeSettings.useTheHttpRequestNode', {
								interpolate: { nodeTypeDisplayName: nodeType?.displayName ?? '' },
							})
						"
					/>
				</div>
			</div>
			<div v-show="openPanel === 'settings'">
				<ParameterInputList
					:parameters="parametersSetting"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hide-delete="true"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<ParameterInputList
					:parameters="nodeSettings"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path=""
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<div class="node-version" data-test-id="node-version">
					{{
						i18n.baseText('nodeSettings.nodeVersion', {
							interpolate: {
								node: nodeType?.displayName as string,
								version: (node.typeVersion ?? latestVersion).toString(),
							},
						})
					}}
					<span>({{ nodeVersionTag }})</span>
				</div>
			</div>
		</div>
		<NDVSubConnections
			v-if="node"
			ref="subConnections"
			:root-node="node"
			@switch-selected-node="onSwitchSelectedNode"
			@open-connection-node-creator="onOpenConnectionNodeCreator"
		/>
		<n8n-block-ui :show="blockUI" />
	</div>
</template>

<style lang="scss" module>
.header {
	background-color: var(--color-background-base);
}

.warningIcon {
	color: var(--color-text-lighter);
	font-size: var(--font-size-2xl);
}

.descriptionContainer {
	display: flex;
	flex-direction: column;
}
</style>

<style lang="scss" scoped>
.node-settings {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color-background-xlight);
	height: 100%;
	width: 100%;

	.no-parameters {
		margin-top: var(--spacing-xs);
	}

	.header-side-menu {
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-s);
		font-size: var(--font-size-l);
		display: flex;
		justify-content: space-between;

		.node-name {
			padding-top: var(--spacing-5xs);
		}
	}

	.node-is-not-valid {
		height: 75%;
		padding: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		line-height: var(--font-line-height-regular);
	}

	.node-parameters-wrapper {
		overflow-y: auto;
		padding: 0 var(--spacing-m) var(--spacing-l) var(--spacing-m);
		flex-grow: 1;
	}

	&.dragging {
		border-color: var(--color-primary);
		box-shadow: 0px 6px 16px rgba(255, 74, 51, 0.15);
	}
}

.parameter-content {
	font-size: 0.9em;
	margin-right: -15px;
	margin-left: -15px;
	input {
		width: calc(100% - 35px);
		padding: 5px;
	}
	select {
		width: calc(100% - 20px);
		padding: 5px;
	}

	&:before {
		display: table;
		content: ' ';
		position: relative;
		box-sizing: border-box;
		clear: both;
	}
}

.parameter-wrapper {
	padding: 0 1em;
}

.color-reset-button-wrapper {
	position: relative;
}
.color-reset-button {
	position: absolute;
	right: 7px;
	top: -25px;
}

.node-version {
	border-top: var(--border-base);
	font-size: var(--font-size-xs);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs) 0 var(--spacing-2xs) 0;
	color: var(--color-text-light);
}

.parameter-value {
	input.expression {
		border-style: dashed;
		border-color: #ff9600;
		display: inline-block;
		position: relative;
		width: 100%;
		box-sizing: border-box;
		background-color: #793300;
	}
}
</style>
