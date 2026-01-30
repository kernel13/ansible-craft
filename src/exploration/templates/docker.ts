/**
 * Docker starter template.
 *
 * Pre-defined exploration topics for Docker roles.
 */

import type { StarterTemplate, StarterTopic } from '../types.js';

const registryTopic: StarterTopic = {
  id: 'docker-registry',
  name: 'Registry Configuration',
  type: 'feature',
  description: 'Container registry setup',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'Docker Hub',
      description: 'Use public Docker Hub',
      isDefault: true,
    },
    {
      label: 'Private registry',
      description: 'Configure private registry authentication',
    },
    {
      label: 'Multiple registries',
      description: 'Configure multiple registry credentials',
    },
    {
      label: 'Insecure registry',
      description: 'Allow insecure registries (development only)',
    },
  ],
  explorationQuestions: [
    'Will you use private container registries?',
    'Do you need to configure registry authentication?',
    'Are there any insecure registries to allow?',
  ],
  defaultValue: 'docker-hub',
};

const networkingTopic: StarterTopic = {
  id: 'docker-networking',
  name: 'Networking',
  type: 'feature',
  description: 'Docker network configuration',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'Bridge (default)',
      description: 'Standard bridge networking',
      isDefault: true,
    },
    {
      label: 'Custom networks',
      description: 'Create custom bridge networks',
    },
    {
      label: 'Host networking',
      description: 'Use host network stack',
    },
    {
      label: 'Overlay',
      description: 'Multi-host overlay networks (Swarm)',
    },
  ],
  explorationQuestions: [
    'Do you need custom Docker networks?',
    'Will containers communicate across hosts?',
    'Do you need specific network drivers?',
  ],
  defaultValue: 'bridge',
};

const storageTopic: StarterTopic = {
  id: 'docker-storage',
  name: 'Storage',
  type: 'feature',
  description: 'Volume and storage configuration',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'Local volumes',
      description: 'Docker-managed local volumes',
      isDefault: true,
    },
    {
      label: 'Bind mounts',
      description: 'Mount host directories',
    },
    {
      label: 'NFS volumes',
      description: 'Network file system volumes',
    },
    {
      label: 'Storage driver',
      description: 'Configure storage driver (overlay2)',
    },
  ],
  explorationQuestions: [
    'How will container data be persisted?',
    'Do you need named volumes or bind mounts?',
    'Are there specific storage driver requirements?',
  ],
  defaultValue: 'local',
};

const composeTopic: StarterTopic = {
  id: 'docker-compose',
  name: 'Docker Compose',
  type: 'feature',
  description: 'Docker Compose installation and configuration',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Include',
      description: 'Install Docker Compose',
      isDefault: true,
    },
    {
      label: 'Skip',
      description: 'Do not install Compose',
    },
    {
      label: 'V1 compatibility',
      description: 'Install with V1 compatibility symlink',
    },
  ],
  explorationQuestions: [
    'Do you need Docker Compose installed?',
    'Should the legacy docker-compose command be available?',
  ],
  defaultValue: 'include',
};

const daemonTopic: StarterTopic = {
  id: 'docker-daemon',
  name: 'Daemon Configuration',
  type: 'feature',
  description: 'Docker daemon settings',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Defaults',
      description: 'Use default daemon configuration',
      isDefault: true,
    },
    {
      label: 'Custom',
      description: 'Configure daemon.json options',
    },
    {
      label: 'Logging',
      description: 'Configure logging driver',
    },
    {
      label: 'Security',
      description: 'Enable security features (userns, seccomp)',
    },
  ],
  explorationQuestions: [
    'Do you need custom daemon configuration?',
    'Which logging driver should be used?',
    'Are there specific security requirements?',
  ],
  defaultValue: 'defaults',
};

const usersTopic: StarterTopic = {
  id: 'docker-users',
  name: 'User Access',
  type: 'feature',
  description: 'Configure users for Docker access',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Root only',
      description: 'Only root can use Docker',
    },
    {
      label: 'Docker group',
      description: 'Add users to docker group',
      isDefault: true,
    },
    {
      label: 'Rootless',
      description: 'Enable rootless Docker mode',
    },
  ],
  explorationQuestions: [
    'Which users should have Docker access?',
    'Do you need rootless Docker mode?',
  ],
  defaultValue: 'docker-group',
};

const cleanupTopic: StarterTopic = {
  id: 'docker-cleanup',
  name: 'Cleanup',
  type: 'feature',
  description: 'Automated cleanup configuration',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'None',
      description: 'No automated cleanup',
      isDefault: true,
    },
    {
      label: 'Prune unused',
      description: 'Scheduled prune of unused resources',
    },
    {
      label: 'Image cleanup',
      description: 'Remove old/unused images',
    },
  ],
  explorationQuestions: [
    'Do you need automated cleanup of Docker resources?',
    'How often should cleanup run?',
  ],
  defaultValue: 'none',
};

export const dockerTemplate: StarterTemplate = {
  tool: 'docker',
  aliases: ['docker-ce', 'docker-engine', 'container', 'containers'],
  topics: [
    registryTopic,
    networkingTopic,
    storageTopic,
    composeTopic,
    daemonTopic,
    usersTopic,
    cleanupTopic,
  ],
  bestPractices: [
    {
      practice: 'Pin Docker versions for reproducibility',
      rationale: 'Prevents unexpected changes from version updates',
      priority: 'recommended',
    },
    {
      practice: 'Use overlay2 storage driver',
      rationale: 'Best performance and stability for most use cases',
      priority: 'recommended',
    },
    {
      practice: 'Configure log rotation to prevent disk exhaustion',
      rationale: 'Container logs can grow unbounded without limits',
      priority: 'critical',
    },
    {
      practice: 'Add users to docker group instead of using sudo',
      rationale: 'More secure than running all commands as root',
      priority: 'recommended',
    },
    {
      practice: 'Configure registry mirrors for faster pulls',
      rationale: 'Improves image pull performance',
      priority: 'optional',
    },
  ],
};
