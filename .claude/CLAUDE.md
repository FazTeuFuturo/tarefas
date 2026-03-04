# CLAUDE.md — Family Quest
> Manual de Conduta para Agentes de IA
> Última revisão: 2026-03-03

---

## ⚡ Leia isso primeiro

Este arquivo é sua **única fonte de verdade**. Antes de escrever qualquer linha de código, você lê este documento inteiro. Sem exceções.

Se uma instrução aqui contradiz algo que você "acha" que sabe sobre React, Supabase ou TypeScript — **este arquivo vence**.

---

## 1. O Projeto em 60 Segundos

**Family Quest** é uma PWA gamificada para tarefas familiares. Filhos ("Heróis") completam missões e ganham XP + moedas. Pais ("Mestres") criam missões, aprovam entregas e gerenciam recompensas na Taverna.

| Item | Valor |
|---|---|
| Stack | Vite 5 + React 18 + TypeScript 5.5 + Supabase |
| Deploy | Vercel (frontend) + Supabase Cloud (backend) |
| Supabase Project ID | `cgmpjzwtolnrwsctrerr` |
| Package name | `family-quest` |
| Auth storage key | `family-quest-auth-v3` |

---

## 2. Mapa da Arquitetura

```
family-quest/
├── src/
│   ├── main.tsx               # Entrypoint React (StrictMode)
│   ├── App.tsx                # Roteamento por role (AppRouter)
│   ├── index.css              # Design System global — CSS Variables + Neo-Brutalism
│   ├── contexts/
│   │   └── AuthContext.tsx    # Estado global: user + profile
│   ├── hooks/
│   │   └── useAppData.ts      # ← CÉREBRO DO APP. Todo acesso ao Supabase passa aqui.
│   ├── lib/
│   │   └── supabase.ts        # Singleton do cliente Supabase
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── hero/
│   │   │   └── HeroDashboard.tsx    # role=child
│   │   └── parent/
│   │       └── MasterDashboard.tsx  # role=parent
│   └── components/
│       ├── QuestCard.tsx          # Componente central — timer integrado
│       ├── QuestList.tsx
│       ├── Tavern.tsx
│       ├── RewardCard.tsx
│       ├── Inventory.tsx
│       ├── LeaderboardWidget.tsx
│       ├── StatusBar.tsx
│       ├── Mascot.tsx
│       ├── MissionEditModal.tsx
│       └── DeleteConfirmationModal.tsx
├── supabase/
│   ├── config.toml
│   └── migrations/            # Migrations versionadas (.sql) — NUNCA editar retroativamente
├── production_schema.sql      # Schema consolidado para emergências
└── .aios-core/                # Framework AIOS — agentes especializados
```

### Fluxo de Dados (siga este caminho, nunca crie atalhos)

```
Supabase Auth
    └─► AuthContext (user + profile)
            └─► AppRouter → HeroDashboard | MasterDashboard
                    └─► useAppData
                            ├─► Supabase DB (fetchAll com Promise.all)
                            └─► Callbacks (completeQuest, approveQuest, buyReward, timers…)
```

> **Regra de ouro:** Nenhum componente faz query direta ao Supabase. Tudo passa por `useAppData.ts`.

---

## 3. Banco de Dados

### Tabelas

| Tabela | Propósito |
|---|---|
| `profiles` | Usuários com role, XP, nível e FC |
| `tasks` | Missões com status, recompensas e timer |
| `rewards` | Itens da Taverna |
| `redemptions` | Log de compras dos Heróis (inventário) |

### Tipos Enum

```sql
user_role:   'parent' | 'child' | 'mestre'
task_status: 'pending' | 'active' | 'completed' | 'approved'
```

### Colunas Críticas de `tasks`

| Coluna | Tipo | Descrição |
|---|---|---|
| `status` | task_status | `active` = herói trabalhando; `pending` = aguarda aprovação |
| `is_recurring` | boolean | Se `true`, volta para `active` após aprovação |
| `assignee_id` | UUID\|null | `null` = qualquer herói pode pegar |
| `timer_status` | text | `idle` \| `running` \| `paused` |
| `timer_remaining_seconds` | integer | Persistido no DB |
| `timer_updated_at` | timestamptz | Base para recalcular elapsed ao recarregar |

### Lógica de Negócio — Não Reinvente

