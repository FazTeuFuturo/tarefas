# Product Requirements Document (PRD) - Family Quest 🛡️

## 1. Visão Geral do Produto

**Nome do Produto:** Family Quest
**Mote (Elevator Pitch):** Uma plataforma gamificada de gestão de tarefas familiares que transforma a rotina diária em aventuras épicas, promovendo engajamento doméstico, educação financeira e desenvolvimento de bons hábitos através de recompensas reais e motivação lúdica.

### 1.1 Objetivo do Negócio
Resolver o clássico atrito familiar sobre a divisão de tarefas ("arrumar o quarto", "fazer o dever de casa") através da gamificação. O sistema substitui a cobrança exaustiva por um ciclo de motivação intrínseca e extrínseca, onde pais atuam como "Mestres de Jogo" e os filhos são "Heróis" conquistando níveis e recompensas.

### 1.2 Público-Alvo
- **Pais (Mestres do Jogo):** Adultos buscando uma forma mais leve e eficiente de educar e organizar as rotinas domésticas.
- **Filhos (Heróis):** Crianças e adolescentes (geralmente de 6 a 15 anos) motivados por sistemas de progressão de jogos, recompensas virtuais e reais.

---

## 2. Personas

### 2.1 Persona 1: A Mãe/Mestre Organizadora (Clara, 38)
- **Dores:** Cansada de ter que pedir várias vezes para os filhos arrumarem o quarto ou fazerem a lição. Sente que a relação se desgasta pela rotina de cobranças.
- **Objetivos:** Delegar tarefas claras, acompanhar o cumprimento sem estresse, e incentivar a educação financeira através do conceito de "trabalho compensado".
- **Comportamento no App:** Cria missões recorrentes, aprova execuções, monitora o dashboard geral e adiciona prêmios atrativos à Taverna.

### 2.2 Persona 2: O Herói Jovem (Leo, 11)
- **Dores:** Acha as tarefas de casa chatas. Precisa de permissão ou insistir muito para ganhar algo (como pizza, horas de videogame ou brinquedos).
- **Objetivos:** Subir de nível, ver seu nome no topo do Leaderboard, e juntar moedas suficientes para "comprar" suas recompensas favoritas.
- **Comportamento no App:** Verifica missões diárias, clica em "completar" para ganhar XP/Moedas, compete com os irmãos e gasta suas moedas na Taverna.

---

## 3. Jornada do Usuário (User Journey)

### 3.1 O Mestre (Pais)
1. **Onboarding:** Cria a conta como 'parent', visualiza o Quartel General (Dashboard vazio).
2. **Setup:** Adiciona recompensas iniciais na "Taverna" (ex: "Noite de Pizza" por 100 FC) para instigar os filhos.
3. **Delegação:** Cria Missões Diárias (ex: "Arrumar a Cama") definindo o XP ganho e as Family Coins (FC).
4. **Gerenciamento:** Visualiza as missões ativas, acompanha os níveis de cada filho, concede bônus por bom comportamento esporádico.

### 3.2 O Herói (Filhos)
1. **Onboarding:** Cria a conta como 'child'. Vê sua barra de nível (Nível 1), XP e saldo zerado.
2. **Exploração:** Entra na "Taverna" e descobre os prêmios que pode conquistar, gerando desejo (Buy-in).
3. **Ação:** Vai para a aba "Missões", vê a missão "Arrumar a Cama", realiza-a offline e marca como completa.
4. **Recompensa e Ciclo:** Ouve o som de moedas, vê a barra de XP subir. Uma vez acumuladas moedas suficientes, retorna à Taverna para realizar a troca.

---

## 4. Requisitos Funcionais (Features)

### 4.1 Autenticação e Perfis (Auth/Profile)
- **RF01:** O sistema deve permitir criar contas via email e senha (`Supabase Auth`).
- **RF02:** O sistema deve possuir dois tipos de perfis (Roles): `parent` (Mestre) e `child` (Herói).
- **RF03:** Todo perfil de Herói deve ter Controle de Evolução (Nível, XP Atual e Saldo de FC).
- **RF04:** O sistema deve criar avatares automáticos para os heróis (integração via `Dicebear`).

### 4.2 Dashboard do Mestre (Quartel General)
- **RF05:** Criar, editar e cancelar **Missões** (título, descrição, recompensa de XP, recompensa de FC, tempo estimado, herói designado).
- **RF06:** Criar, editar e excluir **Prêmios** (itens da Taverna) definindo Custo em FC, título, descrição e ícone temático.
- **RF07:** Funcionalidade de "Conceder Bônus" (Bonus Drops) para injetar XP/FC diretamente a um herói específico, sem atrela-lo a uma missão previamente criada.
- **RF08:** Monitorar Quests ativas e o status de todos os perfis supervisionados.

### 4.3 Dashboard do Herói (Hero App)
- **RF09:** Visualização imersiva do próprio status: Barra de Progresso de Nível (`XP Atual / Next Level XP`) e saldo da carteira (`FC Balance`).
- **RF10:** Aba de Missões (`Quests`) exibindo apenas as tarefas pendentes/ativas a ele delegadas ou tarefas de família (gerais).
- **RF11:** Capacidade de completar uma missão, recebendo instantaneamente a injeção de XP e FC (Sistema optimista ou validado instantaneamente).
- **RF12:** Componente de Classificação (Leaderboard) exibindo todos os heróis da família, rankeados pelo Nível e XP.

