/**
 * PostgreSQL starter template.
 *
 * Pre-defined exploration topics for PostgreSQL roles.
 */

import type { StarterTemplate, StarterTopic } from '../types.js';

const replicationTopic: StarterTopic = {
  id: 'postgresql-replication',
  name: 'Replication',
  type: 'feature',
  description: 'Database replication for high availability',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'None',
      description: 'Single server, no replication',
      isDefault: true,
    },
    {
      label: 'Streaming replication',
      description: 'Primary-replica with WAL streaming',
    },
    {
      label: 'Logical replication',
      description: 'Selective table/database replication',
    },
    {
      label: 'Patroni/HA',
      description: 'High availability with automatic failover',
    },
  ],
  explorationQuestions: [
    'Do you need high availability for your database?',
    'What is your recovery time objective (RTO)?',
    'Will you have read replicas for scaling reads?',
  ],
  defaultValue: 'none',
};

const backupsTopic: StarterTopic = {
  id: 'postgresql-backups',
  name: 'Backups',
  type: 'feature',
  description: 'Backup strategy configuration',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'pg_dump',
      description: 'Logical backups with pg_dump',
      isDefault: true,
    },
    {
      label: 'pg_basebackup',
      description: 'Physical backups for PITR',
    },
    {
      label: 'pgBackRest',
      description: 'Enterprise backup solution',
    },
    {
      label: 'Barman',
      description: 'Backup and recovery manager',
    },
    {
      label: 'None',
      description: 'No backup configuration',
    },
  ],
  explorationQuestions: [
    'What is your backup strategy (logical vs physical)?',
    'Do you need point-in-time recovery (PITR)?',
    'How long should backups be retained?',
  ],
  defaultValue: 'pg_dump',
};

const connectionPoolingTopic: StarterTopic = {
  id: 'postgresql-pooling',
  name: 'Connection Pooling',
  type: 'feature',
  description: 'Connection pooler for efficiency',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'None',
      description: 'Direct connections only',
      isDefault: true,
    },
    {
      label: 'PgBouncer',
      description: 'Lightweight connection pooler',
    },
    {
      label: 'Pgpool-II',
      description: 'Pooler with load balancing',
    },
  ],
  explorationQuestions: [
    'How many concurrent connections do you expect?',
    'Do you need connection pooling for efficiency?',
    'Will you use PgBouncer or Pgpool?',
  ],
  defaultValue: 'none',
};

const extensionsTopic: StarterTopic = {
  id: 'postgresql-extensions',
  name: 'Extensions',
  type: 'feature',
  description: 'PostgreSQL extensions to install',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'None',
      description: 'No additional extensions',
      isDefault: true,
    },
    {
      label: 'Common',
      description: 'uuid-ossp, pg_stat_statements, hstore',
    },
    {
      label: 'PostGIS',
      description: 'Geospatial extension',
    },
    {
      label: 'TimescaleDB',
      description: 'Time-series extension',
    },
    {
      label: 'Custom',
      description: 'Specify your own extensions',
    },
  ],
  explorationQuestions: [
    'Do you need any PostgreSQL extensions?',
    'Will you use geospatial features (PostGIS)?',
    'Do you need time-series capabilities?',
  ],
  defaultValue: 'none',
};

const securityTopic: StarterTopic = {
  id: 'postgresql-security',
  name: 'Security',
  type: 'feature',
  description: 'Authentication and access control',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Basic',
      description: 'Password authentication, local trust',
      isDefault: true,
    },
    {
      label: 'Secure',
      description: 'scram-sha-256, no trust connections',
    },
    {
      label: 'Enterprise',
      description: 'LDAP/Kerberos integration, SSL required',
    },
  ],
  explorationQuestions: [
    'What authentication method should be used?',
    'Do you need SSL for client connections?',
    'Will you integrate with LDAP or Kerberos?',
  ],
  defaultValue: 'basic',
};

const performanceTopic: StarterTopic = {
  id: 'postgresql-performance',
  name: 'Performance Tuning',
  type: 'feature',
  description: 'Memory and performance settings',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Defaults',
      description: 'Use PostgreSQL defaults',
      isDefault: true,
    },
    {
      label: 'Auto-tuned',
      description: 'Configure based on system resources',
    },
    {
      label: 'OLTP',
      description: 'Optimized for transactional workloads',
    },
    {
      label: 'OLAP',
      description: 'Optimized for analytical workloads',
    },
  ],
  explorationQuestions: [
    'What type of workload will this database handle?',
    'How much RAM is available for PostgreSQL?',
    'Should settings be auto-tuned based on resources?',
  ],
  defaultValue: 'defaults',
};

const databasesTopic: StarterTopic = {
  id: 'postgresql-databases',
  name: 'Databases & Users',
  type: 'feature',
  description: 'Initial databases and users to create',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'None',
      description: 'No initial databases',
      isDefault: true,
    },
    {
      label: 'Single',
      description: 'One database with owner',
    },
    {
      label: 'Multiple',
      description: 'Multiple databases from variable list',
    },
  ],
  explorationQuestions: [
    'Should initial databases be created?',
    'What users and permissions are needed?',
  ],
  defaultValue: 'none',
};

export const postgresqlTemplate: StarterTemplate = {
  tool: 'postgresql',
  aliases: ['postgres', 'pg', 'psql', 'pgsql'],
  topics: [
    replicationTopic,
    backupsTopic,
    connectionPoolingTopic,
    extensionsTopic,
    securityTopic,
    performanceTopic,
    databasesTopic,
  ],
  bestPractices: [
    {
      practice: 'Use scram-sha-256 authentication instead of md5',
      rationale: 'More secure password hashing mechanism',
      priority: 'critical',
    },
    {
      practice: 'Configure pg_hba.conf with principle of least privilege',
      rationale: 'Minimize attack surface by restricting access',
      priority: 'critical',
    },
    {
      practice: 'Set up automated backups with retention policy',
      rationale: 'Ensures data recovery capability',
      priority: 'critical',
    },
    {
      practice: 'Configure logging for audit and troubleshooting',
      rationale: 'Enables monitoring and forensics',
      priority: 'recommended',
    },
    {
      practice: 'Tune shared_buffers to 25% of available RAM',
      rationale: 'Improves performance by caching data in memory',
      priority: 'recommended',
    },
  ],
};
