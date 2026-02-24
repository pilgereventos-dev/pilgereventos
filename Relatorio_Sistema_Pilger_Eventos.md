# 📋 Relatório do Sistema — Pilger Eventos

**Plataforma Digital para Gestão de Eventos e Comunicação Automatizada com Convidados**

---

## 🎯 O que é o Sistema?

O **Pilger Eventos** é uma plataforma online completa para gerenciar eventos exclusivos. Ele funciona como um **site de confirmação de presença** combinado com um **sistema inteligente de comunicação por WhatsApp**, automatizando todo o contato com os convidados de forma profissional e personalizada.

O endereço do sistema é: **https://pilgereventos.vercel.app**

---

## 📱 Como Funciona — Visão Geral

O sistema possui **duas áreas principais**:

### 1. Página do Convidado (Acesso Público)
Quando um convidado acessa o link do evento, ele encontra uma **página elegante e sofisticada** contendo:

- **Informações completas do evento** — data, horário, local e descrição
- **Formulário de confirmação de presença** onde o convidado informa:
  - Nome completo
  - Telefone (WhatsApp)
  - Quantidade de acompanhantes (até 2)
  - Nome e telefone de cada acompanhante

> Ao confirmar presença, o convidado e seus acompanhantes recebem **automaticamente** uma mensagem de boas-vindas personalizada via WhatsApp.

---

### 2. Painel Administrativo (Acesso Restrito)
Área protegida por login e senha, onde o organizador do evento tem controle total:

#### 📊 Dashboard — Painel de Controle
- **Lista completa de convidados** com nome, telefone e status
- **Busca rápida** por nome ou telefone
- **Check-in no dia do evento** — marcar presença com um clique
- **Reenvio de WhatsApp** — reenviar a mensagem de boas-vindas manualmente
- **Exclusão de convidados** quando necessário
- **Controle de acesso** — aprovar novos administradores do sistema
- **Contadores em tempo real** — total de convidados, confirmados e check-ins realizados

#### ⚙️ Configurações
- Gerenciamento das **credenciais de integração com WhatsApp** (ConnectyHub API)
- Configuração da **mensagem de boas-vindas** personalizada

#### 🤖 Automação de Mensagens
Esta é a funcionalidade mais poderosa do sistema. O administrador pode criar **regras automáticas de envio de mensagens**, como:

| Tipo de Regra | Como Funciona | Exemplo |
|---|---|---|
| **Após confirmação** | Envia a mensagem X minutos/horas/dias após o convidado confirmar presença | *"1 minuto após confirmar, enviar lembrete do dress code"* |
| **Data fixa** | Envia a mensagem em um dia e horário específico para todos os convidados | *"2 dias antes do evento, enviar roteiro completo"* |

Cada regra pode ser **ativada/desativada** individualmente, e as mensagens são **personalizadas com o nome do convidado** automaticamente.

---

## 🔄 Fluxo Completo do Sistema

```
┌─────────────────────────────────────┐
│     Convidado acessa o link         │
│     do evento no celular            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Preenche nome, telefone e         │
│   confirma presença                 │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   ✅ Recebe mensagem de             │
│   boas-vindas no WhatsApp           │
│   (instantaneamente)                │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   ⏰ Sistema agenda mensagens       │
│   automáticas conforme as           │
│   regras configuradas               │
│   (ex: lembrete 2 dias antes,       │
│    roteiro 5h antes do evento)      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   📲 Mensagens são enviadas         │
│   automaticamente no momento        │
│   programado para cada convidado    │
│   e seus acompanhantes              │
└─────────────────────────────────────┘
```

---

## 🏗️ Tecnologias Utilizadas

O sistema foi construído com tecnologias modernas que garantem **velocidade, segurança e escalabilidade**:

| Componente | Tecnologia | Benefício |
|---|---|---|
| Site / Interface | React + Vite | Experiência rápida e fluida |
| Hospedagem | Vercel | Alta disponibilidade mundial |
| Banco de Dados | Supabase | Dados seguros na nuvem |
| Automação | Inngest | Processamento confiável de mensagens |
| WhatsApp | ConnectyHub API | Envio profissional de mensagens |

---

## ✨ Diferenciais do Sistema

- **100% Online** — funciona em qualquer dispositivo com navegador
- **Comunicação Automática** — o convidado recebe mensagens sem intervenção manual
- **Personalização** — todas as mensagens usam o nome do convidado
- **Acompanhantes** — cada acompanhante recebe suas próprias mensagens individuais
- **Check-in Digital** — controle de presença no dia do evento com um clique
- **Múltiplos Administradores** — sistema de login com aprovação de novos usuários
- **Design Premium** — interface elegante e sofisticada, compatível com eventos de alto padrão

---

## 📈 Capacidades

- Suporta **número ilimitado de convidados**
- Até **2 acompanhantes por convidado** (cada um com mensagens individuais)
- **Múltiplas regras de automação** simultâneas
- **Envio de mensagens a cada minuto** (processamento contínuo)
- **Dashboard em tempo real** com dados sempre atualizados

---

*Documento gerado em 11 de fevereiro de 2026*
*Sistema desenvolvido pela equipe Pilger Eventos*
