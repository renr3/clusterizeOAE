// ===== GLOBAL UI STATE =====
let selectedPoint = null;
let hiddenClusters = new Set();

// ===== POINT SELECTION =====
function selectPoint(point) {
    selectedPoint = point;
    
    // Update selected point info
    document.getElementById('selectedPoint').innerHTML = `
        <div class="selected-point">
            <strong>Point ID:</strong> ${point.id}<br>
            <strong>SGE:</strong> ${point.sge}<br>
            <strong>Unidade Local:</strong> ${point.unidade_local}<br>
            <strong>Custo:</strong> R$ ${point.custo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br>
            <strong>Município:</strong> ${point.municipio}
        </div>
    `;
    
    // Show current cluster statistics
    const currentClusterStats = getClusterStats(point.cluster);
    if (currentClusterStats) {
        document.getElementById('currentClusterInfo').innerHTML = `
            <div class="cluster-info">
                <h3>🔍 Lote atual: ${currentClusterStats.label}</h3>
                <div class="cluster-detail">
                    <span class="cluster-detail-label">Total de OAEs:</span>
                    <span class="cluster-detail-value">${currentClusterStats.nPoints}</span>
                </div>
                <div class="cluster-detail">
                    <span class="cluster-detail-label">Custo total:</span>
                    <span class="cluster-detail-value">R$ ${currentClusterStats.totalCost.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                </div>
                <div class="cluster-detail">
                    <span class="cluster-detail-label">Custo médio:</span>
                    <span class="cluster-detail-value">R$ ${currentClusterStats.avgCost.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                </div>
            </div>
        `;
    }
    
    // Populate cluster dropdown with ALL clusters from ALL Unidades Locais
    const targetSelect = document.getElementById('targetCluster');
    targetSelect.innerHTML = '<option value="">Selecione o lote alvo...</option>';
    
    // Add "Sem Lote" option
    const semLoteOption = document.createElement('option');
    semLoteOption.value = '-1';
    semLoteOption.textContent = '🚫 Sem Lote (Excluir da Análise)';
    semLoteOption.style.fontWeight = 'bold';
    semLoteOption.style.color = '#999999';
    semLoteOption.style.background = '#f0f0f0';
    targetSelect.appendChild(semLoteOption);

    // Separator
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '────────────────────';
    targetSelect.appendChild(separator);

    // Get all unique cluster IDs from all points, grouped by Unidade Local
    Object.keys(unidadesClusters).sort().forEach(unidadeLocal => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = unidadeLocal;
        
        // Add option to create new cluster in this Unidade Local
        const newClusterOption = document.createElement('option');
        newClusterOption.value = `NEW_${unidadeLocal}`;
        newClusterOption.textContent = `➕ Criar Novo Lote em ${unidadeLocal}`;
        newClusterOption.style.fontWeight = 'bold';
        newClusterOption.style.color = '#4CAF50';
        optgroup.appendChild(newClusterOption);
        
        // Add existing clusters
        unidadesClusters[unidadeLocal].forEach(clusterId => {
            if (clusterId !== point.cluster) {
                const option = document.createElement('option');
                option.value = clusterId;
                const stats = getClusterStats(clusterId);
                option.textContent = stats ? stats.label : `Lote ${clusterId}`;
                optgroup.appendChild(option);
            }
        });
        
        if (optgroup.children.length > 0) {
            targetSelect.appendChild(optgroup);
        }
    });
    
    // Show target cluster info when selected
    targetSelect.onchange = function() {
        if (this.value) {
            const targetStats = getClusterStats(parseInt(this.value));
            if (targetStats) {
                document.getElementById('targetClusterInfo').innerHTML = `
                    <div class="target-cluster-info">
                        <h4>🎯 Infos do lote Alvo</h4>
                        <div class="cluster-detail">
                            <span class="cluster-detail-label">Unidade:</span>
                            <span class="cluster-detail-value">${targetStats.unidade_local}</span>
                        </div>
                        <div class="cluster-detail">
                            <span class="cluster-detail-label">OAEs:</span>
                            <span class="cluster-detail-value">${targetStats.nPoints} → ${targetStats.nPoints + 1}</span>
                        </div>
                        <div class="cluster-detail">
                            <span class="cluster-detail-label">Custo total:</span>
                            <span class="cluster-detail-value">R$ ${targetStats.totalCost.toLocaleString('pt-BR', {maximumFractionDigits: 0})} → R$ ${(targetStats.totalCost + point.custo).toLocaleString('pt-BR', {maximumFractionDigits: 0})}</span>
                        </div>
                    </div>
                `;
            }
        } else {
            document.getElementById('targetClusterInfo').innerHTML = '';
        }
    };
    
    document.getElementById('reassignControl').style.display = 'block';
}

