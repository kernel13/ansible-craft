import boxen from 'boxen';
import chalk from 'chalk';
import packageJson from '../../package.json';

/**
 * Version information structure.
 */
export interface VersionInfo {
  version: string;
  runtime: string;
  os: string;
}

/**
 * Get version information including runtime and OS details.
 */
export function getVersionInfo(): VersionInfo {
  // Detect Bun runtime or fallback to Node
  const runtime = typeof Bun !== 'undefined' ? `Bun ${Bun.version}` : `Node ${process.version}`;

  return {
    version: packageJson.version,
    runtime,
    os: `${process.platform}-${process.arch}`,
  };
}

/**
 * Display version information in a styled box.
 */
export function displayVersion(): void {
  const info = getVersionInfo();

  const content = [
    `${chalk.bold.cyan('ansible-craft')} ${chalk.green(`v${info.version}`)}`,
    '',
    `${chalk.dim('Runtime:')}  ${info.runtime}`,
    `${chalk.dim('OS:')}       ${info.os}`,
  ].join('\n');

  const boxed = boxen(content, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  });

  console.log(boxed);
}
