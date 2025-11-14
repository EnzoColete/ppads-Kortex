# Kortex – Gestão Pessoal Empresarial

Aplicação Next.js que integra Prisma, Supabase e Tailwind para gerenciar clientes, fornecedores, ordens de serviço e fluxos financeiros. Este guia descreve tudo o que um desenvolvedor precisa para preparar e executar o projeto localmente.

## Pré-requisitos
- Node.js 20 LTS ou superior (inclui `npm`)
- Banco PostgreSQL acessível (Supabase ou instância própria)
- Accesso ao terminal com `git`

## Passo a passo
1. **Clonar o repositório**
   ```bash
   git clone <url-do-repo>
   cd ppads-Kortex-main
   ```
2. **Instalar dependências**
   ```bash
   npm install
   ```
3. **Configurar variáveis de ambiente**  
   Crie um arquivo `.env` na raiz (ou duplique o existente) e preencha com valores válidos do seu projeto Supabase/Postgres:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon-do-supabase>

   DATABASE_URL=postgresql://<usuario>:<senha>@<host>:<porta>/<banco>

   DEFAULT_ADMIN_NAME="Administrador do Sistema"
   DEFAULT_ADMIN_EMAIL="admin@exemplo.com"
   DEFAULT_ADMIN_PASSWORD="SenhaSegura123!"
   ```
   > Estas variáveis são lidas pelo Next.js e pelo Prisma; sem elas a aplicação não inicia.
4. **Preparar o Prisma**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
5. **Popular usuário administrador (opcional, mas recomendado em ambientes vazios)**
   ```bash
   npm run bootstrap:auth
   ```
6. **Executar o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`. A tela de login está em `/auth/login`.

## Comandos úteis
- `npm run lint` – valida o código com ESLint/TypeScript
- `npm run build` – produz o bundle otimizado
- `npm run start` – sobe o servidor em modo produção (rodar após `npm run build`)

## Dicas
- Ao alterar o schema do Prisma, gere novamente o cliente (`npm run prisma:generate`) antes de iniciar o dev server.
- Para ambientes de produção, mantenha as chaves e `DATABASE_URL` em cofres/variáveis gerenciadas (Vercel, Docker secrets etc.).
