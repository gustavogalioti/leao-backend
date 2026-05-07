const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Permite chamadas do seu domínio GitHub Pages
app.use(cors({
  origin: [
    'https://gustavogalioti.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:5500' // para testes locais
  ]
}));

app.use(express.json({ limit: '50mb' }));

// Health check — para o Railway saber que o servidor está vivo
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LEÃO API rodando 🦁' });
});

// Rota principal — proxy para a Anthropic
app.post('/api/analyze', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Chave de API não configurada no servidor.' });
    }

    const { messages, max_tokens } = req.body;

    if (!messages) {
      return res.status(400).json({ error: 'Parâmetro messages obrigatório.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 4000,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro da API Anthropic.' });
    }

    res.json(data);

  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.listen(PORT, () => {
  console.log(`🦁 LEÃO servidor rodando na porta ${PORT}`);
});
