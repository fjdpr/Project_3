// Global variables for the map and heatmap layer
let map;
let heatmapLayer;
let dataSamples;

// Define an array of month names to be used globally
const monthNames = [
    "January", "February", "March", "April", "May",
    "June", "July", "August", "September", "October",
    "November", "December"
];

// Function to update chart titles based on the selected year
function updateChartTitles(year) {
    if (year === "") {
        document.getElementById('title0').innerText = '% of Historical Border Crossings by Country';
        document.getElementById('title1').innerText = 'Number of Historical Border Crossings';
    } else {
        document.getElementById('title0').innerText = `% of Border Crossings by Country (${year})`;
        document.getElementById('title1').innerText = `Border Crossings by Month in ${year}`;
    }
}


// Function to initialize the map
function initializeMap() {
    if (!map) {
        // Create a new map instance with specific configurations
        map = new maplibregl.Map({
            container: 'box3',
            style: {
                version: 8,
                sources: {
                    "osm-tiles": {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256
                    }
                },
                layers: [
                    {
                        id: "osm-tiles",
                        type: "raster",
                        source: "osm-tiles"
                    }
                ]
            },
            center: [-95.7129, 39.8283],
            zoom: 3
        });

        // Add heatmap layer once the map is loaded
        map.on('load', () => {
            heatmapLayer = new deck.MapboxLayer({
                id: 'heatmap',
                type: deck.HeatmapLayer,
                data: [],
                getPosition: d => d.position,
                getWeight: d => d.weight,
                radiusPixels: 100
            });
            map.addLayer(heatmapLayer);

            // Add zoom and border filter controls
            addMapControls();
        });
    }
}

// Function to add controls to the map
function addMapControls() {
    // Create a container for the controls
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'mapboxgl-ctrl';

    // Create the border filter select element
    const borderFilter = document.createElement('select');
    borderFilter.id = 'borderFilter';
    borderFilter.innerHTML = `
        <option value="">All</option>
        <option value="Mexico">Mexico</option>
        <option value="Canada">Canada</option>
    `;
    // Update the heatmap when the border filter changes
    borderFilter.addEventListener('change', () => buildHeatMap(dataSamples));
    controlsContainer.appendChild(borderFilter);

    // Create the zoom control input element
    const zoomControl = document.createElement('input');
    zoomControl.type = 'range';
    zoomControl.id = 'zoomControl';
    zoomControl.min = '1';
    zoomControl.max = '20';
    zoomControl.step = '1';
    zoomControl.value = map.getZoom();
    // Update the map zoom level when the zoom control is adjusted
    zoomControl.addEventListener('input', function() {
        map.setZoom(parseInt(this.value));
    });
    controlsContainer.appendChild(zoomControl);

    // Add the controls container to the map
    map.getContainer().appendChild(controlsContainer);
}

// Function to update the heatmap data
function buildHeatMap(samples) {
    let borderFilter = document.getElementById('borderFilter').value;
    // Filter the samples based on the selected border filter
    let filteredSamples = samples.filter(sample => {
        if (borderFilter) {
            return sample['Border'].includes(borderFilter);
        }
        return true;
    });

    // Map the filtered samples to heatmap data format
    let heatmapData = filteredSamples.map(sample => ({
        position: [parseFloat(sample['Longitude']), parseFloat(sample['Latitude'])],
        weight: parseInt(sample['Value'])
    }));

    // Update the heatmap layer with the new data
    if (heatmapLayer) {
        heatmapLayer.setProps({ data: heatmapData });
    }
}

// Function to populate dropdowns with years from the data
function populateDropdowns(samples) {
    // Extract years from the data
    let years = new Set(samples.map(sample => sample['Year']));
    
    // Select dropdown element
    let yearDropdown = d3.select("#yearDropdown");

    // Add "All" option at the beginning of dropdown
    yearDropdown.append("option").text("All").property("value", "");

    // Add year options to the dropdown
    years.forEach(year => {
        yearDropdown.append("option").text(year).property("value", year);
    });

    // Add event listener for dropdown change
    yearDropdown.on("change", updateCharts);
}

// Function to update the charts and heatmap when the dropdown changes
function updateCharts() {
    let selectedYear = d3.select("#yearDropdown").property("value");
    updateChartTitles(selectedYear);
    buildPieChart(dataSamples, selectedYear);
    loadDataAndBuildSecondChart(dataSamples, selectedYear);
    buildHeatMap(dataSamples);
}

// Wait for the DOM content to be loaded before executing the following code
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();

    // Fetch data from JSON file
    fetch('static/json/data.json')
        .then(response => response.json())
        .then(data => {
            dataSamples = data;
            // Initialize dropdowns and charts with the fetched data
            populateDropdowns(dataSamples);
            buildPieChart(dataSamples, "");
            loadDataAndBuildSecondChart(dataSamples, "");
            buildHeatMap(dataSamples);
            updateChartTitles("");
        })
        .catch(error => console.error('Error fetching JSON data:', error));
});

