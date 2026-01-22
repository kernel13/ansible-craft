/**
 * Shell completion script generators.
 *
 * Generates completion scripts for bash, zsh, and fish shells.
 * Users install via: ansible-craft completions <shell> >> ~/.bashrc
 */

/**
 * Generate bash completion script.
 */
export function generateBashCompletions(): string {
  return `# ansible-craft bash completion
# Install: ansible-craft completions bash >> ~/.bashrc

_ansible_craft_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="new config explain fix completions"
    local new_subcommands="role playbook"

    case "\${cword}" in
        1)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
        2)
            case "\${prev}" in
                new)
                    COMPREPLY=( $(compgen -W "\${new_subcommands}" -- "\${cur}") )
                    ;;
                explain|fix)
                    # Complete files
                    _filedir
                    ;;
                config)
                    COMPREPLY=( $(compgen -W "show save" -- "\${cur}") )
                    ;;
                completions)
                    COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
                    ;;
            esac
            ;;
        *)
            case "\${words[1]}" in
                new)
                    case "\${words[2]}" in
                        role|playbook)
                            COMPREPLY=( $(compgen -W "--output --name --dry-run --force --fix --no-interactive --quick --quiet --json --help" -- "\${cur}") )
                            ;;
                    esac
                    ;;
                explain)
                    COMPREPLY=( $(compgen -W "--complex --help" -- "\${cur}") )
                    ;;
                fix)
                    COMPREPLY=( $(compgen -W "--playbook --complex --apply --help" -- "\${cur}") )
                    ;;
                config)
                    COMPREPLY=( $(compgen -W "--help" -- "\${cur}") )
                    ;;
            esac
            ;;
    esac
}

complete -F _ansible_craft_completions ansible-craft
`;
}

/**
 * Generate zsh completion script.
 */
export function generateZshCompletions(): string {
  return `#compdef ansible-craft
# ansible-craft zsh completion
# Install: ansible-craft completions zsh >> ~/.zshrc

_ansible_craft() {
    local -a commands
    commands=(
        'new:Generate new Ansible resources'
        'config:Manage configuration'
        'explain:Explain Ansible code'
        'fix:Fix Ansible errors'
        'completions:Generate shell completions'
    )

    local -a new_commands
    new_commands=(
        'role:Generate a new Ansible role'
        'playbook:Generate a new Ansible playbook'
    )

    local -a config_commands
    config_commands=(
        'show:Display current configuration'
        'save:Save configuration interactively'
    )

    local -a completions_commands
    completions_commands=(
        'bash:Generate bash completions'
        'zsh:Generate zsh completions'
        'fish:Generate fish completions'
    )

    _arguments -C \\
        '1: :->command' \\
        '2: :->subcommand' \\
        '*: :->args'

    case "\$state" in
        command)
            _describe -t commands 'command' commands
            ;;
        subcommand)
            case "\$words[2]" in
                new)
                    _describe -t commands 'new command' new_commands
                    ;;
                config)
                    _describe -t commands 'config command' config_commands
                    ;;
                completions)
                    _describe -t commands 'shell' completions_commands
                    ;;
                explain|fix)
                    _files
                    ;;
            esac
            ;;
        args)
            case "\$words[2]" in
                new)
                    _arguments \\
                        '(-o --output)'{-o,--output}'[Output directory]:directory:_files -/' \\
                        '(-n --name)'{-n,--name}'[Name]:name' \\
                        '--dry-run[Preview without writing]' \\
                        '--force[Overwrite existing]' \\
                        '--fix[Auto-fix lint issues]' \\
                        '--no-interactive[Skip prompts]' \\
                        '(-Q --quick)'{-Q,--quick}'[Skip wizard]' \\
                        '(-q --quiet)'{-q,--quiet}'[Suppress progress]' \\
                        '--json[Output JSON format]' \\
                        '(-h --help)'{-h,--help}'[Show help]'
                    ;;
                explain)
                    _arguments \\
                        '--complex[Use Claude Opus]' \\
                        '(-h --help)'{-h,--help}'[Show help]' \\
                        '*:file:_files'
                    ;;
                fix)
                    _arguments \\
                        '--playbook[Context playbook]:file:_files' \\
                        '--complex[Use Claude Opus]' \\
                        '--apply[Apply fix automatically]' \\
                        '(-h --help)'{-h,--help}'[Show help]'
                    ;;
            esac
            ;;
    esac
}

_ansible_craft "\$@"
`;
}

/**
 * Generate fish completion script.
 */
export function generateFishCompletions(): string {
  return `# ansible-craft fish completion
# Install: ansible-craft completions fish > ~/.config/fish/completions/ansible-craft.fish

# Disable file completions by default
complete -c ansible-craft -f

# Main commands
complete -c ansible-craft -n "__fish_use_subcommand" -a "new" -d "Generate new Ansible resources"
complete -c ansible-craft -n "__fish_use_subcommand" -a "config" -d "Manage configuration"
complete -c ansible-craft -n "__fish_use_subcommand" -a "explain" -d "Explain Ansible code"
complete -c ansible-craft -n "__fish_use_subcommand" -a "fix" -d "Fix Ansible errors"
complete -c ansible-craft -n "__fish_use_subcommand" -a "completions" -d "Generate shell completions"

# new subcommands
complete -c ansible-craft -n "__fish_seen_subcommand_from new" -a "role" -d "Generate a new Ansible role"
complete -c ansible-craft -n "__fish_seen_subcommand_from new" -a "playbook" -d "Generate a new Ansible playbook"

# config subcommands
complete -c ansible-craft -n "__fish_seen_subcommand_from config" -a "show" -d "Display current configuration"
complete -c ansible-craft -n "__fish_seen_subcommand_from config" -a "save" -d "Save configuration interactively"

# completions subcommands
complete -c ansible-craft -n "__fish_seen_subcommand_from completions" -a "bash" -d "Generate bash completions"
complete -c ansible-craft -n "__fish_seen_subcommand_from completions" -a "zsh" -d "Generate zsh completions"
complete -c ansible-craft -n "__fish_seen_subcommand_from completions" -a "fish" -d "Generate fish completions"

# new role/playbook flags
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -s o -l output -d "Output directory" -r -F
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -s n -l name -d "Name" -r
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -l dry-run -d "Preview without writing"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -l force -d "Overwrite existing"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -l fix -d "Auto-fix lint issues"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -l no-interactive -d "Skip prompts"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -s Q -l quick -d "Skip wizard"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -s q -l quiet -d "Suppress progress"
complete -c ansible-craft -n "__fish_seen_subcommand_from role playbook" -l json -d "Output JSON format"

# explain flags
complete -c ansible-craft -n "__fish_seen_subcommand_from explain" -l complex -d "Use Claude Opus"
complete -c ansible-craft -n "__fish_seen_subcommand_from explain" -F -d "File to explain"

# fix flags
complete -c ansible-craft -n "__fish_seen_subcommand_from fix" -l playbook -d "Context playbook" -r -F
complete -c ansible-craft -n "__fish_seen_subcommand_from fix" -l complex -d "Use Claude Opus"
complete -c ansible-craft -n "__fish_seen_subcommand_from fix" -l apply -d "Apply fix automatically"

# Global flags
complete -c ansible-craft -s h -l help -d "Show help"
complete -c ansible-craft -s V -l version -d "Show version"
`;
}
