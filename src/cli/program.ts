import { Command } from 'commander';

export const program = new Command();

program
  .name('ansible-craft')
  .description('Generate production-ready Ansible roles from natural language')
  .version('0.1.0', '-V, --version', 'Display version information');
