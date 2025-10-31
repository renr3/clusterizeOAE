// ===== GLOBAL STATE FOR CLUSTER OPERATIONS =====
let mergeSourceCluster = null;

// ===== CHANGE LOTE COLOR =====
function changeLoteColor(clusterId, event) {
    const currentColor = colors[clusterId % colors.length];
    
    const modal = document.createElement('div');
    const rect = event.target.getBoundingClientRect();
    
    modal.style.cssText = `position:fixed; top:${rect.top}px; left:${rect.right + 10}px; background:white; padding:20px; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.3); z-index:3000;`;
    
    modal.innerHTML = `
        <h3>Escolher Cor</h3>
        <input type="color" id="colorPicker" value="${currentColor}" style="width:100%; height:50px; cursor:pointer;">
        <div style="margin-top:10px;">
            <button onclick="this.parentElement.parentElement.remove()" style="padding:8px 15px; margin-right:5px;">Cancelar</button>
            <button onclick="colors[${clusterId} % colors.length]=document.getElementById('colorPicker').value; createMarkers(); updateLotesPanel(); this.parentElement.parentElement.remove();" class="btn-primary" style="padding:8px 15px;">Aplicar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== MERGE MODAL =====
function openMergeModal(clusterId) {
    mergeSourceCluster = clusterId;
    const modal = document.getElementById('mergeModal');
    const select = document.getElementById('mergeTargetSelect');
    
    // Preencher opções
    select.innerHTML = '<option value="">Selecione...</option>';
    
    const uniqueClusters = [...new Set(pointsData.map(p => p.cluster))].sort((a, b) => a - b);
    uniqueClusters.forEach(cId => {
        if (cId !== clusterId && cId !== -1) {
            const stats = getClusterStats(cId);
            const option = document.createElement('option');
            option.value = cId;
            option.textContent = stats ? stats.label : `Cluster ${cId}`;
            select.appendChild(option);
        }
    });
    
    modal.style.display = 'block';
}

function closeMergeModal() {
    document.getElementById('mergeModal').style.display = 'none';
    mergeSourceCluster = null;
}

function confirmMerge() {
    const targetClusterValue = document.getElementById('mergeTargetSelect').value;
    const targetCluster = parseInt(targetClusterValue);
    
    // Verificação corrigida: checa se o valor é vazio ou NaN, não se é 0
    if (targetClusterValue === '' || isNaN(targetCluster) || mergeSourceCluster === null) {
        alert('Por favor, selecione um lote de destino!');
        return;
    }
    
    // Mesclar OAEs
    pointsData.forEach(point => {
        if (point.cluster === mergeSourceCluster) {
            point.cluster = targetCluster;
            // Atualizar label
            const targetStats = getClusterStats(targetCluster);
            if (targetStats) {
                point.cluster_label = targetStats.label;
            }
        }
    });
    
    // Rebuild unidadesClusters
    rebuildUnidadesClusters();
    
    // Refresh
    createMarkers();
    updateStatistics();
    updateLotesPanel();
    
    closeMergeModal();
    alert('✅ Lotes mesclados com sucesso!');
}

// ===== DELETE LOTE =====
function deleteLote(clusterId) {
    const stats = getClusterStats(clusterId);
    const confirmMsg = `Tem certeza que deseja excluir o lote "${stats.label}"?\n\n` +
                    `${stats.nPoints} OAE(s) serão movidas para "Sem Lote".`;
    
    if (!confirm(confirmMsg)) return;
    
    // Mover OAEs para cluster -1 (Sem Lote)
    pointsData.forEach(point => {
        if (point.cluster === clusterId) {
            point.cluster = -1;
            point.cluster_label = 'Sem Lote';
        }
    });
    
    // Rebuild unidadesClusters
    rebuildUnidadesClusters();
    
    // Refresh
    createMarkers();
    updateStatistics();
    updateLotesPanel();
    
    alert('✅ Lote excluído. OAEs movidas para "Sem Lote".');
}