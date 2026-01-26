# Feature name 
Claude code integrate

## Context
Currentl this tool helps me to generate ansible roles and playbook, but it requires an api key.          

## Goal
  I would like to see how I can integrate this tool into claude  code in form of skills, agent, ... or any other mean so I can  use my claude code subscription.       

##  Main Features of ansible-craft                                  
                                                                  
  Based on the codebase exploration, here are the main features:  
                                                                  
  Generation Commands                                             
                                                                  
  1. new role <description> - Generate complete Ansible roles from
   natural language                                               
  2. new playbook <description> - Create multi-play playbooks with
   inventory structure                                            
                                                                  
  Two-Phase Generation Workflow                                   
                                                                  
  - Plan Phase: Structured preview using Anthropic beta API for   
  guaranteed JSON                                                 
  - User Review: Accept/modify/reject the plan before code        
  generation                                                      
  - Code Generation: Streaming YAML with real-time visual feedback
                                                                  
  Interactive Wizards                                             
                                                                  
  - Role Wizard (4 steps): Structure selection, platform,         
  handlers, validation                                            
  - Playbook Wizard (3 steps): Target hosts, privilege escalation,
   handlers                                                       
                                                                  
  Code Analysis                                                   
                                                                  
  - explain <path> - Plain English explanations of existing       
  Ansible code                                                    
  - fix <error> - Diagnose errors and suggest/apply fixes         
  automatically                                                   
                                                                  
  Validation Pipeline                                             
                                                                  
  - YAML syntax validation                                        
  - FQCN (Fully Qualified Collection Name) compliance             
  - Idempotency pattern checking                                  
  - ansible-lint integration with auto-fix                        
                                                                  
  CLI Options                                                     
                                                                  
  - --dry-run: Preview without writing files                      
  - --json: Machine-readable output for CI/CD                     
  - --complex: Use Claude Opus for deeper analysis                
  - --quick: Skip wizard, use defaults                            
  - --fix: Auto-fix lint violations                               
  - --force: Overwrite existing directories                       
                                                                  
  Configuration                                                   
                                                                  
  - config save - Interactive setup for API key and preferences   
  - TOML-based config at ~/.config/ansible-craft/config.toml      
                                                                  
  Agent Architecture                                              
                                                                  
  - PlannerAgent, GeneratorAgent, ValidatorAgent, LinterAgent,    
  FixerAgent, ExplainerAgent, DebuggerAgent, WriterAgent          
                                                          
                                                           
