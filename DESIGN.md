---
version: alpha
name: Mogno Brechó
description: Brechó de Aracaju com linguagem de curadoria e uma vitrine em tons de mogno, papel e sálvia.
colors:
  madeira: "#7A3B22"
  areia: "#F7EDDA"
  papel: "#FFF8EC"
  salvia: "#234139"
  carvao: "#1B1512"
---

A base fica em `css/styles.css`. O arquivo `css/refinements.css` aplica a identidade visual do frontend fornecido e define as cores finais da vitrine. O mogno (`--c-magno-primary`) destaca ações, o papel (`--c-white`) delimita os cartões e a areia (`--c-sand-50`) forma o fundo. A fonte local Spicy Rice dá caráter aos títulos da vitrine. Playfair Display e Plus Jakarta Sans sustentam os títulos auxiliares e os formulários.

A vitrine usa araras e cabides para roupas, uma seção própria para acessórios e uma visualização com inclinação e zoom nos detalhes. As imagens e texturas de marca ficam em `assets/`. O catálogo conectado usa as fotos cadastradas no Supabase. A sacola informa o subtotal e o estado do pedido junto à ação. O painel reaproveita cartões, botões e mensagens existentes. Confirmações de venda, cancelamento e exclusão usam um diálogo nativo. A interface usa português do Brasil e valores em reais.
