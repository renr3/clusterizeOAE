import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import io
import warnings
warnings.filterwarnings('ignore')

import requests
import time

# MUST be first line
st.set_page_config(
    page_title="Ferramenta de Análise de Lotes",
    page_icon="🗺️",
    layout="wide"  # Critical for maps!
)

# CSS optimized for map applications
st.markdown("""
<style>
/* Remove Streamlit default padding and margins */
html, body, [class^="st-"], .main, .block-container {
    padding: 0 !important;
    margin: 0 !important;
}

/* Make the main container full height */
.main .block-container {
    max-width: 100% !important;
    height: 100vh !important;
}

/* Make iframe truly fill available space */
iframe {
    width: 100vw !important;
    height: 100vh !important;
    border: none !important;
}

/* Hide Streamlit footer and branding */
footer, header, .viewerBadge_container__1QSob {
    display: none !important;
}
</style>
""", unsafe_allow_html=True)

# Minimal title
# st.markdown("## 🗺️ Ferramenta de análise de lotes")

# Create tabs
tab1, tab2, tab3 = st.tabs(["🗺️ Visualizador", "📗 Gerar Excel com dados iniciais", "📖 Instruções"])

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
                #Progress bar
                progress_bar = st.progress(0)
                df1 = pd.read_excel(file1, header=1, usecols="B:Y", decimal=",")
                progress_bar.progress(10)
                df2 = pd.read_excel(file2, sheet_name="Simulação", header=2, usecols="B:AS", decimal=",")
                progress_bar.progress(20)
                df3 = pd.read_excel(file3, sheet_name="CONTROLE GERAL PROARTE", header=0, decimal=",")
                progress_bar.progress(30)
                df3 = df3.drop_duplicates(subset="CodPro", keep="first")
                progress_bar.progress(40)

                # MERGING DATAFRAMES WITH CLEANING
                def clean_numerical_code(series):
                    """Convert any format to clean integer string"""
                    return (
                        series
                        .astype(str)
                        .str.strip()
                        .str.replace('.0', '', regex=False)
                        .str.replace(',', '', regex=False)
                    )

                # Cleaning merge keys
                df1['merge_key'] = clean_numerical_code(df1['Código (SGE)'])
                df1['CodPro'] = clean_numerical_code(df1['CodPro'])
                df2['merge_key'] = clean_numerical_code(df2['SGE_AJUSTE'])
                df3['CodPro'] = clean_numerical_code(df3['CodPro'])

                progress_bar.progress(50)

                # Merge df1 with df2
                df_merged = df1.merge(
                    df2[['merge_key', 'Custo final']],
                    on='merge_key',
                    how='left'
                )

                # Merge with df3 to get Nota Final
                df_merged = df_merged.merge(
                    df3[['CodPro', 'Unidade Local']],
                    on='CodPro',
                    how='left',
                    suffixes=('', '_df3')
                )
                progress_bar.progress(60)

                def process_nota_final(value):
                    if isinstance(value, str):
                        if value.strip().upper() == "S/N":
                            return -99
                        value = value.replace(",", ".")
                    try:
                        return int(float(value))
                    except:
                        return -99  # fallback in case of unexpected formats
                    
                df_merged['NOTA CONSOLIDADA'] = df_merged['Nota Final'].apply(process_nota_final)


                # MAKE INITIAL CLUSTER

                # Initialize cache and API counter
                distance_cache = {}
                api_call_count = 0

                def get_road_distance(lat1, lon1, lat2, lon2, show_progress=True):
                    """Get road travel distance between two points using OSRM"""
                    global distance_cache, api_call_count

                    if lat1 == lat2 and lon1 == lon2:
                        return 0.0

                    key = f"{lat1:.6f},{lon1:.6f}|{lat2:.6f},{lon2:.6f}"
                    rev_key = f"{lat2:.6f},{lon2:.6f}|{lat1:.6f},{lon1:.6f}"

                    if key in distance_cache:
                        return distance_cache[key]
                    if rev_key in distance_cache:
                        return distance_cache[rev_key]

                    url = (
                        f"http://router.project-osrm.org/route/v1/driving/"
                        f"{lon1},{lat1};{lon2},{lat2}"
                        f"?overview=false"
                    )

                    try:
                        api_start_time = time.time()
                        response = requests.get(url, timeout=10)
                        data = response.json()

                        if "routes" in data and len(data["routes"]) > 0:
                            distance_meters = data["routes"][0]["distance"]
                            distance_km = distance_meters / 1000.0
                            distance_cache[key] = distance_km
                            api_call_count += 1

                            if show_progress:
                                elapsed_ms = (time.time() - api_start_time) * 1000
                                print(f"    [API Call #{api_call_count}] Distance: {distance_km:.2f} km | Time: {elapsed_ms:.0f}ms")

                            return distance_km
                        else:
                            if show_progress:
                                print(f"    Warning: OSRM no route found")
                            return float('inf')
                    except Exception as e:
                        if show_progress:
                            print(f"    Error fetching OSRM route: {e}")
                        return float('inf')

                def haversine_distance(lat1, lon1, lat2, lon2):
                    """Calculate straight-line distance between two points in km"""
                    if lat1 == lat2 and lon1 == lon2:
                        return 0.0

                    R = 6371
                    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1

                    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
                    c = 2 * np.arcsin(np.sqrt(a))

                    return R * c

                # CONFIGURATION
                analysed_state = estadoAnalisado
                max_cluster_size = tamanhoLoteReferencia

                # Filter data
                notaMinima = pd.to_numeric(notaMinima, errors='coerce')
                notaMaxima = pd.to_numeric(notaMaxima, errors='coerce')
                df_filtered = df_merged[
                    (df_merged['UF'] == analysed_state) &
                    (df_merged['NOTA CONSOLIDADA'] >= notaMinima) &
                    (df_merged['NOTA CONSOLIDADA'] <= notaMaxima) &
                    (pd.notna(df_merged['Latitude'])) &
                    (pd.notna(df_merged['Longitude'])) &
                    (pd.notna(df_merged['Unidade Local'])) &
                    (pd.notna(df_merged['Custo final']))
                ].copy()

                df_filtered['LAT'] = df_filtered['Latitude']
                df_filtered['LONG'] = df_filtered['Longitude']
                progress_bar.progress(70)

                def calculate_cluster_metrics(df, cluster_col='cluster', use_road_distance=False):
                    """Calculate metrics for each cluster"""
                    metrics = {}
                    for cluster_id in df[cluster_col].unique():
                        cluster_data = df[df[cluster_col] == cluster_id]
                        coords = cluster_data[['LAT', 'LONG']].values

                        max_dist = 0
                        if len(coords) > 1:
                            for i in range(len(coords)):
                                for j in range(i+1, len(coords)):
                                    if use_road_distance:
                                        dist = get_road_distance(coords[i][0], coords[i][1],
                                                                coords[j][0], coords[j][1],
                                                                show_progress=False)
                                    else:
                                        dist = haversine_distance(coords[i][0], coords[i][1],
                                                                coords[j][0], coords[j][1])
                                    max_dist = max(max_dist, dist)

                        avg_dist = 0
                        if len(coords) > 1:
                            distances = []
                            for i in range(len(coords)):
                                for j in range(i+1, len(coords)):
                                    if use_road_distance:
                                        dist = get_road_distance(coords[i][0], coords[i][1],
                                                                coords[j][0], coords[j][1],
                                                                show_progress=False)
                                    else:
                                        dist = haversine_distance(coords[i][0], coords[i][1],
                                                                coords[j][0], coords[j][1])
                                    distances.append(dist)
                            avg_dist = np.mean(distances) if distances else 0

                        metrics[cluster_id] = {
                            'n_points': len(cluster_data),
                            'cost': cluster_data['Custo final'].sum(),
                            'max_distance': max_dist,
                            'avg_distance': avg_dist
                        }

                    return metrics

                def cluster_unidade_local(df_ul, unidade_name):
                    """Cluster points within a single Unidade Local"""
                    print(f"\n{'='*70}")
                    print(f"Processing: {unidade_name}")
                    print(f"{'='*70}")
                    print(f"Total points: {len(df_ul)}")

                    if len(df_ul) == 0:
                        return df_ul

                    n_clusters = max(1, int(np.ceil(len(df_ul) / max_cluster_size)))
                    print(f"Creating {n_clusters} cluster(s) (max {max_cluster_size} points each)")

                    coords = df_ul[['LAT', 'LONG']].values

                    if n_clusters == 1:
                        df_ul['cluster'] = 0
                        return df_ul

                    print("Initial geographic clustering...")
                    # Normalize cost to similar scale as coordinates
                    cost_normalized = df_ul['Custo final'] / df_ul['Custo final'].max()

                    # Create feature matrix with lat, lon, AND normalized cost
                    features = np.column_stack([
                        coords,  # lat, lon
                        cost_normalized * 1  # weighted cost
                    ])

                    kmeans = KMeans(n_clusters=n_clusters)
                    clusters = kmeans.fit_predict(features)

                    df_ul['cluster'] = clusters  # Use the cost-aware result!

                    return df_ul

                # # Process each Unidade Local
                # print("\n" + "="*70)
                # print("CLUSTERING ANALYSIS BY UNIDADE LOCAL")
                # print("="*70)

                unidades_locais = df_filtered['Unidade Local'].unique()
                # print(f"\nFound {len(unidades_locais)} unique Unidade Local(s)")

                global_cluster_id = 0
                result_dfs = []

                for unidade in sorted(unidades_locais):
                    df_ul = df_filtered[df_filtered['Unidade Local'] == unidade].copy()
                    df_ul = cluster_unidade_local(df_ul, unidade)
                    df_ul['cluster'] = df_ul['cluster'] + global_cluster_id
                    global_cluster_id = df_ul['cluster'].max() + 1
                    df_ul['cluster_label'] = df_ul.apply(
                        lambda row: f"{row['Unidade Local']}-C{row['cluster']}", axis=1
                    )
                    result_dfs.append(df_ul)

                df_final = pd.concat(result_dfs, ignore_index=True)
                pd.set_option('display.max_columns', None)
                print(df_final)
                
                progress_bar.progress(80)

                # Calculate centroids for each cluster
                cluster_centroids = []
                for cluster_id in sorted(df_final['cluster'].unique()):
                    cluster_data = df_final[df_final['cluster'] == cluster_id]
                    centroid_lat = cluster_data['LAT'].mean()
                    centroid_lon = cluster_data['LONG'].mean()
                    cluster_label = cluster_data['cluster_label'].iloc[0]

                    cluster_centroids.append({
                        'cluster': int(cluster_id),
                        'lat': float(centroid_lat),
                        'lon': float(centroid_lon),
                        'label': str(cluster_label),
                        'n_points': len(cluster_data),
                        'total_cost': float(cluster_data['Custo final'].sum())
                    })
                progress_bar.progress(90)

                # Save Excel output compatible with HTML tool
                excel_filename = f'{analysed_state.lower()}_clusters_output.xlsx'
                # print(f"\n{'='*70}")
                # print("GENERATING EXCEL OUTPUT FOR HTML TOOL")
                # print(f"{'='*70}")

                # Prepare "All Points" sheet with exact column names expected by HTML
                df_all_points = pd.DataFrame()

                # Add Point ID (using index)
                df_all_points['Point ID'] = range(len(df_final))

                # Add cluster information
                df_all_points['Cluster ID'] = df_final['cluster'].astype(int)
                df_all_points['Cluster Label'] = df_final['cluster_label']
                df_all_points['Unidade Local'] = df_final['Unidade Local']

                # Add SGE (if exists in original data, otherwise use a default or empty)
                # Add SGE (if exists in original data, otherwise use a default or empty)
                if 'Código (SGE)' in df_final.columns:
                    # keep missing values and convert floats (e.g. 150026.0) to pandas nullable integers
                    df_all_points['SGE'] = df_final['Código (SGE)'].where(df_final['Código (SGE)'].notna(), pd.NA).astype('Int64')
                else:
                    df_all_points['SGE'] = pd.Series([pd.NA] * len(df_final), dtype='Int64')
                
                # Add CodPro
                df_all_points['CodPro'] = df_final['CodPro'] if 'CodPro' in df_final.columns else ''

                # Add coordinates
                df_all_points['Latitude'] = df_final['LAT']

                # Add coordinates
                df_all_points['Latitude'] = df_final['LAT']
                df_all_points['Longitude'] = df_final['LONG']

                # Add nota consolidada
                df_all_points['Nota Consolidada'] = df_final['NOTA CONSOLIDADA']

                # Add cost
                df_all_points['Custo Final (R$)'] = df_final['Custo final']

                # Add additional fields (use original column names or empty if not available)
                df_all_points['Rodovia'] = df_final['Rodovia'] if 'Rodovia' in df_final.columns else ''
                df_all_points['km'] = df_final['km'] if 'km' in df_final.columns else ''
                df_all_points['Município'] = df_final['Município'] if 'Município' in df_final.columns else ''
                df_all_points['Status Geral'] = df_final['Status Geral'] if 'Status Geral' in df_final.columns else ''
                df_all_points['Status Detalhado'] = df_final['Status Detalhado'] if 'Status Detalhado' in df_final.columns else ''

                # Add Dataset column (default to "Principal" for primary dataset)
                df_all_points['Dataset'] = 'Principal'

                progress_bar.progress(95)
                # Prepare "Cluster Summary" sheet with exact column names expected by HTML
                cluster_summary = []
                for cluster_id in sorted(df_final['cluster'].unique()):
                    cluster_data = df_final[df_final['cluster'] == cluster_id]
                    cluster_label = cluster_data['cluster_label'].iloc[0]
                    unidade_local = cluster_data['Unidade Local'].iloc[0]

                    cluster_summary.append({
                        'Cluster ID': int(cluster_id),
                        'Cluster Label': cluster_label,
                        'Unidade Local': unidade_local,
                        'Number of Points': len(cluster_data),
                        'Total Cost (R$)': float(cluster_data['Custo final'].sum()),
                        'Avg Cost (R$)': float(cluster_data['Custo final'].mean()),
                    })

                progress_bar.progress(97)

                df_summary = pd.DataFrame(cluster_summary)

                # Create a BytesIO buffer instead of a file
                output = io.BytesIO()

                # Write to Excel in memory (same logic as your notebook)
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df_all_points.to_excel(writer, sheet_name='All Points', index=False)
                    df_summary.to_excel(writer, sheet_name='Cluster Summary', index=False)

                # Rewind the buffer
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
    
    ### 🗺️ 3. Visualizador
    - De posse do arquivo Excel gerado, abra a aba "Visualizador"
    - O Visualizador carrega o arquivo Excel e apresenta os dados em um mapa interativo
    - O Visualizador também permite editar manualmente os lotes diretamente no mapa
    
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
            height=0,  # ignored due to CSS height:100vh
            scrolling=False
        )
    except FileNotFoundError:
        st.error("❌ Arquivo 'standalone_cluster_editor.html' não encontrado!")
        st.info("Certifique-se de que o arquivo HTML está no mesmo diretório que app.py")