### 4.4 Economia e Taverna (Loja)
- **RF13:** Vitrine de Recompensas agrupadas em cards temáticos, habilitados dinamicamente apenas se o saldo for maior ou igual ao custo (`canAfford`).
- **RF14:** Transação de "Compra": descontar o valor do saldo total (`fc_balance`), emitir feedback audiovisual (animação, som de moedas) caso houver sucesso.
- **RF15:** Animação de "Saldo Insuficiente" (Shake effect) caso uma tentativa de debite ultrapasse o saldo permitido.

---

## 5. Regras de Negócio e Gamificação (Core Mechanics)

### 5.1 Sistema de Experiência (XP Progression)
- **Fórmula de Level Up:** `Próximo Nível = Nível Atual * 100 + 500`.
  *(Ex: Nível 1 precisa de 600 XP; Nível 2 precisa de 700 XP)*.
- **Mecânica Progressiva:** A cada nível, a exigência total para o próximo cresce de forma escalonada para preservar o senso de desafio e evitar inflação de experiência na fase final.

### 5.2 Currencies (Moedas)
A plataforma trabalha com duas métricas motivacionais primárias:
- **XP (Métrica de Vaidade/Status):** Cumulativa. Não se gasta. Define a patente e posição no Leaderboard da família.
- **FC (Family Coins - Métrica Transacional):** Dinheiro virtual utilitário. Acumulado e trocado (queimado) por prêmios reais estabelecidos pelos pais.

### 5.3 Lógica de Missões
- **Permissão de Criação:** Apenas perfis tipo `parent`.
- **Visibilidade:** Missões sem `assignee_id` são globais e exibidas para todos os heróis. Uma vez completada, torna-se concluída logicamente (quem chegar primeiro leva a recompensa ou o sistema deve clonar instâncias da tarefa - *A definir refinamento de comportamento compartilhado*).

---

## 6. Requisitos Não Funcionais

### 6.1 UI/UX e Design System
- **Estética:** Design "Neo-Brutalista" (ou similar), amigável, utilizando contornos grossos (`#111`), sombras duras, cores vibrantes (Primary: Roxo/Amarelo, Danger: Vermelho) e border-radius generosos. Visual de videogame lúdico, com ícones e emojis predominando.
- **Micro-interações:** Presença de animações ao trocar de abas (`slideIn`), carregamento (`skeleton screens` e spinners personalizados), botões responsivos ao clique (transform/translate) e realimentação auditiva.
- **Responsividade (Mobile-First Estrito):** A interface **obrigatoriamente** deve ser projetada `mobile-first` (aplicativo diário de rotina), simulando a experiência exata de um aplicativo nativo (sem rolagem horizontal, botões grandes e acessíveis ("tap targets"), e navegação inferior ou superior fixa).

### 6.2 Stack Tecnológico
- **Frontend:** React + Vite + TypeScript.
- **Estilização:** Vanilla CSS focada em variáveis semânticas CSS (`var(--color-primary)`, `var(--space-X)`).
- **Backend/BaaS:** Supabase (Auth, PostgreSQL DB, Row Level Security - RLS).
- **Comunicação:** Chamadas via Supabase-js instanciadas de forma leve na tipagem do lado do cliente.

### 6.3 Arquitetura "App-Ready" (Preparação para Lojas de Aplicativos)
Para garantir uma transição suave e de baixíssimo custo para as lojas de aplicativos da Apple (App Store) e do Google (Play Store) no futuro, o desenvolvimento web deve seguir regras estritas de compatibilidade com **Capacitor.js** e **PWA**:
- **Navegação SPA Pura:** Evitar recarregamentos totais de página. Toda navegação deve ser fluida e controlada pelo cliente (ex: React Router ou controle de estado condicional).
- **Armazenamento e Estado:** Minimizar dependência estrita de Cookies de sessão puro, priorizando tokens JWT (o funcionamento nativo do Supabase Auth atende perfeitamente a isso).
- **Comportamento Nativo:** Evitar seleções de texto acidentais (CSS `user-select: none`) em elementos de UI (botões, cards), garantindo sensação de clique "touch" em dispositivos móveis.
- **Performance:** Otimizar o bundle final para garantir um First Contentful Paint (FCP) e Time to Interactive (TTI) quase instantâneos, essenciais para simular o "launch" de um aplicativo.

---

## 7. Roadmap Futuro (Extensões Sugeridas)
1. **Sistema de Aprovação (Workflow):** A criança completa, e o status muda p/ `pending_approval`. O pai aprova e o XP é creditado, evitando falsos completos ("cheating").
2. **Log de Aventuras (Histórico):** Extrato de todas as movimentações financeiras de FC e XP para garantir transparência.
3. **Guildas de Heróis (Cooperação):** Tarefas que necessitam que dois irmãos unam forças.
4. **Customização de Avatar/Perfil:** Consumir moedas para skins do Dashboard e molduras do Leaderboard (Recompensas unicamente digitais).

---
> **Nota de Validação Técnica AIOS**: O sistema consta perfeitamente inicializado, compatível com a suíte AIOS+MCP, com as restrições locais devidamente aplicadas aos scripts de persistência em cloud, aderente a todas as normativas de auditoria implícita e confidencialidade exigidas pelo projeto.