**XP e Level-Up:**
```typescript
const levelUpXP = profileToUpdate.nivel * 100 + 500;
// Se newXP >= levelUpXP → nivel++ e XP diminui o threshold
```

**Fluxo de Aprovação:**
```
Herói → "FEITO" → status: active → pending
Mestre aprova → XP + FC creditados → completed (ou active se is_recurring)
Mestre rejeita → status volta para active
```

**Timer:** persistido no DB; `setInterval` roda apenas no cliente. Ao recarregar, `QuestCard` recalcula com `Date.now() - timer_updated_at`.

**Taverna:** `buyReward()` insere em `redemptions` + decrementa `fc_balance`. `useReward()` muda status de `'unused'` → `'used'`.

---

## 4. Convenções — Siga ou Quebre o Projeto

### TypeScript & React

| Regra | Detalhe |
|---|---|
| Interfaces de dados | Definidas no arquivo onde são consumidas primariamente |
| `Quest` | Definida em `QuestCard.tsx` |
| `LeaderboardEntry`, `Reward`, `Redemption` | Definidas em `useAppData.ts` |
| `Profile` | Definida em `AuthContext.tsx` |
| Nomenclatura do banco | **PT-BR** (`titulo`, `descricao`, `nome`, `nivel`) |
| Nomenclatura de código | **EN** (`profile`, `quest`, `reward`) |
| Tipagem de componentes | `React.FC<Props>` — explícita, sempre |
| Hooks customizados | Retornam **objetos nomeados**, nunca arrays |
| `useCallback` | Obrigatório para funções passadas como props ou usadas em `useEffect` |

### CSS — Sem Tailwind. Sem Exceções.

Use exclusivamente as CSS Variables do Design System em `index.css`.

**Variáveis disponíveis:**
```css
/* Cores */
--color-primary, --color-secondary, --color-tertiary
--color-success, --color-danger, --color-warning
--color-background, --color-surface, --color-border

/* Espaçamento */
--space-1 até --space-8

/* Tipografia */
--font-size-sm, --font-size-base, --font-size-lg, --font-size-xl
```

**Classes utilitárias do projeto:**
`neo-box`, `neo-button`, `neo-input`, `neo-label`, `neo-spinner`,
`flex`, `flex-col`, `gap-2`, `gap-3`, `items-center`, `justify-between`, `w-full`

**Estética:** Neo-Brutalism — bordas sólidas, sombras deslocadas, peso de fonte 800.

### Arquivos e Nomes

- Componentes: `PascalCase.tsx`
- Hooks: `camelCase.ts` com prefixo `use`
- CSS: única folha global (`index.css`) — não criar arquivos CSS adicionais
- Sem barril exports (`index.ts`)

---

## 5. Hard Limits — O "Não" em Negrito

> Violar qualquer item abaixo quebra o projeto ou cria risco de segurança real.

### ❌ Nunca faça

- **Nunca commite `.env`** com credenciais reais
- **Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend** — apenas em scripts server-side
- **Nunca faça query direta ao Supabase fora de `useAppData.ts`**
- **Nunca use `.select('*')`** em tabelas com dados sensíveis — selecione colunas explícitas
- **Nunca edite migrations já executadas** — crie uma nova migration
- **Nunca rode migrations automáticas sem revisão manual**
- **Nunca crie componentes com valores de estilo hardcoded** — use CSS Variables
- **Nunca deixe `console.log` de debug no código final**
- **Nunca silencie erros** com catch vazio — no mínimo `console.error`
- **Nunca instale Tailwind** — o Design System já existe

### ⚠️ Dívida Técnica Conhecida (não agravar)

- RLS com `USING (true)` — permissivo, não escalar sem corrigir
- `approveQuest()` faz operações em sequência sem transação — risco de inconsistência
- Sem validação de XP/FC negativo no frontend

---

## 6. Segurança — Checklist Antes de Qualquer Commit

- [ ] Nenhuma credencial real no código ou no `.env` commitado
- [ ] `profile.role` verificado antes de operações privilegiadas (`create/delete task`, `approveQuest`)
- [ ] Nova tabela tem `ALTER TABLE nome ENABLE ROW LEVEL SECURITY;` + políticas baseadas em `auth.uid()`
- [ ] Nenhum input de usuário injetado diretamente em queries
- [ ] `storageKey` incrementado (`family-quest-auth-vN`) se houver DB Reset

