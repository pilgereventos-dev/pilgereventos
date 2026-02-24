# Guia de Integração WhatsApp via ConnectyHub / Evolution API

> **Finalidade:** Este documento serve como referência completa para uma IA replicar a integração com a API da ConnectyHub (baseada na Evolution API) para disparo de mensagens WhatsApp. Contém arquitetura, schema de banco de dados, endpoints, exemplos de código e boas práticas.

---

## 1. Visão Geral da Arquitetura

```
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│  Frontend    │────▸│  Vercel Functions  │────▸│  ConnectyHub API   │
│  (React)     │     │  (api/*.ts)        │     │  (Evolution-based) │
└──────────────┘     └────────┬──────────┘     └────────────────────┘
                              │
                     ┌────────▼──────────┐
                     │     Supabase      │
                     │  (PostgreSQL)     │
                     │  - app_config     │
                     │  - automation_rules│
                     │  - message_queue  │
                     └───────────────────┘
                              │
                     ┌────────▼──────────┐
                     │     Inngest       │
                     │  (Background Jobs)│
                     │  - Cron 1min      │
                     │  - Event-driven   │
                     └───────────────────┘
```

### Componentes Principais

| Componente | Descrição |
|---|---|
| **`api/send-whatsapp.ts`** | Envio direto de mensagem WhatsApp (ex: boas-vindas no cadastro) |
| **`api/inngest.ts`** | Handler Inngest que processa a fila de mensagens agendadas |
| **`api/triggers/signup.ts`** | Trigger que agenda mensagens quando um usuário se cadastra |
| **`api/triggers/schedule-rule.ts`** | Trigger que agenda mensagens para data fixa (broadcast) |
| **`api/cron/process-queue.ts`** | Fallback CRON para processar fila caso Inngest falhe |

---

## 2. Banco de Dados (Supabase / PostgreSQL)

### 2.1 Tabela `app_config`

Armazena credenciais da API e templates de mensagem. **Não use variáveis de ambiente para credenciais da API do WhatsApp** — salve-as no banco para permitir edição via painel admin.

```sql
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- Dados iniciais obrigatórios:
INSERT INTO app_config (key, value, description) VALUES
    ('connectyhub_api_url', 'https://api.connectyhub.com.br', 'URL Base da API ConnectyHub'),
    ('connectyhub_api_key', 'SUA_API_KEY_AQUI', 'API Key da ConnectyHub'),
    ('connectyhub_instance', 'NOME_DA_INSTANCIA', 'Nome da Instância WhatsApp'),
    ('welcome_message_template', 'Olá *{name}*! 👋 Bem-vindo!', 'Mensagem de Boas-vindas (WhatsApp)')
ON CONFLICT (key) DO NOTHING;
```

**Chaves usadas:**

| Key | Descrição |
|---|---|
| `connectyhub_api_url` | URL base da API (ex: `https://api.connectyhub.com.br`) |
| `connectyhub_api_key` | Chave de autenticação (header `apikey`) |
| `connectyhub_instance` | Nome da instância WhatsApp conectada |
| `welcome_message_template` | Template da mensagem de boas-vindas (suporta `{name}`, `{guest_summary}`) |

### 2.2 Tabela `automation_rules`

Define regras de automação para envio de mensagens.

```sql
CREATE TABLE automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('signup_relative', 'fixed_date')),
    trigger_value TEXT NOT NULL,  -- minutos (ex: "60") ou ISO date (ex: "2025-03-01T10:00")
    message_template TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Tipos de regra:**

| Tipo | `trigger_value` | Comportamento |
|---|---|---|
| `signup_relative` | Minutos após cadastro (ex: `"0"`, `"60"`, `"1440"`) | Agendamento individual por usuário |
| `fixed_date` | Data ISO (ex: `"2025-03-01T10:00"`) | Broadcast para todos os usuários |

**Variáveis disponíveis nos templates:** `{name}` (nome do destinatário)

### 2.3 Tabela `message_queue`

Fila de mensagens a serem enviadas.

```sql
CREATE TABLE message_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES guests(id),
    rule_id UUID REFERENCES automation_rules(id),
    content TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    target_phone TEXT,    -- telefone direto (para companions/contatos alternativos)
    target_name TEXT,     -- nome direto
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Status flow:** `pending` → `sent` | `failed`

