document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la aplicación
    initApp();
});

function initApp() {
    // Cargar inventario al iniciar
    loadInventory();
    updateFinancialSummary();
    
    // Configurar eventos
    setupEventListeners();
    
    // Proteger datos al recargar
    window.addEventListener('beforeunload', function(e) {
        // No es necesario hacer nada, localStorage persiste
    });
}

function setupEventListeners() {
    // Formulario de producto
    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProduct();
    });
    
    // Vista previa de imagen
    document.getElementById('productImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${event.target.result}" alt="Vista previa">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Botón de búsqueda
    document.querySelector('.btn-search').addEventListener('click', searchProduct);
    
    // Exportar a Excel
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    
    // Buscar al presionar Enter
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProduct();
        }
    });
}

function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const cost = parseFloat(document.getElementById('productCost').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value.trim();
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!name || isNaN(quantity) || isNaN(cost) || isNaN(price)) {
        showAlert('Por favor complete todos los campos requeridos correctamente.', 'error');
        return;
    }
    
    processImage(imageFile).then(imageData => {
        const product = {
            id: Date.now(),
            name,
            quantity,
            cost,
            price,
            category: category || 'Sin categoría',
            totalCost: quantity * cost,
            totalPrice: quantity * price,
            profit: quantity * (price - cost),
            image: imageData || null,
            createdAt: new Date().toISOString()
        };
        
        let inventory = getInventory();
        const existingProductIndex = inventory.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        
        if (existingProductIndex >= 0) {
            // Actualizar producto existente
            inventory[existingProductIndex].quantity += quantity;
            inventory[existingProductIndex].totalCost = inventory[existingProductIndex].quantity * inventory[existingProductIndex].cost;
            inventory[existingProductIndex].totalPrice = inventory[existingProductIndex].quantity * inventory[existingProductIndex].price;
            inventory[existingProductIndex].profit = inventory[existingProductIndex].quantity * (inventory[existingProductIndex].price - inventory[existingProductIndex].cost);
            
            if (imageData) {
                inventory[existingProductIndex].image = imageData;
            }
            
            showAlert('Producto actualizado correctamente', 'success');
        } else {
            // Agregar nuevo producto
            inventory.push(product);
            showAlert('Producto agregado correctamente', 'success');
        }
        
        saveInventory(inventory);
        loadInventory();
        updateFinancialSummary();
        resetForm();
    });
}

