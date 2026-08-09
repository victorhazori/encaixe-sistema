# PROMPT MESTRE — PLATAFORMA SaaS DE AGENDAMENTOS MULTISSEGMENTO

## 1. PAPEL DA IA

Você é um **Arquiteto de Software Sênior, Engenheiro Full Stack, Especialista em SaaS, UX/UI, Segurança, LGPD, bancos de dados e integrações com APIs externas**.

Sua missão é projetar e desenvolver uma plataforma SaaS web completa de agendamentos para profissionais e estabelecimentos que trabalham com horários marcados.

Exemplos de segmentos:

* Barbearias
* Salões de beleza
* Manicures
* Cabeleireiros
* Esteticistas
* Psicólogos
* Médicos
* Dentistas
* Fisioterapeutas
* Nutricionistas
* Personal trainers
* Clínicas
* Consultórios
* Técnicos e prestadores de serviços
* Outros profissionais que trabalham com agenda

O sistema deverá ser **multi-tenant**, modular, personalizável e comercializado através de **assinaturas mensais**.

O produto deverá permitir que cada estabelecimento tenha sua própria identidade visual, configurações, profissionais, serviços, horários, regras de agendamento e funcionalidades habilitadas de acordo com seu plano.

---

# 2. REGRA MAIS IMPORTANTE: ANALISAR O PROJETO EXISTENTE

Antes de escrever qualquer código novo, você deverá analisar completamente o projeto existente localizado em:

`delivery-site`

Esse projeto é um sistema chamado **Brasa Delivery** e contém funcionalidades que poderão ser reutilizadas.

### NÃO faça suposições sobre a tecnologia utilizada.

Primeiro descubra:

* linguagem utilizada;
* framework;
* versão do framework;
* arquitetura;
* estrutura de diretórios;
* sistema de componentes;
* biblioteca de UI;
* sistema de estilos;
* banco de dados;
* ORM;
* migrations;
* autenticação;
* autorização;
* gerenciamento de estado;
* APIs;
* serviços;
* integrações;
* sistema de upload;
* armazenamento de arquivos;
* validação;
* tratamento de erros;
* testes;
* configuração de ambiente;
* Docker;
* scripts;
* dependências;
* bibliotecas reutilizáveis;
* componentes visuais reutilizáveis;
* funcionalidades que possam ser adaptadas;
* padrões arquiteturais existentes;
* problemas técnicos ou dívida técnica.

Faça uma auditoria técnica do projeto antes de decidir a stack definitiva.

### Regra:

**Não reescreva algo que possa ser reutilizado com qualidade.**

Por outro lado:

**Não reutilize código apenas porque ele já existe.**

Se uma funcionalidade existente estiver mal estruturada, insegura, acoplada ou inadequada para o novo SaaS, explique o problema e proponha uma implementação melhor.

---

# 3. DECISÃO DA STACK

A stack tecnológica não foi previamente definida.

Depois de analisar `delivery-site`, escolha a melhor stack para o novo sistema considerando:

* produtividade;
* manutenção;
* escalabilidade;
* segurança;
* custo;
* facilidade de deploy;
* facilidade de desenvolvimento por IA;
* qualidade da documentação;
* ecossistema;
* performance;
* responsividade;
* suporte a SaaS multi-tenant;
* integração com APIs;
* integração com WhatsApp;
* pagamentos;
* relatórios;
* IA;
* banco de dados.

Se a stack existente for adequada, considere reutilizá-la.

Se outra stack for claramente superior, explique a decisão antes de implementá-la.

Não escolha tecnologia por moda.

Escolha tecnologia pela adequação ao produto.

---

# 4. VISÃO DO PRODUTO

O sistema será uma plataforma SaaS onde um estabelecimento poderá criar sua conta, contratar um plano e configurar sua própria operação.

O cliente final poderá acessar a página pública do estabelecimento, visualizar os serviços disponíveis, escolher profissional, data e horário e realizar um agendamento.

O estabelecimento terá um painel administrativo para controlar sua operação.

O sistema deverá permitir que diferentes tipos de profissionais utilizem a mesma plataforma sem que o sistema fique preso ao conceito de "barbearia".

Portanto, prefira conceitos genéricos como:

* estabelecimento;
* profissional;
* cliente;
* serviço;
* procedimento;
* agenda;
* atendimento;
* agendamento;
* unidade;
* recurso;
* plano;
* assinatura.

---

# 5. ARQUITETURA MULTI-TENANT

O sistema deverá ser preparado desde o início para múltiplos estabelecimentos.

Cada estabelecimento deverá possuir seus próprios:

* usuários;
* clientes;
* profissionais;
* serviços;
* horários;
* agendas;
* agendamentos;
* configurações;
* identidade visual;
* regras;
* plano;
* assinatura;
* dados financeiros;
* relatórios.

Um estabelecimento **jamais poderá acessar dados de outro estabelecimento**.

A separação dos tenants deverá ser tratada como requisito crítico de segurança.

Todas as consultas, APIs e operações administrativas deverão validar o contexto do tenant.

Não confiar apenas no frontend para impedir acesso indevido.

---

# 6. MODELO DE ASSINATURAS

Existirão inicialmente três planos:

## BASIC

Funcionalidades principais:

* página/site do estabelecimento;
* personalização básica;
* cadastro de serviços;
* cadastro de profissionais;
* configuração de horários;
* agenda;
* agendamento online;
* cadastro/login dos clientes;
* plano de fidelidade;
* gerenciamento básico de clientes.

O plano Basic NÃO deverá possuir:

* relatórios avançados;
* integração com WhatsApp;
* bot;
* IA;
* pagamentos online.

---

# 7. PLANO PRO

O plano Pro deverá incluir tudo do Basic e acrescentar:

* relatórios;
* indicadores;
* estatísticas;
* integração com WhatsApp;
* agendamento através do WhatsApp;
* bot de atendimento;
* confirmação automática de agendamento;
* lembretes;
* mensagens automáticas;
* mensagens de confirmação;
* mensagens de cancelamento;
* mensagens próximas do horário;
* pergunta automática sobre confirmação da presença;
* comunicação relacionada ao agendamento.

O sistema deverá permitir que o cliente faça o agendamento:

1. pelo site;
2. pelo WhatsApp.

O bot deverá utilizar os dados reais da agenda.

Ele nunca deverá oferecer um horário que esteja indisponível.

---

# 8. PLANO ENTERPRISE

O Enterprise deverá incluir tudo dos planos anteriores e acrescentar funcionalidades avançadas.

### IA NO WHATSAPP

O bot poderá utilizar inteligência artificial para proporcionar uma conversa mais natural.

A IA deverá ser capaz de:

* entender linguagem natural;
* identificar intenção;
* consultar disponibilidade;
* apresentar serviços;
* apresentar profissionais;
* sugerir horários;
* criar agendamentos;
* remarcar;
* cancelar;
* confirmar;
* responder perguntas frequentes;
* orientar clientes.

A IA deverá operar dentro de limites definidos pelo estabelecimento.

Não permitir que a IA execute operações críticas sem as devidas validações.

### PAGAMENTOS

O Enterprise deverá permitir:

* pagamento diretamente no site;
* geração de link de pagamento;
* envio do link pelo WhatsApp;
* associação do pagamento ao agendamento;
* acompanhamento do status do pagamento.

A arquitetura deverá ser preparada para integração com gateways de pagamento.

Não acople a lógica do sistema a apenas um provedor.

Crie uma camada de abstração para pagamentos.

---

# 9. SISTEMA DE FIDELIDADE

O cliente que criar uma conta poderá participar de um programa de fidelidade configurável pelo estabelecimento.

O proprietário deverá conseguir configurar regras como:

* quantidade de agendamentos;
* quantidade de atendimentos;
* pontos;
* recompensas;
* descontos;
* serviços gratuitos;
* bônus;
* validade da recompensa.

Exemplo:

"Após 10 atendimentos, o cliente ganha um serviço."

Outro exemplo:

"A cada R$ 100 gastos, o cliente recebe 10 pontos."

O sistema deverá ser flexível para suportar diferentes modelos de fidelidade.

---

# 10. AGENDA

A agenda é uma das funcionalidades centrais do sistema.

O estabelecimento deverá conseguir configurar:

* dias de funcionamento;
* horários de funcionamento;
* intervalos;
* pausas;
* feriados;
* bloqueios;
* férias;
* indisponibilidade;
* profissionais;
* serviços;
* duração dos serviços;
* intervalos entre serviços;
* capacidade;
* horários específicos por profissional.

Deverá ser possível determinar quais serviços podem ser realizados por quais profissionais.

Exemplo:

Profissional A:

* Corte;
* Barba;
* Corte + Barba.

Profissional B:

* Manicure;
* Pedicure.

O sistema deverá calcular automaticamente a disponibilidade.

---

# 11. MOTOR DE DISPONIBILIDADE

Não implemente disponibilidade simplesmente escondendo horários no frontend.

Crie um mecanismo confiável de disponibilidade no backend.

O sistema deverá considerar:

* horário de funcionamento;
* profissional;
* serviço;
* duração;
* intervalo;
* agendamentos existentes;
* bloqueios;
* feriados;
* folgas;
* configurações;
* regras do estabelecimento.

O backend deverá ser a fonte de verdade.

Evitar conflitos de agenda através de validações transacionais e mecanismos adequados de concorrência.

Dois clientes não podem conseguir reservar o mesmo horário por causa de uma condição de corrida.

---

# 12. EXPERIÊNCIA DO CLIENTE

O cliente final deverá possuir uma experiência extremamente simples.

Fluxo esperado:

1. acessar o site do estabelecimento;
2. visualizar informações;
3. escolher serviço;
4. escolher profissional, quando aplicável;
5. escolher data;
6. visualizar horários disponíveis;
7. escolher horário;
8. criar conta ou entrar;
9. confirmar agendamento;
10. receber confirmação.

O sistema deverá evitar formulários excessivamente longos.

Priorizar UX mobile-first.

---

# 13. CONTA DO CLIENTE

O cliente deverá poder:

* criar conta;
* entrar;
* recuperar acesso;
* editar dados;
* visualizar histórico;
* visualizar próximos agendamentos;
* cancelar;
* remarcar;
* visualizar benefícios;
* acompanhar fidelidade;
* gerenciar preferências de comunicação.

Implementar autenticação segura.

---

# 14. PAINEL DO ESTABELECIMENTO

Criar um painel administrativo moderno.

Deverá conter, conforme o plano contratado:

### Dashboard

* agenda do dia;
* próximos atendimentos;
* quantidade de agendamentos;
* clientes;
* ocupação;
* indicadores;
* alertas;
* pendências.

### Agenda

Visualização:

* diária;
* semanal;
* mensal.

Permitir interação intuitiva.

### Clientes

Permitir:

* cadastro;
* pesquisa;
* histórico;
* informações relevantes;
* fidelidade;
* agendamentos;
* preferências de comunicação.

### Profissionais

Permitir:

* cadastro;
* edição;
* serviços oferecidos;
* horários;
* folgas;
* bloqueios;
* agenda.

### Serviços

Permitir:

* nome;
* descrição;
* duração;
* preço;
* profissional responsável;
* disponibilidade;
* regras.

### Configurações

Permitir personalização do estabelecimento.

---

# 15. PERSONALIZAÇÃO

Esse é um requisito fundamental do produto.

Cada cliente deverá conseguir configurar sua identidade visual.

Possibilidades:

* logo;
* nome;
* descrição;
* cores;
* cor primária;
* cor secundária;
* tipografia, quando suportado;
* imagens;
* capa;
* favicon;
* informações de contato;
* endereço;
* redes sociais;
* textos;
* aparência da página pública.

A personalização deverá ser feita de forma segura.

Não permitir que usuários injetem código arbitrário.

---

# 16. SITE PÚBLICO

Cada estabelecimento deverá possuir uma página pública.

A arquitetura deverá permitir futuramente:

* subdomínio;
* domínio personalizado;
* URL amigável.

Exemplo conceitual:

`estabelecimento.plataforma.com`

ou:

`plataforma.com/estabelecimento`

O sistema deverá ser preparado para evolução futura para domínios próprios.

---

# 17. RESPONSIVIDADE

Responsividade é requisito obrigatório.

O sistema deverá funcionar corretamente em:

