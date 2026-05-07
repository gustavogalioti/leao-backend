const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Health check
app.get('/', (req, res) => {
  res.json({ status: '🦁 LEÃO API rodando', version: '1.0.0' });
});

// ── ANALISAR DOCUMENTOS IR ──
app.post('/analisar', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || files.length === 0)
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const contentParts = [];

    for (const file of files) {
      if (file.type === 'pdf') {
        contentParts.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: file.data },
          title: file.name
        });
      } else if (file.type === 'image') {
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: file.mediaType, data: file.data }
        });
      }
    }

    contentParts.push({
      type: 'text',
      text: `Você é o Léo, assistente especialista em IR no Brasil (DIRPF), da plataforma LEÃO.
Analise os documentos enviados e extraia todas as informações para preencher a declaração IRPF 2025 (ano-calendário 2024).
Retorne APENAS JSON válido, sem markdown:
{
  "identificacao": { "nome":"","cpf":"","dataNascimento":"","tituloEleitoral":"","ocupacao":"","naturezaOcupacao":"","enderecoCompleto":"" },
  "rendimentosTributaveis": { "totalRendimentos":0,"contribuicaoPrevidenciaria":0,"impostoRetidoFonte":0,"decimoTerceiro":0,"impostoRetidoDecimoTerceiro":0,"fontes":[{"nomeFonte":"","cnpj":"","rendimentos":0,"irrf":0,"previdencia":0}] },
  "rendimentosIsentos": { "total":0,"itens":[{"codigo":"","descricao":"","valor":0,"fonte":""}] },
  "rendimentosExclusivos": { "total":0,"itens":[{"tipo":"","valor":0,"irrf":0,"fonte":""}] },
  "deducoes": { "dependentes":[],"saude":0,"educacao":0,"previdenciaOficial":0,"previdenciaPrivada":0,"pensaoAlimenticia":0,"totalDeducoes":0,"detalhes":[{"codigo":"","beneficiario":"","cpf":"","valor":0}] },
  "bensEDireitos": [{"grupo":"","codigo":"","discriminacao":"","situacao2023":0,"situacao2024":0,"cnpj":""}],
  "dividasOnus": [{"codigo":"","discriminacao":"","credor":"","cnpj":"","valor2023":0,"valor2024":0}],
  "rendaVariavel": { "acoes":{"resultadoMercadoVista":0,"resultadoMercadoOpcoes":0,"resultadoFII":0,"impostosPagos":0},"operacoes":[{"ativo":"","tipo":"","resultado":0,"darf":0}] },
  "resumo": { "baseCalculoIR":0,"impostoDue":0,"impostoRetidoFonte":0,"saldoImposto":0,"statusDeclaracao":"" },
  "alertas": [{"tipo":"atencao","mensagem":""}],
  "fontesIdentificadas": [],
  "observacoes": ""
}`
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: contentParts }]
    });

    const rawText = response.content?.map(c => c.text || '').join('');
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch (e) {
      parsed = { observacoes: rawText, alertas: [{ tipo: 'info', mensagem: 'Documentos processados.' }] };
    }

    res.json({ success: true, data: parsed });

  } catch (error) {
    console.error('Erro /analisar:', error.message);
    res.status(500).json({ error: 'Erro ao processar documentos.', detail: error.message });
  }
});

// ── CHAT COM O LÉO ──
app.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || messages.length === 0)
      return res.status(400).json({ error: 'Mensagens não enviadas.' });

    const system = `Você é o Léo, assistente simpático e especialista em Imposto de Renda do Brasil, da plataforma LEÃO. Responda em português, de forma clara e amigável. Nunca invente valores.${context ? '\n\nContexto dos documentos analisados: ' + context : ''}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system,
      messages
    });

    const reply = response.content?.map(c => c.text || '').join('') || 'Não consegui responder agora.';
    res.json({ success: true, reply });

  } catch (error) {
    console.error('Erro /chat:', error.message);
    res.status(500).json({ error: 'Erro no chat.', detail: error.message });
  }
});

app.listen(PORT, () => console.log(`🦁 LEÃO API na porta ${PORT}`));