// ===== LOTES PANEL =====
function toggleLotesPanel() {
    const panel = document.getElementById('lotesPanel');
    const btn = panel.querySelector('.toggle-panel-btn');
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
}

function updateLotesPanel() {
    const lotesList = document.getElementById('lotesList');
    lotesList.innerHTML = '';
    
    // Agrupar OAEs por cluster
    const clusterGroups = {};
    pointsData.forEach(point => {
        if (!clusterGroups[point.cluster]) {
            clusterGroups[point.cluster] = [];
        }
        clusterGroups[point.cluster].push(point);
    });

    if (!clusterGroups['-1']) {
        clusterGroups['-1'] = [];
    }
    
    // Ordenar clusters
    const sortedClusters = Object.keys(clusterGroups).sort((a, b) => {
        // "Sem Lote" sempre no final
        if (a === '-1') return 1;
        if (b === '-1') return -1;
        return parseInt(a) - parseInt(b);
    });
    
    sortedClusters.forEach(clusterId => {
        const clusterPoints = clusterGroups[clusterId];
        const clusterInt = parseInt(clusterId);
        const isUnassigned = clusterInt === -1;
        const color = isUnassigned ? '#999999' : colors[clusterInt % colors.length];
        const isHidden = hiddenClusters.has(clusterInt);
        
        const stats = getClusterStats(clusterInt);
        const label = stats ? stats.label : (isUnassigned ? 'Sem Lote' : `Cluster ${clusterId}`);
        
        const loteItem = document.createElement('div');
        loteItem.className = `lote-item ${isUnassigned ? 'unassigned-lote' : ''} ${isHidden ? 'hidden' : ''}`;
        loteItem.style.borderLeftColor = color;
        
        loteItem.innerHTML = `
            <div class="lote-header">
                <input type="checkbox" 
                    class="lote-checkbox" 
                    ${!isHidden ? 'checked' : ''}
                    onchange="toggleClusterVisibility(${clusterInt})">
                <div class="lote-color-indicator" style="background-color: ${color};"></div>
                <span class="lote-name">${label}</span>
            </div>
            <div class="lote-stats">
                🔢 ${clusterPoints.length} OAE(s) | 
                💰 R$ ${clusterPoints.reduce((sum, p) => sum + p.custo, 0).toLocaleString('pt-BR', {maximumFractionDigits: 0})}
            </div>
            ${!isUnassigned ? `
                <div class="lote-actions">
                    <button class="lote-btn lote-btn-color" onclick="changeLoteColor(${clusterInt}, event)">
                        🎨 Cor
                    </button>
                    <button class="lote-btn lote-btn-merge" onclick="openMergeModal(${clusterInt})">
                        🔗 Mesclar
                    </button>
                    <button class="lote-btn lote-btn-delete" onclick="deleteLote(${clusterInt})">
                        🗑️ Excluir
                    </button>
                </div>
            ` : ''}
        `;
        
        lotesList.appendChild(loteItem);
    });
}

function toggleClusterVisibility(clusterId) {
    if (hiddenClusters.has(clusterId)) {
        hiddenClusters.delete(clusterId);
    } else {
        hiddenClusters.add(clusterId);
    }
    
    // Atualizar visibilidade dos markers
    pointsData.forEach(point => {
        if (point.cluster === clusterId && markers[point.id]) {
            if (hiddenClusters.has(clusterId)) {
                map.removeLayer(markers[point.id]);
            } else {
                markers[point.id].addTo(map);
            }
        }
    });
    
    // Atualizar visibilidade dos centróides
    if (centroidMarkers[clusterId]) {
        if (hiddenClusters.has(clusterId)) {
            map.removeLayer(centroidMarkers[clusterId]);
        } else {
            centroidMarkers[clusterId].addTo(map);
        }
    }
    
    updateLotesPanel();
}

