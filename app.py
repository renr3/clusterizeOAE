import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
import numpy as np
import io
import warnings
warnings.filterwarnings('ignore')
# ADD THIS IMPORT:
from utils import clustering


# ADD THIS NEW FUNCTION HERE:
def load_html_with_assets():
    """Load HTML template and inject CSS and JS files"""
    
    # Read CSS
    with open('assets/css/styles.css', 'r', encoding='utf-8') as f:
        css = f.read()
    
    # Read JS files in order
    js_files = [
        'assets/js/map-core.js',
        'assets/js/data-handlers.js',
        'assets/js/cluster-operations.js',
        'assets/js/ui-controls.js',
    ]
    
    js_content = ""
    for js_file in js_files:
        with open(js_file, 'r', encoding='utf-8') as f:
            js_content += f.read() + "\n\n"
    
    # Read HTML template
    with open('templates/map_viewer.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Inject CSS into <head> (before </head>)
    css_tag = f'<style>\n{css}\n</style>'
    html = html.replace('<!-- Custom CSS will be injected here by app.py -->', css_tag)
    
    # Inject JS into <body> (before </body>)
    js_tag = f'<script>\n{js_content}\n</script>'
    html = html.replace('<!-- Custom JavaScript will be injected here by app.py -->', js_tag)
    
    return html

# MUST be first line
st.set_page_config(
    page_title="Ferramenta de Análise de Lotes",
    page_icon="🗺️",
    layout="wide"
)

# CSS optimized for map applications
st.markdown("""
<style>
/* Remove ALL default Streamlit padding and margins */
.main > div {
    padding-top: 0rem !important;
    padding-bottom: 0rem !important;
    padding-left: 0rem !important;
    padding-right: 0rem !important;
}

.block-container {
    padding-top: 0rem !important;
    padding-bottom: 0rem !important;
    padding-left: 0rem !important;
    padding-right: 0rem !important;
    max-width: 100% !important;
}

/* Remove gap between tabs and content */
.stTabs [data-baseweb="tab-list"] {
    gap: 0px;
    padding: 0.5rem 1rem 0rem 1rem;
}

.stTabs [data-baseweb="tab-panel"] {
    padding: 0px !important;
}

/* Make iframe truly fill available space without scrollbars */
iframe {
    width: 100% !important;
    height: calc(100vh - 60px) !important;  /* Subtract space for tabs */
    border: none !important;
    display: block !important;
}

/* Hide Streamlit footer and branding */
footer, header, .viewerBadge_container__1QSob {
    display: none !important;
}

/* Prevent body overflow */
html, body {
    overflow-x: hidden !important;
}

/* Ensure main container doesn't add extra height */
section[data-testid="stAppViewContainer"] {
    overflow: hidden !important;
}

section[data-testid="stAppViewContainer"] > .main {
    overflow: hidden !important;
}
</style>
""", unsafe_allow_html=True)


# Must come before any Streamlit elements
st.markdown("""
    <style>
        /* Increase horizontal space between tab labels */
        div[data-baseweb="tab-list"] > button {
            margin-right: 20px;  /* change value as needed */
            padding-left: 12px;
            padding-right: 12px;
        }
    </style>
""", unsafe_allow_html=True)

# Create tabs
tab1, tab2, tab3 = st.tabs(["🗺️ Visualizador", "📗 Análise prévia", "📖 Instruções"])

with tab1:
    # Load HTML with injected CSS and JS
    try:
        html_content = load_html_with_assets()
        
        # Render the HTML
        components.html(
            html_content,
            height=0,  # ignored due to CSS height:100vh
            scrolling=False
        )
    except FileNotFoundError as e:
        st.error(f"❌ Erro ao carregar arquivos: {e}")
        st.info("""
        Certifique-se de que os seguintes arquivos/pastas existem:
        - templates/map_viewer.html
        - assets/css/styles.css
        - assets/js/map-core.js
        - assets/js/data-handlers.js
        - assets/js/ui-controls.js
        - assets/js/cluster-operations.js
        """)

with tab2:
    st.header("Carregar os arquivos-base")

     # Columns for file uploads
    col1, col2, col3 = st.columns(3)
    with col1:
        file1 = st.file_uploader("📄 MAPEAMENTO_INSPEÇÕES_20201021", type=["xlsx"])
    with col2:
        file2 = st.file_uploader("📄 Estudo Paramétrico_20251021", type=["xlsx"])
    with col3:
        file3 = st.file_uploader("📄 CONTROLE GERAL PROARTE", type=["xlsx"])

    st.header("Definir parâmetros para loteamento inicial")

    # Columns for other controls
    col4, col5, col6, col7 = st.columns([1,1,1,1])  # adjust relative widths
    with col4:
        estadoAnalisado = st.selectbox(
            "Estado a ser analisado",
            ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES",
             "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
             "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
             "SP", "SE", "TO"],
            index=0
        )
    with col5:
        tamanhoLoteReferencia = st.number_input(
            "Tamanho do lote de referência",
            min_value=0, max_value=100, value=0, step=1
        )
    with col6:
        notaMinima = st.number_input("Nota mínima a ser incluída",min_value=0, max_value=5, value=0, step=1)
    with col7:
        notaMaxima = st.number_input("Nota máxima a ser incluída",min_value=0, max_value=5, value=5, step=1)

    if st.button("▶️ Rodar Análise", key="rodar_lotes"):
        try:
            if not (file1 and file2 and file3):
                st.error("⚠️ Por favor, envie os três arquivos necessários.")
            else:
                # Progress bar
                progress_bar = st.progress(0)
                
                # Load Excel files
                df1 = pd.read_excel(file1, header=1, usecols="B:Y", decimal=",")
                progress_bar.progress(10)
                df2 = pd.read_excel(file2, sheet_name="Simulação", header=2, usecols="B:AS", decimal=",")
                progress_bar.progress(20)
                df3 = pd.read_excel(file3, sheet_name="CONTROLE GERAL PROARTE", header=0, decimal=",")
                progress_bar.progress(30)
                df3 = df3.drop_duplicates(subset="CodPro", keep="first")
                
                # Merge dataframes using the utility function
                df_merged = clustering.merge_dataframes(
                    df1, df2, df3, 
                    progress_callback=progress_bar.progress
                )
                
                # Perform clustering
                df_final, cluster_centroids = clustering.perform_clustering(
                    df_merged,
                    analysed_state=estadoAnalisado,
                    max_cluster_size=tamanhoLoteReferencia,
                    nota_minima=notaMinima,
                    nota_maxima=notaMaxima,
                    progress_callback=progress_bar.progress
                )
                
                pd.set_option('display.max_columns', None)
                print(df_final)
                
                # Prepare Excel output
                df_all_points, df_summary, excel_filename = clustering.prepare_excel_output(
                    df_final, estadoAnalisado
                )
                
                progress_bar.progress(97)
                
                # Create Excel file in memory
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df_all_points.to_excel(writer, sheet_name='All Points', index=False)
                    df_summary.to_excel(writer, sheet_name='Cluster Summary', index=False)
                
                output.seek(0)
                progress_bar.progress(100)
                
                st.download_button(
                    label="💾 Baixar Resultados",
                    data=output,
                    file_name=f"{estadoAnalisado}_analise_previa.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
        except Exception as e:
            st.error(f"❌ Ocorreu um erro durante a análise: {e}")

with tab3:
    st.markdown("""
    ## Como usar esta ferramenta:
    
    ### 📁 1. Preparar o arquivo Excel com dados iniciais
    - O Visualizador opera a partir de um arquivo .xlsx (Excel) que contém as informações necessárias de cada OAE em análise
    - Para gerar tais arquivos .xlsx, utilize a aba "Gerar Excel com dados iniciais"
    - Para isso, é necessário carregar três arquivos-base:
        1. MAPEAMENTO_INSPEÇÕES_20201021.xlsx
        2. Estudo Paramétrico_20251021.xlsx
        3. CONTROLE GERAL PROARTE.xlsx
    - Em seguida, é necessário definir parâmetros que serão utilizados para a sugestão inicial de loteamento, baseada em uma análise de clusters:
        - Estado a ser analisado
        - Tamanho do lote de referência)  
        - Nota mínima e máxima a ser incluída na análise
    - Após definir os parâmetros, clique em "Rodar Análise"
    - Aguarde o processamento, após o qual aparecerá um botão para descarregar o arquivo Excel gerado
    - O arquivo gerado conterá as seguintes colunas essenciais:
        - Point ID, Cluster ID, Cluster Label, Unidade Local, SGE
        - Latitude, Longitude, Nota Consolidada, Custo Final (R$)
        - Rodovia, km, Município, Status Geral, Status Detalhado
    
    ### 🗺️ 2. Visualizador
    - De posse do arquivo Excel gerado, abra a aba "Visualizador"
    - O Visualizador carrega o arquivo Excel e apresenta os dados em um mapa interativo
    - O Visualizador também permite editar manualmente os lotes diretamente no mapa
    
    ### 💾 3. Exportar resultados
    - Clique em "Exportar para Excel" para baixar o arquivo editado
    - O arquivo conterá todas as suas modificações manuais
    """)

