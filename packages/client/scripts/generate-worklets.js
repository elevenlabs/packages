#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workletDir = path.join(__dirname, '../worklets');
const outputDir = path.join(__dirname, '../src/utils');

/** Creates ts versions of needed js scripts to code so that they can be exported and used during runtime. Automatically run during build */

const worklets = [
  {
    jsFile: 'raw-audio-processor.js',
    tsFile: 'rawAudioProcessor.ts',
    exportName: 'loadRawAudioProcessor',
    processorName: 'raw-audio-processor'
  },
  {
    jsFile: 'audio-concat-processor.js', 
    tsFile: 'audioConcatProcessor.ts',
    exportName: 'loadAudioConcatProcessor',
    processorName: 'audio-concat-processor'
  }
];

console.log('Generating TypeScript worklet files...');

worklets.forEach(({ jsFile, tsFile, exportName, processorName }) => {
  const jsPath = path.join(workletDir, jsFile);
  const tsPath = path.join(outputDir, tsFile);
  
  // Read the JS file
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  
  // Generate the TS file content
  const tsContent = `import { createWorkletModuleLoader } from "./createWorkletModuleLoader";

export const ${exportName} = createWorkletModuleLoader(
  "${processorName}",
  // language=JavaScript
  \`${jsContent}\`
);
`;

  // Write the TS file
  fs.writeFileSync(tsPath, tsContent);
  console.log(`Generated ${tsFile} from ${jsFile}`);
});

console.log('Worklet generation complete!');
