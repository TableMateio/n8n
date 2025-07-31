import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	dropboxApiRequest,
	dropboxpiRequestAllItems,
	getCredentials,
	getRootDirectory,
	simplify,
} from './GenericFunctions';

export class Dropbox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dropbox',
		name: 'dropbox',
		icon: 'file:dropbox.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Dropbox',
		defaults: {
			name: 'Dropbox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'dropboxApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'dropboxOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'Means of authenticating with the service',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'Search',
						value: 'search',
					},
				],
				default: 'file',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a file',
						action: 'Copy a file',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a file',
						action: 'Delete a file',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download a file',
						action: 'Download a file',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a file',
						action: 'Move a file',
					},
					{
						name: 'Upload',
						value: 'upload',
						description: 'Upload a file',
						action: 'Upload a file',
					},
				],
				default: 'upload',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['folder'],
					},
				},
				options: [
					{
						name: 'Copy',
						value: 'copy',
						description: 'Copy a folder',
						action: 'Copy a folder',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a folder',
						action: 'Create a folder',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a folder',
						action: 'Delete a folder',
					},
					{
						name: 'List',
						value: 'list',
						description: 'Return the files and folders in a given folder',
						action: 'List a folder',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move a folder',
						action: 'Move a folder',
					},
				],
				default: 'create',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['search'],
					},
				},
				options: [
					{
						name: 'Query',
						value: 'query',
						action: 'Query',
					},
				],
				default: 'query',
			},

			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file/folder:copy
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/original.txt',
				description: 'The path of file or folder to copy',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['copy'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/copy.txt',
				description: 'The destination path of file or folder',
			},

			// ----------------------------------
			//         file/folder:delete
			// ----------------------------------
			{
				displayName: 'Delete Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The path to delete. Can be a single file or a whole folder.',
			},

			// ----------------------------------
			//         file/folder:move
			// ----------------------------------
			{
				displayName: 'From Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/old_name.txt',
				description: 'The path of file or folder to move',
			},
			{
				displayName: 'To Path',
				name: 'toPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['move'],
						resource: ['file', 'folder'],
					},
				},
				placeholder: '/invoices/new_name.txt',
				description: 'The new path of file or folder',
			},

			// ----------------------------------
			//         file:download
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description: 'The file path of the file to download. Has to contain the full path.',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						operation: ['download'],
						resource: ['file'],
					},
				},
				hint: 'The name of the output binary field to put the file in',
			},

			// ----------------------------------
			//         file:upload
			// ----------------------------------
			{
				displayName: 'File Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				placeholder: '/invoices/2019/invoice_1.pdf',
				description:
					'The file path of the file to upload. Has to contain the full path. The parent folder has to exist. Existing files get overwritten.',
			},
			{
				displayName: 'Binary File',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				description: 'Whether the data to upload should be taken from binary field',
			},
			{
				displayName: 'File Content',
				name: 'fileContent',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
						binaryData: [false],
					},
				},
				placeholder: '',
				description: 'The text content of the file to upload',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
						binaryData: [true],
					},
				},
				placeholder: '',
				hint: 'The name of the input binary field containing the file to be uploaded',
			},
			{
				displayName: 'Create Shareable Link',
				name: 'createShareableLink',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
					},
				},
				description: 'Whether to create a shareable link for the uploaded file',
			},
			{
				displayName: 'Link Type',
				name: 'linkType',
				type: 'options',
				options: [
					{
						name: 'Preview Page',
						value: 'preview',
						description: 'Link opens a preview page where users can view and download the file',
					},
					{
						name: 'Direct Download',
						value: 'direct',
						description: 'Link directly downloads the file when clicked',
					},
				],
				default: 'preview',
				displayOptions: {
					show: {
						operation: ['upload'],
						resource: ['file'],
						createShareableLink: [true],
					},
				},
				description: 'Type of shareable link to create',
			},

			// ----------------------------------
			//         search:query
			// ----------------------------------
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['query'],
						resource: ['search'],
					},
				},
				description:
					'The string to search for. May match across multiple fields based on the request arguments.',
			},
			{
				displayName: 'File Status',
				name: 'fileStatus',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
				],
				default: 'active',
				displayOptions: {
					show: {
						operation: ['query'],
						resource: ['search'],
					},
				},
				description:
					'The string to search for. May match across multiple fields based on the request arguments.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['query'],
						resource: ['search'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['search'],
						operation: ['query'],
						returnAll: [false],
					},
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['query'],
						resource: ['search'],
					},
				},
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['search'],
						operation: ['query'],
					},
				},
				options: [
					{
						displayName: 'File Categories',
						name: 'file_categories',
						type: 'multiOptions',
						options: [
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Audio (mp3, qav, mid, etc.)',
								value: 'audio',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Document (doc, docx, txt, etc.)',
								value: 'document',
							},
							{
								name: 'Dropbox Paper',
								value: 'paper',
							},
							{
								name: 'Folder',
								value: 'folder',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Image (jpg, png, gif, etc.)',
								value: 'image',
							},
							{
								name: 'Other',
								value: 'other',
							},
							{
								name: 'PDF',
								value: 'pdf',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Presentation (ppt, pptx, key, etc.)',
								value: 'presentation',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Spreadsheet (xlsx, xls, csv, etc.)',
								value: 'spreadsheet',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Video (avi, wmv, mp4, etc.)',
								value: 'video',
							},
						],
						default: [],
					},
					{
						displayName: 'File Extensions',
						name: 'file_extensions',
						type: 'string',
						default: '',
						description:
							'Multiple file extensions can be set separated by comma. Example: jpg,pdf.',
					},
					{
						displayName: 'Folder',
						name: 'path',
						type: 'string',
						default: '',
						description: 'If this field is not specified, this module searches the entire Dropbox',
					},
				],
			},

			// ----------------------------------
			//         folder
			// ----------------------------------

			// ----------------------------------
			//         folder:create
			// ----------------------------------
			{
				displayName: 'Folder',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019',
				description: 'The folder to create. The parent folder has to exist.',
			},

			// ----------------------------------
			//         folder:list
			// ----------------------------------
			{
				displayName: 'Folder Path',
				name: 'path',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['folder'],
					},
				},
				placeholder: '/invoices/2019/',
				description: 'The path of which to list the content',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['list'],
						resource: ['folder'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['list'],
						returnAll: [false],
					},
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['folder'],
						operation: ['list'],
					},
				},
				options: [
					{
						displayName: 'Include Deleted',
						name: 'include_deleted',
						type: 'boolean',
						default: false,
						description:
							'Whether the results will include entries for files and folders that used to exist but were deleted. The default for this field is False.',
					},
					{
						displayName: 'Include Shared Members',
						name: 'include_has_explicit_shared_members',
						type: 'boolean',
						default: false,
						description:
							'Whether the results will include a flag for each file indicating whether or not that file has any explicit members. The default for this field is False.',
					},
					{
						displayName: 'Include Mounted Folders',
						name: 'include_mounted_folders',
						type: 'boolean',
						default: true,
						description:
							'Whether the results will include entries under mounted folders which includes app folder, shared folder and team folder. The default for this field is True.',
					},
					{
						displayName: 'Include Non Downloadable Files',
						name: 'include_non_downloadable_files',
						type: 'boolean',
						default: true,
						description:
							'Whether to include files that are not downloadable, i.e. Google Docs. The default for this field is True.',
					},
					{
						displayName: 'Recursive',
						name: 'recursive',
						type: 'boolean',
						default: false,
						description:
							'Whether the list folder operation will be applied recursively to all subfolders and the response will contain contents of all subfolders. The default for this field is False.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let endpoint = '';
		let requestMethod: IHttpRequestMethods = 'GET';
		let returnAll = false;
		let property = '';
		let body: IDataObject | Buffer;
		let options;
		const query: IDataObject = {};

		let headers: IDataObject = {};
		let simple = false;

		const { accessType } = await getCredentials.call(this);

		if (accessType === 'full') {
			// get the root directory to set it as the default for all operations
			const {
				root_info: { root_namespace_id },
			} = await getRootDirectory.call(this);

			headers = {
				'dropbox-api-path-root': JSON.stringify({
					'.tag': 'root',
					root: root_namespace_id,
				}),
			};
		}

		for (let i = 0; i < items.length; i++) {
			try {
				body = {};

				if (resource === 'file') {
					if (operation === 'download') {
						// ----------------------------------
						//         download
						// ----------------------------------

						requestMethod = 'POST';

						query.arg = JSON.stringify({
							path: this.getNodeParameter('path', i) as string,
						});

						endpoint = 'https://content.dropboxapi.com/2/files/download';
					} else if (operation === 'upload') {
						// ----------------------------------
						//         upload
						// ----------------------------------

						requestMethod = 'POST';
						headers['Content-Type'] = 'application/octet-stream';

						query.arg = JSON.stringify({
							mode: 'overwrite',
							path: this.getNodeParameter('path', i) as string,
						});

						endpoint = 'https://content.dropboxapi.com/2/files/upload';

						options = { json: false };

						if (this.getNodeParameter('binaryData', i)) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							this.helpers.assertBinaryData(i, binaryPropertyName);
							body = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						} else {
							// Is text file
							body = Buffer.from(this.getNodeParameter('fileContent', i) as string, 'utf8');
						}
					}
				} else if (resource === 'folder') {
					if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						body = {
							path: this.getNodeParameter('path', i) as string,
						};

						endpoint = 'https://api.dropboxapi.com/2/files/create_folder_v2';
					} else if (operation === 'list') {
						// ----------------------------------
						//         list
						// ----------------------------------

						returnAll = this.getNodeParameter('returnAll', 0);

						const filters = this.getNodeParameter('filters', i);

						property = 'entries';

						requestMethod = 'POST';
						body = {
							path: this.getNodeParameter('path', i) as string,
							limit: 1000,
						};

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							body.limit = limit;
						}

						Object.assign(body, filters);

						endpoint = 'https://api.dropboxapi.com/2/files/list_folder';
					}
				} else if (resource === 'search') {
					if (operation === 'query') {
						// ----------------------------------
						//         query
						// ----------------------------------

						returnAll = this.getNodeParameter('returnAll', 0);

						simple = this.getNodeParameter('simple', 0) as boolean;

						const filters = this.getNodeParameter('filters', i);

						property = 'matches';

						requestMethod = 'POST';
						body = {
							query: this.getNodeParameter('query', i) as string,
							options: {
								filename_only: true,
							},
						};

						if (filters.file_extensions) {
							filters.file_extensions = (filters.file_extensions as string).split(',');
						}

						Object.assign(body.options!, filters);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							Object.assign(body.options!, { max_results: limit });
						}

						endpoint = 'https://api.dropboxapi.com/2/files/search_v2';
					}
				}
				if (['file', 'folder', 'search'].includes(resource)) {
					if (operation === 'copy') {
						// ----------------------------------
						//         copy
						// ----------------------------------

						requestMethod = 'POST';
						body = {
							from_path: this.getNodeParameter('path', i) as string,
							to_path: this.getNodeParameter('toPath', i) as string,
						};

						endpoint = 'https://api.dropboxapi.com/2/files/copy_v2';
					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'POST';
						body = {
							path: this.getNodeParameter('path', i) as string,
						};

						endpoint = 'https://api.dropboxapi.com/2/files/delete_v2';
					} else if (operation === 'move') {
						// ----------------------------------
						//         move
						// ----------------------------------

						requestMethod = 'POST';
						body = {
							from_path: this.getNodeParameter('path', i) as string,
							to_path: this.getNodeParameter('toPath', i) as string,
						};

						endpoint = 'https://api.dropboxapi.com/2/files/move_v2';
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				if (resource === 'file' && operation === 'download') {
					// Return the data as a buffer
					options = { encoding: null };
				}

				let responseData;

				if (returnAll) {
					responseData = await dropboxpiRequestAllItems.call(
						this,
						property,
						requestMethod,
						endpoint,
						body,
						query,
						headers,
					);
				} else {
					responseData = await dropboxApiRequest.call(
						this,
						requestMethod,
						endpoint,
						body,
						query,
						headers,
						options,
					);
				}

				if (resource === 'file' && operation === 'upload') {
					const data = JSON.parse(responseData as string);

					// Check if user wants to create a shareable link
					const createShareableLink = this.getNodeParameter('createShareableLink', i) as boolean;

					if (createShareableLink) {
						try {
							const linkType = this.getNodeParameter('linkType', i) as string;
							// Use file ID for more precise targeting (avoids folder link issues)
							const fileId = data.id;
							const filePath = data.path_display || data.path_lower;
							let sharedLinkResponse;

							// Create clean headers for sharing API calls (remove Content-Type from upload)
							const sharingHeaders = { ...headers };
							delete sharingHeaders['Content-Type']; // Remove octet-stream header from upload

							console.log('🔗 [DEBUG] Creating shareable link for:', { fileId, filePath });

							// First, try to list existing shared links for this file (use file ID)
							try {
								const existingLinksResponse = await dropboxApiRequest.call(
									this,
									'POST',
									'https://api.dropboxapi.com/2/sharing/list_shared_links',
									{ path: fileId },
									{},
									sharingHeaders,
								);

								console.log('🔗 [DEBUG] Existing links response:', existingLinksResponse);

								// Check if we have folder links that we can use to construct file URLs
								if (existingLinksResponse.links && existingLinksResponse.links.length > 0) {
									const fileLinks = existingLinksResponse.links.filter(
										(link) => link['.tag'] === 'file',
									);
									const folderLinks = existingLinksResponse.links.filter(
										(link) => link['.tag'] === 'folder',
									);

									if (fileLinks.length > 0) {
										sharedLinkResponse = fileLinks[0];
										console.log('🔗 [DEBUG] Using existing FILE link:', sharedLinkResponse.url);
									} else if (folderLinks.length > 0) {
										// Try to construct file URL from folder sharing pattern
										const folderLink = folderLinks[0];
										console.log(
											'🔗 [DEBUG] Found shared folder, attempting to construct file URL...',
										);
										console.log('🔗 [DEBUG] Folder URL:', folderLink.url);

										// Try to use folder's sharing structure for the file
										const fileName = data.name;
										const folderUrl = folderLink.url;

										// Extract the base sharing info from folder URL
										if (folderUrl.includes('rlkey=')) {
											// Attempt to construct a file URL using folder's sharing credentials
											// This is experimental - we'll see if it works
											try {
												const urlParts = folderUrl.split('/scl/fo/');
												if (urlParts.length === 2) {
													const [baseUrl, pathAndQuery] = urlParts;
													const [folderToken, queryString] = pathAndQuery.split('?');

													// Try constructing a file URL pattern
													const constructedUrl = `${baseUrl}/scl/fi/${folderToken}/${fileName}?${queryString}`;
													console.log(
														'🔗 [DEBUG] Attempting constructed file URL:',
														constructedUrl,
													);

													sharedLinkResponse = {
														url: constructedUrl,
														'.tag': 'file',
													};
												}
											} catch (constructError) {
												console.log(
													'🔗 [DEBUG] Could not construct file URL, will try creating new link...',
												);
											}
										}

										if (!sharedLinkResponse) {
											console.log(
												'🔗 [DEBUG] Could not use folder link, creating new file link...',
											);
										}
									} else {
										console.log('🔗 [DEBUG] No existing links found, creating new file link...');
									}
								}
							} catch (listError) {
								console.log('🔗 [DEBUG] List links failed:', listError.message);
								// Continue to create new link if listing fails
							}

							// If no existing file link found, create a new one
							if (!sharedLinkResponse) {
								// Try legacy API first (simpler authorization requirements)
								try {
									console.log('🔗 [DEBUG] Trying legacy create_shared_link API first...');
									sharedLinkResponse = await dropboxApiRequest.call(
										this,
										'POST',
										'https://api.dropboxapi.com/2/sharing/create_shared_link',
										{ path: fileId },
										{},
										sharingHeaders,
									);
									console.log(
										'🔗 [DEBUG] ✅ Legacy API worked! Created link:',
										sharedLinkResponse.url,
									);
								} catch (legacyError) {
									console.log(
										'🔗 [DEBUG] Legacy API failed:',
										legacyError.message,
										'- trying modern API...',
									);
									// If legacy fails, try modern API
									try {
										console.log('🔗 [DEBUG] Trying modern create_shared_link_with_settings...');
										sharedLinkResponse = await dropboxApiRequest.call(
											this,
											'POST',
											'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
											{ path: fileId },
											{},
											sharingHeaders,
										);
										console.log(
											'🔗 [DEBUG] ✅ Modern API worked! Created link:',
											sharedLinkResponse.url,
										);
									} catch (modernError) {
										console.log(
											'🔗 [DEBUG] Both APIs failed with file ID. Trying with file path as last resort...',
										);
										// Last resort: try with file path instead of file ID
										try {
											sharedLinkResponse = await dropboxApiRequest.call(
												this,
												'POST',
												'https://api.dropboxapi.com/2/sharing/create_shared_link',
												{ path: filePath },
												{},
												sharingHeaders,
											);
											console.log(
												'🔗 [DEBUG] ✅ Path-based API worked! Created link:',
												sharedLinkResponse.url,
											);
										} catch (pathError) {
											console.log(
												'🔗 [DEBUG] All attempts failed. File ID errors - Legacy:',
												legacyError.message,
												'Modern:',
												modernError.message,
												'Path:',
												pathError.message,
											);
											throw pathError;
										}
									}
								}
							}

							// Final validation: ensure we got a file link, not a folder link
							if (
								sharedLinkResponse &&
								sharedLinkResponse.url &&
								sharedLinkResponse.url.includes('/scl/fo/')
							) {
								console.log(
									'⚠️ [DEBUG] WARNING: Got folder link instead of file link. Forcing new file link creation...',
								);
								try {
									// Force create a new file-specific link by skipping existing links
									sharedLinkResponse = await dropboxApiRequest.call(
										this,
										'POST',
										'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
										{
											path: fileId,
											settings: {
												access: 'viewer',
												allow_download: true,
												audience: 'public',
												requested_visibility: 'public',
											},
										},
										{},
										sharingHeaders,
									);
									console.log(
										'✅ [DEBUG] Successfully created file-specific link:',
										sharedLinkResponse.url,
									);
								} catch (forceError) {
									console.log('🔗 [DEBUG] Could not force create file link:', forceError.message);
									// Continue with the folder link as fallback
								}
							}

							// Modify URL based on link type preference
							let shareableUrl = sharedLinkResponse.url;
							if (linkType === 'direct') {
								// For new Dropbox link architecture (/scl/), ensure we preserve rlkey when changing dl parameter
								if (shareableUrl.includes('rlkey=')) {
									// New link format: change dl=0 to dl=1 while preserving rlkey
									shareableUrl = shareableUrl.replace('dl=0', 'dl=1');
								} else {
									// Legacy link format: change dl=0 to dl=1
									shareableUrl = shareableUrl.replace('dl=0', 'dl=1');
								}
							}

							console.log('🔗 [DEBUG] Final shareable URL:', shareableUrl);

							// Extract filename from the path
							const filename = data.name || data.path_display?.split('/').pop() || 'file';

							// Add shareable link to the response data
							data.shareable_url = shareableUrl;
							data.link_type = linkType;

							// Add structured URL object for easy access
							data.url_object = {
								url: shareableUrl,
								filename: filename,
							};
						} catch (linkError) {
							console.log('🔗 [DEBUG] Final catch - sharing failed:', linkError.message);
							// Check if it's a scope permission error and provide helpful message
							if (linkError.message && linkError.message.includes('sharing.')) {
								data.shareable_url_error = `Failed to create shareable link: Missing Dropbox app permissions. Please enable 'sharing.read' and 'sharing.write' scopes in your Dropbox App Console, then re-authenticate this connection.`;
							} else if (linkError.message && linkError.message.includes('Authorization failed')) {
								data.shareable_url_error = `Failed to create shareable link: Authorization failed. Please re-authenticate your Dropbox connection or check your app permissions.`;
							} else {
								data.shareable_url_error = `Failed to create shareable link: ${linkError.message}`;
							}
						}
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(data as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				} else if (resource === 'file' && operation === 'download') {
					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
						pairedItem: { item: i },
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary!, items[i].binary);
					}

					items[i] = newItem;

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);

					const filePathDownload = this.getNodeParameter('path', i) as string;
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
						Buffer.from(responseData as string),
						filePathDownload,
					);
				} else if (resource === 'folder' && operation === 'list') {
					const propNames: { [key: string]: string } = {
						id: 'id',
						name: 'name',
						client_modified: 'lastModifiedClient',
						server_modified: 'lastModifiedServer',
						rev: 'rev',
						size: 'contentSize',
						'.tag': 'type',
						content_hash: 'contentHash',
						path_lower: 'pathLower',
						path_display: 'pathDisplay',
						has_explicit_shared_members: 'hasExplicitSharedMembers',
						is_downloadable: 'isDownloadable',
					};

					if (!returnAll) {
						responseData = responseData.entries;
					}

					for (const item of responseData) {
						const newItem: IDataObject = {};

						// Get the props and save them under a proper name
						for (const propName of Object.keys(propNames)) {
							if (item[propName] !== undefined) {
								newItem[propNames[propName]] = item[propName];
							}
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(newItem),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'search' && operation === 'query') {
					let data = responseData;
					if (returnAll) {
						data = simple ? simplify(responseData as IDataObject[]) : responseData;
					} else {
						data = simple
							? simplify(responseData[property] as IDataObject[])
							: responseData[property];
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(data as IDataObject[]),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				} else {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					if (resource === 'file' && operation === 'download') {
						items[i].json = { error: error.message };
					} else {
						returnData.push({ json: { error: error.message } });
					}
					continue;
				}
				throw error;
			}
		}

		if (resource === 'file' && operation === 'download') {
			// For file downloads the files get attached to the existing items
			return [items];
		} else {
			// For all other ones does the output items get replaced
			return [returnData];
		}
	}
}
