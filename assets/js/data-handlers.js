// ===== GLOBAL DATA STATE =====
let pointsData = [];
let unidadesClusters = {};
let datasetCounter = 0;
let datasetFilenames = {};

// ===== FILE LOADING =====
function loadExcelFile(file, isOverlay) {
    const reader = new FileReader();
    const statusDiv = isOverlay ? 'overlayStatus' : 'loadStatus';
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            const worksheet = workbook.Sheets['All Points'];
            if (!worksheet) {
                throw new Error('Sheet "All Points" não encontrada no arquivo Excel');
            }
            
            const importedData = XLSX.utils.sheet_to_json(worksheet);
            
            if (importedData.length === 0) {
                throw new Error('Arquivo Excel está vazio');
            }
            
            // Increment dataset counter for overlay
            if (isOverlay) {
                datasetCounter++;
                datasetFilenames[datasetCounter] = file.name;
            } else {
                datasetFilenames[0] = file.name;
            }
            
            // Get the highest existing cluster ID to avoid conflicts
            const maxExistingCluster = pointsData.length > 0 
                ? Math.max(...pointsData.map(p => p.cluster))
                : -1;
            
            // Transform data - ADD 'dataset' field to each point
            const newPoints = importedData.map((row, idx) => {
                const originalCluster = parseInt(row['Cluster ID']);
                // Prevent a new overlay from merging with previous points, by offsetting their cluster IDs
                const adjustedCluster = isOverlay 
                    ? originalCluster + maxExistingCluster + 1000 * datasetCounter
                    : originalCluster;
                
                return {
                    id: (isOverlay ? 'sobreposicao_' + datasetCounter + '_' : '') + (row['Point ID'] || idx),
                    lat: parseFloat(row['Latitude'] || row['LAT']),
                    lon: parseFloat(row['Longitude'] || row['LONG']),
                    cluster: adjustedCluster,
                    unidade_local: String(row['Unidade Local'] || 'N/A'),
                    sge: parseInt(row['SGE'] || row['Código (SGE)'] || 0, 10),
                    CodPro: String(row['CodPro'] || 'N/A'),
                    IdOAE: String(row['Identificação da OAE'] || 'N/A'),
                    Largura: parseFloat(row['Largura'] || 0),
                    Extensao: parseFloat(row['Extensão'] || 0),
                    nota: parseInt(row['Nota Consolidada'] || row['NOTA CONSOLIDADA'] || 0, 10),
                    custo: parseFloat(row['Custo Final (R$)'] || row['Custo final'] || 0),
                    cluster_label: String(row['Cluster Label'] || `Cluster ${adjustedCluster}`),
                    rodovia: String(row['Rodovia'] || 'N/A'),
                    km: String(row['km'] || 'N/A'),
                    municipio: String(row['Município'] || 'N/A'),
                    status_geral: String(row['Status Geral'] || 'N/A'),
                    status_detalhado: String(row['Status Detalhado'] || 'N/A'),
                    dataset: isOverlay ? datasetCounter : 0
                };
            });
            
            // Add to existing data instead of replacing
            pointsData = pointsData.concat(newPoints);

            // Rebuild unidadesClusters mapping
            unidadesClusters = {};
            pointsData.forEach(point => {
                if (!unidadesClusters[point.unidade_local]) {
                    unidadesClusters[point.unidade_local] = new Set();
                }
                unidadesClusters[point.unidade_local].add(point.cluster);
            });

            // Convert Sets to sorted arrays
            Object.keys(unidadesClusters).forEach(key => {
                unidadesClusters[key] = Array.from(unidadesClusters[key]).sort((a, b) => a - b);
            });

            // Initialize map if first load
            if (!map || !isOverlay) {
                initMap();
            }
            
            createMarkers();
            updateStatistics();
            createUnidadeLegend();
            createShapeLegend();
            updateLotesPanel(); 
            
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('content').classList.add('active');
            
            if (!isOverlay) {
                // Hide initial upload box, show overlay section
                document.getElementById('uploadBox').style.display = 'none';
                document.getElementById('overlaySection').classList.add('active');
                document.getElementById('loadedMessage').style.display = 'block';
            }
            
            showStatus(
                `✅ ${newPoints.length} OAEs ${isOverlay ? 'sobrepostas' : 'carregadas'} com sucesso!`, 
                'success', 
                statusDiv
            );
            
            // Hide loadedMessage after 1 second
            document.getElementById('loadedMessage').style.display = 'block';
            setTimeout(() => {
                document.getElementById('loadedMessage').style.display = 'none';
            }, 1000);
            
        } catch (error) {
            showStatus(`❌ Erro ao carregar arquivo: ${error.message}`, 'error', statusDiv);
            console.error(error);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ===== STATUS MESSAGES =====
function showStatus(message, type, divId) {
    const statusDiv = document.getElementById(divId);
    statusDiv.className = type === 'error' ? 'error-message' : 
                         type === 'success' ? 'success-message' : '';
    statusDiv.innerHTML = message;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// ===== CLUSTER STATISTICS =====
function getClusterStats(clusterId) {
    const clusterPoints = pointsData.filter(p => p.cluster === clusterId);
    if (clusterPoints.length === 0) return null;
    
    const totalCost = clusterPoints.reduce((sum, p) => sum + p.custo, 0);
    const avgCost = totalCost / clusterPoints.length;
    
    if (clusterId === -1) {
        return {
            nPoints: clusterPoints.length,
            totalCost: totalCost,
            avgCost: avgCost,
            label: 'Sem Lote',
            unidade_local: 'N/A'
        };
    }

    return {
        nPoints: clusterPoints.length,
        totalCost: totalCost,
        avgCost: avgCost,
        label: clusterPoints[0]?.cluster_label || `Cluster ${clusterId}`,
        unidade_local: clusterPoints[0]?.unidade_local || 'N/A'
    };
}

// ===== GENERAL STATISTICS =====
function updateStatistics() {
    const primaryPoints = pointsData.filter(p => p.dataset === 0).length;
    const overlayPoints = pointsData.filter(p => p.dataset > 0).length;

    document.getElementById('primaryPoints').textContent = primaryPoints;
    document.getElementById('overlayPoints').textContent = overlayPoints;

    document.getElementById('totalPoints').textContent = pointsData.length;
    
    const uniqueClusters = [...new Set(pointsData.map(p => p.cluster))];
    document.getElementById('totalClusters').textContent = uniqueClusters.length;
    
    const totalCost = pointsData.reduce((sum, p) => sum + p.custo, 0);
    document.getElementById('totalCost').textContent = 
        'R$ ' + totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0});
}

// ===== REBUILD UNIDADES CLUSTERS MAPPING =====
function rebuildUnidadesClusters() {
    unidadesClusters = {};
    pointsData.forEach(point => {
        if (!unidadesClusters[point.unidade_local]) {
            unidadesClusters[point.unidade_local] = new Set();
        }
        unidadesClusters[point.unidade_local].add(point.cluster);
    });
    Object.keys(unidadesClusters).forEach(key => {
        unidadesClusters[key] = Array.from(unidadesClusters[key]).sort((a, b) => a - b);
    });
}