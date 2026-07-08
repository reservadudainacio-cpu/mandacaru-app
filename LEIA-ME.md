# 🍕 Mandacaru - Painel Administrativo

Sistema completo de gestão para **Mandacaru - Esfihas & Jantinha**, com controle de pedidos, delivery, estoque, financeiro e cardápio digital.

## ✨ Melhorias Visuais Recentes

O projeto recebeu uma atualização visual completa! Confira o arquivo [IMPROVEMENTS.md](./IMPROVEMENTS.md) para detalhes sobre todas as melhorias implementadas.

### Destaques:
- 🎨 **Sistema de design moderno** com paleta de cores personalizada
- 🧩 **Componentes reutilizáveis** (Button, Card, Badge)
- 💫 **Animações suaves** e micro-interações
- 🪟 **Glassmorphism** no header e elementos
- 📱 **Totalmente responsivo**
- ⚡ **Performance otimizada**

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn

### Instalação

1. **Instalar dependências**:
```bash
npm install
```

2. **Configurar variáveis de ambiente**:
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

3. **Executar em desenvolvimento**:
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`

### Preview do Build

```bash
npm run preview
```

## 📁 Estrutura do Projeto

```
project/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/             # Componentes base reutilizáveis
│   │   │   ├── Button.tsx  # Botão customizado
│   │   │   ├── Card.tsx    # Sistema de cards
│   │   │   └── Badge.tsx   # Badges e tags
│   │   ├── Header.tsx      # Header principal
│   │   ├── Layout.tsx      # Layout base
│   │   ├── HomePage.tsx    # Página inicial
│   │   ├── LoginPage.tsx   # Página de login
│   │   └── ...             # Outros componentes
│   ├── contexts/           # Contextos React
│   ├── lib/               # Bibliotecas e utilidades
│   ├── types/             # Tipos TypeScript
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Entry point
│   └── index.css          # Estilos globais
├── public/                # Arquivos estáticos
├── tailwind.config.js     # Configuração Tailwind
├── vite.config.ts         # Configuração Vite
└── package.json           # Dependências
```

## 🎨 Novos Componentes UI

### Button Component
Botão versátil com múltiplas variantes e tamanhos:

```tsx
import { Button } from './components/ui/Button';
import { Save } from 'lucide-react';

// Botão primário
<Button variant="primary" size="md">
  Salvar
</Button>

// Com ícone
<Button 
  variant="secondary" 
  leftIcon={<Save className="w-4 h-4" />}
>
  Salvar
</Button>

// Com loading
<Button isLoading>
  Processando
</Button>
```

### Card Component
Sistema modular de cards:

```tsx
import { Card, CardHeader, CardBody, CardFooter } from './components/ui/Card';

<Card hover gradient>
  <CardHeader>
    <h3>Título do Card</h3>
  </CardHeader>
  <CardBody>
    <p>Conteúdo do card aqui</p>
  </CardBody>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

### Badge Component
Badges para status e notificações:

```tsx
import { Badge } from './components/ui/Badge';

<Badge variant="success">Ativo</Badge>
<Badge variant="danger" pulse>Urgente</Badge>
<Badge variant="warning" size="lg">Pendente</Badge>
```

## 🎯 Funcionalidades

### Áreas do Sistema
- 🏠 **Início**: Dashboard com visão geral
- 🍽️ **Atendimento**: Gestão de pedidos no salão
- 🚚 **Delivery**: Controle de entregas
- 🌐 **Pedidos Online**: Pedidos do cardápio digital
- 💰 **Financeiro**: Controle de receitas e despesas
- 📦 **Produtos**: Gestão do cardápio
- 📊 **Estoque**: Entrada e saída de produtos
- ⚙️ **Configurações**: Ajustes do sistema

### Cardápio Digital
Acesse `?cardapio=true` na URL para ver o cardápio público que os clientes podem usar para fazer pedidos online.

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool moderna
- **Tailwind CSS** - Framework CSS
- **Supabase** - Backend e banco de dados
- **Lucide React** - Ícones
- **Recharts** - Gráficos

## 🎨 Paleta de Cores

### Laranja (Primary)
- Base: `#f97316`
- Variações: 50 a 900

### Vermelho (Accent)
- Base: `#ef4444`
- Variações: 50 a 900

### Neutros
- Cinzas do Tailwind
- Branco e preto

## 📱 Responsividade

O sistema é totalmente responsivo e funciona perfeitamente em:
- 📱 **Mobile**: 320px a 768px
- 📲 **Tablet**: 768px a 1024px
- 💻 **Desktop**: 1024px+
- 🖥️ **Large Desktop**: 1440px+

## 🔐 Autenticação

O sistema possui autenticação via Supabase. Apenas usuários autorizados podem acessar o painel administrativo.

O cardápio digital é público e não requer autenticação.

## 🚧 Desenvolvimento Futuro

Sugestões de melhorias futuras:
- [ ] Dark mode
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Relatórios em PDF
- [ ] Integração com WhatsApp Business API
- [ ] Sistema de fidelidade
- [ ] Cupons de desconto
- [ ] Múltiplos idiomas

## 📄 Licença

Este projeto é proprietário e desenvolvido exclusivamente para **Mandacaru - Esfihas & Jantinha**.

## 👥 Contato

Para suporte ou dúvidas sobre o sistema, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para Mandacaru - Esfihas & Jantinha**
