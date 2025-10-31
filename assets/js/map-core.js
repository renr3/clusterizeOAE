// ALL map-related functionality
let map = null;
let markers = {};
let centroidMarkers = {};

// ===== COLOR GENERATION FUNCTIONS =====
function generateHighContrastColors(n) {
    const colors = [];
    
    // Use golden ratio for hue distribution
    const goldenRatioConjugate = 0.618033988749895;
    let hue = Math.random();
    
    for (let i = 0; i < n; i++) {
        hue += goldenRatioConjugate;
        hue %= 1;
        
        const h = hue * 360;
        
        // Alternate between high saturation and moderate saturation
        // Alternate between lighter and darker colors
        const s = (i % 2 === 0) ? 85 : 65; // High contrast in saturation
        const l = (i % 3 === 0) ? 40 : (i % 3 === 1) ? 60 : 50; // Vary lightness more
        
        colors.push(hslToHex(h, s, l));
    }
    
    return colors;
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    
    const toHex = (val) => {
        const hex = Math.round((val + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ===== MARKER SHAPE GENERATION =====
function getMarkerShape(dataset, size, unidadeColor, clusterColor, nota) {
    const shapes = [
        // Shape 0: Circle (original/primary dataset)
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" />
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="${uColor}" />
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" fill="white" />
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 7}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 1: Square
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="white" />
                <rect x="4" y="4" width="${size-8}" height="${size-8}" fill="${uColor}" />
                <rect x="6" y="6" width="${size-12}" height="${size-12}" fill="white" />
                <rect x="7" y="7" width="${size-14}" height="${size-14}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 2: Triangle (pointing up)
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${size/2},2 ${size-2},${size-2} 2,${size-2}" fill="white" />
                <polygon points="${size/2},4 ${size-4},${size-4} 4,${size-4}" fill="${uColor}" />
                <polygon points="${size/2},6 ${size-6},${size-6} 6,${size-6}" fill="white" />
                <polygon points="${size/2},7 ${size-7},${size-7} 7,${size-7}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2 + 3}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 3: Diamond
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}" fill="white" />
                <polygon points="${size/2},4 ${size-4},${size/2} ${size/2},${size-4} 4,${size/2}" fill="${uColor}" />
                <polygon points="${size/2},6 ${size-6},${size/2} ${size/2},${size-6} 6,${size/2}" fill="white" />
                <polygon points="${size/2},7 ${size-7},${size/2} ${size/2},${size-7} 7,${size/2}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 4: Pentagon
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${size/2},2 ${size-2},${size*0.4} ${size-5},${size-2} ${5},${size-2} 2,${size*0.4}" fill="white" />
                <polygon points="${size/2},4 ${size-4},${size*0.4} ${size-7},${size-4} ${7},${size-4} 4,${size*0.4}" fill="${uColor}" />
                <polygon points="${size/2},6 ${size-6},${size*0.4} ${size-9},${size-6} ${9},${size-6} 6,${size*0.4}" fill="white" />
                <polygon points="${size/2},7 ${size-7},${size*0.4} ${size-10},${size-7} ${10},${size-7} 7,${size*0.4}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2 + 2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 5: Hexagon
        (size, uColor, cColor, nota) => `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${size*0.3},2 ${size*0.7},2 ${size-2},${size/2} ${size*0.7},${size-2} ${size*0.3},${size-2} 2,${size/2}" fill="white" />
                <polygon points="${size*0.3},4 ${size*0.7},4 ${size-4},${size/2} ${size*0.7},${size-4} ${size*0.3},${size-4} 4,${size/2}" fill="${uColor}" />
                <polygon points="${size*0.3},6 ${size*0.7},6 ${size-6},${size/2} ${size*0.7},${size-6} ${size*0.3},${size-6} 6,${size/2}" fill="white" />
                <polygon points="${size*0.3},7 ${size*0.7},7 ${size-7},${size/2} ${size*0.7},${size-7} ${size*0.3},${size-7} 7,${size/2}" fill="${cColor}" opacity="0.85" />
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`,
        
        // Shape 6: Star
        (size, uColor, cColor, nota) => {
            const cx = size/2, cy = size/2, outerR = size/2 - 2, innerR = size/5;
            const points = [];
            for (let i = 0; i < 5; i++) {
                const outerAngle = (i * 72 - 90) * Math.PI / 180;
                const innerAngle = (i * 72 - 90 + 36) * Math.PI / 180;
                points.push(`${cx + outerR * Math.cos(outerAngle)},${cy + outerR * Math.sin(outerAngle)}`);
                points.push(`${cx + innerR * Math.cos(innerAngle)},${cy + innerR * Math.sin(innerAngle)}`);
            }
            return `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <polygon points="${points.join(' ')}" fill="white" stroke="${uColor}" stroke-width="2"/>
                <polygon points="${points.join(' ')}" fill="${cColor}" opacity="0.85" transform="scale(0.7) translate(${size*0.21}, ${size*0.21})"/>
                <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" 
                    font-family="Arial, sans-serif" font-size="${size/2.8}" font-weight="900" 
                    fill="white" stroke="black" stroke-width="1.5" 
                    paint-order="stroke">${nota}</text>
            </svg>`;
        }
    ];
    
    // Cycle through shapes if we have more datasets than shapes
    const shapeIndex = dataset % shapes.length;
    return shapes[shapeIndex](size, unidadeColor, clusterColor, Math.round(nota));
}

// ===== COLOR PALETTE =====
const colors = [
    '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
    '#ffff33', '#a65628', '#f781bf', '#999999', '#8dd3c7',
    '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69',
    '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'
];

// ===== MAP INITIALIZATION =====
function initMap() {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView([-15.7801, -47.9292], 4);
    
    // Camadas base
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
        maxNativeZoom: 17
    });
    
    const hybridLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
        maxNativeZoom: 17
    });
    
    const streetsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
        maxNativeZoom: 17
    });
    
    // Adicionar camada padrão (satélite)
    satelliteLayer.addTo(map);
    
    // Controle de camadas
    const baseMaps = {
        "🗺️ Mapa de Ruas": osmLayer,
        "🛰️ Satélite": satelliteLayer,
        "🌍 Híbrido (Satélite + Ruas)": L.layerGroup([hybridLayer, streetsLayer])
    };
    
    L.control.layers(baseMaps, null, {position: 'bottomleft'}).addTo(map);

    // Criar handle de toggle do sidebar se não existir
    if (!document.querySelector('.sidebar-toggle')) {
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'sidebar-toggle';
        toggleBtn.onclick = toggleSidebar;
        toggleBtn.title = 'Ocultar Painel Lateral';
        document.body.appendChild(toggleBtn);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.querySelector('.sidebar-toggle');
    
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        btn.style.left = '0px';
        btn.title = 'Mostrar Painel Lateral';
    } else {
        btn.style.left = '400px';
        btn.title = 'Ocultar Painel Lateral';
    }
    
    // Força o mapa a recalcular seu tamanho
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// ===== MARKER CREATION =====
function createMarkers() {
    // Remove existing point markers
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};

    updateLotesPanel();
    
    // Create a color mapping for Unidades Locais
    const unidadeColors = {};
    
    // Base palette for first 20
    const baseColorPalette = [
        // Primary saturated colors
        '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF',
        // Dark variants
        '#8B0000', '#00008B', '#006400', '#B8860B', '#8B008B', '#008B8B',
        // Bright variants
        '#FF6347', '#4169E1', '#32CD32', '#FFD700', '#FF1493', '#00CED1',
        // Orange/Brown spectrum
        '#FF4500', '#FF8C00', '#D2691E', '#A0522D', '#8B4513', '#CD853F',
        // Purple/Pink spectrum
        '#9400D3', '#9932CC', '#BA55D3', '#DA70D6', '#EE82EE', '#FF69B4',
        // Green spectrum
        '#228B22', '#2E8B57', '#3CB371', '#66CDAA', '#7FFF00', '#ADFF2F'
    ];
    
    const sortedUnidades = Object.keys(unidadesClusters).sort();

    const needsGeneration = sortedUnidades.length > baseColorPalette.length;
    
    let generatedColors = [];
    if (needsGeneration) {
        const numToGenerate = sortedUnidades.length - baseColorPalette.length;
        generatedColors = generateHighContrastColors(numToGenerate);
    }
    
    const fullPalette = [...baseColorPalette, ...generatedColors];
    
    sortedUnidades.forEach((unidade, index) => {
        unidadeColors[unidade] = fullPalette[index];
    });
    
    pointsData.forEach(point => {
        const clusterColor = colors[point.cluster % colors.length];
        const unidadeColor = unidadeColors[point.unidade_local] || '#999999';
        
        // Get the appropriate shape based on dataset
        const iconHtml = getMarkerShape(
            point.dataset, 
            28, 
            unidadeColor, 
            clusterColor, 
            point.nota
        );
        
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });
        
        const marker = L.marker([point.lat, point.lon], {
            icon: customIcon
        });
        
        marker.bindPopup(() => {
            // Find the current point data (in case it was updated)
            const currentPoint = pointsData.find(p => p.id === point.id) || point;
            const currentClusterColor = colors[currentPoint.cluster % colors.length];
            const currentUnidadeColor = unidadeColors[currentPoint.unidade_local] || '#999999';
            const currentDatasetLabel = datasetFilenames[currentPoint.dataset]
                ? `<span class="dataset-tag ${currentPoint.dataset === 0 ? 'dataset-primary' : 'dataset-overlay'}">${datasetFilenames[currentPoint.dataset]}</span>`
                : (currentPoint.dataset === 0 
                    ? '<span class="dataset-tag dataset-primary">Principal</span>' 
                    : `<span class="dataset-tag dataset-overlay">Sobreposto ${currentPoint.dataset}</span>`);
            
            return `
                <strong>${currentPoint.cluster_label}</strong> ${currentDatasetLabel}<br>
                <span style="display:inline-block; width:12px; height:12px; background:${currentUnidadeColor}; border-radius:50%; margin-right:5px;"></span>
                Unidade Local: ${currentPoint.unidade_local}<br>
                SGE: ${currentPoint.sge}<br>
                Nota: ${currentPoint.nota}<br>
                Custo: R$ ${currentPoint.custo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br>
                Rodovia: ${currentPoint.rodovia}<br>
                km: ${currentPoint.km}<br>
                Município: ${currentPoint.municipio}
            `;
        });
        
        marker.on('click', () => selectPoint(point));
        marker.addTo(map);
        markers[point.id] = marker;
    });
    
    // Store unidadeColors globally for legend
    window.currentUnidadeColors = unidadeColors;
    
    // Create/update centroid markers
    createCentroidMarkers();
}

