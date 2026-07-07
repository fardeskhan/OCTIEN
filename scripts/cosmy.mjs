import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const args = process.argv.slice(2);
const command = args[0];
const targetName = args[1];

const GENERATOR_VERSION = "1.0.0";
const WORKSPACE_ROOT = path.join(process.cwd());

// Name Normalization
function normalizeNames(input) {
   const lower = input.toLowerCase();
   const camel = lower.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
   const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
   const upper = input.toUpperCase().replace(/-/g, '_');
   return { lower, camel, pascal, upper };
}

async function ensureDir(dirPath) {
   await fs.mkdir(dirPath, { recursive: true });
}

async function generateFile(filePath, content) {
   await fs.writeFile(filePath, content.trim() + '\n', 'utf-8');
}

async function runCapabilityGenerator(name) {
   const names = normalizeNames(name);
   const capabilityName = names.pascal;
   const capabilityDir = names.lower;

   // Check for optional feature flags
   const withUi = process.argv.includes('--with-ui') || (!process.argv.includes('--no-ui') && !process.argv.some(arg => arg.startsWith('--with-')));
   const withApi = process.argv.includes('--with-api') || (!process.argv.includes('--no-api') && !process.argv.some(arg => arg.startsWith('--with-')));
   const withEvents = process.argv.includes('--with-events') || (!process.argv.includes('--no-events') && !process.argv.some(arg => arg.startsWith('--with-')));
   const withTests = process.argv.includes('--with-tests') || (!process.argv.includes('--no-tests') && !process.argv.some(arg => arg.startsWith('--with-')));

   console.log(`\n🚀 Generating COSMY Capability: ${capabilityName} (Version 1.0.0)\n`);

   // 1. Scaffold Directory Structure
   const paths = {
     domain: path.join(WORKSPACE_ROOT, 'packages/domain/src', capabilityDir),
     app: path.join(WORKSPACE_ROOT, 'packages/application/src', capabilityDir),
     infra: path.join(WORKSPACE_ROOT, 'packages/infrastructure/src', capabilityDir),
     api: path.join(WORKSPACE_ROOT, 'apps/backend/src/modules', capabilityDir),
     ui: path.join(WORKSPACE_ROOT, 'apps/frontend/src/features', capabilityDir),
     pages: path.join(WORKSPACE_ROOT, 'apps/frontend/src/pages', capabilityDir),
     tests: path.join(WORKSPACE_ROOT, 'apps/backend/test/integration', capabilityDir),
     docs: path.join(WORKSPACE_ROOT, 'docs/capabilities', capabilityDir),
     examples: path.join(WORKSPACE_ROOT, 'docs/capabilities', capabilityDir, 'examples'),
     seed: path.join(WORKSPACE_ROOT, 'packages/infrastructure/src', capabilityDir, 'seed')
   };

   async function createDirs() {
     console.log('Scaffolding Core Domain...');
     await fs.mkdir(path.join(paths.domain, 'aggregates'), { recursive: true });
     await fs.mkdir(path.join(paths.domain, 'entities'), { recursive: true });
     await fs.mkdir(path.join(paths.domain, 'value-objects'), { recursive: true });
     if (withEvents) await fs.mkdir(path.join(paths.domain, 'events'), { recursive: true });

     console.log('Scaffolding Application Layer...');
     await fs.mkdir(path.join(paths.app, 'commands'), { recursive: true });
     await fs.mkdir(path.join(paths.app, 'queries'), { recursive: true });
     await fs.mkdir(path.join(paths.app, 'handlers'), { recursive: true });
     if (withEvents) await fs.mkdir(path.join(paths.app, 'events'), { recursive: true });

     console.log('Scaffolding Infrastructure Layer...');
     await fs.mkdir(path.join(paths.infra, 'repositories'), { recursive: true });
     await fs.mkdir(path.join(paths.infra, 'models'), { recursive: true });
     await fs.mkdir(paths.seed, { recursive: true });

     if (withApi) {
       console.log('Scaffolding Backend API Module...');
       await fs.mkdir(path.join(paths.api, 'controllers'), { recursive: true });
       await fs.mkdir(path.join(paths.api, 'dto'), { recursive: true });
       await fs.mkdir(path.join(paths.api, 'health'), { recursive: true });
       await fs.mkdir(path.join(paths.api, 'metrics'), { recursive: true });
       await fs.mkdir(path.join(paths.api, 'openapi'), { recursive: true });
     }

     if (withUi) {
       console.log('Scaffolding Frontend Feature...');
       await fs.mkdir(path.join(paths.ui, 'components'), { recursive: true });
       await fs.mkdir(path.join(paths.ui, 'hooks'), { recursive: true });
       await fs.mkdir(path.join(paths.ui, 'api'), { recursive: true });

       console.log('Scaffolding Frontend Pages...');
       await fs.mkdir(paths.pages, { recursive: true });
     }
     
     if (withTests) {
       console.log('Scaffolding Integration Tests...');
       await fs.mkdir(paths.tests, { recursive: true });
     }

     console.log('Scaffolding Documentation, Examples & Manifest...');
     await fs.mkdir(paths.docs, { recursive: true });
     await fs.mkdir(paths.examples, { recursive: true });

     // Generate standard Manifest
     const manifestContent = `identity:
  id: ${capabilityDir.toLowerCase()}
  displayName: ${capabilityDir}
  description: Generated capability for ${capabilityDir}.

version: 1.0.0
dependencies: []

contracts:
  commands: []
  queries: []
  publishes: []
  subscribes: []

permissionshealth:
  live: /api/v1/${capabilityDir.toLowerCase()}/health/live
  ready: /api/v1/${capabilityDir.toLowerCase()}/health/ready
  startup: /api/v1/${capabilityDir.toLowerCase()}/health/startup
  metadata: /api/v1/${capabilityDir.toLowerCase()}/health/metadata

metrics:
  dashboards: []

featureFlags:
  # Example: 
  # - id: Feature.Name
  #   state: Experimental | Beta | Stable | Enterprise | Internal | Deprecated
  #   owner: Team
  #   rollout: 0
  #   introducedVersion: 1.0.0
  #   removedVersion: null

branding:
  supportsMultiProfile: true

ai:
  explainable: true
  simulation: true
  rollback: false
  approvalRequired: true
  humanReview: false
  offlineSupport: false
  streaming: false
  toolCalling: true
  riskLevel: Low
  safeRetry: true
  compensationAvailable: false

operations:
  health:
    live: /api/v1/${capabilityDir.toLowerCase()}/health/live
    ready: /api/v1/${capabilityDir.toLowerCase()}/health/ready
  featureFlags: []

certification:
  status: Prototype
  gatesPassed: 0
  score: 0
`;
     await fs.writeFile(path.join(paths.domain, 'manifest.yaml'), manifestContent);

     const certificationContent = `metadata:
  capability: ${capabilityDir.toLowerCase()}
  version: 1.0.0

gates:
  domain: passed
  architecture: passed
  security: pending
  performance: pending
  api: pending
  ui: pending
  documentation: pending
  integration: pending
  load_test: pending
  disaster_recovery: pending
  backward_compatibility: pending
  accessibility: pending
  multi_tenancy: pending
  ai_governance: pending
  operational_readiness: pending

security:
  criticalFindings: 0
  highFindings: 0

performance:
  p95LatencyMs: 0
  throughputRps: 0

compatibility:
  apiVersionFrozen: false
  schemaBackwardCompatible: true

tests:
  e2eCoverage: 0
  integrationCoverage: 0

operations:
  dashboardsReady: false
  alertsConfigured: false

approvals:
  architect: pending
  security: pending
  product: pending

artifacts:
  - path: docs/architecture.md
  - path: docs/threat_model.md
`;
     await fs.writeFile(path.join(paths.domain, 'certification.yaml'), certificationContent);

     // ---- FRONTEND GENERATION ----
     const frontendDir = path.join(process.cwd(), 'apps', 'frontend', 'src', 'features', capabilityDir.toLowerCase());
     await fs.mkdir(frontendDir, { recursive: true });
     
     const feManifest = `identity:
  id: ${capabilityDir.toLowerCase()}
  version: 1.0.0

entrypoints:
  - id: dashboard
    type: view
  - id: workspace
    type: shell
`;
     await fs.writeFile(path.join(frontendDir, 'manifest.yaml'), feManifest);
     
     const feWorkspace = `layout:
  type: WorkspaceShell
  
tabs:
  - id: summary
    default: true
  - id: timeline
  - id: audit
  - id: documents
`;
     await fs.writeFile(path.join(frontendDir, 'workspace.yaml'), feWorkspace);

     const feRoutes = `routes:
  - path: /${capabilityDir.toLowerCase()}
    component: DashboardView
  - path: /${capabilityDir.toLowerCase()}/:id
    component: WorkspaceView
`;
     await fs.writeFile(path.join(frontendDir, 'routes.yaml'), feRoutes);

     console.log(`\n✅ Capability ${capabilityDir} successfully scaffolded (Backend + Frontend)!`);
   }

   await createDirs();

   // 3. Register Navigation
   if (withUi) {
     console.log('Injecting into MAIN_NAVIGATION...');
     const navPath = path.join(WORKSPACE_ROOT, 'apps/frontend/src/navigation.ts');
     
     try {
       let navContent = await fs.readFile(navPath, 'utf8');
       
       if (!navContent.includes(`id: '${capabilityDir}'`)) {
         const insertionPoint = 'export const MAIN_NAVIGATION = [';
         const newNavItem = `
  {
    id: '${capabilityDir}',
    label: '${capabilityName}',
    path: '/${capabilityDir}',
    icon: 'cube', // TODO: Update icon
    children: []
  },`;
         
         navContent = navContent.replace(insertionPoint, insertionPoint + newNavItem);
         await fs.writeFile(navPath, navContent);
       } else {
         console.log(`ℹ️ Navigation for ${capabilityDir} already exists, skipping.`);
       }
     } catch (error) {
       console.log(`⚠️ Could not automatically inject navigation: ${error.message}`);
     }
   }

   console.log(`\n✅ Capability "${capabilityName}" generation complete!\n`);
}

async function main() {
   if (command === 'capability') {
      let capName = targetName;
      if (!capName) {
         capName = await question('Enter Capability Name (e.g. Finance): ');
      }
      if (!capName || capName.length < 2) {
         console.error('Invalid capability name.');
         process.exit(1);
      }
      await runCapabilityGenerator(capName);
   } else {
      console.log(`
COSMY Developer CLI v${GENERATOR_VERSION}
Usage:
  npm run cosmy capability <Name>    - Scaffold a full bounded context
  npm run cosmy aggregate <Name>     - (Coming soon)
  npm run cosmy command <Name>       - (Coming soon)
`);
   }
   rl.close();
}

main().catch(console.error);