// Function to build a pie chart (box0)
function buildPieChart(samples, selectedYear = "") {
    // Filter the data based on the selected year
    let filteredData = samples.filter(sample => {
        let year = sample['Year'];
        return (selectedYear ? year === selectedYear : true);
    });

    // Process data for the pie chart
    let borderData = {};
    filteredData.forEach(sample => {
        let border = sample['Border'].replace("US-", "").replace(" Border", "");
        let value = parseInt(sample['Value']);
        if (border && !isNaN(value)) {
            if (borderData[border]) {
                borderData[border] += value;
            } else {
                borderData[border] = value;
            }
        }
    });

    // Order borders: Mexico first, then Canada, then others
    let borderNames = ["Mexico", "Canada"].concat(Object.keys(borderData).filter(border => border !== "Mexico" && border !== "Canada"));
    let borderValues = borderNames.map(border => borderData[border]);

    // Calculate percentages
    let totalValue = borderValues.reduce((sum, value) => sum + value, 0);
    let borderPercentages = borderValues.map(value => (value / totalValue) * 100);

    // Define colors for the pie chart
    let borderColors = borderNames.map(border => {
        if (border === 'Mexico') {
            return '#66b2b2';
        } else if (border === 'Canada') {
            return '#ff9999';
        } else {
            return '#cccccc';
        }
    });

    // Prepare data and layout for the pie chart
    let pieData = [{
        values: borderPercentages,
        labels: borderPercentages.map(p => `<b>${p.toFixed(2)}%</b>`),
        type: 'pie',
        textinfo: 'label',
        hoverinfo: 'label+percent',
        marker: {
            colors: borderColors,
            line: {
                color: '#000000',
                width: 0.5
            }
        }
    }];

    let pieLayout = {
        showlegend: false,
        autosize: true,
        margin: { l: 5, r: 5, b: 5, t: 5 },
        height: document.getElementById('box0').clientHeight - 80,
        width: document.getElementById('box0').clientWidth - 80
    };

    // Render the pie chart
    Plotly.newPlot("box0", pieData, pieLayout, {responsive: true});

    // Render flags and color boxes in a separate container
    let flagContainer = document.getElementById('flag-container');
    flagContainer.innerHTML = '';
    borderNames.forEach((name, index) => {
        let flagSource = '';
        if (name === 'Mexico') {
            flagSource = 'static/images/Flag_of_Mexico.svg';
        } else if (name === 'Canada') {
            flagSource = 'static/images/Flag_of_Canada.svg';
        }

        if (flagSource) {
            let flagElement = document.createElement('div');
            flagElement.style.flex = '1';
            flagElement.style.display = 'flex';
            flagElement.style.alignItems = 'center';
            flagElement.style.justifyContent = 'center';
            flagElement.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div style="width: 20px; height: 20px; background-color: ${borderColors[index]}; margin-right: 8px;"></div>
                    <img src="${flagSource}" width="60" height="36">
                </div>
            `; // Adjust flag size and add color box
            flagContainer.appendChild(flagElement);
        }
    });
}

// Function to build a line chart (box1)
function loadDataAndBuildSecondChart(samples, selectedYear = "") {
    let filteredData = samples;
    let xValues = [];
    let yValues = [];

    // Check if a specific year is selected or not
    if (selectedYear === "") {
        // Process data by years
        let years = [...new Set(samples.map(sample => sample['Year']))];
        years.sort((a, b) => a - b);
        
        xValues = years;
        yValues = years.map(year => {
            let yearlyData = samples.filter(sample => sample['Year'] === year);
            return yearlyData.reduce((sum, sample) => sum + parseInt(sample['Value']), 0);
        });
    } else {
        // Process data by months for the selected year
        filteredData = samples.filter(sample => sample['Year'] === selectedYear);
        let months = [...new Set(filteredData.map(sample => sample['Month']))];
        months.sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));
        
        xValues = months;
        yValues = months.map(month => {
            let monthlyData = filteredData.filter(sample => sample['Month'] === month);
            return monthlyData.reduce((sum, sample) => sum + parseInt(sample['Value']), 0);
        });
    }

    // Prepare data and layout for the line chart
    let lineData = [{
        x: xValues,
        y: yValues,
        mode: 'lines+markers',
        line: {
            shape: 'spline'
        },
        marker: {
            size: 8
        }
    }];

    let lineLayout = {
        xaxis: {
            tickangle: -45,
            ticktext: xValues,
            tickvals: xValues
        },
        margin: { t: 40, r: 20, b: 80, l: 50 },
        height: document.getElementById('box1').clientHeight - 40,
        width: document.getElementById('box1').clientWidth - 40
    };

    // Render the line chart
    Plotly.newPlot("box1", lineData, lineLayout);
}