function processImage(file) {
    return new Promise((resolve) => {
        if (!file) {
            resolve(null);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const MAX_WIDTH = 200;
                const MAX_HEIGHT = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function loadInventory() {
    const inventory = getInventory();
    const tbody = document.getElementById('inventoryBody');
    
    tbody.innerHTML = '';
    
    if (inventory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="no-data">No hay productos en el inventario</td></tr>`;
        return;
    }
    
    inventory.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" class="table-image">` : 
                    '<i class="fas fa-box-open"></i>'}
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.quantity}</td>
            <td>$${product.cost.toFixed(2)}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>$${product.totalCost.toFixed(2)}</td>
            <td>$${product.totalPrice.toFixed(2)}</td>
            <td class="${product.profit >= 0 ? 'positive' : 'negative'}">$${product.profit.toFixed(2)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn delete-btn" onclick="confirmDelete(${product.id})">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateFinancialSummary() {
    const inventory = getInventory();
    
    const totalInvestment = inventory.reduce((sum, product) => sum + product.totalCost, 0);
    const totalSaleValue = inventory.reduce((sum, product) => sum + product.totalPrice, 0);
    const totalProfit = inventory.reduce((sum, product) => sum + product.profit, 0);
    
    document.getElementById('totalInvestment').textContent = `$${totalInvestment.toFixed(2)}`;
    document.getElementById('totalSaleValue').textContent = `$${totalSaleValue.toFixed(2)}`;
    document.getElementById('totalProfit').textContent = `$${totalProfit.toFixed(2)}`;
    
    // Colorear la ganancia total
    const profitElement = document.getElementById('totalProfit');
    profitElement.className = totalProfit >= 0 ? 'positive' : 'negative';
}

function editProduct(id) {
    const inventory = getInventory();
    const product = inventory.find(p => p.id === id);
    
    if (!product) return;
    
    document.getElementById('productName').value = product.name;
    document.getElementById('productQuantity').value = product.quantity;
    document.getElementById('productCost').value = product.cost;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category;
    
    if (product.image) {
        document.getElementById('imagePreview').innerHTML = `<img src="${product.image}" alt="Vista previa">`;
    }
    
    // Eliminar el producto del inventario (será reemplazado con los nuevos datos)
    const updatedInventory = inventory.filter(p => p.id !== id);
    saveInventory(updatedInventory);
    
    // Hacer scroll al formulario
    document.getElementById('productName').focus();
}

function confirmDelete(id) {
    const inventory = getInventory();
    const product = inventory.find(p => p.id === id);
    
    if (!product) return;
    
    if (confirm(`¿Estás seguro de eliminar "${product.name}" del inventario?`)) {
        deleteProduct(id);
    }
}

function deleteProduct(id) {
    let inventory = getInventory();
    inventory = inventory.filter(p => p.id !== id);
    saveInventory(inventory);
    loadInventory();
    updateFinancialSummary();
    showAlert('Producto eliminado correctamente', 'success');
}

function searchProduct() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const inventory = getInventory();
    const tbody = document.getElementById('inventoryBody');
    
    tbody.innerHTML = '';
    
    if (!searchTerm) {
        loadInventory();
        return;
    }
    
    const filteredProducts = inventory.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.category.toLowerCase().includes(searchTerm)
    );
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="no-data">No se encontraron productos</td></tr>`;
        return;
    }
    
    filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" class="table-image">` : 
                    '<i class="fas fa-box-open"></i>'}
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.quantity}</td>
            <td>$${product.cost.toFixed(2)}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>$${product.totalCost.toFixed(2)}</td>
            <td>$${product.totalPrice.toFixed(2)}</td>
            <td class="${product.profit >= 0 ? 'positive' : 'negative'}">$${product.profit.toFixed(2)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn delete-btn" onclick="confirmDelete(${product.id})">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function exportToExcel() {
    const inventory = getInventory();
    
    if (inventory.length === 0) {
        showAlert('No hay datos para exportar', 'warning');
        return;
    }
    
    // Preparar los datos para Excel
    const data = [
        ['Nombre', 'Categoría', 'Cantidad', 'Costo Unitario', 'Precio Venta', 'Total Costo', 'Total Venta', 'Ganancia', 'Fecha Creación']
    ];
    
    inventory.forEach(product => {
        data.push([
            product.name,
            product.category,
            product.quantity,
            product.cost,
            product.price,
            product.totalCost,
            product.totalPrice,
            product.profit,
            new Date(product.createdAt).toLocaleDateString()
        ]);
    });
    
    // Crear hoja de trabajo
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ajustar el ancho de las columnas
    ws['!cols'] = [
        {wch: 25}, {wch: 20}, {wch: 10}, 
        {wch: 15}, {wch: 15}, {wch: 15},
        {wch: 15}, {wch: 15}, {wch: 20}
    ];
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    
    // Exportar a Excel
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventario_${date}.xlsx`);
    
    showAlert('Exportación a Excel completada', 'success');
}

function getInventory() {
    return JSON.parse(localStorage.getItem('inventory')) || [];
}

function saveInventory(inventory) {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productName').focus();
}

function showAlert(message, type) {
    // Implementación básica de alerta
    alert(`${type.toUpperCase()}: ${message}`);
}

// Protección contra eliminación accidental
window.addEventListener('storage', function(e) {
    if (e.key === 'inventory' && !confirm('Se detectaron cambios en el inventario desde otra pestaña. ¿Deseas recargar los datos?')) {
        // Restaurar el inventario anterior
        localStorage.setItem('inventory', e.oldValue);
    }
    loadInventory();
});
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la aplicación
    initApp();
});

function initApp() {
    // Cargar inventario al iniciar
    loadInventory();
    updateFinancialSummary();
    
    // Configurar eventos
    setupEventListeners();
    
    // Mostrar sección activa
    showSection('inventory');
}

function setupEventListeners() {
    // Navegación de la barra lateral
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Actualizar clase activa
            document.querySelectorAll('.sidebar li').forEach(li => {
                li.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Formulario de producto
    document.getElementById('productForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addProduct();
    });
    
    // Vista previa de imagen
    document.getElementById('productImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${event.target.result}" alt="Vista previa">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Botón de búsqueda
    document.querySelector('.btn-search').addEventListener('click', searchProduct);
    
    // Exportar a Excel
    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    
    // Buscar al presionar Enter
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProduct();
        }
    });
    
    // Generar reporte
    document.getElementById('generateReport').addEventListener('click', generateSalesReport);
    
    // Configuración - Copia de seguridad
    document.getElementById('exportBackup').addEventListener('click', exportBackup);
    document.getElementById('importBackup').addEventListener('click', () => {
        document.getElementById('backupFile').click();
    });
    document.getElementById('backupFile').addEventListener('change', importBackup);
    document.getElementById('clearData').addEventListener('click', confirmClearData);
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Actualizar el título del encabezado
    const headerTitle = document.querySelector('header h1');
    switch(sectionId) {
        case 'inventory':
            headerTitle.innerHTML = '<i class="fas fa-box-open"></i> Gestión de Inventario';
            break;
        case 'reports':
            headerTitle.innerHTML = '<i class="fas fa-chart-line"></i> Reportes de Ventas';
            loadSalesData(); // Cargar datos de ventas al mostrar la sección
            break;
        case 'settings':
            headerTitle.innerHTML = '<i class="fas fa-cog"></i> Configuración del Sistema';
            loadSettings(); // Cargar configuración al mostrar la sección
            break;
    }
}

function generateSalesReport() {
    const dateFrom = document.getElementById('reportDateFrom').value;
    const dateTo = document.getElementById('reportDateTo').value;
    
    // Validar fechas
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
        showAlert('La fecha "Desde" no puede ser mayor que la fecha "Hasta"', 'error');
        return;
    }
    
    // Filtrar ventas por rango de fechas
    const sales = getSalesData();
    let filteredSales = [...sales];
    
    if (dateFrom) {
        filteredSales = filteredSales.filter(sale => 
            new Date(sale.date) >= new Date(dateFrom));
    }
    
    if (dateTo) {
        filteredSales = filteredSales.filter(sale => 
            new Date(sale.date) <= new Date(`${dateTo}T23:59:59`));
    }
    
    // Calcular totales
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalCost = filteredSales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalProfit = totalAmount - totalCost;
    
    // Actualizar resumen
    document.getElementById('totalSalesAmount').textContent = `$${totalAmount.toFixed(2)}`;
    document.getElementById('totalSalesCost').textContent = `$${totalCost.toFixed(2)}`;
    document.getElementById('totalSalesProfit').textContent = `$${totalProfit.toFixed(2)}`;
    
    // Actualizar tabla de ventas
    const tbody = document.getElementById('salesBody');
    tbody.innerHTML = '';
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay ventas en el período seleccionado</td></tr>';
        return;
    }
    
    filteredSales.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(sale.date).toLocaleDateString()}</td>
            <td>${sale.productName}</td>
            <td>${sale.quantity}</td>
            <td>$${sale.price.toFixed(2)}</td>
            <td>$${sale.totalPrice.toFixed(2)}</td>
            <td>$${sale.cost.toFixed(2)}</td>
            <td>$${sale.totalCost.toFixed(2)}</td>
            <td class="${sale.profit >= 0 ? 'positive' : 'negative'}">$${sale.profit.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

function loadSalesData() {
    // Establecer fechas por defecto (mes actual)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('reportDateFrom').valueAsDate = firstDay;
    document.getElementById('reportDateTo').valueAsDate = lastDay;
    
    // Generar reporte automáticamente
    generateSalesReport();
}

function getSalesData() {
    // En un sistema real, esto vendría de una base de datos
    // Por ahora simulamos datos basados en el inventario
    const inventory = getInventory();
    let sales = [];
    
    inventory.forEach(product => {
        if (product.quantity > 0) {
            // Simular algunas ventas para cada producto
            const salesCount = Math.min(Math.floor(Math.random() * 5) + 1, product.quantity);
            for (let i = 0; i < salesCount; i++) {
                const quantitySold = Math.floor(Math.random() * product.quantity / salesCount) + 1;
                const saleDate = new Date();
                saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));
                
                sales.push({
                    id: `sale-${product.id}-${i}`,
                    productId: product.id,
                    productName: product.name,
                    quantity: quantitySold,
                    price: product.price,
                    totalPrice: quantitySold * product.price,
                    cost: product.cost,
                    totalCost: quantitySold * product.cost,
                    profit: quantitySold * (product.price - product.cost),
                    date: saleDate.toISOString()
                });
            }
        }
    });
    
    return sales;
}

function exportBackup() {
    const data = {
        inventory: getInventory(),
        settings: {
            companyName: document.getElementById('companyName').value || 'Mi Empresa'
        },
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('Copia de seguridad exportada correctamente', 'success');
}

function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            if (data.inventory) {
                saveInventory(data.inventory);
                loadInventory();
                updateFinancialSummary();
            }
            
            if (data.settings && data.settings.companyName) {
                document.getElementById('companyName').value = data.settings.companyName;
                saveSettings();
            }
            
            showAlert('Copia de seguridad importada correctamente', 'success');
        } catch (error) {
            showAlert('Error al importar la copia de seguridad: Archivo inválido', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
    
    // Resetear el input para permitir importar el mismo archivo otra vez
    e.target.value = '';
}

function confirmClearData() {
    if (confirm('¿Estás seguro de que deseas borrar TODOS los datos? Esta acción no se puede deshacer.')) {
        clearAllData();
    }
}

function clearAllData() {
    localStorage.clear();
    loadInventory();
    updateFinancialSummary();
    showAlert('Todos los datos han sido borrados', 'success');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    if (settings.companyName) {
        document.getElementById('companyName').value = settings.companyName;
    }
}

function saveSettings() {
    const settings = {
        companyName: document.getElementById('companyName').value || ''
    };
    localStorage.setItem('settings', JSON.stringify(settings));
}

