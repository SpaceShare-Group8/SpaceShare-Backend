import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate postman.json in the current directory or parent directory
const postmanPath = fs.existsSync('postman.json') 
  ? 'postman.json' 
  : path.join(__dirname, '..', 'postman.json');

const rawData = fs.readFileSync(postmanPath, 'utf8');
const postman = JSON.parse(rawData);

const openapi = {
  openapi: '3.0.0',
  info: {
    title: postman.info?.name || 'SpaceShare API',
    description: postman.info?.description || '',
    version: '1.0.0'
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Root Server' },
    { url: 'http://localhost:4000/api', description: 'API Base Server' }
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

function processItems(items, categoryName = '') {
  items.forEach(item => {
    if (item.item) {
      processItems(item.item, item.name || categoryName);
    } else if (item.request) {
      let rawUrl = typeof item.request.url === 'string' ? item.request.url : item.request.url.raw;
      
      // Normalize variable placeholders
      rawUrl = rawUrl.replace('{{rootUrl}}', '').replace('{{baseUrl}}', '');
      
      // Separate query params from path
      const [pathOnly, queryString] = rawUrl.split('?');
      
      // Convert Postman :pathVars or {{pathVars}} to OpenAPI {pathVars}
      let openapiPath = pathOnly.replace(/\{\{([^}]+)\}\}/g, '{$1}').replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      if (!openapiPath.startsWith('/')) {
        openapiPath = '/' + openapiPath;
      }

      const method = (item.request.method || 'GET').toLowerCase();

      if (!openapi.paths[openapiPath]) {
        openapi.paths[openapiPath] = {};
      }

      const operation = {
        summary: item.name,
        tags: [categoryName || 'General'],
        parameters: [],
        responses: {
          '200': { description: 'Successful response' }
        }
      };

      // Extract Path Parameters
      const pathParams = openapiPath.match(/\{([^}]+)\}/g);
      if (pathParams) {
        pathParams.forEach(param => {
          const paramName = param.replace(/[{}]/g, '');
          operation.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' }
          });
        });
      }

      // Extract Query Parameters
      if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        for (const [key] of urlParams.entries()) {
          operation.parameters.push({
            name: key,
            in: 'query',
            required: false,
            schema: { type: 'string' }
          });
        }
      }

      // Extract Request Body
      if (item.request.body && item.request.body.raw) {
        try {
          const exampleBody = JSON.parse(item.request.body.raw);
          operation.requestBody = {
            content: {
              'application/json': {
                example: exampleBody
              }
            }
          };
        } catch (e) {
          operation.requestBody = {
            content: {
              'application/json': {
                example: item.request.body.raw
              }
            }
          };
        }
      }

      // Extract Headers / Auth
      const headers = item.request.header || [];
      const hasAuth = headers.some(h => h.key.toLowerCase() === 'authorization');
      if (hasAuth) {
        operation.security = [{ bearerAuth: [] }];
      }

      openapi.paths[openapiPath][method] = operation;
    }
  });
}

processItems(postman.item);

const outputPath = fs.existsSync('openapi.yaml') ? 'openapi.yaml' : path.join(__dirname, '..', 'openapi.yaml');
const dumpYaml = yaml.dump || yaml.default?.dump;
fs.writeFileSync(outputPath, dumpYaml(openapi, { noRefs: true }));
console.log('✅ SUCCESS: openapi.yaml generated from postman.json!');