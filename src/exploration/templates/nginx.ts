/**
 * Nginx starter template.
 *
 * Pre-defined exploration topics for nginx roles.
 */

import type { StarterTemplate, StarterTopic } from '../types.js';

const sslTopic: StarterTopic = {
  id: 'nginx-ssl',
  name: 'SSL/TLS',
  type: 'feature',
  description: 'SSL/TLS certificate configuration',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: "Let's Encrypt",
      description: 'Auto-renewing free certificates via certbot',
      isDefault: true,
    },
    {
      label: 'Self-signed',
      description: 'Quick setup, browser warnings, good for internal use',
    },
    {
      label: 'Custom CA',
      description: 'Enterprise CA, manual certificate management',
    },
    {
      label: 'None',
      description: 'No SSL (HTTP only)',
    },
  ],
  explorationQuestions: [
    'Which SSL approach fits your use case?',
    'Do you need automatic certificate renewal?',
    'Will this be used for internal or public-facing servers?',
  ],
  defaultValue: 'lets-encrypt',
};

const vhostsTopic: StarterTopic = {
  id: 'nginx-vhosts',
  name: 'Virtual Hosts',
  type: 'feature',
  description: 'Multi-domain/site configuration',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'Single site',
      description: 'One website/domain per server',
      isDefault: true,
    },
    {
      label: 'Multi-site',
      description: 'Multiple domains with separate configurations',
    },
    {
      label: 'Template-based',
      description: 'Dynamic virtual hosts from variable list',
    },
  ],
  explorationQuestions: [
    'How many domains/sites will this server host?',
    'Do you need different configurations per site?',
  ],
  defaultValue: 'single',
};

const reverseProxyTopic: StarterTopic = {
  id: 'nginx-reverse-proxy',
  name: 'Reverse Proxy',
  type: 'feature',
  description: 'Proxy requests to backend servers',
  typicallyInteresting: true,
  commonOptions: [
    {
      label: 'None',
      description: 'Serve static files only',
      isDefault: true,
    },
    {
      label: 'Single backend',
      description: 'Proxy to one upstream server',
    },
    {
      label: 'Load balanced',
      description: 'Distribute across multiple backends',
    },
    {
      label: 'WebSocket',
      description: 'Proxy with WebSocket upgrade support',
    },
  ],
  explorationQuestions: [
    'Do you need to proxy requests to backend applications?',
    'Will there be multiple backend servers?',
    'Do you need WebSocket support?',
  ],
  defaultValue: 'none',
};

const cachingTopic: StarterTopic = {
  id: 'nginx-caching',
  name: 'Caching',
  type: 'feature',
  description: 'Response caching configuration',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'None',
      description: 'No caching configured',
      isDefault: true,
    },
    {
      label: 'Static assets',
      description: 'Cache CSS, JS, images',
    },
    {
      label: 'Proxy cache',
      description: 'Cache backend responses',
    },
    {
      label: 'FastCGI cache',
      description: 'Cache PHP/dynamic content',
    },
  ],
  explorationQuestions: [
    'Do you need response caching?',
    'What type of content should be cached?',
  ],
  defaultValue: 'none',
};

const performanceTopic: StarterTopic = {
  id: 'nginx-performance',
  name: 'Performance Tuning',
  type: 'feature',
  description: 'Worker processes and optimization',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Defaults',
      description: 'Use nginx default settings',
      isDefault: true,
    },
    {
      label: 'Auto-tuned',
      description: 'Configure based on CPU cores',
    },
    {
      label: 'High traffic',
      description: 'Optimized for high concurrency',
    },
  ],
  explorationQuestions: [
    'What is your expected traffic level?',
    'Do you need to tune worker processes?',
  ],
  defaultValue: 'defaults',
};

const securityTopic: StarterTopic = {
  id: 'nginx-security',
  name: 'Security Headers',
  type: 'feature',
  description: 'Security-related HTTP headers',
  typicallyInteresting: false,
  commonOptions: [
    {
      label: 'Basic',
      description: 'Standard security headers',
      isDefault: true,
    },
    {
      label: 'Strict',
      description: 'HSTS, CSP, and more',
    },
    {
      label: 'Custom',
      description: 'Define your own headers',
    },
  ],
  explorationQuestions: [
    'What security headers do you need?',
    'Do you need HSTS (HTTP Strict Transport Security)?',
  ],
  defaultValue: 'basic',
};

export const nginxTemplate: StarterTemplate = {
  tool: 'nginx',
  aliases: ['nginix', 'ngx', 'web-server'],
  topics: [
    sslTopic,
    vhostsTopic,
    reverseProxyTopic,
    cachingTopic,
    performanceTopic,
    securityTopic,
  ],
  bestPractices: [
    {
      practice: 'Use separate server blocks for each virtual host',
      rationale: 'Improves maintainability and allows independent configuration',
      priority: 'recommended',
    },
    {
      practice: 'Configure SSL with modern cipher suites',
      rationale: 'Ensures secure connections and compliance with security standards',
      priority: 'critical',
    },
    {
      practice: 'Use include directives for reusable configuration snippets',
      rationale: 'Reduces duplication and makes updates easier',
      priority: 'recommended',
    },
    {
      practice: 'Set appropriate timeouts for different use cases',
      rationale: 'Prevents resource exhaustion from slow clients',
      priority: 'recommended',
    },
  ],
};
