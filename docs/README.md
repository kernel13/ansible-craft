# ansible-craft Documentation

Welcome to the ansible-craft documentation. This guide will help you generate production-ready Ansible roles and playbooks using AI.

## 📚 Documentation Sections

### Getting Started

- **[Quick Start Guide](user-guide/quick-start.md)** - Get up and running in 5 minutes
- **[Installation](user-guide/installation.md)** - Detailed installation instructions
- **[Configuration](user-guide/configuration.md)** - Configure API keys and preferences

### User Guide

- **[Commands Overview](user-guide/README.md)** - All available commands
- **[Generating Roles](user-guide/commands/new-role.md)** - Create complete Ansible roles
- **[Generating Playbooks](user-guide/commands/new-playbook.md)** - Create multi-play playbooks
- **[Explaining Code](user-guide/commands/explain.md)** - Understand existing Ansible code
- **[Fixing Errors](user-guide/commands/fix.md)** - Interpret and fix Ansible errors
- **[Configuration Management](user-guide/commands/config.md)** - Manage settings
- **[Interactive Wizards](user-guide/wizards.md)** - Use clarifying questions feature
- **[Validation & Linting](user-guide/validation.md)** - Understanding validation results
- **[Troubleshooting](user-guide/troubleshooting.md)** - Common issues and solutions

### Architecture & Design

- **[Architecture Overview](architecture/README.md)** - System design and components
- **[Ansible Best Practices](architecture/ansible-best-practices.md)** - Standards enforced by generation
- **[Generation Flow](architecture/generation-flow.md)** - Two-phase generation process
- **[Validation Pipeline](architecture/validation-pipeline.md)** - Code quality checks
- **[Agent System](architecture/agent-system.md)** - AI agent orchestration
- **[AI Integration](architecture/ai-integration.md)** - Anthropic SDK patterns

### API Reference

- **[API Overview](api-reference/README.md)** - Programmatic usage
- **[CLI API](api-reference/cli-api.md)** - Using CLI programmatically
- **[JSON Schemas](api-reference/json-schemas.md)** - Output formats
- **[Exit Codes](api-reference/exit-codes.md)** - Return codes reference
- **[Configuration Schema](api-reference/configuration-schema.md)** - Config file structure

### Development

- **[Development Guide](development/README.md)** - Contributing to ansible-craft
- **[Setup](development/setup.md)** - Development environment
- **[Testing](development/testing.md)** - Test conventions
- **[Contributing](development/contributing.md)** - How to contribute
- **[Code Style](development/code-style.md)** - Coding standards
- **[Adding Validators](development/adding-validators.md)** - Extend validation
- **[Adding Commands](development/adding-commands.md)** - Create new commands
- **[Debugging](development/debugging.md)** - Debugging tips
- **[Security](development/security.md)** - Security considerations

### Examples

- **[Examples Overview](examples/README.md)** - Sample generations
- **[Generated Roles](examples/generated-roles/)** - Example roles with outputs
- **[Generated Playbooks](examples/generated-playbooks/)** - Example playbooks
- **[Use Cases](examples/use-cases/)** - Real-world scenarios
  - [CI/CD Integration](examples/use-cases/ci-cd-integration.md)
  - [Team Workflows](examples/use-cases/team-workflows.md)
  - [Large-Scale Deployments](examples/use-cases/large-scale.md)

### Migration Guides

- **[Migration Guide Index](migration-guides/README.md)** - Version upgrade guides

## 🚀 Quick Links

| I want to... | Go to... |
|-------------|----------|
| Get started quickly | [Quick Start Guide](user-guide/quick-start.md) |
| Generate my first role | [New Role Command](user-guide/commands/new-role.md) |
| Understand the two-phase flow | [Generation Flow](architecture/generation-flow.md) |
| Fix a failing test | [Troubleshooting](user-guide/troubleshooting.md) |
| Use in CI/CD pipeline | [CI/CD Integration](examples/use-cases/ci-cd-integration.md) |
| Contribute code | [Contributing Guide](development/contributing.md) |
| See example outputs | [Examples](examples/README.md) |

## 🔗 External Resources

- **Main README**: [../README.md](../README.md)
- **GitHub Repository**: https://github.com/ansible-craft/ansible-craft
- **Issue Tracker**: https://github.com/ansible-craft/ansible-craft/issues
- **Discussions**: https://github.com/ansible-craft/ansible-craft/discussions

## 📖 About This Documentation

This documentation covers:

- **ansible-craft CLI**: The command-line tool for generating Ansible code
- **Architecture**: How the system works internally
- **Development**: How to contribute and extend ansible-craft

### Documentation Structure

```
docs/
├── README.md                    # This file - documentation hub
├── user-guide/                  # End-user documentation
│   ├── commands/               # Individual command guides
│   └── ...
├── architecture/               # System design documentation
├── api-reference/              # Programmatic usage
├── development/                # Contributor documentation
├── examples/                   # Sample outputs and use cases
└── migration-guides/           # Version upgrade guides
```

## 💡 Need Help?

- **Bug Reports**: [GitHub Issues](https://github.com/ansible-craft/ansible-craft/issues)
- **Questions**: [GitHub Discussions](https://github.com/ansible-craft/ansible-craft/discussions)
- **Troubleshooting**: [Troubleshooting Guide](user-guide/troubleshooting.md)

---

**License**: MIT | **Version**: 1.0.0