// ===== INSPECT MODAL =====
function inspectLoteOAEs(clusterId) {
    const clusterPoints = pointsData.filter(p => p.cluster === clusterId);
    
    if (clusterPoints.length === 0) {
        alert('Nenhuma OAE encontrada neste lote!');
        return;
    }
    
    const stats = getClusterStats(clusterId);
    
    // Update modal title
    document.getElementById('inspectModalTitle').textContent = 
        `OAEs do ${stats.label} (${clusterPoints.length} OAEs)`;
    
    // Define columns to display
    const columns = [
        { key: 'id', label: 'ID' },
        { key: 'sge', label: 'SGE' },
        { key: 'CodPro', label: 'CodPro' },
        { key: 'IdOAE', label: 'Id. da OAE' },
        { key: 'rodovia', label: 'Rodovia' },
        { key: 'km', label: 'km' },
        { key: 'municipio', label: 'Município' },
        { key: 'unidade_local', label: 'UL' },
        { key: 'Largura', label: 'Largura (m)' },
        { key: 'Extensao', label: 'Extensão (m)' },
        { key: 'nota', label: 'Nota' },
        { key: 'lat', label: 'Lat.', format: (val) => val.toFixed(6) },
        { key: 'lon', label: 'Long.', format: (val) => val.toFixed(6) },
        { key: 'custo', label: 'Custo (R$)', format: (val) => val.toLocaleString('pt-BR', {minimumFractionDigits: 2}) },
        { key: 'status_geral', label: 'Status Geral' },
        { key: 'status_detalhado', label: 'Status Detalhado' },
        { key: 'dataset', label: 'Arquivo', format: (val) => datasetFilenames[val] || (val === 0 ? 'Principal' : `Sobreposto ${val}`) }
    ];
    
    // Build table header
    const thead = document.getElementById('inspectTableHead');
    thead.innerHTML = `
        <tr>
            <th class="row-number">#</th>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
        </tr>
    `;
    
    // Build table body
    const tbody = document.getElementById('inspectTableBody');
    tbody.innerHTML = clusterPoints.map((point, index) => `
        <tr>
            <td class="row-number">${index + 1}</td>
            ${columns.map(col => {
                const value = point[col.key];
                const displayValue = col.format ? col.format(value) : value;
                return `<td>${displayValue !== null && displayValue !== undefined ? displayValue : 'N/A'}</td>`;
            }).join('')}
        </tr>
    `).join('');
    
    // Show modal
    document.getElementById('inspectModalOverlay').style.display = 'block';
    document.getElementById('inspectModal').classList.add('active');
    
    // Close any open map popup
    map.closePopup();
}

function closeInspectModal() {
    document.getElementById('inspectModalOverlay').style.display = 'none';
    document.getElementById('inspectModal').classList.remove('active');
}

// ===== OVERLAY SECTION TOGGLE =====
function toggleOverlaySection() {
    const section = document.getElementById('overlaySection');
    section.classList.toggle('collapsed');
}

// ===== EVENT LISTENERS =====
document.getElementById('loadBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('Por favor, selecione um arquivo primeiro!', 'error', 'loadStatus');
        return;
    }
    
    showStatus('Carregando arquivo...', 'info', 'loadStatus');
    loadExcelFile(file, false);
});

document.getElementById('overlayBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('overlayFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('Por favor, selecione um arquivo primeiro!', 'error', 'overlayStatus');
        return;
    }
    
    showStatus('Sobrepondo arquivo...', 'info', 'overlayStatus');
    loadExcelFile(file, true);
});

