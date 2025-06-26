import type {
	FieldType,
	IDataObject,
	INode,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	ResourceMapperTypeOptions,
} from 'n8n-workflow';
import {
	ExpressionError,
	isResourceMapperValue,
	NodeHelpers,
	validateFieldType,
} from 'n8n-workflow';

import type { ExtendedValidationResult } from '@/interfaces';

const validateResourceMapperValue = (
	parameterName: string,
	paramValues: { [key: string]: unknown },
	node: INode,
	resourceMapperTypeOptions?: ResourceMapperTypeOptions,
): ExtendedValidationResult => {
	const result: ExtendedValidationResult = { valid: true, newValue: paramValues };
	const skipRequiredCheck = resourceMapperTypeOptions?.mode !== 'add';
	const enableTypeValidationOptions = Boolean(resourceMapperTypeOptions?.showTypeConversionOptions);
	const paramNameParts = parameterName.split('.');
	if (paramNameParts.length !== 2) {
		return result;
	}
	const resourceMapperParamName = paramNameParts[0];
	const resourceMapperField = node.parameters[resourceMapperParamName];
	if (!resourceMapperField || !isResourceMapperValue(resourceMapperField)) {
		return result;
	}
	const schema = resourceMapperField.schema;
	const paramValueNames = Object.keys(paramValues);
	for (let i = 0; i < paramValueNames.length; i++) {
		const key = paramValueNames[i];
		const resolvedValue = paramValues[key];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const schemaEntry = schema.find((s) => s.id === key);

		if (
			!skipRequiredCheck &&
			schemaEntry?.required === true &&
			schemaEntry.type !== 'boolean' &&
			(resolvedValue === undefined || resolvedValue === null)
		) {
			return {
				valid: false,
				errorMessage: `The value "${String(key)}" is required but not set`,
				fieldName: key,
			};
		}

		if (schemaEntry?.type) {
			const validationResult = validateFieldType(key, resolvedValue, schemaEntry.type, {
				valueOptions: schemaEntry.options,
				strict: enableTypeValidationOptions && !resourceMapperField.attemptToConvertTypes,
				parseStrings: enableTypeValidationOptions && resourceMapperField.convertFieldsToString,
			});

			if (!validationResult.valid) {
				return { ...validationResult, fieldName: key };
			} else {
				// If it's valid, set the casted value
				paramValues[key] = validationResult.newValue;
			}
		}
	}
	return result;
};

