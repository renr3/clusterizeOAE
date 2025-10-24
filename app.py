import streamlit as st
import streamlit.components.v1 as components

# Page config
st.set_page_config(
    page_title="Ferramenta de Análise de Lotes",
    page_icon="🗺️",
    layout="wide"
)

# Title and instructions
st.title("🗺️ Ferramenta de Análise de Lotes - Visualizador Independente")

# Create tabs
tab1, tab2 = st.tabs(["📊 Ferramenta", "📖 Instruções"])

with tab2:
    st.markdown("""
    ## Como usar esta ferramenta:
    
    ### 📁 1. Preparar o arquivo Excel
    - Execute o notebook Jupyter localmente para gerar o arquivo Excel com os clusters
    - O arquivo deve ter uma aba "All Points" com as seguintes colunas:
        - Point ID, Cluster ID, Cluster Label, Unidade Local, SGE
        - Latitude, Longitude, Nota Consolidada, Custo Final (R$)
        - Rodovia, km, Município, Status Geral, Status Detalhado
    
    ### 📤 2. Carregar o arquivo
    - Clique em "Carregar Arquivo" na ferramenta
    - Selecione seu arquivo Excel processado
    
    ### 🗺️ 3. Visualizar e editar
    - Os pontos aparecerão no mapa com cores diferentes para cada cluster
    - Clique em um ponto para selecioná-lo
    - Use o menu dropdown para reatribuir o ponto a outro cluster
    - As estatísticas são atualizadas em tempo real
    
    ### 💾 4. Exportar resultados
    - Clique em "Exportar para Excel" para baixar o arquivo editado
    - O arquivo conterá todas as suas modificações manuais
    """)

with tab1:
    # Read and display the HTML file
    try:
        with open('standalone_cluster_editor.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
        
        # Render the HTML
        components.html(
            html_content,
            height=850,
            scrolling=True
        )
    except FileNotFoundError:
        st.error("❌ Arquivo 'standalone_cluster_editor.html' não encontrado!")
        st.info("Certifique-se de que o arquivo HTML está no mesmo diretório que app.py")