document.getElementById('reassignBtn').addEventListener('click', () => {
    if (!selectedPoint) return;
    
    const targetValue = document.getElementById('targetCluster').value;
    if (!targetValue) {
        alert('Por favor, selecione um lote alvo primeiro!');
        return;
    }
    
    let targetCluster;
    let targetUnidadeLocal;

    // Handle "Sem Lote"
    if (targetValue === '-1') {
        targetCluster = -1;
        
        // Update point data
        const pointIndex = pointsData.findIndex(p => p.id === selectedPoint.id);
        pointsData[pointIndex].cluster = -1;
        pointsData[pointIndex].cluster_label = 'Sem Lote';
        
        // Rebuild unidadesClusters
        rebuildUnidadesClusters();
        
        // Refresh
        map.closePopup();
        createMarkers();
        updateStatistics();
        
        selectedPoint = null;
        document.getElementById('selectedPoint').innerHTML = '<div class="selected-point">✅ Ponto movido para "Sem Lote"! Este ponto está excluído da análise.</div>';
        document.getElementById('currentClusterInfo').innerHTML = '';
        document.getElementById('reassignControl').style.display = 'none';
        return;
    }
    
    // Check if creating a new cluster
    if (targetValue.startsWith('NEW_')) {
        targetUnidadeLocal = targetValue.substring(4); // Remove 'NEW_' prefix
        
        // Find the highest cluster ID across all data
        const maxCluster = pointsData.length > 0 
            ? Math.max(...pointsData.map(p => p.cluster))
            : -1;
        
        targetCluster = maxCluster + 1;
        
        // Create new cluster label
        const clusterCount = unidadesClusters[targetUnidadeLocal] 
            ? unidadesClusters[targetUnidadeLocal].length 
            : 0;
        const newClusterLabel = `${targetUnidadeLocal}-C${targetCluster}`;
        
        // Update point data
        const pointIndex = pointsData.findIndex(p => p.id === selectedPoint.id);
        pointsData[pointIndex].cluster = targetCluster;
        pointsData[pointIndex].cluster_label = newClusterLabel;
        pointsData[pointIndex].unidade_local = targetUnidadeLocal;
        
    } else {
        // Existing cluster reassignment
        targetCluster = parseInt(targetValue);
        
        // Update point data
        const pointIndex = pointsData.findIndex(p => p.id === selectedPoint.id);
        const originalUnidadeLocal = pointsData[pointIndex].unidade_local;
        pointsData[pointIndex].cluster = targetCluster;
        
        // Find target cluster's information from existing points in that cluster
        const targetClusterPoints = pointsData.filter(p => p.cluster === targetCluster && p.id !== selectedPoint.id);
        
        if (targetClusterPoints.length > 0) {
            // Use the cluster label from other points in the target cluster
            pointsData[pointIndex].cluster_label = targetClusterPoints[0].cluster_label;
        } else {
            // Fallback: construct label with original Unidade Local and new cluster ID
            pointsData[pointIndex].cluster_label = `${originalUnidadeLocal}-C${targetCluster}`;
        }
        
        // Ensure Unidade Local is NOT changed
        pointsData[pointIndex].unidade_local = originalUnidadeLocal;
    }
    
    // Rebuild unidadesClusters mapping
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
    
    // Refresh
    map.closePopup();
    createMarkers();
    createShapeLegend();
    updateStatistics();
    
    selectedPoint = null;
    document.getElementById('selectedPoint').innerHTML = '<div class="selected-point">✅ OAE reatribuída! Clique em outra OAE para continuar.</div>';
    document.getElementById('currentClusterInfo').innerHTML = '';
    document.getElementById('reassignControl').style.display = 'none';
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (pointsData.length === 0) {
        alert('Nenhum dado para exportar!');
        return;
    }
    
    const exportData = pointsData.map(p => ({
        'Point ID': p.id,
        'Cluster ID': p.cluster,
        'Cluster Label': p.cluster_label,
        'Unidade Local': p.unidade_local,
        'SGE': p.sge,
        'CodPro': p.CodPro,
        'IdOAE': p.IdOAE,
        'Latitude': p.lat,
        'Longitude': p.lon,
        'Largura': p.Largura,
        'Extensao': p.Extensao,
        'Nota Consolidada': p.nota,
        'Custo Final (R$)': p.custo,
        'Rodovia': p.rodovia,
        'km': p.km,
        'Município': p.municipio,
        'Status Geral': p.status_geral,
        'Status Detalhado': p.status_detalhado,
        'Dataset': datasetFilenames[p.dataset] || (p.dataset === 0 ? 'Principal' : `Sobreposto ${p.dataset}`),
    }));
    
    const uniqueClusters = [...new Set(pointsData.map(p => p.cluster))];
    const summaryData = uniqueClusters.sort((a, b) => a - b).map(clusterId => {
        const stats = getClusterStats(clusterId);
        
        return {
            'Cluster ID': clusterId,
            'Cluster Label': stats.label,
            'Unidade Local': stats.unidade_local,
            'Number of Points': stats.nPoints,
            'Total Cost (R$)': stats.totalCost,
            'Avg Cost (R$)': stats.avgCost
        };
    });
    
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws1, 'All Points');
    
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Cluster Summary');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(wb, `clusters_edited_${timestamp}.xlsx`);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        // Clear all data
        pointsData = [];
        unidadesClusters = {};
        selectedPoint = null;
        
        // Clear markers
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        Object.values(centroidMarkers).forEach(marker => map.removeLayer(marker));
        markers = {};
        centroidMarkers = {};
        
        // Reset UI
        document.getElementById('content').classList.remove('active');
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('uploadBox').classList.remove('loaded');
        document.getElementById('loadedMessage').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('loadStatus').innerHTML = '';
        
        // Reset map
        if (map) {
            map.setView([-15.7801, -47.9292], 4);
        }
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeInspectModal();
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('mergeModal');
    if (event.target === modal) {
        closeMergeModal();
    }
}