---

## 7. Checklist de Feature — Do Zero ao Merge

Toda feature deve passar por **todos** os itens antes de ser considerada concluída.

### 📐 Planejamento
- [ ] Alinhada com o PRD (`PRD_Family_Quest.md`)
- [ ] Modelo de dados definido (novos campos? nova tabela?)
- [ ] Impacto em `useAppData.ts` mapeado (novo fetch? nova mutation?)
- [ ] Roles afetados identificados (`parent`, `child`, ambos?)

### 🗄️ Banco de Dados
- [ ] Migration criada em `supabase/migrations/` com nome `YYYYMMDDHHMMSS_descricao.sql`
- [ ] `production_schema.sql` atualizado se necessário
- [ ] RLS habilitado com políticas baseadas em `auth.uid()`
- [ ] Trigger/função criada com `SECURITY DEFINER SET search_path = public`
- [ ] Se precisar de updates ao vivo:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE nova_tabela;
  ```

### 💻 Frontend
- [ ] Interface TypeScript definida para o novo tipo de dado
- [ ] Novo `useCallback` em `useAppData.ts` se houver operação de escrita
- [ ] `fetchAll()` chamado após mutations para sincronizar estado
- [ ] Loading state tratado (esqueleto ou spinner)
- [ ] Estado de erro tratado (não silenciar)
- [ ] Visibilidade controlada por `profile.role`
- [ ] Estilos usando apenas CSS Variables existentes
- [ ] Responsivo para mobile (app é mobile-first)

### 🔐 Segurança
- [ ] Operações privilegiadas verificam `profile.role` antes de executar
- [ ] Nenhuma `SERVICE_ROLE_KEY` no frontend
- [ ] Inputs validados no cliente

### ✅ Qualidade
- [ ] `npm run lint` passa sem erros
- [ ] `npm run build` passa sem erros de TypeScript
- [ ] Testado como Herói (role=child)
- [ ] Testado como Mestre (role=parent)
- [ ] Testado com empty state (sem dados)
- [ ] Sem `console.log` de debug

### 🚀 Deploy
- [ ] Variáveis de ambiente atualizadas no Vercel (se novas vars adicionadas)
- [ ] Migration executada no Supabase de produção
- [ ] PR revisado antes do merge para `main`

---

## 8. Variáveis de Ambiente

| Variável | Onde usar | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (Vite) | ✅ Obrigatória |
| `VITE_SUPABASE_ANON_KEY` | Frontend (Vite) | ✅ Obrigatória — pública por design |
| `SUPABASE_URL` | Scripts server-side | Opcional |
| `SUPABASE_ANON_KEY` | Scripts server-side | Opcional |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts server-side APENAS | ⚠️ NUNCA no frontend |

> **Prefixo `VITE_`** é obrigatório para qualquer variável exposta ao bundle do Vite.

---

## 9. Comandos de Sobrevivência

```bash
# Desenvolvimento
npm run dev              # Servidor Vite → http://localhost:5173

# Qualidade (rode antes de qualquer commit)
npm run lint             # ESLint
npm run build            # TypeScript check + build
npm run validate         # build + lint juntos

# Supabase local
npx supabase start
npx supabase db reset
npx supabase migration new <nome>
npx supabase db push

# Utilitários
node confirm_users_v2.js    # Confirma emails manualmente
node debug_users.js         # Lista usuários no banco

# AIOS Core
npm run sync:ide             # Sincroniza skills com o IDE
npm run validate:agents      # Valida estrutura de agentes
```

---

## 10. Agentes AIOS Disponíveis

O framework **Synkra AIOS** está configurado em `.aios-core/`.

| Atalho | Agente | Use para |
|---|---|---|
| `@architect` | Architect | Arquitetura e design de sistema |
| `@dev` | Dev | Implementação de features |
| `@qa` | QA | Testes e qualidade |
| `@devops` | DevOps | CI/CD, migrations, deploy |
| `@pm` | PM | Priorização e roadmap |
| `@ux-design-expert` | UX | Design de interfaces |

Consulte `AGENTS.md` para a lista completa e `constitution.md` para as regras do framework.

---

*Este arquivo é lei. Mantenha-o atualizado a cada sprint.*
*Fonte de verdade para qualquer agente de IA trabalhando neste repositório.*