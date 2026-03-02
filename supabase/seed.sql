-- Seed de dados para desenvolvimento local.
-- Usuários são criados pelo fluxo de cadastro da própria app (não via SQL),
-- pois o Supabase GoTrue valida senhas com sua própria implementação em Go.

-- Missões de exemplo (criadas sem vínculo com usuário específico)
INSERT INTO public.tasks (titulo, descricao, xp_reward, fc_reward, status, created_by)
SELECT
  'Missão Épica: Arrumar o Quarto',
  'O dragão da bagunça atacou novamente! Organize os brinquedos e faça a cama.',
  100, 10, 'active'::task_status,
  id
FROM public.profiles
WHERE role = 'parent'
LIMIT 1;

-- Recompensas da Taverna
INSERT INTO public.rewards (titulo, descricao, cost_fc, icon_type)
VALUES
  ('1 Hora de Videogame', 'Acesso liberado pro PS5. Válido só nos finais de semana!', 50, 'gamepad'),
  ('Noite da Pizza', 'Escolha o sabor da pizza no jantar de sexta.', 150, 'pizza'),
  ('Dormir 30min Mais Tarde', 'Fica acordado um pouco mais hoje à noite.', 30, 'moon');
