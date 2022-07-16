import * as fs from 'fs/promises';
import * as https from 'https';
import { Buffer } from 'node:buffer';
import { EOL } from 'os';
import * as dotenv from 'dotenv';
import * as allProcess from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(allProcess.exec);

dotenv.config();

const getLatestVersionLib = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    https.get(
      process.env.LIBRARY_URL,
      {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`,
        },
      },
      (res) => {
        let string = '';
        res
          .on('data', (data) => {
            string += data;
          })
          .on('end', () => {
            const buffer = Buffer.from(string, 'utf-8');
            const response = JSON.parse(buffer.toString());
            if (response && response['dist-tags'] && response['dist-tags'].latest) {
              resolve(response['dist-tags'].latest);
            }
            resolve(null);
          })
          .on('error', (e) => {
            console.error(e);
            return null;
          });
      },
    );
  });
};

const bootstrap = async () => {
  const file = await fs.readFile(`${process.cwd()}/package.json`, 'utf-8');
  const project = JSON.parse(file);
  const version = await getLatestVersionLib();
  if (!version) return 'Coronal mass ejections in the sun today...';
  const latestVersion = version.split('.');
  if (project.dependencies && !project.dependencies[process.env.LIBRARY_NAME]) {
    process.stdout.write('Package not found' + EOL, 'utf-8', () => {
      process.exit(1);
    });
  }
  const currentVersion = project.dependencies[process.env.LIBRARY_NAME].replace(/[\^]*[\+]*[\~]*/gi, '').split('.');
  const installIsLatestVersion = latestVersion.every((e, i) => Number(e) === Number(currentVersion[i]));
  if (installIsLatestVersion) {
    process.stdout.write('Do you have the latest version' + EOL, 'utf-8', () => process.exit(0));
  } else {
    process.stdout.write('You need to update to the latest version' + EOL, 'utf-8');
    process.stdout.write('The latest version will be installed now' + EOL, 'utf-8');
    await execAsync(`yarn remove ${process.env.LIBRARY_NAME}`);
    process.stdout.write('Remove old version' + EOL, 'utf-8');
    await execAsync(`yarn add ${process.env.LIBRARY_NAME}`);
    process.stdout.write('Latest version installed' + EOL, 'utf-8');
    process.exit(0);
  }
};

bootstrap();