* celulares pequenos;
* celulares grandes;
* tablets;
* notebooks;
* desktops;
* monitores ultrawide;
* telas verticais;
* telas horizontais;
* diferentes densidades de pixel.

Não criar simplesmente uma versão desktop e uma versão mobile.

Criar uma interface realmente responsiva.

Utilizar:

* layouts fluidos;
* breakpoints adequados;
* componentes adaptativos;
* menus adaptáveis;
* tabelas responsivas;
* modais responsivos;
* agenda responsiva;
* touch interactions;
* acessibilidade.

Testar visualmente diferentes tamanhos de viewport.

---

# 18. UI/UX

A interface deverá possuir padrão profissional de produto SaaS moderno.

Prioridades:

* simplicidade;
* clareza;
* velocidade;
* consistência;
* acessibilidade;
* feedback visual;
* estados de loading;
* estados vazios;
* estados de erro;
* confirmações;
* microinterações;
* animações sutis;
* excelente experiência mobile.

Não criar uma interface genérica de CRUD.

O sistema deve parecer um produto comercial profissional.

Criar um Design System reutilizável.

---

# 19. LGPD

A plataforma deverá ser projetada considerando a LGPD.

Implementar desde o início:

* minimização de dados;
* finalidade de coleta;
* consentimento quando necessário;
* controle de acesso;
* proteção de dados;
* logs de segurança;
* políticas de retenção;
* exclusão de dados;
* exportação de dados quando aplicável;
* gerenciamento de consentimentos;
* preferências de comunicação;
* proteção de credenciais;
* criptografia quando apropriado.

Como o sistema poderá atender profissionais de saúde, tratar dados potencialmente sensíveis com cuidado especial.

Não armazenar informações médicas desnecessárias.

A arquitetura deverá permitir separar dados operacionais de dados sensíveis.

Importante:

A implementação técnica deve ser compatível com a LGPD, mas não assumir que o sistema está juridicamente adequado apenas por implementar funcionalidades técnicas.

---

# 20. SEGURANÇA

Aplicar boas práticas de segurança em toda a aplicação.

Considerar:

* autenticação;
* autorização;
* RBAC;
* isolamento de tenant;
* proteção contra SQL injection;
* XSS;
* CSRF quando aplicável;
* brute force;
* rate limiting;
* validação de entrada;
* sanitização;
* sessões;
* cookies seguros;
* secrets;
* logs;
* auditoria;
* proteção de APIs.

Nunca confiar em dados enviados pelo frontend.

Toda permissão deverá ser validada no backend.

---

# 21. BANCO DE DADOS

SQLite poderá ser utilizado inicialmente caso seja tecnicamente adequado.

Porém, não faça uma escolha simplista apenas porque o volume inicial será pequeno.

Analise:

* concorrência;
* deploy;
* backups;
* crescimento;
* multi-tenant;
* transações;
* integrações;
* relatórios;
* futura migração.

Se SQLite for escolhido, estruture a aplicação de forma que uma futura migração para PostgreSQL, por exemplo, seja possível sem reescrever todo o sistema.

Criar modelo de dados organizado e normalizado.

---

# 22. MODELO DE DADOS

A arquitetura deverá considerar entidades semelhantes a:

* User
* Tenant
* TenantMember
* Subscription
* SubscriptionPlan
* Customer
* Professional
* Service
* ProfessionalService
* Schedule
* AvailabilityRule
* BlockedPeriod
* Holiday
* Appointment
* AppointmentStatus
* LoyaltyProgram
* LoyaltyRule
* LoyaltyTransaction
* Notification
* WhatsAppConversation
* WhatsAppMessage
* Payment
* PaymentLink
* Report
* AuditLog
* Consent
* NotificationPreference

Não implemente cegamente essa lista.

Analise o domínio e crie o modelo mais adequado.

---

# 23. CONTROLE DE PLANOS

A aplicação deverá possuir um sistema central de feature flags/permissões baseado no plano.

Exemplo conceitual:

```text
BASIC
 ├── website
 ├── booking
 ├── calendar
 ├── customers
 └── loyalty

PRO
 ├── tudo do BASIC
 ├── reports
 ├── whatsapp
 ├── bot
 └── notifications

ENTERPRISE
 ├── tudo do PRO
 ├── ai
 ├── payments
 └── advanced automation
```

