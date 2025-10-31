# 🗺️ Ferramenta de Análise de Lotes de OAEs

Uma ferramenta interativa para visualização e edição de loteamentos de Obras de Arte Especiais (OAEs - pontes e viadutos) baseada em clustering geoespacial.

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://visualizar-lotes-oae.streamlit.app/)

## 📋 Sobre o Projeto

Esta aplicação permite analisar e reorganizar lotes de inspeção de OAEs através de:
- **Clustering automático**: Agrupamento inicial baseado em algoritmo KMeans considerando localização geográfica, custo e restrições de Unidade Local
- **Visualização interativa**: Mapa com marcadores personalizados mostrando informações detalhadas de cada OAE
- **Edição manual**: Interface para reatribuir OAEs entre lotes, mesclar lotes, criar novos lotes e excluir lotes
- **Sobreposição de dados**: Capacidade de adicionar múltiplos datasets ao mesmo mapa para análises comparativas
- **Exportação**: Geração de arquivos Excel com os lotes editados

## 🚀 Acesso Rápido

**[Acessar aplicação online →](https://visualizar-lotes-oae.streamlit.app/)**

## 🛠️ Tecnologias Utilizadas

- **Backend**: Python 3.x, Streamlit
- **Análise de Dados**: Pandas, NumPy, Scikit-learn (KMeans)
- **Frontend**: HTML5, JavaScript, Leaflet.js
- **Manipulação de Excel**: openpyxl, SheetJS (xlsx.js)

## 📦 Estrutura do Projeto
```
.
├── app.py                          # Aplicação Streamlit (backend + UI)
├── standalone_cluster_editor.html  # Visualizador de mapa interativo
└── README.md                       # Este arquivo
```

## 🎯 Funcionalidades Principais

### 1️⃣ Análise Prévia
- Upload de três arquivos base:
  - `MAPEAMENTO_INSPEÇÕES_20201021.xlsx`
  - `Estudo Paramétrico_20251021.xlsx`
  - `CONTROLE GERAL PROARTE.xlsx`
- Configuração de parâmetros:
  - Estado a ser analisado
  - Tamanho de referência do lote
  - Faixa de notas (mínima e máxima)
- Geração automática de lotes via clustering KMeans respeitando Unidades Locais
- Download do arquivo Excel com loteamento inicial

### 2️⃣ Visualização Interativa
- Mapa com três camadas base: Mapa de Ruas, Satélite, Híbrido
- Marcadores coloridos por:
  - **Forma**: Dataset de origem (círculo, quadrado, triângulo, etc.)
  - **Cor do contorno**: Unidade Local
  - **Cor de preenchimento**: Lote/Cluster
  - **Número interno**: Nota consolidada da OAE
- Centroides de lote com popup informativo
- Painel lateral com controle de visibilidade de lotes
- Legendas interativas para Unidades Locais e Datasets

### 3️⃣ Edição de Lotes
- **Reatribuição de OAEs**: Clique em uma OAE e selecione o lote de destino
- **Criar novos lotes**: Opção de criar lote em qualquer Unidade Local
- **Mesclar lotes**: Combinar dois lotes existentes
- **Excluir lotes**: Remover lote (OAEs vão para "Sem Lote")
- **Alterar cores**: Personalizar cor de cada lote
- **Inspeção detalhada**: Visualizar tabela com todas as OAEs de um lote

### 4️⃣ Sobreposição de Dados
- Adicionar múltiplos arquivos Excel ao mapa existente
- Diferenciação visual por forma de marcador
- Identificação clara do arquivo de origem

### 5️⃣ Exportação
- Geração de arquivo Excel com duas abas:
  - **All Points**: Dados detalhados de cada OAE
  - **Cluster Summary**: Estatísticas agregadas por lote
- Inclui todas as modificações manuais realizadas

## 📊 Formato dos Dados

### Entrada (Excel)
O arquivo Excel de entrada deve conter uma aba "All Points" com as seguintes colunas:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Point ID | int | Identificador único |
| Cluster ID | int | ID do lote |
| Cluster Label | str | Rótulo do lote |
| Unidade Local | str | Unidade administrativa |
| SGE | int | Código SGE |
| CodPro | str | Código do projeto |
| Identificação da OAE | str | Nome/identificação da ponte |
| Latitude | float | Coordenada de latitude |
| Longitude | float | Coordenada de longitude |
| Largura | float | Largura da OAE (m) |
| Extensão | float | Extensão da OAE (m) |
| Nota Consolidada | int | Nota de 0-5 |
| Custo Final (R$) | float | Custo estimado |
| Rodovia | str | Nome da rodovia |
| km | str | Quilômetro na rodovia |
| Município | str | Município |
| Status Geral | str | Status da OAE |
| Status Detalhado | str | Detalhamento do status |
| Dataset | str | Origem dos dados |

### Saída (Excel)
Mesmo formato da entrada, com atualizações nos campos `Cluster ID` e `Cluster Label` conforme edições realizadas.

## 🔧 Executar Localmente

### Pré-requisitos
```bash
python >= 3.8
```

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo
```

2. Instale as dependências:
```bash
pip install streamlit pandas numpy scikit-learn openpyxl requests
```

3. Execute a aplicação:
```bash
python -m streamlit run app.py
```

4. Acesse no navegador:
```
http://localhost:8501
```

## 📖 Como Usar

### Passo 1: Gerar Análise Prévia
1. Acesse a aba "📊 Análise prévia"
2. Carregue os três arquivos Excel necessários
3. Defina os parâmetros de análise
4. Clique em "▶️ Rodar Análise"
5. Aguarde o processamento
6. Baixe o arquivo Excel gerado

### Passo 2: Visualizar e Editar
1. Acesse a aba "🗺️ Visualizador"
2. Carregue o arquivo Excel com uma análise prévia realizada (ou, ao menos, formatado de acordo com o Excel gerado pela ferramenta de análise prévia)
3. O mapa carregará automaticamente com o resultado da análise
4. Explore o mapa, clique nos marcadores para ver detalhes
5. Use o painel lateral para reatribuir OAEs
6. Use o painel de controle de lotes (canto superior direito) para:
   - Mostrar/ocultar lotes
   - Alterar cores
   - Mesclar ou excluir lotes

### Passo 3: Exportar Resultados
1. Clique em "📊 Exportar para Excel"
2. O arquivo será baixado com todas as suas modificações

## 🎨 Características Visuais

- **Marcadores multicamadas**: Combinam informações de Unidade Local (anel externo), Lote (preenchimento) e Nota (número central)
- **Formas geométricas**: Diferentes datasets são representados por formas distintas (círculo, quadrado, triângulo, etc.)
- **Cores de alto contraste**: Paleta otimizada usando proporção áurea para máxima distinção visual
- **Centroides de lote**: Marcadores em forma de gota indicando o centro geométrico de cada lote

## ⚙️ Algoritmo de Clustering

O algoritmo KMeans utilizado considera:
1. **Localização geográfica** (latitude e longitude)
2. **Custo normalizado** das OAEs
3. **Restrição por Unidade Local** (não mistura ULs diferentes)
4. **Tamanho máximo de lote** definido pelo usuário

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👤 Autor

© 2025 Renan Rocha Ribeiro

---

**Nota**: Esta ferramenta foi desenvolvida para auxiliar na organização de lotes de inspeção de OAEs no âmbito do PROARTE/DNIT. Os resultados do clustering automático devem ser revisados e ajustados manualmente conforme necessário.
