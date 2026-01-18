import chalk from 'chalk';
import type { Command, Help } from 'commander';

/**
 * Custom help formatter that provides gh-style help output.
 * Formats help with colored sections: USAGE, COMMANDS, OPTIONS, EXAMPLES.
 */
export class CustomHelp {
  /**
   * Format help output with styled sections.
   */
  formatHelp(cmd: Command, helper: Help): string {
    const lines: string[] = [];
    const name = cmd.name();
    const description = cmd.description();

    // Description
    if (description) {
      lines.push(description);
      lines.push('');
    }

    // USAGE section
    lines.push(chalk.bold.cyan('USAGE'));
    const usage = helper.commandUsage(cmd);
    lines.push(`  ${name} ${usage.replace(name, '').trim() || '<command> [options]'}`);
    lines.push('');

    // COMMANDS section (if there are subcommands)
    const commands = helper.visibleCommands(cmd);
    if (commands.length > 0) {
      lines.push(chalk.bold.cyan('COMMANDS'));
      const maxCmdWidth = Math.max(...commands.map((c) => c.name().length));
      for (const subCmd of commands) {
        const cmdName = chalk.green(subCmd.name().padEnd(maxCmdWidth + 2));
        const cmdDesc = subCmd.description() || '';
        lines.push(`  ${cmdName}${cmdDesc}`);
      }
      lines.push('');
    }

    // OPTIONS section
    const options = helper.visibleOptions(cmd);
    if (options.length > 0) {
      lines.push(chalk.bold.cyan('OPTIONS'));
      const maxOptWidth = Math.max(
        ...options.map((opt) => {
          const flags = opt.flags;
          return flags.length;
        }),
      );
      for (const opt of options) {
        const flags = chalk.yellow(opt.flags.padEnd(maxOptWidth + 2));
        const desc = opt.description || '';
        lines.push(`  ${flags}${desc}`);
      }
      lines.push('');
    }

    // EXAMPLES section
    lines.push(chalk.bold.cyan('EXAMPLES'));
    lines.push(
      `  ${chalk.dim('$')} ${chalk.green('ansible-craft')} new role "install nginx with SSL"`,
    );
    lines.push(
      `  ${chalk.dim('$')} ${chalk.green('ansible-craft')} explain roles/webserver/tasks/main.yml`,
    );
    lines.push(
      `  ${chalk.dim('$')} ${chalk.green('ansible-craft')} fix "FAILED! Authentication failed"`,
    );
    lines.push('');

    // LEARN MORE section
    lines.push(chalk.bold.cyan('LEARN MORE'));
    lines.push(
      `  Use ${chalk.yellow("'ansible-craft <command> --help'")} for more information about a command.`,
    );

    return lines.join('\n');
  }
}

/**
 * Format help using CustomHelp class.
 * Used with Commander's configureHelp.
 */
export function formatHelp(cmd: Command, helper: Help): string {
  return new CustomHelp().formatHelp(cmd, helper);
}