O backend deverá verificar as permissões.

Não esconder funcionalidades apenas no frontend.

A estrutura deverá permitir adicionar novos planos futuramente.

---

# 24. WHATSAPP

A integração com WhatsApp deverá ser criada através de uma camada desacoplada.

Não espalhar chamadas de WhatsApp pelo código.

Criar uma abstração para:

* enviar mensagem;
* receber mensagem;
* identificar conversa;
* enviar template;
* enviar lembrete;
* enviar confirmação;
* enviar link;
* processar resposta.

A arquitetura deverá permitir trocar o provedor posteriormente.

---

# 25. IA

A IA deverá ser implementada de forma desacoplada do restante do sistema.

Criar uma camada responsável por:

* interpretação da mensagem;
* identificação de intenção;
* contexto;
* ferramentas disponíveis;
* consulta de agenda;
* criação de agendamento;
* cancelamento;
* remarcação;
* respostas.

A IA nunca deverá ter acesso direto e irrestrito ao banco.

Utilizar ferramentas/funções controladas.

Exemplo conceitual:

```text
AI
 ↓
Intent
 ↓
Tool
 ↓
Business Rule
 ↓
Database
```

Nunca:

```text
AI → SQL direto
```

---

# 26. PAGAMENTOS

Criar uma camada de abstração:

```text
PaymentProvider
 ├── createPayment()
 ├── createPaymentLink()
 ├── getPaymentStatus()
 ├── refund()
 └── handleWebhook()
```

O sistema deverá estar preparado para diferentes gateways.

Webhooks deverão ser tratados de maneira segura e idempotente.

---

# 27. NOTIFICAÇÕES

Criar um sistema centralizado de notificações.

Possíveis canais:

* WhatsApp;
* e-mail;
* futuramente SMS;
* notificações internas.

O estabelecimento deverá conseguir configurar preferências.

O cliente deverá poder controlar suas preferências dentro dos limites legais e operacionais.

---

# 28. RELATÓRIOS

Disponíveis no Pro e Enterprise.

Exemplos:

* agendamentos;
* cancelamentos;
* faltas;
* faturamento;
* ocupação;
* serviços mais utilizados;
* profissionais;
* clientes;
* recorrência;
* horários mais movimentados;
* ticket médio;
* desempenho.

Não criar relatórios sem propósito.

Cada relatório deve responder uma pergunta útil para o proprietário.

---

# 29. OBSERVABILIDADE

Preparar o sistema para produção.

Implementar, quando adequado:

* logs estruturados;
* tratamento centralizado de erros;
* auditoria;
* monitoramento;
* métricas;
* rastreamento de operações importantes.

Nunca registrar senhas, tokens ou dados sensíveis em logs.

---

# 30. TESTES

Criar testes para funcionalidades críticas.

Prioridade:

### Alta

* autenticação;
* autorização;
* isolamento de tenant;
* criação de agendamento;
* cancelamento;
* remarcação;
* disponibilidade;
* conflitos de agenda;
* assinatura;
* permissões por plano;
* pagamentos;
* webhooks;
* integrações.

### Média

* componentes;
* formulários;
* relatórios;
* fidelidade.

Criar testes unitários e de integração onde fizer sentido.

Adicionar testes E2E para fluxos críticos.

---

# 31. PERFORMANCE

A aplicação deverá ser otimizada desde o início.

Evitar:

* queries desnecessárias;
* N+1;
* carregamento excessivo;
* bundles gigantes;
* chamadas duplicadas;
* processamento desnecessário.

Aplicar:

* paginação;
* cache quando apropriado;
* lazy loading;
* otimização de imagens;
* índices;
* consultas eficientes.

---

# 32. ACESSIBILIDADE

Seguir boas práticas de acessibilidade.

Considerar:

* navegação por teclado;
* contraste;
* labels;
* foco;
* leitores de tela;
* tamanho adequado dos elementos;
* mensagens de erro claras;
* sem depender exclusivamente de cores.

---

# 33. ESTRUTURA DO DESENVOLVIMENTO

NÃO tente construir tudo de uma vez.

Trabalhe em fases.