---

## 3. API ConnectyHub / Evolution — Como Enviar Mensagem

### 3.1 Endpoint de Envio de Texto

```
POST {API_URL}/message/sendText/{INSTANCE_NAME}
```

### 3.2 Headers

```json
{
    "Content-Type": "application/json",
    "apikey": "SUA_API_KEY"
}
```

### 3.3 Body (Formato Simples — recomendado)

```json
{
    "number": "5511999998888",
    "text": "Olá! Esta é uma mensagem de teste."
}
```

### 3.4 Body (Formato Completo — com opções de presença)

```json
{
    "number": "5511999998888",
    "options": {
        "delay": 1200,
        "presence": "composing"
    },
    "textMessage": {
        "text": "Olá! Esta é uma mensagem de teste."
    }
}
```

> **⚠️ ATENÇÃO:** A API aceita ambos os formatos de body. O formato simples (`number` + `text`) é mais confiável e direto. O formato completo com `options` e `textMessage` adiciona efeitos visuais (typing indicator). **Use o formato simples em produção.**

### 3.5 Formatação do Telefone

O número deve ser enviado **sem formatação** e **com código do país (55 para Brasil)**:

```typescript
// Remover tudo que não é dígito
let number = phone.replace(/\D/g, '');

// Garantir prefixo 55 (Brasil)
if (!number.startsWith('55')) {
    number = '55' + number;
}

// Resultado: "5511999998888"
```

### 3.6 Resposta da API

**Sucesso:** HTTP 200/201 com JSON contendo detalhes da mensagem enviada.

**Erro:** HTTP 4xx/5xx com body de texto descrevendo o erro.

---

## 4. Código de Referência

### 4.1 Função de Envio Direto (Send WhatsApp)

