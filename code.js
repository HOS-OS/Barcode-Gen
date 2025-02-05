const { app } = require('@electron/remote');
const fs = require('fs');
const path = require('path');

// Initialize file path and history array
const JSON_FILE_PATH = path.join(app.getPath('userData'), 'barcodes.json');
let barcodeHistory = [];

function showAlert(message) {
    const existingAlert = document.getElementById('duplicate-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.id = 'duplicate-alert';
    alertDiv.className = 'alert-box';
    alertDiv.textContent = message;

    const inputContainer = document.querySelector('h1');
    inputContainer.parentNode.insertBefore(alertDiv, inputContainer.nextSibling);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function loadBarcodeHistory() {
    try {
        if (fs.existsSync(JSON_FILE_PATH)) {
            const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
            barcodeHistory = JSON.parse(data);
        } else {
            barcodeHistory = [];
            fs.writeFileSync(JSON_FILE_PATH, JSON.stringify([], null, 4));
        }
    } catch (error) {
        console.error('Error loading barcode history:', error);
        barcodeHistory = [];
    }
}

function saveBarcodeToFile(number, name, imageData) {
    loadBarcodeHistory();

    const isDuplicate = barcodeHistory.some(item => 
        item.barcode === number || item.label === name
    );

    if (isDuplicate) {
        showAlert('Barcode exists! Please check your history.');
        return false;
    }

    barcodeHistory.push({
        barcode: number,
        label: name,
        imageData: imageData
    });

    if (barcodeHistory.length > 50) {
        barcodeHistory = barcodeHistory.slice(-50);
    }

    try {
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(barcodeHistory, null, 4));
        return true;
    } catch (error) {
        console.error('Error saving barcode:', error);
        showAlert('Failed to save barcode');
        return false;
    }
}

function generateBarcode() {
    const input = document.getElementById('input').value;
    const barcodeName = document.getElementById('barcodeName').value || 'barcode_' + new Date().toISOString().replace(/[:.-]/g, '_');

    if (input.length !== 11 || isNaN(input)) {
        showAlert('Please enter a valid 11-digit number.');
        return;
    }

    JsBarcode("#barcode", input, {
        format: "upc",
        lineColor: "#000",
        width: 2,
        height: 100,
        displayValue: true
    });

    const svg = document.getElementById('barcode');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.getElementById('barcodeCanvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        const barcodeDataURL = canvas.toDataURL("image/png");

        const downloadLink = document.getElementById('downloadLink');
        downloadLink.style.display = 'block';
        downloadLink.href = barcodeDataURL;
        downloadLink.download = barcodeName + ".png";

        if (saveBarcodeToFile(input, barcodeName, barcodeDataURL)) {
            console.log('Barcode saved successfully.');
        }
        
        URL.revokeObjectURL(url);
    };
    
    img.src = url;
}

function toggleHistoryMenu() {
    const historyMenu = document.getElementById('historyMenu');
    historyMenu.classList.toggle('show');
    renderHistoryMenu();
}

function renderHistoryMenu() {
    loadBarcodeHistory();
    const historyContainer = document.getElementById('historyMenuContent');
    const searchInput = document.getElementById('historySearchInput');
    const searchTerm = searchInput.value.toLowerCase();

    const filteredHistory = barcodeHistory
        .filter(item => 
            item.label.toLowerCase().includes(searchTerm) || 
            item.barcode.includes(searchTerm)
        )
        .reverse();

    historyContainer.innerHTML = '';

    filteredHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-menu-item';
        
        historyItem.innerHTML = `
            <p>Number: ${item.barcode}</p>
            <p>Name: ${item.label}</p>
            <img src="${item.imageData}" alt="Barcode image" width="100" height="100">
            <button onclick="downloadHistoryBarcode(${index})">Download</button>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}


// Clear the barcode history and reset the .json file
function clearBarcodeHistory() {
    const confirmation = confirm('Are you sure you want to clear the barcode history? This action cannot be undone.');

    if (confirmation) {
        try {
            barcodeHistory = [];
            fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(barcodeHistory, null, 4)); 

            showAlert('Barcode history cleared successfully.');
            renderHistoryMenu();
        } catch (error) {
            console.error('Error clearing barcode history:', error);
            showAlert('Failed to clear barcode history.');
        }
    }
}

// Event listener for the "Clear History" button
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearBarcodeHistory);
}

function downloadHistoryBarcode(index) {
    const item = barcodeHistory[index];
    const link = document.createElement('a');
    link.href = item.imageData;
    link.download = `${item.label}.png`;
    link.click();
}

function exportHistoryToCSV() {
    loadBarcodeHistory();
    const header = ['Barcode', 'Name', 'Image Data'];
    const rows = barcodeHistory.map(item => [
        item.barcode,
        item.label,
        item.imageData
    ]);

    const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'barcode_history.csv';
    link.click();
    URL.revokeObjectURL(url);
}

window.onload = function() {
    loadBarcodeHistory();
    
    const searchInput = document.getElementById('historySearchInput');
    searchInput.addEventListener('input', renderHistoryMenu);

    const modal = document.getElementById("aboutModal");
    const btn = document.getElementById("aboutBtn");
    const span = document.getElementsByClassName("close")[0];

    btn.onclick = function() {
        modal.style.display = "block";
    }

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    const { shell } = require('electron');
    document.getElementById('external-link').addEventListener('click', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportHistoryToCSV);
    }
};