## FASE 0 — AUDITORIA

Antes de codificar:

1. analisar `delivery-site`;
2. descobrir stack;
3. mapear arquitetura;
4. identificar componentes reutilizáveis;
5. identificar funcionalidades reutilizáveis;
6. identificar problemas;
7. propor arquitetura;
8. propor stack;
9. propor banco;
10. propor estrutura de diretórios.

Ao terminar, apresente um relatório técnico.

**Não comece a implementação antes dessa análise.**

---

# 34. FASE 1 — FUNDAÇÃO

Implementar:

* projeto;
* arquitetura;
* banco;
* migrations;
* autenticação;
* usuários;
* tenants;
* permissões;
* planos;
* feature flags;
* Design System;
* layout;
* responsividade.

O projeto deverá executar corretamente ao final da fase.

---

# 35. FASE 2 — OPERAÇÃO

Implementar:

* estabelecimento;
* profissionais;
* serviços;
* horários;
* disponibilidade;
* agenda;
* clientes;
* agendamentos.

Criar o fluxo completo de reserva.

---

# 36. FASE 3 — SITE PÚBLICO

Implementar:

* página pública;
* personalização;
* fluxo de agendamento;
* login;
* cadastro;
* confirmação;
* área do cliente.

---

# 37. FASE 4 — FIDELIDADE

Implementar:

* programa;
* regras;
* pontos/recompensas;
* histórico;
* configurações.

---

# 38. FASE 5 — PRO

Implementar:

* relatórios;
* WhatsApp;
* bot;
* notificações;
* confirmações;
* lembretes.

---

# 39. FASE 6 — ENTERPRISE

Implementar:

* IA;
* ferramentas da IA;
* pagamentos;
* links de pagamento;
* automações avançadas.

---

# 40. FASE 7 — HARDENING

Executar:

* testes;
* segurança;
* auditoria;
* performance;
* acessibilidade;
* responsividade;
* tratamento de erros;
* revisão arquitetural;
* revisão LGPD;
* revisão multi-tenant.

---

# 41. REGRA DE DESENVOLVIMENTO INCREMENTAL

Ao trabalhar em uma fase:

1. explique o objetivo;
2. identifique arquivos envolvidos;
3. implemente;
4. execute testes;
5. corrija erros;
6. valide a funcionalidade;
7. documente o que foi feito;
8. informe o que ainda falta.

Não avance silenciosamente para outra fase.

---

# 42. REGRA CONTRA CÓDIGO DESNECESSÁRIO

Não criar:

* abstrações sem necessidade;
* dependências desnecessárias;
* componentes duplicados;
* código morto;
* arquivos sem uso;
* funcionalidades fora do escopo.

Prefira código simples, legível e sustentável.

---

# 43. REGRA DE REUTILIZAÇÃO

Antes de criar:

* componente;
* hook;
* serviço;
* utilitário;
* middleware;
* helper;
* sistema de autenticação;
* sistema de UI;

verifique se já existe algo adequado no projeto.

Se existir, reutilize ou refatore.

---

# 44. REGRA DE UX

Toda funcionalidade deverá considerar:

* desktop;
* tablet;
* mobile;
* loading;
* erro;
* vazio;
* sucesso;
* confirmação;
* acessibilidade.

Não considerar uma funcionalidade concluída apenas porque "funciona".

Ela deverá funcionar **bem**.

---

# 45. REGRA DE NEGÓCIO

O sistema deve separar:

```text
UI
↓
API / Application Layer
↓
Business Logic
↓
Domain
↓
Infrastructure
↓
Database / External Services
```

Evite colocar regras de negócio diretamente nos componentes de interface.

---

# 46. DOCUMENTAÇÃO

Documentar:

* arquitetura;
* stack;
* instalação;
* variáveis de ambiente;
* banco;
* migrations;
* comandos;
* autenticação;
* permissões;
* planos;
* integrações;
* WhatsApp;
* IA;
* pagamentos;
* deploy;
* backup;
* manutenção.

Criar um README profissional.

---

# 47. VARIÁVEIS DE AMBIENTE

Nunca colocar:

* API keys;
* tokens;
* secrets;
* senhas;
* credenciais;

diretamente no código.