const validateCollection = (
	node: INode,
	runIndex: number,
	itemIndex: number,
	propertyDescription: INodeProperties,
	parameterPath: string[],
	validationResult: ExtendedValidationResult,
): ExtendedValidationResult => {
	if (process.env.N8N_LOG_LEVEL === 'debug') {
		console.log(
			`🔍 COLLECTION_DEBUG [${node.name}]: Validating collection "${propertyDescription.name}"`,
		);
		console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Parameter path:`, parameterPath);
	}

	let nestedDescriptions: INodeProperties[] | undefined;

	if (propertyDescription.type === 'fixedCollection') {
		// Extract collection name from path, handling array notation like "items[0]" -> "items"
		const collectionName = parameterPath[1]?.split('[')[0] || parameterPath[1];
		nestedDescriptions = (propertyDescription.options as INodePropertyCollection[]).find(
			(entry) => entry.name === collectionName,
		)?.values;
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 COLLECTION_DEBUG [${node.name}]: FixedCollection - looking for "${parameterPath[1]}" -> collection name: "${collectionName}"`,
			);
		}
	}

	if (propertyDescription.type === 'collection') {
		nestedDescriptions = propertyDescription.options as INodeProperties[];
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Collection - using direct options`);
		}
	}

	if (!nestedDescriptions) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(`🔍 COLLECTION_DEBUG [${node.name}]: No nested descriptions found`);
		}
		return validationResult;
	}

	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(
			`🔍 COLLECTION_DEBUG [${node.name}]: Found ${nestedDescriptions.length} nested descriptions`,
		);
	}

	const validationMap: {
		[key: string]: { type: FieldType; displayName: string; options?: INodePropertyOptions[] };
	} = {};

	for (const prop of nestedDescriptions) {
		if (!prop.validateType || prop.ignoreValidationDuringExecution) continue;

		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 COLLECTION_DEBUG [${node.name}]: Adding to validation map: "${prop.name}" (${prop.validateType})`,
			);
		}
		validationMap[prop.name] = {
			type: prop.validateType,
			displayName: prop.displayName,
			options:
				prop.validateType === 'options' ? (prop.options as INodePropertyOptions[]) : undefined,
		};

		if (
			prop.validateType === 'options' &&
			(process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development')
		) {
			console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Options for "${prop.name}":`, prop.options);
		}
	}

	if (!Object.keys(validationMap).length) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 COLLECTION_DEBUG [${node.name}]: No validation map entries - skipping validation`,
			);
		}
		return validationResult;
	}

	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Validation map:`, Object.keys(validationMap));
	}

	if (validationResult.valid) {
		const valuesToValidate = Array.isArray(validationResult.newValue)
			? (validationResult.newValue as IDataObject[])
			: [validationResult.newValue as IDataObject];

		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 COLLECTION_DEBUG [${node.name}]: Validating ${valuesToValidate.length} value(s)`,
			);
		}

		for (let i = 0; i < valuesToValidate.length; i++) {
			const value = valuesToValidate[i];
			if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
				console.log(
					`🔍 COLLECTION_DEBUG [${node.name}]: Validating item ${i}:`,
					JSON.stringify(value, null, 2),
				);
			}

			for (const key of Object.keys(value)) {
				if (!validationMap[key]) {
					if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
						console.log(
							`🔍 COLLECTION_DEBUG [${node.name}]: Skipping "${key}" - not in validation map`,
						);
					}
					continue;
				}

				if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
					console.log(
						`🔍 COLLECTION_DEBUG [${node.name}]: Validating field "${key}" with value:`,
						JSON.stringify(value[key], null, 2),
					);
					console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Field type: ${validationMap[key].type}`);
				}

				const fieldValidationResult = validateFieldType(key, value[key], validationMap[key].type, {
					valueOptions: validationMap[key].options,
				});

				if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
					console.log(
						`🔍 COLLECTION_DEBUG [${node.name}]: Field validation result for "${key}":`,
						fieldValidationResult,
					);
				}

				if (!fieldValidationResult.valid) {
					if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
						console.log(
							`🔍 COLLECTION_DEBUG [${node.name}]: ❌ FIELD VALIDATION FAILED for "${key}"`,
						);
						console.log(
							`🔍 COLLECTION_DEBUG [${node.name}]: Error:`,
							fieldValidationResult.errorMessage,
						);
					}
					throw new ExpressionError(
						`Invalid input for field '${validationMap[key].displayName}' inside '${propertyDescription.displayName}' in [item ${itemIndex}]`,
						{
							description: fieldValidationResult.errorMessage,
							runIndex,
							itemIndex,
							nodeCause: node.name,
						},
					);
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				value[key] = fieldValidationResult.newValue;
				if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
					console.log(
						`🔍 COLLECTION_DEBUG [${node.name}]: ✅ Field "${key}" validated successfully`,
					);
				}
			}
		}
	}

	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(`🔍 COLLECTION_DEBUG [${node.name}]: Collection validation completed successfully`);
	}
	return validationResult;
};

export const validateValueAgainstSchema = (
	node: INode,
	nodeType: INodeType,
	parameterValue: string | number | boolean | object | null | undefined,
	parameterName: string,
	runIndex: number,
	itemIndex: number,
) => {
	// 🔍 DEBUG: Log validation entry (only in debug mode)
	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(`🔍 VALIDATION_DEBUG [${node.name}]: Validating "${parameterName}"`);
		console.log(
			`🔍 VALIDATION_DEBUG [${node.name}]: Parameter value:`,
			JSON.stringify(parameterValue, null, 2),
		);

		// 🔍 NEW DEBUG: Check original parameter value from node.parameters to see if it was an expression
		const originalParameterValue = node.parameters[parameterName.split('.')[0]];
		console.log(
			`🔍 VALIDATION_DEBUG [${node.name}]: Original parameter value:`,
			JSON.stringify(originalParameterValue, null, 2),
		);

		// Check if original value was an expression
		const originalValueStr =
			typeof originalParameterValue === 'string'
				? originalParameterValue
				: originalParameterValue != null
					? JSON.stringify(originalParameterValue)
					: '';
		const wasOriginallyExpression =
			originalValueStr.includes('{{') || originalValueStr.includes('=');
		console.log(
			`🔍 VALIDATION_DEBUG [${node.name}]: Was originally expression:`,
			wasOriginallyExpression,
		);
	}

	const parameterPath = parameterName.split('.');

	const propertyDescription = nodeType.description.properties.find(
		(prop) =>
			parameterPath[0] === prop.name &&
			NodeHelpers.displayParameter(node.parameters, prop, node, nodeType.description),
	);

	if (!propertyDescription) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: No property description found for "${parameterName}"`,
			);
		}
		return parameterValue;
	}

	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(`🔍 VALIDATION_DEBUG [${node.name}]: Property description:`, {
			name: propertyDescription.name,
			type: propertyDescription.type,
			validateType: propertyDescription.validateType,
			ignoreValidationDuringExecution: propertyDescription.ignoreValidationDuringExecution,
		});
	}

	let validationResult: ExtendedValidationResult = { valid: true, newValue: parameterValue };

	if (
		parameterPath.length === 1 &&
		propertyDescription.validateType &&
		!propertyDescription.ignoreValidationDuringExecution
	) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: Direct field validation for "${parameterName}"`,
			);
		}
		validationResult = validateFieldType(
			parameterName,
			parameterValue,
			propertyDescription.validateType,
		);
	} else if (
		propertyDescription.type === 'resourceMapper' &&
		parameterPath[1] === 'value' &&
		typeof parameterValue === 'object'
	) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: Resource mapper validation for "${parameterName}"`,
			);
		}
		validationResult = validateResourceMapperValue(
			parameterName,
			parameterValue as { [key: string]: unknown },
			node,
			propertyDescription.typeOptions?.resourceMapper,
		);
	} else if (['fixedCollection', 'collection'].includes(propertyDescription.type)) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: Collection validation for "${parameterName}"`,
			);
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: Collection type: ${propertyDescription.type}`,
			);
			console.log(`🔍 VALIDATION_DEBUG [${node.name}]: Parameter path:`, parameterPath);
		}
		validationResult = validateCollection(
			node,
			runIndex,
			itemIndex,
			propertyDescription,
			parameterPath,
			validationResult,
		);
	} else {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: No validation applied for "${parameterName}"`,
			);
		}
	}

	if (!validationResult.valid) {
		if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
			console.log(`🔍 VALIDATION_DEBUG [${node.name}]: VALIDATION FAILED for "${parameterName}"`);
			console.log(
				`🔍 VALIDATION_DEBUG [${node.name}]: Error message:`,
				validationResult.errorMessage,
			);
		}
		throw new ExpressionError(
			`Invalid input for '${
				validationResult.fieldName
					? String(validationResult.fieldName)
					: propertyDescription.displayName
			}' [item ${itemIndex}]`,
			{
				description: validationResult.errorMessage,
				runIndex,
				itemIndex,
				nodeCause: node.name,
			},
		);
	}

	if (process.env.N8N_LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development') {
		console.log(`🔍 VALIDATION_DEBUG [${node.name}]: Validation passed for "${parameterName}"`);
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return validationResult.newValue;
};