Este é o padrão para enviar uma única mensagem WhatsApp imediatamente. Busca credenciais do banco e envia via fetch.

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { phone, name } = request.body;

    if (!phone || !name) {
        return response.status(400).json({ error: 'Missing phone or name' });
    }

    // 1. Inicializar Supabase (usar service role key para acesso admin)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return response.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Buscar credenciais da API no banco
    const { data: configData, error: configError } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
            'connectyhub_api_url',
            'connectyhub_api_key',
            'connectyhub_instance'
        ]);

    if (configError || !configData) {
        return response.status(500).json({ error: 'Failed to fetch API config' });
    }

    // Converter array para objeto key-value
    const config = configData.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
    }, {});

    const apiKey = config.connectyhub_api_key;
    const apiUrl = config.connectyhub_api_url;
    const instanceName = config.connectyhub_instance;

    if (!apiKey || !apiUrl || !instanceName) {
        return response.status(500).json({ error: 'API credentials not configured' });
    }

    // 3. Formatar telefone
    let number = phone.replace(/\D/g, '');
    if (!number.startsWith('55')) number = '55' + number;

    // 4. Enviar mensagem
    try {
        const apiResponse = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,  // ← Header 'apikey' (minúsculo)
            },
            body: JSON.stringify({
                number: number,
                text: `Olá ${name}! Mensagem de teste.`,
            }),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.text();
            throw new Error(`API Error: ${errorData}`);
        }

        const data = await apiResponse.json();
        return response.status(200).json({ success: true, data });

    } catch (error: any) {
        return response.status(500).json({ error: error.message });
    }
}
```

### 4.2 Padrão de Busca de Config (Reutilizável)

```typescript
async function getWhatsAppConfig(supabase: any) {
    const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
            'connectyhub_api_url',
            'connectyhub_api_key',
            'connectyhub_instance'
        ]);

    if (error || !data) throw new Error('Failed to fetch API configuration');

    const config = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
    }, {});

    const apiKey = config.connectyhub_api_key;
    const apiUrl = config.connectyhub_api_url;
    const instanceName = config.connectyhub_instance;

    if (!apiKey || !apiUrl || !instanceName) {
        throw new Error('API credentials not configured in database');
    }

    return { apiKey, apiUrl, instanceName };
}
```

### 4.3 Função de Envio (Reutilizável)

```typescript
async function sendWhatsAppMessage(
    config: { apiUrl: string; apiKey: string; instanceName: string },
    phone: string,
    text: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    // Formatar telefone
    let number = phone.replace(/\D/g, '');
    if (!number.startsWith('55')) number = '55' + number;

    try {
        const response = await fetch(
            `${config.apiUrl}/message/sendText/${config.instanceName}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.apiKey,
                },
                body: JSON.stringify({ number, text }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
```

---

## 5. Sistema de Fila de Mensagens (Message Queue)

### 5.1 Fluxo Completo

```
Usuário se cadastra
       │
       ▼
api/triggers/signup.ts
       │
       ├── Busca automation_rules ativas do tipo 'signup_relative'
       ├── Calcula scheduled_for = now() + trigger_value (minutos)
       ├── Insere na message_queue com status 'pending'
       └── Dispara evento Inngest "app/process.queue"
              │
              ▼
       api/inngest.ts  (ou api/cron/process-queue.ts como fallback)
              │
              ├── Busca mensagens pending onde scheduled_for <= now()
              ├── Para cada mensagem: envia via API ConnectyHub
              ├── Atualiza status para 'sent' ou 'failed'
              └── Se batch cheio (50), dispara próximo batch
```

### 5.2 Trigger de Cadastro (signup.ts)

**Endpoint:** `POST /api/triggers/signup`  
**Body:** `{ "guest_id": "uuid-do-convidado" }`

**Lógica:**
1. Busca todas as `automation_rules` ativas com `type = 'signup_relative'`
2. Para cada regra, calcula `scheduled_for = now() + trigger_value minutos`
3. Insere itens na `message_queue` com o template processado (`{name}` → nome real)
4. Dispara evento Inngest para processamento imediato

### 5.3 Trigger de Regra Agendada (schedule-rule.ts)

**Endpoint:** `POST /api/triggers/schedule-rule`  
**Body:** `{ "rule_id": "uuid-da-regra" }`

**Lógica:**
1. Busca a regra pelo ID
2. Só processa regras `type = 'fixed_date'`
3. Busca todos os guests e cria um item na fila para cada um

### 5.4 Processador de Fila com Inngest

**Evento:** `"app/process.queue"`  
**Cron:** A cada 1 minuto  
**Batch size:** 50 mensagens  
**Delay entre mensagens:** 500ms (para não sobrecarregar a API)

```typescript
// Padrão de processamento de fila
const messages = await supabase
    .from('message_queue')
    .select('*, guests(name, phone)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50);

for (const msg of messages) {
    const phone = msg.target_phone || msg.guests?.phone;
    if (!phone) {
        // Marcar como failed
        continue;
    }
    // Enviar e atualizar status
}

// Se batch estava cheio, disparar próximo
if (messages.length === 50) {
    await inngest.send({ name: "app/process.queue", data: {} });
}
```

---

## 6. Integração com Inngest (Background Jobs)

### 6.1 Dependências

```json
{
    "inngest": "^3.52.0"
}
```

### 6.2 Setup do Client

```typescript
import { Inngest } from "inngest";
const inngest = new Inngest({ id: "meu-projeto" });
```

### 6.3 Handler Vercel (api/inngest.ts)

```typescript
import { serve } from "inngest/node";
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "meu-projeto" });

const processQueue = inngest.createFunction(
    { id: "process-message-queue" },
    [
        { event: "app/process.queue" },   // event-driven
        { cron: "* * * * *" }              // cron backup (cada 1 min)
    ],
    async ({ step }) => {
        // ... lógica de processamento usando step.run()
    }
);

export default serve({
    client: inngest,
    functions: [processQueue],
});
```

### 6.4 Disparando Eventos

```typescript
// De qualquer lugar no backend:
await inngest.send({
    name: "app/process.queue",
    data: {}
});
```

### 6.5 Variáveis de Ambiente Necessárias (Vercel)

```
INNGEST_EVENT_KEY=...          # Para enviar eventos
INNGEST_SIGNING_KEY=...       # Para autenticação do handler
SUPABASE_URL=...              # URL do Supabase
SUPABASE_SERVICE_ROLE_KEY=... # Service role key (admin)
```

---

## 7. Deploy (Vercel)

### 7.1 Estrutura de Arquivos

```
projeto/
├── api/
│   ├── send-whatsapp.ts        → POST /api/send-whatsapp
│   ├── inngest.ts              → POST /api/inngest (Inngest handler)
│   ├── triggers/
│   │   ├── signup.ts           → POST /api/triggers/signup
│   │   └── schedule-rule.ts    → POST /api/triggers/schedule-rule
│   └── cron/
│       └── process-queue.ts    → POST /api/cron/process-queue
├── vercel.json
└── package.json
```

### 7.2 vercel.json

```json
{
    "rewrites": [
        { "source": "/api/:path*", "destination": "/api/:path*" },
        { "source": "/((?!api/|_next/|static/|assets/).*)", "destination": "/index.html" }
    ],
    "functions": {
        "api/**/*.ts": {
            "maxDuration": 60
        }
    }
}
```

### 7.3 Variáveis de Ambiente (Vercel Dashboard)

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (nunca expor no frontend!) |
| `VITE_SUPABASE_URL` | Mesma URL para o frontend Vite |
| `VITE_SUPABASE_ANON_KEY` | Anon key para o frontend |
| `INNGEST_EVENT_KEY` | Chave para enviar eventos ao Inngest |
| `INNGEST_SIGNING_KEY` | Chave para verificar requests do Inngest |

---

## 8. Boas Práticas e Lições Aprendidas

### ❌ Erros Comuns a Evitar

1. **Não use `process.env` em código client-side (Vite)** — Causa `process is not defined` no browser. Use `import.meta.env.VITE_*` no frontend.

2. **Não use `import.meta.env` em Vercel Functions** — Use `process.env` no backend.

3. **Não hardcode credenciais da API** — Salve na tabela `app_config` para que o admin possa editar pelo painel.

4. **O header de autenticação é `apikey` (minúsculo)** — Não use `Authorization: Bearer`, a API espera o header `apikey`.

5. **Sempre formate o telefone** — Remova caracteres não-numéricos e garanta o prefixo `55`.

6. **Não confie 100% no Inngest** — Implemente um CRON endpoint de fallback para processar a fila.

### ✅ Padrões Recomendados

1. **Fila de mensagens** — Nunca envie mensagens diretamente da ação do usuário (exceto boas-vindas). Use uma fila com agendamento.

2. **Delay entre envios** — Adicione 500ms-1000ms entre mensagens para evitar rate limiting.

3. **Batch processing** — Processe em lotes de 10-50 mensagens por execução.

4. **Fallback com CRON** — Se usar Inngest, tenha um endpoint CRON que roda a cada 1 minuto como backup.

5. **Status tracking** — Marque mensagens como `sent` ou `failed` para auditoria.

6. **Template variables** — Use `{name}` como placeholder e substitua com `.replace(/{name}/g, realName)`.

---

## 9. Checklist de Implementação

- [ ] Criar tabela `app_config` no Supabase
- [ ] Inserir credenciais ConnectyHub na `app_config`
- [ ] Criar tabela `message_queue` no Supabase
- [ ] Criar tabela `automation_rules` no Supabase (se usar automação)
- [ ] Implementar endpoint de envio direto (`send-whatsapp.ts`)
- [ ] Implementar sistema de fila (trigger + processador)
- [ ] Configurar Inngest (client + handler + functions)
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Registrar o Inngest app no dashboard Inngest Cloud
- [ ] Criar página admin para gerenciar credenciais (`Settings`)
- [ ] Criar página admin para gerenciar regras de automação (`Automation`)
- [ ] Testar envio individual
- [ ] Testar fila com agendamento
- [ ] Verificar logs no Vercel e Inngest dashboard

---

## 10. Referência Rápida da API

```bash
# Testar envio direto via cURL
curl -X POST "https://api.connectyhub.com.br/message/sendText/INSTANCE_NAME" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "number": "5511999998888",
    "text": "Mensagem de teste"
  }'
```

---

> **Nota:** Esta documentação foi extraída do projeto **Pilger Eventos** e adaptada como guia genérico. Adapte nomes de tabelas, variáveis e templates conforme as necessidades do novo projeto.