Utilizar variáveis de ambiente.

Criar um arquivo de exemplo como:

`.env.example`

sem valores secretos reais.

---

# 48. DEPLOY

A arquitetura deverá ser preparada para deploy real.

Considerar:

* produção;
* staging;
* desenvolvimento local;
* banco;
* backups;
* variáveis de ambiente;
* HTTPS;
* domínio;
* logs;
* migrations;
* rollback.

---

# 49. CRITÉRIOS DE ACEITAÇÃO

Uma funcionalidade somente será considerada concluída quando:

* estiver implementada;
* estiver integrada;
* estiver responsiva;
* possuir tratamento de erros;
* possuir loading quando necessário;
* possuir validações;
* respeitar permissões;
* respeitar o tenant;
* não quebrar funcionalidades existentes;
* possuir testes adequados;
* estiver documentada quando necessário.

---

# 50. COMPORTAMENTO ESPERADO DA IA

Não quero uma IA que simplesmente gere código rapidamente.

Quero uma IA que pense como uma equipe sênior de engenharia.

Antes de tomar decisões importantes:

* analise o contexto;
* procure código existente;
* avalie alternativas;
* identifique riscos;
* escolha a solução mais simples que atenda aos requisitos;
* explique decisões arquiteturais relevantes.

Quando encontrar problemas no projeto existente, não esconda.

Informe:

* problema;
* impacto;
* causa provável;
* solução recomendada.

---

# 51. NÃO INVENTAR FUNCIONALIDADES

Não adicionar funcionalidades grandes que não foram solicitadas sem antes justificar.

Entretanto, se uma funcionalidade for tecnicamente necessária para que outra funcione corretamente, ela poderá ser criada.

Explique a necessidade.

---

# 52. NÃO QUEBRAR O SISTEMA EXISTENTE

O projeto `delivery-site` contém código potencialmente reutilizável.

Não destruir ou substituir indiscriminadamente o projeto.

Faça análise antes de alterar.

Quando uma migração for necessária:

1. explique;
2. faça backup quando aplicável;
3. migre gradualmente;
4. valide;
5. mantenha o sistema funcional.

---

# 53. PRIMEIRA TAREFA

Sua primeira tarefa NÃO é criar o sistema.

Sua primeira tarefa é:

## AUDITAR O `delivery-site`.

Analise o projeto profundamente.

Depois entregue:

### 1. Stack atual

Informe:

* frontend;
* backend;
* banco;
* ORM;
* autenticação;
* UI;
* infraestrutura;
* principais dependências.

### 2. Arquitetura atual

Explique como o projeto está organizado.

### 3. Funcionalidades reutilizáveis

Liste o que pode ser aproveitado.

### 4. Componentes reutilizáveis

Liste os componentes que podem ser aproveitados.

### 5. Problemas encontrados

Liste problemas técnicos, arquitetura, segurança e manutenção.

### 6. Recomendação

Explique:

* o que reutilizar;
* o que refatorar;
* o que criar do zero;
* o que eventualmente substituir.

### 7. Arquitetura proposta

Apresente a arquitetura do novo SaaS.

### 8. Stack recomendada

Explique a escolha.

### 9. Banco de dados

Apresente a estratégia e as principais entidades.

### 10. Roadmap

Apresente as fases de implementação.

**Somente depois dessa auditoria e da aprovação da arquitetura deverá começar a implementação.**

---

# 54. PRINCÍPIO FINAL

O objetivo não é apenas criar um sistema de agendamento.

O objetivo é construir uma **plataforma SaaS profissional, modular, multi-tenant, segura, escalável e comercializável**, capaz de atender diferentes tipos de profissionais sem precisar desenvolver um sistema separado para cada segmento.

O produto deve permitir que um estabelecimento tenha a sensação de possuir seu próprio sistema, enquanto tecnicamente todos utilizam uma única plataforma.

Prioridades, nesta ordem:

1. Segurança
2. Integridade dos agendamentos
3. Isolamento entre tenants
4. Experiência do usuário
5. Arquitetura sustentável
6. Responsividade
7. Manutenibilidade
8. Performance
9. Escalabilidade
10. Funcionalidades avançadas

Comece pela **auditoria do `delivery-site`**.