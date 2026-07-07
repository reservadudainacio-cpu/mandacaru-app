/*
# Atualizar categorias e adicionar produtos iniciais

1. Alterações
- Remove categorias antigas
- Cria novas categorias na ordem: Esfiha Tradicional, Esfihas Doce, Esfihas Especiais, Bebidas, Espetos
- Adiciona produtos de exemplo para cada categoria

2. Categorias
- Esfiha Tradicional: Esfihas clássicas de carne e queijo
- Esfihas Doce: Esfihas doces variadas
- Esfihas Especiais: Esfihas com ingredientes especiais
- Bebidas: Refrigerantes, sucos e drinks
- Espetos: Espetos simples e completos
*/

-- Remove categorias antigas
DELETE FROM categorias WHERE 1=1;

-- Insere novas categorias na ordem correta
INSERT INTO categorias (nome, descricao, ordem) VALUES
('Esfiha Tradicional', 'Esfihas clássicas de carne e queijo', 1),
('Esfihas Doce', 'Esfihas doces variadas', 2),
('Esfihas Especiais', 'Esfihas com ingredientes especiais', 3),
('Bebidas', 'Refrigerantes, sucos e drinks', 4),
('Espetos', 'Espetos simples e completos', 5);

-- Adiciona produtos de exemplo
INSERT INTO produtos (nome, descricao, preco, custo, categoria_id, estoque_atual, unidade, ativo)
SELECT 'Esfiha de Carne', 'Esfiha tradicional de carne moída temperada', 5.00, 1.80, id, 100, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Queijo', 'Esfiha recheada com queijo mussarela', 5.00, 1.50, id, 100, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha Mista', 'Carne e queijo juntos', 6.00, 2.20, id, 80, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Frango', 'Frango desfiado temperado', 5.50, 1.90, id, 80, 'un', true FROM categorias WHERE nome = 'Esfiha Tradicional'
UNION ALL
SELECT 'Esfiha de Chocolate', 'Recheio cremoso de chocolate', 6.00, 2.00, id, 60, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Goiabada', 'Goiabada com queijo (Romeu e Julieta)', 6.00, 2.10, id, 50, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Leite Ninho', 'Creme de leite ninho com leite condensado', 7.00, 2.50, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Banana', 'Banana com canela e açúcar', 5.50, 1.80, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Doce'
UNION ALL
SELECT 'Esfiha de Carne com Queijo', 'Carne especial com queijo gratinado', 7.00, 2.80, id, 60, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Calabresa', 'Calabresa com cebola e queijo', 7.50, 2.50, id, 50, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Bacon', 'Bacon crocante com queijo', 8.00, 3.00, id, 40, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha de Palmito', 'Palmito com molho especial', 8.50, 3.20, id, 30, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Esfiha Portuguesa', 'Presunto, queijo, ovo e ervilha', 9.00, 3.50, id, 30, 'un', true FROM categorias WHERE nome = 'Esfihas Especiais'
UNION ALL
SELECT 'Refrigerante Lata', 'Coca, Guaraná ou Fanta 350ml', 5.00, 2.00, id, 100, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Refrigerante 600ml', 'Coca, Guaraná ou Fanta', 7.00, 3.00, id, 80, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Refrigerante 2L', 'Coca, Guaraná ou Fanta', 10.00, 5.00, id, 50, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Suco Natural', 'Laranja, Limão ou Maracujá 400ml', 7.00, 2.50, id, 60, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Água Mineral', 'Água mineral 500ml', 3.00, 1.00, id, 100, 'un', true FROM categorias WHERE nome = 'Bebidas'
UNION ALL
SELECT 'Espeto Simples - Carne', 'Espeto de carne bovina', 12.00, 5.00, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Simples - Frango', 'Espeto de frango', 10.00, 4.00, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Simples - Linguiça', 'Espeto de linguiça calabresa', 11.00, 4.50, id, 40, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo - Carne', 'Carne, queijo, bacon e farofa', 18.00, 7.00, id, 30, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo - Frango', 'Frango, queijo, bacon e farofa', 16.00, 6.00, id, 30, 'un', true FROM categorias WHERE nome = 'Espetos'
UNION ALL
SELECT 'Espeto Completo Misto', 'Carne, frango, queijo, bacon e farofa', 22.00, 9.00, id, 20, 'un', true FROM categorias WHERE nome = 'Espetos';