// ===== CENTROID MARKERS =====
function createCentroidMarkers() {
    // Remove existing centroid markers
    Object.values(centroidMarkers).forEach(marker => map.removeLayer(marker));
    centroidMarkers = {};
    
    // Calculate centroids based on current point assignments
    const clusterGroups = {};
    pointsData.forEach(point => {
        if (!clusterGroups[point.cluster]) {
            clusterGroups[point.cluster] = [];
        }
        clusterGroups[point.cluster].push(point);
    });
    
    // Create centroid marker for each cluster
    Object.keys(clusterGroups).forEach(clusterId => {
        const clusterPoints = clusterGroups[clusterId];
        const centroidLat = clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length;
        const centroidLon = clusterPoints.reduce((sum, p) => sum + p.lon, 0) / clusterPoints.length;
        const color = colors[parseInt(clusterId) % colors.length];
        const stats = getClusterStats(parseInt(clusterId));

        // Skip if stats is null (shouldn't happen, but safety check)
        if (!stats) {
            console.warn(`No stats found for cluster ${clusterId}`);
            return;
        }
                        
        // Create a custom icon for centroid
        const centroidIcon = L.divIcon({
            className: 'custom-centroid-icon',
            html: `<div style="
                background-color: ${color};
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                border: 3px solid white;
                transform: rotate(-45deg);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
        
        const centroidMarker = L.marker([centroidLat, centroidLon], {
            icon: centroidIcon,
            zIndexOffset: 1000
        });
        
        centroidMarker.bindPopup(`
            <div style="min-width: 200px;">
                <strong style="font-size: 14px;">${stats.label}</strong><br>
                Unidade: ${stats.unidade_local}<br>
                OAEs: ${stats.nPoints}<br>
                Custo Total: R$ ${stats.totalCost.toLocaleString('pt-BR', {maximumFractionDigits: 0})}<br>
                <br>
                <div style="border-top: 2px solid #ddd; margin: 10px 0; padding-top: 10px;">
                    <button onclick="inspectLoteOAEs(${clusterId})" 
                            style="width: 100%; padding: 10px; background: #2196F3; color: white; 
                                border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        Inspecionar OAEs do Lote
                    </button>
                </div>
            </div>
        `);

        centroidMarker.addTo(map);
        centroidMarkers[clusterId] = centroidMarker;
    });
}

// ===== LEGENDS =====
function createUnidadeLegend() {
    // Remove existing legend if any
    if (window.unidadeLegend) {
        map.removeControl(window.unidadeLegend);
    }
    
    const legend = L.control({position: 'topleft'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.background = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        div.style.maxHeight = '300px';
        div.style.overflowY = 'auto';
        
        div.innerHTML = '<strong>Unidades Locais</strong><br>';
        
        // Use the globally stored colors from createMarkers
        const unidadeColors = window.currentUnidadeColors || {};
        
        Object.keys(unidadeColors).sort().forEach(unidade => {
            div.innerHTML += `
                <div style="margin: 5px 0;">
                    <span style="display:inline-block; width:16px; height:16px; background:${unidadeColors[unidade]}; border:2px solid black; border-radius:50%; margin-right:5px;"></span>
                    ${unidade}
                </div>
            `;
        });
        
        return div;
    };
    
    legend.addTo(map);
    window.unidadeLegend = legend;
}

function createShapeLegend() {
    // Remove existing legend if any
    if (window.shapeLegend) {
        map.removeControl(window.shapeLegend);
    }
    
    // Get unique datasets
    const datasets = [...new Set(pointsData.map(p => p.dataset))].sort();
    
    if (datasets.length <= 1) return; // Don't show legend if only one dataset
    
    const legend = L.control({position: 'topleft'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.background = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        div.innerHTML = '<strong>Datasets</strong><br>';
        
        const shapeNames = ['Círculo', 'Quadrado', 'Triângulo', 'Diamante', 'Pentágono', 'Hexágono', 'Estrela'];
        
        datasets.forEach(dataset => {
            const shapeName = shapeNames[dataset % shapeNames.length];
            const label = datasetFilenames[dataset] || (dataset === 0 ? 'Principal' : `Sobreposto ${dataset}`);
            const sampleSVG = getMarkerShape(dataset, 20, '#999', '#666', '');
            
            div.innerHTML += `
                <div style="margin: 5px 0; display: flex; align-items: center;">
                    <div style="width: 20px; height: 20px; margin-right: 8px;">${sampleSVG}</div>
                    <span>${shapeName} - ${label}</span>
                </div>
            `;
        });
        
        return div;
    };
    
    legend.addTo(map);
    window.shapeLegend = legend;
}

// Global function to update cluster color
function updateClusterColor(clusterId, newColor) {
    // Update the colors array permanently for this cluster
    colors[clusterId % colors.length] = newColor;
    
    // Recreate all markers to reflect the new color
    createMarkers();
    createShapeLegend();
    
    // Close the popup
    map.closePopup();
    
    // Show success message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'success-message';
    statusDiv.innerHTML = `✅ Cor do lote ${clusterId} atualizada!`;
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '20px';
    statusDiv.style.right = '20px';
    statusDiv.style.zIndex = '10000';
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.remove();
    }, 3000);
}

// Initialize empty map on load
initMap();