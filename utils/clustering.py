"""
Clustering utilities for bridge analysis
"""
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import requests
import time


# ===== DISTANCE CALCULATIONS =====

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


# ===== DATA CLEANING =====

def clean_numerical_code(series):
    """Convert any format to clean integer string"""
    return (
        series
        .astype(str)
        .str.strip()
        .str.replace('.0', '', regex=False)
        .str.replace(',', '', regex=False)
    )


def process_nota_final(value):
    """Process nota final values, handling special cases"""
    if isinstance(value, str):
        if value.strip().upper() == "S/N":
            return -99
        value = value.replace(",", ".")
    try:
        return int(float(value))
    except:
        return -99  # fallback in case of unexpected formats


# ===== DATA MERGING =====

def merge_dataframes(df1, df2, df3, progress_callback=None):
    """
    Merge three dataframes with proper cleaning
    
    Args:
        df1: MAPEAMENTO_INSPEÇÕES dataframe
        df2: Estudo Paramétrico dataframe  
        df3: CONTROLE GERAL PROARTE dataframe
        progress_callback: Optional function to call with progress updates (0-100)
    
    Returns:
        Merged dataframe
    """
    if progress_callback:
        progress_callback(40)
    
    # Cleaning merge keys
    df1['merge_key'] = clean_numerical_code(df1['Código (SGE)'])
    df1['CodPro'] = clean_numerical_code(df1['CodPro'])
    df2['merge_key'] = clean_numerical_code(df2['SGE_AJUSTE'])
    df3['CodPro'] = clean_numerical_code(df3['CodPro'])

    if progress_callback:
        progress_callback(50)

    # Merge df1 with df2
    df_merged = df1.merge(
        df2[['merge_key', 'Custo final', 'Extensão', 'Largura']],
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
    
    if progress_callback:
        progress_callback(60)

    df_merged['NOTA CONSOLIDADA'] = df_merged['Nota Final'].apply(process_nota_final)
    
    return df_merged


# ===== CLUSTERING =====

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


def cluster_unidade_local(df_ul, unidade_name, max_cluster_size):
    """
    Cluster points within a single Unidade Local
    
    Args:
        df_ul: DataFrame with points from one Unidade Local
        unidade_name: Name of the Unidade Local
        max_cluster_size: Maximum number of points per cluster
    
    Returns:
        DataFrame with 'cluster' column added
    """
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

    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(features)

    df_ul['cluster'] = clusters

    return df_ul


def perform_clustering(df_merged, analysed_state, max_cluster_size, nota_minima, nota_maxima, progress_callback=None):
    """
    Main clustering function
    
    Args:
        df_merged: Merged dataframe from merge_dataframes()
        analysed_state: State code (e.g., 'AC', 'SP')
        max_cluster_size: Maximum points per cluster
        nota_minima: Minimum grade to include
        nota_maxima: Maximum grade to include
        progress_callback: Optional function for progress updates
    
    Returns:
        tuple: (df_final, cluster_centroids)
            - df_final: DataFrame with cluster assignments
            - cluster_centroids: List of dicts with centroid info
    """
    # Filter data
    nota_minima = pd.to_numeric(nota_minima, errors='coerce')
    nota_maxima = pd.to_numeric(nota_maxima, errors='coerce')
    
    df_filtered = df_merged[
        (df_merged['UF'] == analysed_state) &
        (df_merged['NOTA CONSOLIDADA'] >= nota_minima) &
        (df_merged['NOTA CONSOLIDADA'] <= nota_maxima) &
        (pd.notna(df_merged['Latitude'])) &
        (pd.notna(df_merged['Longitude'])) &
        (pd.notna(df_merged['Unidade Local'])) &
        (pd.notna(df_merged['Custo final']))
    ].copy()

    df_filtered['LAT'] = df_filtered['Latitude']
    df_filtered['LONG'] = df_filtered['Longitude']
    
    if progress_callback:
        progress_callback(70)

    # Process each Unidade Local
    unidades_locais = df_filtered['Unidade Local'].unique()
    global_cluster_id = 0
    result_dfs = []

    for unidade in sorted(unidades_locais):
        df_ul = df_filtered[df_filtered['Unidade Local'] == unidade].copy()
        df_ul = cluster_unidade_local(df_ul, unidade, max_cluster_size)
        df_ul['cluster'] = df_ul['cluster'] + global_cluster_id
        global_cluster_id = df_ul['cluster'].max() + 1
        df_ul['cluster_label'] = df_ul.apply(
            lambda row: f"{row['Unidade Local']}-C{row['cluster']}", axis=1
        )
        result_dfs.append(df_ul)

    df_final = pd.concat(result_dfs, ignore_index=True)
    
    if progress_callback:
        progress_callback(80)

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
    
    if progress_callback:
        progress_callback(90)
    
    return df_final, cluster_centroids


# ===== EXCEL OUTPUT PREPARATION =====

def prepare_excel_output(df_final, analysed_state):
    """
    Prepare data for Excel export
    
    Args:
        df_final: Final clustered dataframe
        analysed_state: State code for filename
    
    Returns:
        tuple: (df_all_points, df_summary, excel_filename)
    """
    # Prepare "All Points" sheet
    df_all_points = pd.DataFrame()

    df_all_points['Point ID'] = range(len(df_final))
    df_all_points['Cluster ID'] = df_final['cluster'].astype(int)
    df_all_points['Cluster Label'] = df_final['cluster_label']
    df_all_points['Unidade Local'] = df_final['Unidade Local']
    df_all_points['Identificação da OAE'] = df_final['Identificação da OAE']
    df_all_points['Extensão'] = df_final['Extensão']
    df_all_points['Largura'] = df_final['Largura']

    if 'Código (SGE)' in df_final.columns:
        df_all_points['SGE'] = df_final['Código (SGE)'].where(
            df_final['Código (SGE)'].notna(), pd.NA
        ).astype('Int64')
    else:
        df_all_points['SGE'] = pd.Series([pd.NA] * len(df_final), dtype='Int64')
    
    df_all_points['CodPro'] = df_final['CodPro'] if 'CodPro' in df_final.columns else ''
    df_all_points['Latitude'] = df_final['LAT']
    df_all_points['Longitude'] = df_final['LONG']
    df_all_points['Nota Consolidada'] = df_final['NOTA CONSOLIDADA']
    df_all_points['Custo Final (R$)'] = df_final['Custo final']
    df_all_points['Rodovia'] = df_final['Rodovia'] if 'Rodovia' in df_final.columns else ''
    df_all_points['km'] = df_final['km'] if 'km' in df_final.columns else ''
    df_all_points['Município'] = df_final['Município'] if 'Município' in df_final.columns else ''
    df_all_points['Status Geral'] = df_final['Status Geral'] if 'Status Geral' in df_final.columns else ''
    df_all_points['Status Detalhado'] = df_final['Status Detalhado'] if 'Status Detalhado' in df_final.columns else ''
    df_all_points['Dataset'] = 'Principal'

    # Prepare "Cluster Summary" sheet
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

    df_summary = pd.DataFrame(cluster_summary)
    excel_filename = f'{analysed_state.lower()}_clusters_output.xlsx'
    
    return df_all_points, df_summary, excel_filename