// ===== MODAL DRAGGING AND RESIZING =====
(function() {
    let isDragging = false;
    let isResizing = false;
    let dragOffsetX;
    let dragOffsetY;
    let initialWidth;
    let initialHeight;
    let initialLeft;
    let initialTop;
    let initialMouseX;
    let initialMouseY;

    const modal = document.getElementById('inspectModal');
    const header = document.getElementById('inspectModalHeader');
    const resizeHandle = document.getElementById('inspectModalResizeHandle');

    // Dragging functionality
    header.addEventListener('mousedown', dragStart);

    function dragStart(e) {
        // Don't drag if clicking the close button
        if (e.target.classList.contains('inspect-modal-close')) {
            return;
        }

        isDragging = true;
        modal.classList.add('dragging');
        
        // Get current position of the modal
        const rect = modal.getBoundingClientRect();
        
        // Calculate offset between mouse and modal's top-left corner
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        // Remove transform-based centering
        modal.style.transform = 'none';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        e.preventDefault();
    }

    function drag(e) {
        if (!isDragging) return;

        e.preventDefault();

        // Calculate new position maintaining cursor offset
        const newLeft = e.clientX - dragOffsetX;
        const newTop = e.clientY - dragOffsetY;

        // Apply boundaries to keep modal on screen
        const maxLeft = window.innerWidth - modal.offsetWidth;
        const maxTop = window.innerHeight - modal.offsetHeight;

        modal.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        modal.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
    }

    function dragEnd() {
        isDragging = false;
        modal.classList.remove('dragging');
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
    }

    // Resizing functionality
    resizeHandle.addEventListener('mousedown', resizeStart);

    function resizeStart(e) {
        isResizing = true;
        modal.classList.add('resizing');
        e.preventDefault();
        e.stopPropagation();

        // Get current dimensions and position
        const rect = modal.getBoundingClientRect();
        initialWidth = rect.width;
        initialHeight = rect.height;
        initialLeft = rect.left;
        initialTop = rect.top;
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;

        // Remove transform if present
        modal.style.transform = 'none';
        modal.style.left = initialLeft + 'px';
        modal.style.top = initialTop + 'px';

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', resizeEnd);
    }

    function resize(e) {
        if (!isResizing) return;

        e.preventDefault();

        // Calculate change in mouse position
        const deltaX = e.clientX - initialMouseX;
        const deltaY = e.clientY - initialMouseY;

        // Calculate new dimensions (expanding from bottom-right only)
        const newWidth = Math.max(400, initialWidth + deltaX);
        const newHeight = Math.max(300, initialHeight + deltaY);

        // Apply new dimensions
        modal.style.width = newWidth + 'px';
        modal.style.height = newHeight + 'px';
        modal.style.maxWidth = 'none'; // Remove max-width constraint when resizing

        // Keep top-left position fixed
        modal.style.left = initialLeft + 'px';
        modal.style.top = initialTop + 'px';
    }

    function resizeEnd() {
        isResizing = false;
        modal.classList.remove('resizing');
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', resizeEnd);
    }

    // Reset position and size when modal is closed and reopened
    const originalCloseInspectModal = window.closeInspectModal;
    window.closeInspectModal = function() {
        originalCloseInspectModal();
        // Reset position and size to centered
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.left = '50%';
        modal.style.top = '50%';
        modal.style.width = '90%';
        modal.style.height = '80vh';
        modal.style.maxWidth = '1200px';
    };
})();