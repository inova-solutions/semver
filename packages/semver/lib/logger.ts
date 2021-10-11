import chalk from 'chalk';
import { CLI_NAME } from './constants';

export function debug(enabled: boolean, text: string): void {
  const prefix = chalk.magenta.bold(CLI_NAME);
  if (enabled) console.log(`${prefix} : ${text}`);
}

export function info(text: string): void {
  const prefix = chalk.magenta.bold(CLI_NAME);
  console.log(`${prefix} : ${text}`);
}

export function warn(text: string): void {
  const prefix = chalk.magenta.bold(CLI_NAME);
  console.log(`${prefix} : ${chalk.yellowBright.bold(text)}`);
}
