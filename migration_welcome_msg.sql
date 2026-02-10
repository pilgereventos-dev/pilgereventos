-- Insert the default welcome message template into app_config
-- user can then edit it via the Admin Panel

INSERT INTO app_config (key, value, description)
VALUES (
  'welcome_message_template', 
  'Olá *{name}*! 👋

Sua presença no *Folia do Pilger* foi confirmada com sucesso! 🎭✨

🗓 *Data:* 16 de Fevereiro
📍 *Local:* Av. Carlos Drummond de Andrade, Praia Brava
⏰ *Horário:* 16h

{guest_summary}

Estamos ansiosos para te receber neste evento exclusivo!

_Este é um convite digital e pessoal._',
  'Mensagem de Boas-vindas (WhatsApp)'
) ON CONFLICT (key) DO NOTHING;
