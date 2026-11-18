# Mogno Brechó

Sirva a raiz com `python3 -m http.server 8000` e abra `http://localhost:8000` para desenvolvimento. Em produção, publique os arquivos estáticos em um domínio HTTPS.

## Configurar o Supabase

1. Crie um projeto no [painel do Supabase](https://supabase.com/dashboard). No **SQL Editor**, abra uma consulta nova. Copie todo o conteúdo do [arquivo de migração](supabase/migrations/20261118000000_store.sql), da primeira linha `begin;` até a última linha `commit;`. Cole na consulta e clique em **Run** sem deixar um trecho selecionado. Execute a migração uma vez em um projeto novo.
2. Em **Authentication → Users**, crie ou convide a pessoa que administra a loja. Autorize-a no SQL Editor com o UUID exibido no painel:

   ```sql
   insert into public.store_admins (user_id)
   values ('UUID_DA_CONTA_ADMINISTRADORA');
   ```

3. Preencha [js/store-config.js](js/store-config.js) com a URL HTTPS do projeto, a chave pública **Publishable** (ou **anon**) e o número comercial do WhatsApp em dígitos, com DDI 55 e DDD. Chaves `service_role` e `sb_secret_` ficam fora do site.
4. Abra **Área da loja** no rodapé, entre com a conta criada e cadastre as peças reais. O catálogo de demonstração só aparece enquanto a conexão estiver sem configuração. Os cadastros antigos que estavam apenas no navegador precisam ser recadastrados com as informações e fotos reais.
5. Teste com uma peça real em duas sessões. Na primeira, adicione a peça à sacola, registre um pedido e confira o link gerado. Na segunda, localize o pedido pelo código no painel e confirme a venda após combinar o pagamento. A peça aparece como vendida quando a vitrine é recarregada.

Se o SQL Editor cortar a colagem, use os três arquivos menores abaixo em um projeto onde a migração ainda não foi aplicada. Execute cada arquivo em uma consulta nova, na ordem indicada. Passe ao próximo arquivo depois que o anterior terminar com sucesso.

1. [Tabelas e permissões](supabase/sql-editor/01-tabelas-e-permissoes.sql)
2. [Registro de pedidos](supabase/sql-editor/02-registro-de-pedidos.sql)
3. [Vendas e imagens](supabase/sql-editor/03-vendas-e-imagens.sql)

Os três arquivos juntos aplicam a mesma migração do passo 1. Depois deles, siga para o cadastro do administrador no passo 2.

## Como a venda funciona

O banco registra os itens, o preço e o número do pedido. A compradora usa esse número para continuar no WhatsApp, onde combina pagamento e entrega. O pedido pendente não bloqueia a peça. Ao confirmar uma venda, o banco atualiza o estoque na mesma transação. Se outra venda já consumiu uma peça do pedido, a confirmação falha sem vender as demais. Pedidos pendentes podem ser cancelados pelo painel.

O Supabase Auth autentica a equipe e as políticas de acesso limitam os dados de pedidos e as alterações de estoque a administradores cadastrados. O catálogo e as imagens das peças são públicos.
